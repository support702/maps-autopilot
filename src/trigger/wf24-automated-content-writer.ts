import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { callClaude } from "../lib/anthropic";
import { queryPerplexity } from "../lib/perplexity";
import axios from "axios";

export const wf24AutomatedContentWriter = task({
  id: "wf24-automated-content-writer",
  run: async (_payload: Record<string, unknown>) => {
    const { rows: clients } = await query(
      `SELECT * FROM clients
       WHERE status = 'active' AND (service_tier = 'full_seo' OR tier = 'full_seo')
       AND wp_url IS NOT NULL AND wp_username IS NOT NULL`
    );

    const results: Array<{ client_id: string; page?: string; success: boolean }> = [];

    for (const client of clients) {
      try {
        // Get next pending page from content queue
        const { rows: [page] } = await query(
          `SELECT * FROM content_queue
           WHERE client_id = $1 AND status = 'pending'
           ORDER BY created_at ASC LIMIT 1`,
          [client.client_id]
        );
        if (!page) {
          results.push({ client_id: client.client_id, success: true });
          continue;
        }

        // Update status to in_progress
        await query("UPDATE content_queue SET status = 'in_progress' WHERE id = $1", [page.id]);

        // Research local data via Perplexity
        let localData = "";
        try {
          localData = await queryPerplexity(
            `What are the key landmarks, neighborhoods, demographics, and local facts about ${page.target_city}? Include population, notable areas, and community details.`
          );
        } catch {
          localData = "Local research unavailable";
        }

        const { rows: [niche] } = await query(
          "SELECT * FROM niche_configs WHERE niche_key = $1",
          [client.niche_key]
        );

        // Generate content with Claude
        const contentPrompt = `Write a 1,500-2,000 word location page for a ${niche?.niche_name || client.niche_key} business.
Target keyword: "${page.target_keyword} in ${page.target_city}"
Business: ${client.business_name}
Local data from research: ${localData}

Requirements:
- H1: Include exact keyword
- Include 3-4 H2 sections
- FAQ section at the bottom (5 questions, LLM-optimized format)
- Include local landmarks/neighborhoods naturally
- Include business name, phone, address in schema-friendly format
- No fluff, no sales copy — factual, direct, helpful
- Format for AI search (ChatGPT, Gemini, Perplexity citations)

Return: {"title": "...", "html_content": "full HTML"}`;

        const contentRaw = await callClaude(contentPrompt, undefined, 4096);
        let contentResult: Record<string, string>;
        try {
          contentResult = JSON.parse(contentRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
        } catch {
          contentResult = { title: page.page_title, html_content: contentRaw };
        }

        // Post to WordPress
        let wordpressPostId: number | null = null;
        let publishedUrl: string | null = null;
        try {
          const wpAuth = Buffer.from(
            `${client.wp_username}:${client.wp_app_password}`
          ).toString("base64");

          const { data: wpPost } = await axios.post(
            `${client.wp_url}/wp-json/wp/v2/pages`,
            {
              title: contentResult.title,
              content: contentResult.html_content,
              status: "publish",
              slug: page.slug || page.target_keyword.toLowerCase().replace(/\s+/g, "-"),
            },
            {
              headers: { Authorization: `Basic ${wpAuth}` },
              timeout: 30000,
            }
          );
          wordpressPostId = wpPost.id;
          publishedUrl = wpPost.link;
        } catch (wpErr) {
          console.error(`WordPress publish failed for ${client.client_id}:`, wpErr);
        }

        // Update content queue
        await query(
          `UPDATE content_queue SET status = $1, wordpress_post_id = $2, published_url = $3, published_at = NOW()
           WHERE id = $4`,
          [
            wordpressPostId ? "published" : "failed",
            wordpressPostId,
            publishedUrl,
            page.id,
          ]
        );

        // Log to published_content
        if (wordpressPostId) {
          await query(
            `INSERT INTO published_content (client_id, content_text, post_type, publish_date)
             VALUES ($1, $2, 'location_page', NOW())`,
            [client.client_id, contentResult.title]
          );
        }

        results.push({
          client_id: client.client_id,
          page: contentResult.title,
          success: !!wordpressPostId,
        });
      } catch (err) {
        console.error(`WF24 failed for ${client.client_id}:`, err);
        results.push({ client_id: client.client_id, success: false });
      }
    }

    return { processed: results.length, results };
  },
});
