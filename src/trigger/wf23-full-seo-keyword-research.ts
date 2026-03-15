import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { callClaude } from "../lib/anthropic";
import { queryPerplexity } from "../lib/perplexity";
import { sendEmail } from "../lib/email";

interface KeywordResearchPayload {
  client_id: string;
  target_city: string;
  niche_key: string;
}

export const wf23FullSeoKeywordResearch = task({
  id: "wf23-full-seo-keyword-research",
  retry: { maxAttempts: 2 },
  run: async (payload: KeywordResearchPayload) => {
    const { rows: [client] } = await query(
      "SELECT * FROM clients WHERE client_id = $1",
      [payload.client_id]
    );
    if (!client) throw new Error(`Client not found: ${payload.client_id}`);

    const { rows: [niche] } = await query(
      "SELECT * FROM niche_configs WHERE niche_key = $1",
      [payload.niche_key]
    );

    // Research via Perplexity
    const localData = await queryPerplexity(
      `What are the most searched ${niche?.niche_name || payload.niche_key} services in ${payload.target_city} and surrounding suburbs? Include specific neighborhoods, zip codes, and nearby cities within 15 miles.`
    );

    const keywordPrompt = `Generate a comprehensive local SEO keyword research for a ${niche?.niche_name || payload.niche_key} business in ${payload.target_city}.

LOCAL RESEARCH DATA:
${localData}

SERVICES: ${client.services || ""}

Generate:
1. 50 target keywords with intent classification (informational/transactional/navigational)
2. 12 location pages needed (target city + surrounding suburbs)
3. 6-month content calendar (2 pieces per week)

Return JSON:
{
  "target_keywords": [{"keyword": "", "intent": "", "volume_estimate": "", "difficulty": ""}],
  "location_pages": [{"city": "", "slug": "", "primary_keyword": ""}],
  "content_calendar": [{"month": 1, "topics": [{"title": "", "type": "", "target_keyword": ""}]}]
}`;

    const researchRaw = await callClaude(keywordPrompt, undefined, 4096);
    let research: Record<string, unknown>;
    try {
      research = JSON.parse(researchRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    } catch {
      research = { target_keywords: [], location_pages: [], content_calendar: [] };
    }

    // Save to seo_strategies
    await query(
      `INSERT INTO seo_strategies (client_id, target_keywords, location_pages, content_calendar)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (client_id) DO UPDATE SET
         target_keywords = $2, location_pages = $3, content_calendar = $4, updated_at = NOW()`,
      [
        payload.client_id,
        JSON.stringify(research.target_keywords),
        JSON.stringify(research.location_pages),
        JSON.stringify(research.content_calendar),
      ]
    );

    // Queue location pages in content_queue
    const locationPages = (research.location_pages as Array<Record<string, string>>) || [];
    for (const page of locationPages) {
      await query(
        `INSERT INTO content_queue (client_id, page_title, target_keyword, target_city, slug, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         ON CONFLICT DO NOTHING`,
        [
          payload.client_id,
          `${page.primary_keyword} in ${page.city}`,
          page.primary_keyword,
          page.city,
          page.slug,
        ]
      );
    }

    // Email AM
    try {
      await sendEmail(
        "tom@haildentpro.com",
        `SEO Strategy: ${client.business_name}`,
        `<h2>Full SEO Keyword Research: ${client.business_name}</h2>
         <p><strong>Keywords:</strong> ${((research.target_keywords as unknown[]) || []).length}</p>
         <p><strong>Location Pages:</strong> ${locationPages.length}</p>
         <p><strong>Content Calendar:</strong> 6 months planned</p>
         <h3>Top Location Pages to Build</h3>
         <ol>${locationPages.slice(0, 5).map((p) => `<li>${p.primary_keyword} in ${p.city}</li>`).join("")}</ol>`
      );
    } catch {
      console.error("Failed to send SEO research email");
    }

    return { success: true, keywords: ((research.target_keywords as unknown[]) || []).length, pages_queued: locationPages.length };
  },
});
