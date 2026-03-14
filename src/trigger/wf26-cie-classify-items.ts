/**
 * WF26 CIE — Classify Items
 * Location: src/trigger/wf26-cie-classify-items.ts
 *
 * Uses Claude Haiku to classify scanned content items by relevance,
 * category, urgency, and actionability. Filters to items scoring >= 6.
 * Called by the Sunday/Wednesday orchestrators via triggerAndWait().
 */

import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

const scanItemSchema = z.object({
  title: z.string(),
  url: z.string(),
  description: z.string(),
  source: z.string(),
});

const classifyInput = z.object({
  items: z.array(scanItemSchema),
  scanType: z.enum(["sunday", "wednesday"]),
});

export interface ClassifiedItem {
  title: string;
  url: string;
  description: string;
  source: string;
  relevanceScore: number;
  category: string;
  urgency: string;
  actionability: string;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const wf26CieClassifyItems = schemaTask({
  id: "wf26-cie-classify-items",
  schema: classifyInput,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    randomize: true,
  },
  run: async (payload): Promise<ClassifiedItem[]> => {
    const { items, scanType } = payload;

    if (items.length === 0) {
      return [];
    }

    const itemsList = items
      .map(
        (item, i) =>
          `${i + 1}. Title: ${item.title}\n   URL: ${item.url}\n   Description: ${item.description}\n   Source: ${item.source}`
      )
      .join("\n\n");

    const prompt = `You are a local SEO intelligence analyst for a Maps/GBP marketing agency called "Maps Autopilot".

Classify each item below for relevance to a local SEO agency managing Google Business Profiles, reviews, citations, and local search visibility.

SCAN TYPE: ${scanType} (${scanType === "sunday" ? "comprehensive weekly scan" : "mid-week update check"})

ITEMS TO CLASSIFY:
${itemsList}

For each item, provide:
- relevance_score: 1-10 (10 = directly impacts our clients' local SEO)
- category: one of [algorithm_update, gbp_feature, ai_search, content_strategy, review_management, competitor_intel, industry_news]
- urgency: one of [immediate, this_week, informational]
- actionability: one of [high, medium, low]

Return ONLY valid JSON array. No markdown, no code fences.
[
  {
    "index": 1,
    "relevance_score": 8,
    "category": "algorithm_update",
    "urgency": "immediate",
    "actionability": "high"
  }
]`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system:
        "You are a local SEO intelligence classifier. Return only valid JSON arrays.",
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    const rawText = block.type === "text" ? block.text : "[]";

    let classifications: Array<{
      index: number;
      relevance_score: number;
      category: string;
      urgency: string;
      actionability: string;
    }>;

    try {
      classifications = JSON.parse(
        rawText
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "")
          .trim()
      );
    } catch {
      console.error("WF26 classify: failed to parse Claude response");
      return [];
    }

    const classifiedItems: ClassifiedItem[] = classifications
      .filter((c) => c.relevance_score >= 6)
      .map((c) => {
        const originalItem = items[c.index - 1];
        if (!originalItem) return null;
        return {
          title: originalItem.title,
          url: originalItem.url,
          description: originalItem.description,
          source: originalItem.source,
          relevanceScore: c.relevance_score,
          category: c.category,
          urgency: c.urgency,
          actionability: c.actionability,
        };
      })
      .filter((item): item is ClassifiedItem => item !== null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    return classifiedItems;
  },
});
