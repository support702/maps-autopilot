import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { callClaude } from "../lib/anthropic";
import { queryPerplexity } from "../lib/perplexity";
import { sendEmail } from "../lib/email";

export const wf17ContentGapAnalysis = task({
  id: "wf17-content-gap-analysis",
  run: async (_payload: Record<string, unknown>) => {
    const { rows: clients } = await query(
      `SELECT c.*, nc.niche_name FROM clients c
       JOIN niche_configs nc ON c.niche_key = nc.niche_key
       WHERE c.status = 'active' AND (c.service_tier = 'premium' OR c.tier = 'premium')`
    );

    for (const client of clients) {
      try {
        const city = client.city || client.service_area || "";

        // Research trending queries via Perplexity
        const trendingData = await queryPerplexity(
          `What are the top questions people search for about ${client.niche_name || client.niche_key} services in ${city} right now? List 15-20 specific search queries.`
        );

        // Get existing content topics
        const { rows: existingContent } = await query(
          `SELECT DISTINCT post_type, content_text FROM published_content
           WHERE client_id = $1 ORDER BY publish_date DESC LIMIT 30`,
          [client.client_id]
        );

        const existingTopics = existingContent
          .map((c) => (c.content_text || "").substring(0, 100))
          .join("\n");

        // Claude gap analysis
        const gapPrompt = `Analyze content gaps for ${client.business_name} (${client.niche_name}) in ${city}.

TRENDING QUERIES:
${trendingData}

EXISTING CONTENT TOPICS (last 30 posts):
${existingTopics || "No existing content found"}

Identify gaps (topics not yet covered) and prioritize by search intent.
Return JSON:
{
  "trending_queries": ["query1", "query2"],
  "gaps_identified": [{"topic": "", "priority": "high/medium/low", "search_intent": ""}],
  "recommended_topics": [{"title": "", "post_type": "", "reason": ""}]
}`;

        const gapRaw = await callClaude(gapPrompt, undefined, 2000);
        let gapResult: Record<string, unknown>;
        try {
          gapResult = JSON.parse(gapRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
        } catch {
          gapResult = { trending_queries: [], gaps_identified: [], recommended_topics: [] };
        }

        // Save report
        await query(
          `INSERT INTO content_gap_reports (client_id, trending_queries, gaps_identified, recommended_topics)
           VALUES ($1, $2, $3, $4)`,
          [
            client.client_id,
            JSON.stringify(gapResult.trending_queries),
            JSON.stringify(gapResult.gaps_identified),
            JSON.stringify(gapResult.recommended_topics),
          ]
        );

        // Email AM
        const topics = (gapResult.recommended_topics as Array<Record<string, string>>) || [];
        await sendEmail(
          "tom@haildentpro.com",
          `Content Gaps: ${client.business_name}`,
          `<h2>Content Gap Analysis: ${client.business_name}</h2>
           <h3>Recommended Topics for Next Month</h3>
           <ol>${topics.map((t) => `<li><strong>${t.title}</strong> (${t.post_type}) — ${t.reason}</li>`).join("")}</ol>`
        );
      } catch (err) {
        console.error(`WF17 failed for ${client.client_id}:`, err);
      }
    }

    return { clients_analyzed: clients.length };
  },
});
