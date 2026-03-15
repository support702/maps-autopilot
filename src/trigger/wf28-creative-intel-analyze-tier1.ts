/**
 * WF28 Creative Intelligence — Analyze Tier 1
 * Location: src/trigger/wf28-creative-intel-analyze-tier1.ts
 *
 * Deep pattern analysis for Tier 1 "Study" accounts using Claude Sonnet.
 * Extracts: hook style, copy structure, visual design, format distribution,
 * CTA patterns, offer framing, ad lifespan, testing velocity.
 */

import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { callClaude } from "../lib/anthropic.js";
import type { AdData } from "./wf28-creative-intel-scan-account.js";

const analyzeTier1Input = z.object({
  advertiser_id: z.number(),
  page_id: z.string(),
  page_name: z.string(),
  ads: z.array(z.any()), // AdData[]
  scan_date: z.string(),
});

export interface Tier1Analysis {
  advertiser_id: number;
  scan_date: string;
  format_distribution: {
    video: number;
    static: number;
    carousel: number;
    total: number;
  };
  hook_patterns: {
    styles: string[];
    examples: string[];
    effectiveness: string;
  };
  copy_structure: {
    avg_length: number;
    tone: string;
    structure_notes: string;
  };
  offer_framing: {
    primary_offers: string[];
    price_signals: string[];
    guarantees: string[];
  };
  testing_velocity: {
    new_this_week: number;
    killed_this_week: number;
    avg_lifespan_days: number;
  };
  longevity_insights: {
    longest_running_ad: {
      copy: string;
      days: number;
      snapshot_url: string;
    } | null;
    survivor_patterns: string;
  };
  actionable_takeaways: string[];
  raw_analysis: string;
}

export const wf28CreativeIntelAnalyzeTier1 = schemaTask({
  id: "wf28-creative-intel-analyze-tier1",
  schema: analyzeTier1Input,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    randomize: true,
  },
  run: async (payload): Promise<Tier1Analysis> => {
    const { advertiser_id, page_name, ads, scan_date } = payload;

    if (ads.length === 0) {
      console.log(`WF28 analyze-tier1: No ads for ${page_name}, skipping analysis`);
      return {
        advertiser_id,
        scan_date,
        format_distribution: { video: 0, static: 0, carousel: 0, total: 0 },
        hook_patterns: { styles: [], examples: [], effectiveness: "No data" },
        copy_structure: { avg_length: 0, tone: "N/A", structure_notes: "No ads" },
        offer_framing: { primary_offers: [], price_signals: [], guarantees: [] },
        testing_velocity: { new_this_week: 0, killed_this_week: 0, avg_lifespan_days: 0 },
        longevity_insights: { longest_running_ad: null, survivor_patterns: "No data" },
        actionable_takeaways: [],
        raw_analysis: "No ads available for analysis",
      };
    }

    // Prepare ad summary for Claude
    const adsSummary = ads.slice(0, 50).map((ad: AdData, i: number) => {
      const copyText = ad.ad_copy.join(" | ");
      const headline = ad.headlines.length > 0 ? ad.headlines[0] : "No headline";
      return `Ad ${i + 1}:
  Media: ${ad.media_type}
  Running: ${ad.days_running} days (${ad.delivery_stop_time ? "STOPPED" : "ACTIVE"})
  Platforms: ${ad.publisher_platforms.join(", ")}
  Headline: ${headline}
  Copy: ${copyText.substring(0, 300)}${copyText.length > 300 ? "..." : ""}
  Snapshot: ${ad.snapshot_url}`;
    }).join("\n\n");

    const prompt = `You are a creative strategist analyzing ads from **${page_name}** (Tier 1 Study account — excellent creative quality).

Analyze these ${ads.length} ads and extract creative patterns.

ADS:
${adsSummary}

ANALYSIS REQUIREMENTS:

1. FORMAT DISTRIBUTION: Count video, static images, carousel formats.

2. HOOK PATTERNS: What styles of hooks do they use? List 3-5 examples verbatim. What makes them effective?

3. COPY STRUCTURE: Average length (short/medium/long), tone (casual/professional/bold), structure notes (numbered lists, questions, stats, storytelling, etc.)

4. OFFER FRAMING: What offers do they push? Price signals visible? Guarantees or claims made?

5. TESTING VELOCITY: How many new ads this week (created in last 7 days)? How many killed (stopped in last 7 days)? What's the average lifespan across all ads?

6. LONGEVITY INSIGHTS: Which ad has run the longest? Why might it be working? What patterns do the longest-running ads share?

7. ACTIONABLE TAKEAWAYS: 3-5 specific, copyable tactics we should test (e.g., "Test sub-30-second hooks with single-stat focus")

Return ONLY valid JSON. No markdown, no code fences.
{
  "format_distribution": {"video": X, "static": X, "carousel": X, "total": X},
  "hook_patterns": {"styles": ["style1", "style2"], "examples": ["hook1", "hook2"], "effectiveness": "analysis"},
  "copy_structure": {"avg_length": X, "tone": "tone", "structure_notes": "notes"},
  "offer_framing": {"primary_offers": ["offer1"], "price_signals": ["price1"], "guarantees": ["guarantee1"]},
  "testing_velocity": {"new_this_week": X, "killed_this_week": X, "avg_lifespan_days": X},
  "longevity_insights": {"longest_running_ad": {"copy": "text", "days": X, "snapshot_url": "url"}, "survivor_patterns": "patterns"},
  "actionable_takeaways": ["takeaway1", "takeaway2", "takeaway3"]
}`;

    const rawAnalysis = await callClaude(prompt, undefined, 4096);

    let parsed: any;
    try {
      parsed = JSON.parse(
        rawAnalysis
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "")
          .trim()
      );
    } catch {
      console.error("WF28 analyze-tier1: Failed to parse Claude response");
      parsed = {
        format_distribution: { video: 0, static: 0, carousel: 0, total: ads.length },
        hook_patterns: { styles: [], examples: [], effectiveness: "Parse error" },
        copy_structure: { avg_length: 0, tone: "N/A", structure_notes: "Parse error" },
        offer_framing: { primary_offers: [], price_signals: [], guarantees: [] },
        testing_velocity: { new_this_week: 0, killed_this_week: 0, avg_lifespan_days: 0 },
        longevity_insights: { longest_running_ad: null, survivor_patterns: "Parse error" },
        actionable_takeaways: [],
      };
    }

    return {
      advertiser_id,
      scan_date,
      format_distribution: parsed.format_distribution,
      hook_patterns: parsed.hook_patterns,
      copy_structure: parsed.copy_structure,
      offer_framing: parsed.offer_framing,
      testing_velocity: parsed.testing_velocity,
      longevity_insights: parsed.longevity_insights,
      actionable_takeaways: parsed.actionable_takeaways,
      raw_analysis: rawAnalysis,
    };
  },
});
