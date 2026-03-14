/**
 * WF26 CIE — Emergency Scan
 * Location: src/trigger/wf26-cie-emergency-scan.ts
 *
 * On-demand task triggered when a RED alert is detected by the content
 * intelligence system (e.g. from Google intel agent or manual trigger).
 * Stores the alert, generates an impact assessment and brief, then
 * posts an urgent notification to Slack.
 *
 * Flow: store RED item → generate brief → assess impact → post emergency Slack → store full results
 */

import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { query } from "../lib/db.js";
import { wf26CieGenerateBrief } from "./wf26-cie-generate-brief.js";
import { wf26CieAssessImpact } from "./wf26-cie-assess-impact.js";
import { wf26CieStoreResults } from "./wf26-cie-store-results.js";
import axios from "axios";

const emergencyScanInput = z.object({
  alertType: z.string(),
  title: z.string(),
  description: z.string(),
  source: z.string(),
  url: z.string(),
  category: z.string(),
  relevanceScore: z.number(),
  triggeredBy: z.string(),
});

export const wf26CieEmergencyScan = schemaTask({
  id: "wf26-cie-emergency-scan",
  schema: emergencyScanInput,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    randomize: true,
  },
  run: async (payload) => {
    const {
      alertType,
      title,
      description,
      source,
      url,
      category,
      relevanceScore,
      triggeredBy,
    } = payload;

    const scanDate = new Date().toISOString().split("T")[0];

    // Step 1: Store the RED item directly into content_intelligence
    const insertResult = await query(
      `INSERT INTO content_intelligence
         (scan_date, source, title, url, description, relevance_score,
          category, urgency, actionability, scan_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'immediate', 'high', 'emergency')
       RETURNING id`,
      [scanDate, source, title, url, description, relevanceScore, category]
    );

    const intelligenceId = insertResult.rows[0].id as number;

    // Step 2: Generate brief (reuse Sunday comprehensive format)
    let briefData = {
      brief: "Brief generation failed — see raw alert data below.",
      actionItems: [] as string[],
      contentScripts: [] as Array<{ title: string; script: string; platform: string }>,
      clientImpact: "",
      generatedAt: new Date().toISOString(),
    };
    let briefGenerated = false;

    try {
      const briefResult = await wf26CieGenerateBrief.triggerAndWait({
        classifiedItems: [
          {
            title,
            url,
            description,
            source,
            relevanceScore,
            category,
            urgency: "immediate",
            actionability: "high",
          },
        ],
        scanType: "sunday" as const,
      });

      if (briefResult.ok) {
        briefData = briefResult.output;
        briefGenerated = true;
      }
    } catch (err) {
      console.error("WF26 Emergency: brief generation failed", err);
    }

    // Step 3: Assess impact across workflows
    let impactAlert = {
      alertId: intelligenceId,
      affectedWorkflows: [] as string[],
      confidence: "unknown",
      recommendation: "Manual review required — impact assessment failed.",
      evidence: "",
    };

    try {
      const impactResult = await wf26CieAssessImpact.triggerAndWait({
        intelligenceId,
        title,
        description,
        category,
        urgency: "immediate",
        actionability: "high",
        relevanceScore,
      });

      if (impactResult.ok) {
        impactAlert = {
          alertId: intelligenceId,
          affectedWorkflows: impactResult.output.affectedWorkflows ?? [],
          confidence: impactResult.output.confidence ?? "unknown",
          recommendation: impactResult.output.recommendation ?? "",
          evidence: impactResult.output.evidence ?? "",
        };
      }
    } catch (err) {
      console.error("WF26 Emergency: impact assessment failed", err);
    }

    // Step 4: Post emergency alert to Slack
    let slackPosted = false;
    try {
      const webhookUrl = process.env.SLACK_WEBHOOK_URL!;

      const actionList = briefData.actionItems.length > 0
        ? briefData.actionItems.map((item, i) => `${i + 1}. ${item}`).join("\n")
        : "• Review the source material and assess operational impact";

      const affectedList = impactAlert.affectedWorkflows.length > 0
        ? impactAlert.affectedWorkflows.join(", ")
        : "Assessment pending";

      const emergencyMessage = `:red_circle: *RED ALERT — Content Intelligence Emergency*

*${title}*
${description}

:bar_chart: *Impact Assessment:*
- Affected Workflows: ${affectedList}
- Confidence: ${impactAlert.confidence}
- Recommendation: ${impactAlert.recommendation}
- Evidence: ${impactAlert.evidence || "N/A"}

:clipboard: *Immediate Actions:*
${actionList}

:link: Source: ${url}

cc @tri — requires immediate review
_Triggered by: ${triggeredBy} | Generated by WF26 CIE Emergency Scan_`;

      await axios.post(webhookUrl, { text: emergencyMessage });
      slackPosted = true;
    } catch (err) {
      console.error("WF26 Emergency: Slack post failed", err);
    }

    // Step 5: Store full results (fire-and-forget)
    await wf26CieStoreResults.trigger({
      scanDate,
      scanType: "sunday" as const,
      classifiedItems: [
        {
          title,
          url,
          description,
          source,
          relevanceScore,
          category,
          urgency: "immediate",
          actionability: "high",
        },
      ],
      brief: briefData.brief,
      actionItems: briefData.actionItems,
      contentScripts: briefData.contentScripts,
      clientImpact: briefData.clientImpact,
      stats: {
        totalScanned: 1,
        relevant: 1,
        highPriority: 1,
      },
    });

    return {
      success: true,
      intelligenceId,
      impactAlert: {
        alertId: impactAlert.alertId,
        affectedWorkflows: impactAlert.affectedWorkflows,
        confidence: impactAlert.confidence,
        recommendation: impactAlert.recommendation,
      },
      briefGenerated,
      slackPosted,
    };
  },
});
