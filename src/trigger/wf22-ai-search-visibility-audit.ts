import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { queryPerplexity } from "../lib/perplexity";
import { sendEmail } from "../lib/email";
import axios from "axios";

export const wf22AiSearchVisibilityAudit = task({
  id: "wf22-ai-search-visibility-audit",
  run: async (_payload: Record<string, unknown>) => {
    const { rows: clients } = await query(
      `SELECT c.*, nc.niche_name FROM clients c
       JOIN niche_configs nc ON c.niche_key = nc.niche_key
       WHERE c.status = 'active'`
    );

    for (const client of clients) {
      try {
        const city = client.city || client.service_area || "";
        const service = client.niche_name || client.niche_key;
        const searchQuery = `best ${service} in ${city}`;

        // Check Perplexity
        let perplexityVisible = false;
        let citedUrls: string[] = [];
        try {
          const perplexityResult = await queryPerplexity(searchQuery);
          perplexityVisible =
            perplexityResult.toLowerCase().includes(client.business_name.toLowerCase()) ||
            (client.website && perplexityResult.includes(client.website));
          const urlMatches = perplexityResult.match(/https?:\/\/[^\s)]+/g) || [];
          citedUrls = urlMatches;
        } catch {
          console.error("Perplexity check failed");
        }

        // Check Brave Search
        let braveVisible = false;
        try {
          const braveUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}`;
          const { data } = await axios.get(braveUrl, {
            headers: { "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY || "" },
            timeout: 10000,
          });
          const results = data.web?.results || [];
          braveVisible = results.some(
            (r: Record<string, string>) =>
              r.title?.toLowerCase().includes(client.business_name.toLowerCase()) ||
              r.url?.includes(client.website || "___none___")
          );
        } catch {
          console.error("Brave search check failed");
        }

        // Score
        let visibilityScore = 0;
        if (perplexityVisible) visibilityScore += 40;
        if (braveVisible) visibilityScore += 30;
        if (citedUrls.some((u) => u.includes(client.website || "___none___")))
          visibilityScore += 30;

        await query(
          `INSERT INTO ai_search_audits (client_id, perplexity_visible, brave_visible, chatgpt_visible,
           visibility_score, cited_urls, recommendations, audit_date)
           VALUES ($1, $2, $3, false, $4, $5, $6, NOW())`,
          [
            client.client_id,
            perplexityVisible,
            braveVisible,
            visibilityScore,
            JSON.stringify(citedUrls),
            JSON.stringify(
              visibilityScore < 50
                ? [
                    "Add FAQ sections to website with question/answer format",
                    "Create content that directly answers common search queries",
                    "Ensure NAP data is consistent across all platforms",
                    "Add structured data (JSON-LD) to website",
                  ]
                : ["Maintain current content strategy", "Continue publishing helpful Q&A content"]
            ),
          ]
        );

        if (visibilityScore < 50) {
          try {
            await sendEmail(
              "tom@haildentpro.com",
              `AI Visibility Alert: ${client.business_name} (${visibilityScore}/100)`,
              `<h2>AI Search Visibility: ${client.business_name}</h2>
               <p>Score: <strong>${visibilityScore}/100</strong></p>
               <ul>
                 <li>Perplexity: ${perplexityVisible ? "✅ Visible" : "❌ Not found"}</li>
                 <li>Brave Search: ${braveVisible ? "✅ Visible" : "❌ Not found"}</li>
               </ul>
               <h3>Recommendations</h3>
               <ul>
                 <li>Add FAQ sections to website</li>
                 <li>Create Q&A-format content for GBP</li>
                 <li>Ensure consistent NAP data</li>
                 <li>Add JSON-LD structured data</li>
               </ul>`
            );
          } catch {
            console.error("Failed to send AI visibility email");
          }
        }
      } catch (err) {
        console.error(`WF22 failed for ${client.client_id}:`, err);
      }
    }

    return { clients_audited: clients.length };
  },
});
