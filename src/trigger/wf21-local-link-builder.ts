import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { callClaude } from "../lib/anthropic";
import { sendEmail } from "../lib/email";

export const wf21LocalLinkBuilder = task({
  id: "wf21-local-link-builder",
  run: async (_payload: Record<string, unknown>) => {
    const { rows: clients } = await query(
      `SELECT c.*, nc.niche_name FROM clients c
       JOIN niche_configs nc ON c.niche_key = nc.niche_key
       WHERE c.status = 'active' AND (c.service_tier = 'premium' OR c.tier = 'premium')`
    );

    for (const client of clients) {
      try {
        const city = client.city || client.service_area || "";

        const linkPrompt = `Find 5 local link building opportunities for ${client.business_name}, a ${client.niche_name} in ${city}.

Consider:
- Local chamber of commerce
- Industry associations
- Local sponsorship opportunities
- Community organizations
- Local news/blog opportunities

For each opportunity, provide:
1. Source name
2. Estimated URL pattern
3. Opportunity type (directory/sponsorship/guest-post/partnership)
4. Draft outreach email (3-4 sentences, professional, specific)

Return JSON:
[{"source_name": "", "source_url": "", "opportunity_type": "", "outreach_email": ""}]`;

        const linkRaw = await callClaude(linkPrompt, undefined, 2000);
        let opportunities: Array<Record<string, string>> = [];
        try {
          opportunities = JSON.parse(linkRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
        } catch {
          opportunities = [];
        }

        for (const opp of opportunities) {
          await query(
            `INSERT INTO link_opportunities (client_id, source_name, source_url, opportunity_type, outreach_email_draft, status)
             VALUES ($1, $2, $3, $4, $5, 'identified')`,
            [client.client_id, opp.source_name, opp.source_url, opp.opportunity_type, opp.outreach_email]
          );
        }

        if (opportunities.length > 0) {
          await sendEmail(
            "tom@haildentpro.com",
            `Link Opportunities: ${client.business_name} (${opportunities.length} found)`,
            `<h2>Local Link Building: ${client.business_name}</h2>
             ${opportunities.map(
               (o) =>
                 `<h3>${o.source_name} (${o.opportunity_type})</h3>
                  <p><strong>URL:</strong> ${o.source_url}</p>
                  <p><strong>Draft Email:</strong></p>
                  <blockquote>${o.outreach_email}</blockquote>`
             ).join("<hr>")}`
          );
        }
      } catch (err) {
        console.error(`WF21 failed for ${client.client_id}:`, err);
      }
    }

    return { clients_processed: clients.length };
  },
});
