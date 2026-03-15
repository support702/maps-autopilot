import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { sendEmail } from "../lib/email";

export const wf18GbpCompletenessAudit = task({
  id: "wf18-gbp-completeness-audit",
  run: async (_payload: Record<string, unknown>) => {
    const { rows: clients } = await query(
      "SELECT * FROM clients WHERE status = 'active'"
    );

    const needsAttention: Array<{ name: string; score: number; missing: string[] }> = [];

    for (const client of clients) {
      try {
        const missing: string[] = [];
        let score = 0;

        // Photos (20%)
        const { rows: [photoCount] } = await query(
          "SELECT COUNT(*) as cnt FROM client_photos WHERE client_id = $1 AND active = true",
          [client.client_id]
        );
        if (Number(photoCount.cnt) >= 5) score += 20;
        else if (Number(photoCount.cnt) > 0) score += 10;
        else missing.push("No photos uploaded");

        // Business hours — check if GBP location configured (15%)
        if (client.gbp_location_id) score += 15;
        else missing.push("GBP location not linked");

        // Description (15%)
        if (client.unique_selling_points) score += 15;
        else missing.push("No business description/USP");

        // Products (20%)
        const { rows: [prodCount] } = await query(
          "SELECT COUNT(*) as cnt FROM gbp_products WHERE client_id = $1 AND status = 'published'",
          [client.client_id]
        );
        if (Number(prodCount.cnt) >= 5) score += 20;
        else if (Number(prodCount.cnt) > 0) score += 10;
        else missing.push("No GBP products published");

        // Q&A (15%)
        if (client.gbp_category_analysis) {
          try {
            const analysis = typeof client.gbp_category_analysis === "string"
              ? JSON.parse(client.gbp_category_analysis)
              : client.gbp_category_analysis;
            if (analysis.qa_topics?.length > 0) score += 15;
            else missing.push("No Q&A seeded");
          } catch {
            missing.push("No Q&A seeded");
          }
        } else {
          missing.push("No Q&A seeded");
        }

        // Posts (15%)
        const { rows: [postCount] } = await query(
          `SELECT COUNT(*) as cnt FROM published_content
           WHERE client_id = $1 AND publish_date > NOW() - INTERVAL '30 days'`,
          [client.client_id]
        );
        if (Number(postCount.cnt) >= 8) score += 15;
        else if (Number(postCount.cnt) > 0) score += 8;
        else missing.push("No recent GBP posts");

        const prevScore = client.gbp_completeness_score || 0;

        await query(
          `UPDATE clients SET gbp_completeness_score = $1, gbp_completeness_audit = $2, gbp_last_audit = NOW()
           WHERE client_id = $3`,
          [score, JSON.stringify({ score, missing, previous_score: prevScore }), client.client_id]
        );

        if (score < 80 || score < prevScore) {
          needsAttention.push({ name: client.business_name, score, missing });
        }
      } catch (err) {
        console.error(`WF18 failed for ${client.client_id}:`, err);
      }
    }

    if (needsAttention.length > 0) {
      try {
        await sendEmail(
          "tom@haildentpro.com",
          `GBP Audit: ${needsAttention.length} profiles need work`,
          `<h2>GBP Completeness Audit</h2>
           ${needsAttention
             .map(
               (c) =>
                 `<h3>${c.name} — ${c.score}%</h3>
                  <ul>${c.missing.map((m) => `<li>${m}</li>`).join("")}</ul>`
             )
             .join("")}`
        );
      } catch {
        console.error("Failed to send GBP audit email");
      }
    }

    return { audited: clients.length, needs_attention: needsAttention.length };
  },
});
