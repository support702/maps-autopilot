import { schedules } from "@trigger.dev/sdk/v3";
import { query } from "../lib/db";
import { callClaude } from "../lib/anthropic";
import { sendEmail } from "../lib/email";
import { fetchReviews } from "../lib/brightlocal";

export const wf03ReviewMonitor = schedules.task({
  id: "wf03-review-monitor",
  cron: "0 */2 * * *",
  run: async () => {
    const { rows: clients } = await query(
      `SELECT c.*, nc.niche_name, nc.review_context
       FROM clients c
       JOIN niche_configs nc ON c.niche_key = nc.niche_key
       WHERE c.status = 'active' AND c.brightlocal_location_id IS NOT NULL`
    );

    let totalNew = 0;
    let totalNegative = 0;

    for (const client of clients) {
      try {
        const lastCheck = client.last_review_check
          ? new Date(client.last_review_check).toISOString().split("T")[0]
          : new Date(Date.now() - 7200000).toISOString().split("T")[0];

        const reviewData = await fetchReviews(client.brightlocal_location_id, lastCheck);
        const reviews = reviewData?.reviews || [];

        for (const review of reviews) {
          // Insert review
          await query(
            `INSERT INTO reviews (client_id, platform, reviewer_name, rating, review_text, review_date, brightlocal_review_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT DO NOTHING`,
            [
              client.client_id,
              review.platform || "google",
              review.reviewer_name || "Anonymous",
              review.rating,
              review.review_text || "",
              review.review_date || new Date().toISOString(),
              review.review_id || "",
            ]
          );

          const reviewContext = client.review_context || {};
          const rating = Number(review.rating);

          if (rating >= 4) {
            // Auto-generate positive response
            const prompt = `Write a professional response to this ${rating}-star Google review for ${client.business_name}.
Review: "${review.review_text || ""}"
Reviewer: ${review.reviewer_name || "Customer"}
Business niche: ${client.niche_name}
Tone: ${reviewContext.positive_tone || "warm, grateful"}

Rules:
- Max 200 characters
- Never be defensive
- Thank them, mention a specific service if mentioned
Return JSON: {"response_text": "..."}`;

            const respRaw = await callClaude(prompt, undefined, 500);
            try {
              const resp = JSON.parse(respRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
              await query(
                `UPDATE reviews SET responded = true, response_text = $1 WHERE brightlocal_review_id = $2`,
                [resp.response_text, review.review_id]
              );
            } catch {
              console.error("Failed to parse review response");
            }
          } else {
            // Negative review — draft response and email AM
            totalNegative++;
            const prompt = `Write a professional response to this ${rating}-star Google review for ${client.business_name}.
Review: "${review.review_text || ""}"
Reviewer: ${review.reviewer_name || "Customer"}
Business niche: ${client.niche_name}
Phone: ${client.phone || ""}
Tone: ${reviewContext.negative_tone || "empathetic, professional"}

Rules:
- Max 350 characters
- Never be defensive
- Apologize, offer to resolve offline, include phone number
Return JSON: {"response_text": "..."}`;

            const respRaw = await callClaude(prompt, undefined, 500);
            try {
              const resp = JSON.parse(respRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
              await sendEmail(
                "tom@haildentpro.com",
                `⚠️ Negative Review: ${client.business_name} (${rating}⭐)`,
                `<h3>${client.business_name} received a ${rating}-star review</h3>
                 <p><strong>Reviewer:</strong> ${review.reviewer_name}</p>
                 <p><strong>Review:</strong> ${review.review_text}</p>
                 <h4>Draft Response:</h4>
                 <p>${resp.response_text}</p>
                 <p>Please review and post this response.</p>`
              );
            } catch {
              console.error("Failed to handle negative review");
            }
          }

          totalNew++;
        }

        // Update last check timestamp
        await query(
          "UPDATE clients SET last_review_check = NOW() WHERE client_id = $1",
          [client.client_id]
        );
      } catch (err) {
        console.error(`WF03 failed for ${client.client_id}:`, err);
      }
    }

    return { clients_checked: clients.length, new_reviews: totalNew, negative: totalNegative };
  },
});
