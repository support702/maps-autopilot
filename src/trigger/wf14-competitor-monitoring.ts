import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { sendEmail } from "../lib/email";
import axios from "axios";

export const wf14CompetitorMonitoring = task({
  id: "wf14-competitor-monitoring",
  run: async (_payload: Record<string, unknown>) => {
    const { rows: clients } = await query(
      `SELECT * FROM clients
       WHERE status = 'active' AND (service_tier = 'premium' OR tier = 'premium')
       AND primary_keyword IS NOT NULL`
    );

    const alerts: string[] = [];

    for (const client of clients) {
      try {
        // Search Google Places for competitors
        const keyword = client.primary_keyword || client.niche_key;
        const city = client.city || client.service_area || "";
        const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(keyword + " " + city)}&type=establishment&key=${process.env.GOOGLE_API_KEY}`;

        const { data } = await axios.get(searchUrl, { timeout: 15000 });
        const results = data.results || [];

        // Clear old snapshots for this client
        await query(
          "DELETE FROM competitor_snapshots WHERE client_id = $1",
          [client.client_id]
        );

        for (let i = 0; i < Math.min(results.length, 10); i++) {
          const comp = results[i];
          const placeId = comp.place_id || "";
          const compName = comp.name || "";
          const reviewCount = comp.user_ratings_total || 0;
          const rating = comp.rating || 0;

          // Save snapshot (overwrite weekly)
          await query(
            `INSERT INTO competitor_snapshots (client_id, competitor_place_id, competitor_name, review_count, rating, rank_position, scan_date)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)`,
            [client.client_id, placeId, compName, reviewCount, rating, i + 1]
          );

          // Check previous history for review velocity
          const { rows: [prevEntry] } = await query(
            `SELECT review_count FROM competitor_history
             WHERE client_id = $1 AND competitor_place_id = $2
             ORDER BY scan_date DESC LIMIT 1`,
            [client.client_id, placeId]
          );
          const reviewDelta = prevEntry ? reviewCount - prevEntry.review_count : 0;

          // Append to history
          await query(
            `INSERT INTO competitor_history (client_id, competitor_place_id, competitor_name, review_count, rating, rank_position, review_delta, scan_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)`,
            [client.client_id, placeId, compName, reviewCount, rating, i + 1, reviewDelta]
          );

          if (reviewDelta >= 10) {
            alerts.push(
              `${client.business_name}: Competitor "${compName}" gained ${reviewDelta} reviews in the last week`
            );
          }
        }
      } catch (err) {
        console.error(`WF14 failed for ${client.client_id}:`, err);
      }
    }

    if (alerts.length > 0) {
      try {
        await sendEmail(
          "tom@haildentpro.com",
          `Competitor Alert: ${alerts.length} significant changes`,
          `<h2>Weekly Competitor Monitoring</h2>
           <ul>${alerts.map((a) => `<li>⚠️ ${a}</li>`).join("")}</ul>`
        );
      } catch {
        console.error("Failed to send competitor alert");
      }
    }

    return { clients_monitored: clients.length, alerts: alerts.length };
  },
});
