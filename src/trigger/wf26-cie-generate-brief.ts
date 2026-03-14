/**
 * WF26 CIE — Generate Brief
 * Location: src/trigger/wf26-cie-generate-brief.ts
 *
 * Uses Claude Sonnet (via callClaude) to produce an executive brief,
 * action items, content scripts, and client impact assessment from
 * classified intelligence items. Called via triggerAndWait().
 */

import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { callClaude } from "../lib/anthropic.js";

const classifiedItemSchema = z.object({
  title: z.string(),
  url: z.string(),
  description: z.string(),
  source: z.string(),
  relevanceScore: z.number(),
  category: z.string(),
  urgency: z.string(),
  actionability: z.string(),
});

const generateBriefInput = z.object({
  classifiedItems: z.array(classifiedItemSchema),
  scanType: z.enum(["sunday", "wednesday"]),
});

export interface ContentScript {
  title: string;
  script: string;
  platform: string;
}

export interface BriefOutput {
  brief: string;
  actionItems: string[];
  contentScripts: ContentScript[];
  clientImpact: string;
  generatedAt: string;
}

export const wf26CieGenerateBrief = schemaTask({
  id: "wf26-cie-generate-brief",
  schema: generateBriefInput,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    randomize: true,
  },
  run: async (payload): Promise<BriefOutput> => {
    const { classifiedItems, scanType } = payload;

    const itemsSummary = classifiedItems
      .map(
        (item, i) =>
          `${i + 1}. [${item.category}] (relevance: ${item.relevanceScore}/10, urgency: ${item.urgency}, actionability: ${item.actionability})
   Title: ${item.title}
   URL: ${item.url}
   Description: ${item.description}`
      )
      .join("\n\n");

    const prompt = `You are the Chief Intelligence Officer for "Maps Autopilot", a local SEO agency that manages Google Business Profiles, reviews, citations, and local search visibility for service-area businesses (home services, dental, auto repair, etc.).

SCAN TYPE: ${scanType} (${scanType === "sunday" ? "comprehensive weekly brief" : "mid-week update"})
ITEMS FOUND: ${classifiedItems.length}

CLASSIFIED INTELLIGENCE:
${itemsSummary}

Generate a complete intelligence brief with these sections:

1. EXECUTIVE BRIEF: 3-5 bullet points summarizing what matters this week. Be specific and actionable. Reference actual items.

2. ACTION ITEMS: Specific things to do for Maps Autopilot clients this week. Each should be concrete (e.g., "Update GBP categories for all dental clients to include new category X").

3. CONTENT SCRIPTS: 2-3 ready-to-record short video scripts (30-60 seconds each) for Tom (agency owner) to record for social media and client education. Each script should:
   - Have a catchy title
   - Be based on a trending topic from the scan
   - Include a hook, 2-3 key points, and a CTA
   - Specify target platform (TikTok, Instagram Reels, LinkedIn, YouTube Shorts)

4. CLIENT IMPACT ASSESSMENT: How these trends affect current clients. Group by urgency (immediate action needed, monitor this week, informational).

Return ONLY valid JSON. No markdown, no code fences.
{
  "brief": "• Bullet 1\\n• Bullet 2\\n• Bullet 3",
  "actionItems": ["Action 1", "Action 2"],
  "contentScripts": [
    {
      "title": "Script Title",
      "script": "Full 30-60 second script text",
      "platform": "TikTok"
    }
  ],
  "clientImpact": "Full impact assessment text"
}`;

    const rawResponse = await callClaude(prompt, undefined, 4096);

    let parsed: {
      brief: string;
      actionItems: string[];
      contentScripts: ContentScript[];
      clientImpact: string;
    };

    try {
      parsed = JSON.parse(
        rawResponse
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "")
          .trim()
      );
    } catch {
      console.error("WF26 generate-brief: failed to parse Claude response");
      parsed = {
        brief: "Failed to generate brief — raw scan data available in store.",
        actionItems: ["Review raw scan results manually"],
        contentScripts: [],
        clientImpact: "Unable to assess — generation failed.",
      };
    }

    return {
      brief: parsed.brief,
      actionItems: parsed.actionItems || [],
      contentScripts: parsed.contentScripts || [],
      clientImpact: parsed.clientImpact || "",
      generatedAt: new Date().toISOString(),
    };
  },
});
