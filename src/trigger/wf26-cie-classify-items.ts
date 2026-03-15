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

    // Use different classification logic for Wednesday (community) vs Sunday (news)
    const prompt = scanType === "wednesday" 
      ? `You are a content strategist for Reverse Engineers Media, a local SEO agency that helps mechanic shops, HVAC companies, and dental practices dominate Google Maps.

You are scanning community forums and Reddit for content opportunities.

Your goal is NOT to find SEO news — the Sunday scan handles that. Your goal is to find CONVERSATIONS that reveal what local business owners actually think, believe, fear, and argue about regarding their online presence.

You are looking for 6 specific content angles:

## ANGLE 1: CONTRARIAN / "EVERYONE'S WRONG"
Threads where business owners express strong opinions that are partially or fully wrong.
Examples: "SEO is a complete scam", "Google reviews are all fake anyway", "Just do word of mouth, online doesn't matter", "AI is going to kill Google"
Score HIGH when: the thread has lots of engagement (upvotes, comments, debate), the wrong belief is widely held, and the correction can be delivered with empathy not condescension.

## ANGLE 2: "I RAN THE NUMBERS"  
Threads where business owners are confused about ROI, costs, or the financial impact of online presence.
Examples: "Is paying $500/month for SEO worth it?", "How many calls does being #1 on Google actually bring?", "My competitor has way more reviews but I do better work"
Score HIGH when: specific dollar amounts, call counts, or ROI questions are discussed.

## ANGLE 3: AGENCY HORROR STORIES / EXPOSÉ
Threads where business owners share bad experiences with SEO agencies or marketing companies.
Examples: "I paid $2,000/month for 6 months and got nothing", "My agency won't show me what they're doing", "Are all SEO companies scams?"
Score HIGH when: specific details about what went wrong, dollar amounts, timeframes mentioned.

## ANGLE 4: "LET ME SHOW YOU" / PROOF-BASED
Threads where business owners are skeptical and need visual proof to believe something works.
Examples: "Does Google Maps optimization actually work?", "What does a good Google Business Profile look like?", "How do I get more reviews?"
Score HIGH when: the question can be answered with a screen recording or visual demonstration.

## ANGLE 5: AI SEARCH / FUTURE SHOCK
Threads where business owners are unaware of or confused about AI search (ChatGPT, Gemini, Siri recommendations).
Examples: "Does anyone use ChatGPT to find local businesses?", "Is Google going to be replaced by AI?"
Score HIGH when: the topic involves AI search, voice search, or changing customer behavior.

## ANGLE 6: NICHE-SPECIFIC PAIN POINTS
Threads from mechanic/HVAC/dental forums about business challenges that tie back to online presence.
Examples: "Slow season is killing us", "How do I compete with the chain shops?", "Customers only call for price quotes"
Score HIGH when: the pain point can be reframed as an online visibility problem, even if the poster doesn't see it that way.

ITEMS TO CLASSIFY:
${itemsList}

For each item, output:
- index: item number
- angle: one of [contrarian, numbers, exposé, proof, ai_future, niche_pain, none]
- severity: one of [RED, YELLOW, GREEN] (RED=massively viral 100+ comments, YELLOW=good engagement, GREEN=low engagement)
- content_potential: one of [HIGH, MEDIUM, LOW]
- debate_score: 1-10 (how much engagement/disagreement in the thread)
- emotional_charge: 1-10 (how frustrated/passionate are the posters)
- filmability: 1-10 (how easily this becomes a 60-second video)
- hook_suggestion: "First 3 seconds of the video"
- contrarian_take: "The angle that challenges the prevailing opinion"
- audience_relevance: 1-10 (how much would a local business owner care)
- relevance_score: (debate_score + emotional_charge + filmability) / 3

RULES:
- Ignore threads that are purely technical SEO (that's for SEO practitioners, not business owners)
- Ignore threads older than 14 days
- Ignore threads with fewer than 5 comments (not enough signal)
- Prefer threads where the BUSINESS OWNER is talking, not an SEO professional
- The best content comes from threads where someone is WRONG but RELATABLE

Return ONLY valid JSON array sorted by relevance_score descending. No markdown, no code fences.
[
  {
    "index": 1,
    "angle": "contrarian",
    "severity": "YELLOW",
    "content_potential": "HIGH",
    "debate_score": 8,
    "emotional_charge": 7,
    "filmability": 9,
    "hook_suggestion": "You think SEO is dead? I ran the numbers...",
    "contrarian_take": "SEO isn't dead, but 80% of agencies are doing it wrong",
    "audience_relevance": 9,
    "relevance_score": 8
  }
]`
      : `You are a local SEO intelligence analyst for a Maps/GBP marketing agency called "Maps Autopilot".

Classify each item below for relevance to a local SEO agency managing Google Business Profiles, reviews, citations, and local search visibility.

SCAN TYPE: ${scanType} (comprehensive weekly scan)

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

    let classifications: any[];

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

    // For Wednesday community scans, map the extended fields to standard format
    const classifiedItems: ClassifiedItem[] = classifications
      .filter((c) => {
        if (scanType === "wednesday") {
          return c.content_potential === "HIGH" || c.content_potential === "MEDIUM";
        }
        return c.relevance_score >= 6;
      })
      .map((c) => {
        const originalItem = items[c.index - 1];
        if (!originalItem) return null;
        
        if (scanType === "wednesday") {
          // Wednesday community format
          return {
            title: originalItem.title,
            url: originalItem.url,
            description: originalItem.description,
            source: originalItem.source,
            relevanceScore: c.relevance_score || c.audience_relevance || 7,
            category: c.angle || "community_question",
            urgency: c.severity === "RED" ? "immediate" : c.severity === "YELLOW" ? "this_week" : "informational",
            actionability: c.content_potential === "HIGH" ? "high" : c.content_potential === "MEDIUM" ? "medium" : "low",
          };
        } else {
          // Sunday news format
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
        }
      })
      .filter((item): item is ClassifiedItem => item !== null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    return classifiedItems;
  },
});
