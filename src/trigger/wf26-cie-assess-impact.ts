/**
 * WF26 CIE — Assess Impact
 * Location: src/trigger/wf26-cie-assess-impact.ts
 *
 * Assesses the operational impact of a classified intelligence item on
 * existing Maps Autopilot workflows. Cross-references internal data
 * (competitor snapshots, geo grid history) with the intelligence item,
 * then uses Claude to determine confidence level, recommended action,
 * and detailed evidence. Stores results in workflow_impact_alerts table.
 *
 * Called on-demand by the emergency scan or Sunday pipeline via
 * triggerAndWait(). Consumes the workflow registry to map categories
 * to affected workflows.
 */

import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { query } from "../lib/db.js";
import { callClaude } from "../lib/anthropic.js";
import { getAffectedWorkflows, type WorkflowEntry } from "./wf26-cie-workflow-registry.js";

const assessImpactInput = z.object({
  intelligenceId: z.number(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  urgency: z.string(),
  actionability: z.string(),
  relevanceScore: z.number(),
});

interface AssessmentResult {
  alertId: number;
  affectedWorkflows: string[];
  confidence: string;
  recommendation: string;
  evidence: string;
}

interface ClaudeAssessment {
  confidence: string;
  recommendation: string;
  evidence: string;
}

export const wf26CieAssessImpact = schemaTask({
  id: "wf26-cie-assess-impact",
  schema: assessImpactInput,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    randomize: true,
  },
  run: async (payload): Promise<AssessmentResult> => {
    const {
      intelligenceId,
      title,
      description,
      category,
      urgency,
      actionability,
      relevanceScore,
    } = payload;

    // Get affected workflows from registry
    const affectedEntries: WorkflowEntry[] = getAffectedWorkflows(category);
    const affectedWorkflows: string[] = affectedEntries.map((w) => w.id);

    // Query recent competitor snapshot data (±7 days) - gracefully handle missing tables
    let competitorData;
    try {
      competitorData = await query(
        `SELECT
           COUNT(*) AS total_snapshots,
           COUNT(DISTINCT competitor_name) AS unique_competitors,
           ROUND(AVG(rating)::numeric, 2) AS avg_rating,
           ROUND(AVG(review_count)::numeric, 0) AS avg_reviews,
           MIN(rank_position) AS best_rank,
           MAX(rank_position) AS worst_rank
         FROM competitor_snapshots
         WHERE scan_date >= NOW() - INTERVAL '7 days'
           AND scan_date <= NOW() + INTERVAL '7 days'`
      );
    } catch (error) {
      console.log("WF26 assess-impact: competitor_snapshots table not found, using empty data");
      competitorData = { rows: [{ total_snapshots: 0 }] };
    }

    // Query recent geo grid history (±7 days) - gracefully handle missing tables
    let geoData;
    try {
      geoData = await query(
        `SELECT
           COUNT(*) AS total_records,
           COUNT(DISTINCT keyword) AS unique_keywords,
           ROUND(AVG(top3_pct)::numeric, 1) AS avg_top3_pct,
           ROUND(AVG(top10_pct)::numeric, 1) AS avg_top10_pct,
           ROUND(AVG(avg_rank)::numeric, 1) AS avg_rank,
           ARRAY_AGG(DISTINCT trend) FILTER (WHERE trend IS NOT NULL) AS trends
         FROM geo_grid_history
         WHERE scan_date >= NOW() - INTERVAL '7 days'
           AND scan_date <= NOW() + INTERVAL '7 days'`
      );
    } catch (error) {
      console.log("WF26 assess-impact: geo_grid_history table not found, using empty data");
      geoData = { rows: [{ total_records: 0 }] };
    }

    const compStats = competitorData.rows[0];
    const geoStats = geoData.rows[0];

    // Build context summaries for Claude
    const competitorSummary = Number(compStats.total_snapshots) > 0
      ? `Recent competitor data (last 7 days): ${compStats.total_snapshots} snapshots across ${compStats.unique_competitors} competitors. Avg rating: ${compStats.avg_rating}, avg reviews: ${compStats.avg_reviews}, rank range: ${compStats.best_rank}-${compStats.worst_rank}.`
      : "No recent competitor snapshot data available.";

    const geoSummary = Number(geoStats.total_records) > 0
      ? `Recent geo grid data (last 7 days): ${geoStats.total_records} records across ${geoStats.unique_keywords} keywords. Avg top-3: ${geoStats.avg_top3_pct}%, avg top-10: ${geoStats.avg_top10_pct}%, avg rank: ${geoStats.avg_rank}. Observed trends: ${geoStats.trends?.join(", ") || "none"}.`
      : "No recent geo grid history data available.";

    const workflowList = affectedEntries.length > 0
      ? affectedEntries.map((w) => `${w.id} (${w.name})`).join(", ")
      : "No specific workflows mapped for this category";

    // Call Claude for impact assessment
    const prompt = `You are a Workflow Impact Analyst for "Maps Autopilot", a local SEO agency that manages Google Business Profiles, reviews, citations, and local search visibility through automated workflows.

INTELLIGENCE ITEM:
- Title: ${title}
- Description: ${description}
- Category: ${category}
- Urgency: ${urgency}
- Actionability: ${actionability}
- Relevance Score: ${relevanceScore}/10

AFFECTED WORKFLOWS: ${workflowList}

INTERNAL DATA CONTEXT:
${competitorSummary}
${geoSummary}

TASK: Assess the operational impact of this intelligence item on our workflows.

1. CONFIDENCE: Determine data confirmation level:
   - CONFIRMED: The intelligence is corroborated by our internal data (e.g., ranking drops coincide with reported algorithm update)
   - PROBABLE: The intelligence is likely accurate but no direct internal evidence supports or contradicts it
   - UNCONFIRMED: The intelligence is speculative or contradicted by our data

2. RECOMMENDATION: What action should the team take?
   - MONITOR: Watch for further developments, no immediate action needed
   - REVIEW: Team should review affected workflows within the week
   - URGENT_CHANGE: Immediate workflow modifications recommended

3. EVIDENCE: Provide a concise explanation (2-4 sentences) connecting the intelligence to our internal data and affected workflows. Reference specific data points when available.

Return ONLY valid JSON. No markdown, no code fences.
{
  "confidence": "CONFIRMED|PROBABLE|UNCONFIRMED",
  "recommendation": "MONITOR|REVIEW|URGENT_CHANGE",
  "evidence": "Your reasoning here..."
}`;

    let assessment: ClaudeAssessment;

    try {
      const rawText = await callClaude(
        prompt,
        "You are a Workflow Impact Analyst for a local SEO automation platform. Return only valid JSON."
      );

      const cleaned = rawText
        .replace(/```json?\n?/g, "")
        .replace(/```/g, "")
        .trim();

      assessment = JSON.parse(cleaned);

      // Validate expected values, default if malformed
      const validConfidence = ["CONFIRMED", "PROBABLE", "UNCONFIRMED"];
      const validRecommendation = ["MONITOR", "REVIEW", "URGENT_CHANGE"];

      if (!validConfidence.includes(assessment.confidence)) {
        assessment.confidence = "UNCONFIRMED";
      }
      if (!validRecommendation.includes(assessment.recommendation)) {
        assessment.recommendation = "MONITOR";
      }
      if (!assessment.evidence || typeof assessment.evidence !== "string") {
        assessment.evidence = "Assessment completed but evidence text was not properly generated.";
      }
    } catch {
      console.error("WF26 assess-impact: failed to parse Claude response, using defaults");
      assessment = {
        confidence: "UNCONFIRMED",
        recommendation: "MONITOR",
        evidence: `Auto-classified as ${category} with ${urgency} urgency. Unable to complete AI-powered impact analysis — manual review recommended.`,
      };
    }

    // Store result in workflow_impact_alerts
    const insertResult = await query(
      `INSERT INTO workflow_impact_alerts
         (intelligence_id, affected_workflows, data_confirmation, evidence,
          content_recommendation, status)
       VALUES ($1, $2, $3, $4, $5, 'new')
       RETURNING id`,
      [
        intelligenceId,
        JSON.stringify(affectedWorkflows),
        assessment.confidence,
        assessment.evidence,
        assessment.recommendation,
      ]
    );

    const alertId = insertResult.rows[0].id;

    return {
      alertId,
      affectedWorkflows,
      confidence: assessment.confidence,
      recommendation: assessment.recommendation,
      evidence: assessment.evidence,
    };
  },
});
