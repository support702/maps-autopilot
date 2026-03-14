import { schedules } from "@trigger.dev/sdk/v3";
import { query } from "../lib/db";
import { callClaude } from "../lib/anthropic";
import { generateImage, overlayText } from "../lib/images";
import { publishGBPPost } from "../lib/latedev";

const POST_TYPES: Record<number, string> = {
  1: "educational_faq",
  3: "service_spotlight",
  5: "behind_the_scenes",
};

const SEASONS: Record<number, string> = {
  0: "winter", 1: "winter", 2: "spring", 3: "spring", 4: "spring",
  5: "summer", 6: "summer", 7: "summer", 8: "fall", 9: "fall",
  10: "fall", 11: "winter",
};

export const wf02ContentEngine = schedules.task({
  id: "wf02-content-engine",
  cron: "0 14 * * 1,3,5",
  run: async () => {
    const { rows: clients } = await query(
      `SELECT c.*, nc.niche_name, nc.content_topics, nc.seasonal_calendar, nc.post_templates, nc.industry_terms
       FROM clients c
       JOIN niche_configs nc ON c.niche_key = nc.niche_key
       WHERE c.status = 'active'`
    );

    const now = new Date();
    const dayOfWeek = now.getDay();
    const month = now.getMonth();
    const postType = POST_TYPES[dayOfWeek] || "educational_faq";
    const season = SEASONS[month] || "winter";
    const postDate = now.toISOString().split("T")[0];
    const currentMonth = now.toLocaleString("en-US", { month: "long" });

    const results: Array<{ client_id: string; success: boolean; error?: string }> = [];

    for (const client of clients) {
      try {
        const seasonalCalendar = client.seasonal_calendar || {};
        const seasonalContext = seasonalCalendar[season] || "Use general seasonal context";

        const utmUrl = client.website
          ? `${client.website}?utm_source=google&utm_medium=gbp&utm_campaign=${postType}&utm_content=${postDate}`
          : "";

        const contentPrompt = `Write a Google Business Profile post for ${client.business_name}, a ${client.niche_name} in ${client.service_area || client.city || ""}.

POST TYPE: ${postType}
CURRENT MONTH: ${currentMonth}
SEASON: ${season}

SEASONAL CONTEXT:
${seasonalContext}

SERVICES: ${client.services || ""}
USP: ${client.unique_selling_points || ""}
PHONE: ${client.phone || ""}

CONTENT RULES:
- 150-300 words
- First sentence MUST state the service + city name
- Include phone number as primary CTA
- NO sales fluff, NO "We're the best!", NO generic marketing
- Write factual, specific, helpful content that answers real questions
- Include specific data points, numbers, or timelines
- For Monday FAQ: start with question, answer directly
- For Wednesday service: list what's included, when needed, timeline
- For Friday behind-scenes: human story with specific details

UTM LINK: ${utmUrl}

GRAPHIC TEXT:
- TEXT OVERLAY: 5-8 words, ALL CAPS
- SUBTITLE: 3-5 words

Content must be useful to both humans AND AI systems (ChatGPT, Gemini).
Include 3-5 relevant hashtags.

CRITICAL: Return ONLY raw JSON. No markdown, no code fences.
{
  "post_text": "full post content",
  "graphic_overlay": "5-8 WORD HEADLINE",
  "graphic_subtitle": "3-5 words",
  "image_prompt": "descriptive prompt for Kie.ai image generation",
  "utm_url": "full UTM-tagged URL"
}`;

        const contentRaw = await callClaude(contentPrompt, undefined, 1500);
        let content: Record<string, string>;
        try {
          content = JSON.parse(contentRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
        } catch {
          // Retry with explicit JSON request
          const retryRaw = await callClaude(
            contentPrompt + "\n\nReturn ONLY valid JSON.",
            undefined,
            1500
          );
          content = JSON.parse(retryRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
        }

        // Get photo — try client_photos first, then client.photo_url, then generate
        let imageUrl: string | null = null;

        const { rows: photos } = await query(
          "SELECT photo_url FROM client_photos WHERE client_id = $1 AND active = true ORDER BY RANDOM() LIMIT 1",
          [client.client_id]
        );
        if (photos[0]?.photo_url) {
          imageUrl = photos[0].photo_url;
        } else if (client.photo_url) {
          imageUrl = client.photo_url;
        }

        // If no client photo, generate via Kie.ai
        if (!imageUrl) {
          try {
            imageUrl = await generateImage(content.image_prompt);
          } catch (imgErr) {
            console.error(`Kie.ai failed for ${client.client_id}:`, imgErr);
          }
        }

        // Bannerbear text overlay
        let finalImageUrl = imageUrl;
        if (imageUrl) {
          try {
            finalImageUrl = await overlayText(
              imageUrl,
              content.graphic_overlay,
              client.business_name
            );
          } catch (bbErr) {
            console.error(`Bannerbear failed for ${client.client_id}:`, bbErr);
            finalImageUrl = imageUrl;
          }
        }

        // Post to GBP via Late.dev
        let postId = "";
        if (client.late_account_id) {
          try {
            const result = await publishGBPPost(
              client.late_account_id,
              content.post_text,
              finalImageUrl || undefined
            );
            postId = result.postId;
          } catch (postErr) {
            console.error(`Late.dev publish failed for ${client.client_id}:`, postErr);
          }
        }

        // Log to DB
        await query(
          `INSERT INTO published_content (client_id, content_text, image_url, post_type, gbp_post_id, publish_date, utm_campaign)
           VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
          [client.client_id, content.post_text, finalImageUrl, postType, postId, postType]
        );

        results.push({ client_id: client.client_id, success: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`WF02 failed for ${client.client_id}:`, message);
        await query(
          `INSERT INTO system_alerts (alert_type, severity, source_workflow, affected_client_id, message)
           VALUES ('content_publish_failed', 'warning', 'wf02', $1, $2)`,
          [client.client_id, message]
        );
        results.push({ client_id: client.client_id, success: false, error: message });
      }
    }

    return { processed: results.length, results };
  },
});
