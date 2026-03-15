import { schedules } from "@trigger.dev/sdk/v3";
import { query } from "../lib/db";
import { callClaude } from "../lib/anthropic";
import { sendEmail } from "../lib/email";

export const wf05MonthlyReports = schedules.task({
  id: "wf05-monthly-reports",
  cron: "0 12 1 * *",
  run: async () => {
    const { rows: clients } = await query(
      `SELECT c.*, nc.niche_name, nc.suggested_price
       FROM clients c
       JOIN niche_configs nc ON c.niche_key = nc.niche_key
       WHERE c.status = 'active'`
    );

    const summaries: string[] = [];

    for (const client of clients) {
      try {
        // Review data (30-day window)
        const { rows: reviews } = await query(
          `SELECT COUNT(*) as count, COALESCE(AVG(rating), 0) as avg_rating
           FROM reviews WHERE client_id = $1 AND review_date > NOW() - INTERVAL '30 days'`,
          [client.client_id]
        );
        const reviewCount = Number(reviews[0]?.count || 0);
        const avgRating = Number(reviews[0]?.avg_rating || 0).toFixed(1);

        // Published content count
        const { rows: posts } = await query(
          `SELECT COUNT(*) as count FROM published_content
           WHERE client_id = $1 AND publish_date > NOW() - INTERVAL '30 days'`,
          [client.client_id]
        );
        const postCount = Number(posts[0]?.count || 0);

        // Money Sheet
        const callCount = 0; // Placeholder until GBP Performance API approved
        const estimatedJobs = Math.floor(callCount * 0.3);
        const avgJobValue = client.suggested_price || 350;
        const estimatedRevenue = estimatedJobs * avgJobValue;
        const monthlyPrice = client.monthly_price || 500;
        const roi =
          monthlyPrice > 0
            ? ((estimatedRevenue - monthlyPrice) / monthlyPrice * 100).toFixed(0)
            : "N/A";

        // Claude narrative summary
        const reportPrompt = `Write a concise monthly performance summary for ${client.business_name}.
Data:
- New reviews this month: ${reviewCount} (avg rating: ${avgRating})
- GBP posts published: ${postCount}
- Estimated tracked calls: ${callCount}
- Month number: ${client.months_active || 1}

Write 3-4 sentences. Be specific. Highlight wins. Note any concerns.
End with one recommended action for next month.
Return JSON: {"summary": "..."}`;

        const summaryRaw = await callClaude(reportPrompt, undefined, 500);
        let summary = "";
        try {
          const parsed = JSON.parse(summaryRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
          summary = parsed.summary;
        } catch {
          summary = summaryRaw;
        }

        const reportHtml = `
          <h2>Monthly Report: ${client.business_name}</h2>
          <p><strong>Month:</strong> ${client.months_active || 1}</p>
          <table border="1" cellpadding="8" cellspacing="0">
            <tr><td>New Reviews</td><td>${reviewCount} (avg ${avgRating}⭐)</td></tr>
            <tr><td>GBP Posts</td><td>${postCount}</td></tr>
            <tr><td>Tracked Calls</td><td>${callCount}</td></tr>
            <tr><td>Est. Jobs</td><td>${estimatedJobs}</td></tr>
            <tr><td>Est. Revenue</td><td>$${estimatedRevenue}</td></tr>
            <tr><td>ROI</td><td>${roi}%</td></tr>
          </table>
          <h3>Summary</h3>
          <p>${summary}</p>`;

        try {
          await sendEmail(
            "tom@haildentpro.com",
            `Monthly Report: ${client.business_name}`,
            reportHtml
          );
        } catch {
          console.error(`Failed to send report for ${client.client_id}`);
        }

        // Increment months_active
        await query(
          "UPDATE clients SET months_active = COALESCE(months_active, 0) + 1 WHERE client_id = $1",
          [client.client_id]
        );

        summaries.push(`${client.business_name}: ${reviewCount} reviews, ${postCount} posts`);
      } catch (err) {
        console.error(`WF05 failed for ${client.client_id}:`, err);
      }
    }

    // Operator digest
    if (summaries.length > 0) {
      try {
        await sendEmail(
          "tom@haildentpro.com",
          `Monthly Report Digest — ${clients.length} clients`,
          `<h2>Monthly Digest</h2><ul>${summaries.map((s) => `<li>${s}</li>`).join("")}</ul>`
        );
      } catch {
        console.error("Failed to send operator digest");
      }
    }

    return { clients_reported: clients.length };
  },
});
