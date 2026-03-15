/**
 * WF28 Creative Intelligence — Detect Patterns
 * Cross-account pattern analysis using Claude Sonnet.
 * Identifies universal patterns, emerging trends, format/hook consensus.
 */

import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { callClaude } from "../lib/anthropic.js";
import { query } from "../lib/db.js";

const detectPatternsInput = z.object({
  tier1_analyses: z.array(z.any()),
  scan_date: z.string(),
});

export const wf28CreativeIntelDetectPatterns = schemaTask({
  id: "wf28-creative-intel-detect-patterns",
  schema: detectPatternsInput,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    randomize: true,
  },
  run: async (payload) => {
    const { tier1_analyses, scan_date } = payload;

    if (tier1_analyses.length === 0) {
      console.log("WF28 detect-patterns: No Tier 1 analyses to process");
      return { patterns_detected: false };
    }

    // Prepare summary of all Tier 1 analyses
    const analysesSummary = tier1_analyses.map((result: any, i: number) => {
      const { page_name, analysis } = result;
      return `Account ${i + 1}: ${page_name}
Format distribution: ${JSON.stringify(analysis.format_distribution)}
Hook patterns: ${JSON.stringify(analysis.hook_patterns?.styles || [])}
Copy structure: ${analysis.copy_structure?.tone || "N/A"}
Offer framing: ${JSON.stringify(analysis.offer_framing?.primary_offers || [])}
Testing velocity: ${analysis.testing_velocity?.new_this_week || 0} new, ${analysis.testing_velocity?.killed_this_week || 0} killed
Takeaways: ${(analysis.actionable_takeaways || []).join("; ")}`;
    }).join("\n\n");

    const prompt = `You are analyzing creative patterns across ${tier1_analyses.length} top-performing advertisers (Tier 1 Study accounts).

ANALYSES:
${analysesSummary}

CROSS-ACCOUNT PATTERN DETECTION:

1. UNIVERSAL PATTERNS: What creative patterns appear across 2+ accounts? (e.g., "All using sub-30-second video hooks")

2. EMERGING TRENDS: What's shifting this week? (e.g., "Moving from long-form to punchy clips")

3. FORMAT CONSENSUS: Which formats are winning vs declining across accounts?

4. HOOK CONSENSUS: Which hook styles are working vs saturated?

5. CREATIVE BRIEF RECOMMENDATIONS: Based on patterns, generate 2-3 specific creative concepts to test (format + hook + angle)

6. CHANGES FROM PREVIOUS: Any major shifts from general best practices? (e.g., "Carousel format now outperforming static")

Return ONLY valid JSON:
{
  "universal_patterns": ["pattern1", "pattern2"],
  "emerging_trends": ["trend1", "trend2"],
  "format_consensus": {"winning": ["format1"], "declining": ["format2"]},
  "hook_consensus": {"working": ["hook1"], "saturated": ["hook2"]},
  "creative_brief_recommendations": [
    {"format": "format", "hook": "hook", "angle": "angle", "reasoning": "why"}
  ],
  "changes_from_previous": "summary of shifts"
}`;

    const rawAnalysis = await callClaude(prompt, undefined, 4096);

    let parsed: any;
    try {
      parsed = JSON.parse(
        rawAnalysis.replace(/```json?\n?/g, "").replace(/```/g, "").trim()
      );
    } catch {
      console.error("WF28 detect-patterns: Failed to parse Claude response");
      parsed = {
        universal_patterns: [],
        emerging_trends: [],
        format_consensus: { winning: [], declining: [] },
        hook_consensus: { working: [], saturated: [] },
        creative_brief_recommendations: [],
        changes_from_previous: "Parse error",
      };
    }

    // Store in pattern_library
    try {
      await query(
        `INSERT INTO pattern_library (
          scan_date, universal_patterns, emerging_trends,
          format_consensus, hook_consensus,
          creative_brief_recommendations, changes_from_previous,
          raw_analysis
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          scan_date,
          parsed.universal_patterns,
          parsed.emerging_trends,
          parsed.format_consensus,
          parsed.hook_consensus,
          parsed.creative_brief_recommendations,
          parsed.changes_from_previous,
          rawAnalysis,
        ]
      );

      console.log(`WF28 detect-patterns: Stored pattern library for ${scan_date}`);
    } catch (error) {
      console.error("WF28 detect-patterns: Error storing pattern library:", error);
    }

    return {
      patterns_detected: true,
      universal_patterns: parsed.universal_patterns,
      emerging_trends: parsed.emerging_trends,
      creative_briefs_generated: parsed.creative_brief_recommendations.length,
    };
  },
});
