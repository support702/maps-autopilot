import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { sendEmail } from "../lib/email";
import axios from "axios";

export const wf15GeoGridTracker = task({
  id: "wf15-geo-grid-tracker",
  run: async (_payload: Record<string, unknown>) => {
    const { rows: clients } = await query(
      `SELECT * FROM clients
       WHERE status = 'active' AND (service_tier = 'premium' OR tier = 'premium')
       AND latitude IS NOT NULL AND longitude IS NOT NULL AND primary_keyword IS NOT NULL`
    );

    const alerts: string[] = [];

    for (const client of clients) {
      try {
        // Call Local Falcon API
        const { data } = await axios.post(
          "https://api.localfalcon.com/v1/scan",
          {
            keyword: client.primary_keyword,
            lat: String(client.latitude),
            lng: String(client.longitude),
            grid_size: "7x7",
            zoom: 13,
          },
          {
            headers: { "X-API-KEY": process.env.LOCAL_FALCON_API_KEY || "" },
            timeout: 120000,
          }
        );

        const gridData = data.grid || data;
        const positions = Array.isArray(gridData)
          ? gridData.flat()
          : Object.values(gridData).flat();
        const numPositions = positions.length || 49;
        const top3Count = positions.filter((p: number) => p >= 1 && p <= 3).length;
        const top10Count = positions.filter((p: number) => p >= 1 && p <= 10).length;
        const notRanking = positions.filter((p: number) => p === 0 || p > 20).length;
        const ranked = positions.filter((p: number) => p > 0);
        const avgRank =
          ranked.length > 0
            ? (ranked.reduce((a: number, b: number) => a + b, 0) / ranked.length).toFixed(1)
            : "N/A";
        const top3Pct = Math.round((top3Count / numPositions) * 100);
        const top10Pct = Math.round((top10Count / numPositions) * 100);

        // Save snapshot
        await query(
          `INSERT INTO geo_grid_snapshots (client_id, keyword, grid_size, grid_data, avg_rank, top3_percentage, scan_date)
           VALUES ($1, $2, '7x7', $3, $4, $5, NOW())`,
          [client.client_id, client.primary_keyword, JSON.stringify(gridData), avgRank === "N/A" ? null : avgRank, top3Pct]
        );

        // Check previous week for comparison
        const { rows: [prevScan] } = await query(
          `SELECT top3_pct, avg_rank FROM geo_grid_history
           WHERE client_id = $1 AND keyword = $2
           ORDER BY scan_date DESC LIMIT 1`,
          [client.client_id, client.primary_keyword]
        );

        const trend = prevScan
          ? top3Pct > prevScan.top3_pct ? "improving" : top3Pct < prevScan.top3_pct ? "declining" : "stable"
          : "new";

        // Save to history
        await query(
          `INSERT INTO geo_grid_history (client_id, keyword, top3_pct, top10_pct, avg_rank, top3_count, not_ranking_count, trend, scan_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE)`,
          [client.client_id, client.primary_keyword, top3Pct, top10Pct, avgRank, top3Count, notRanking, trend]
        );

        // Alert if ranking dropped significantly
        if (prevScan && top3Pct < prevScan.top3_pct - 10) {
          alerts.push(
            `${client.business_name}: Top-3 dropped from ${prevScan.top3_pct}% to ${top3Pct}% for "${client.primary_keyword}"`
          );
        }
      } catch (err) {
        console.error(`WF15 failed for ${client.client_id}:`, err);
      }
    }

    if (alerts.length > 0) {
      try {
        await sendEmail(
          "tom@haildentpro.com",
          `Geo-Grid Alert: ${alerts.length} ranking drops`,
          `<h2>Weekly Geo-Grid Report</h2>
           <ul>${alerts.map((a) => `<li>⚠️ ${a}</li>`).join("")}</ul>`
        );
      } catch {
        console.error("Failed to send geo-grid alert");
      }
    }

    return { clients_scanned: clients.length, alerts: alerts.length };
  },
});
