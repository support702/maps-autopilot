/**
 * WF28 Creative Intelligence — Analyze Tier 2
 * Light competitive intelligence using Claude Haiku for Tier 2 "Monitor" accounts.
 * Tracks: offers, claims, angles, positioning shifts.
 */

import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import type { AdData } from "./wf28-creative-intel-scan-account.js";

const analyzeTier2Input = z.object({
  advertiser_id: z.number(),
  page_name: z.string(),
  ads: z.array(z.any()),
  scan_date: z.string(),
});

export interface Tier2Analysis {
  advertiser_id: number;
  scan_date: string;
  primary_offers: string[];
  claims_made: string[];
  angles_pushed: string[];
  positioning_notes: string;
  new_ads_count: number;
  actionable_insights: string[];
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const wf28CreativeIntelAnalyzeTier2 = schemaTask({
  id: "wf28-creative-intel-analyze-tier2",
  schema: analyzeTier2Input,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    randomize: true,
  },
  run: async (payload): Promise<Tier2Analysis> => {
    const { advertiser_id, page_name, ads, scan_date } = payload;

    if (ads.length === 0) {
      return {
        advertiser_id,
        scan_date,
        primary_offers: [],
        claims_made: [],
        angles_pushed: [],
        positioning_notes: "No ads",
        new_ads_count: 0,
        actionable_insights: [],
      };
    }

    const adsSummary = ads.slice(0, 30).map((ad: AdData, i: number) => {
      const copy = ad.ad_copy.join(" | ");
      const headline = ad.headlines[0] || "No headline";
      return `Ad ${i + 1}: ${headline} — ${copy.substring(0, 200)}`;
    }).join("\n");

    const prompt = `Competitive intelligence for **${page_name}** (competitor):

${ads.length} active ads. Sample:
${adsSummary}

Extract:
1. Primary offers (what are they selling?)
2. Claims made (guarantees, promises, results)
3. Angles pushed (pain points, benefits, positioning)
4. Positioning notes (how do they position vs competitors?)
5. New ads count (ads created in last 7 days: ${ads.filter((a: AdData) => a.days_running <= 7).length})
6. Actionable insights (3-5 things we should watch or counter)

Return JSON:
{
  "primary_offers": ["offer1"],
  "claims_made": ["claim1"],
  "angles_pushed": ["angle1"],
  "positioning_notes": "notes",
  "new_ads_count": X,
  "actionable_insights": ["insight1"]
}`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    const rawText = block.type === "text" ? block.text : "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(rawText.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    } catch {
      parsed = {
        primary_offers: [],
        claims_made: [],
        angles_pushed: [],
        positioning_notes: "Parse error",
        new_ads_count: ads.filter((a: AdData) => a.days_running <= 7).length,
        actionable_insights: [],
      };
    }

    return {
      advertiser_id,
      scan_date,
      ...parsed,
    };
  },
});
