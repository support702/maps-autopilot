/**
 * WF26 CIE — Sunday Scan (Comprehensive)
 * Location: src/trigger/wf26-cie-sunday-scan.ts
 *
 * Orchestrator that runs every Sunday at 8AM CT (1PM UTC).
 * Performs a comprehensive scan across 6 content source categories,
 * classifies results, generates a weekly intelligence brief with
 * content scripts, then posts to Slack and stores results.
 *
 * Flow: scan sources → classify → generate brief → post + store → assess impact (high-priority)
 */

import { schedules, wait } from "@trigger.dev/sdk/v3";
import { wf26CieScanSource } from "./wf26-cie-scan-source.js";
import { wf26CieClassifyItems } from "./wf26-cie-classify-items.js";
import { wf26CieGenerateBrief } from "./wf26-cie-generate-brief.js";
import { wf26CiePostSlack } from "./wf26-cie-post-slack.js";
import { wf26CieStoreResults } from "./wf26-cie-store-results.js";
import { wf26CieAssessImpact } from "./wf26-cie-assess-impact.js";
import { query } from "../lib/db.js";
import type { ScanResult } from "./wf26-cie-scan-source.js";

const SUNDAY_SOURCES = [
  {
    source: "local_seo_news",
    query: "local SEO news updates 2026",
  },
  {
    source: "google_algorithm",
    query: "Google algorithm update local search ranking",
  },
  {
    source: "ai_search_trends",
    query: "AI search Google SGE local business visibility",
  },
  {
    source: "content_marketing",
    query: "local business content marketing strategy",
  },
  {
    source: "review_management",
    query: "Google reviews management reputation local business",
  },
  {
    source: "gbp_updates",
    query: "Google Business Profile new features updates",
  },
];

export const wf26CieSundayScan = schedules.task({
  id: "wf26-cie-sunday-scan",
  cron: "0 13 * * 0",
  run: async () => {
    const scanDate = new Date().toISOString().split("T")[0];

    // Step 1: Scan all sources in parallel via batchTriggerAndWait
    const scanBatchItems = SUNDAY_SOURCES.map((src) => ({
      payload: {
        source: src.source,
        query: src.query,
        scanDate,
        maxResults: 10,
      },
      options: {
        idempotencyKey: `cie-sun-${src.source}-${scanDate}`,
      },
    }));

    const scanResults = await wf26CieScanSource.batchTriggerAndWait(
      scanBatchItems
    );

    // Collect all scan items from batch results
    const allItems: ScanResult[] = [];
    for (const result of scanResults.runs) {
      if (result.ok && Array.isArray(result.output)) {
        allItems.push(...result.output);
      }
    }

    if (allItems.length === 0) {
      console.log("WF26 Sunday: no items found across all sources");
      return { scanned: 0, relevant: 0, scanDate };
    }

    // Step 2: Classify items
    const classifyResult = await wf26CieClassifyItems.triggerAndWait({
      items: allItems.map((item) => ({
        title: item.title,
        url: item.url,
        description: item.description,
        source: item.source,
      })),
      scanType: "sunday" as const,
    });

    const classifiedItems = classifyResult.ok ? classifyResult.output : [];

    // Step 3: Generate brief
    const briefResult = await wf26CieGenerateBrief.triggerAndWait({
      classifiedItems,
      scanType: "sunday" as const,
    });

    const briefData = briefResult.ok
      ? briefResult.output
      : {
          brief: "Brief generation failed",
          actionItems: [],
          contentScripts: [],
          clientImpact: "",
          generatedAt: new Date().toISOString(),
        };

    const highPriorityCount = classifiedItems.filter(
      (item) => item.urgency === "immediate" || item.actionability === "high"
    ).length;

    const stats = {
      totalScanned: allItems.length,
      relevant: classifiedItems.length,
      highPriority: highPriorityCount,
    };

    // Step 4: Post to Slack and store results (fire-and-forget)
    await wf26CiePostSlack.trigger({
      brief: briefData.brief,
      actionItems: briefData.actionItems,
      contentScripts: briefData.contentScripts,
      scanType: "sunday" as const,
      stats,
    });

    await wf26CieStoreResults.trigger({
      scanDate,
      scanType: "sunday" as const,
      classifiedItems,
      brief: briefData.brief,
      actionItems: briefData.actionItems,
      contentScripts: briefData.contentScripts,
      clientImpact: briefData.clientImpact,
      stats,
    });

    // Step 5: Trigger impact assessment for high-priority items
    const highPriorityItems = classifiedItems.filter(
      (item) =>
        item.urgency === "immediate" ||
        (item.actionability === "high" && item.relevanceScore >= 8)
    );

    if (highPriorityItems.length > 0) {
      // Wait briefly for store to persist items
      await wait.for({ seconds: 5 });

      // Look up stored intelligence IDs for high-priority items
      for (const item of highPriorityItems) {
        const idResult = await query(
          `SELECT id FROM content_intelligence WHERE scan_date = $1 AND url = $2 LIMIT 1`,
          [scanDate, item.url]
        );
        if (idResult.rows.length > 0) {
          await wf26CieAssessImpact.trigger({
            intelligenceId: idResult.rows[0].id,
            title: item.title,
            description: item.description,
            category: item.category,
            urgency: item.urgency,
            actionability: item.actionability,
            relevanceScore: item.relevanceScore,
          });
        }
      }
    }

    return {
      scanDate,
      scanType: "sunday",
      totalScanned: allItems.length,
      relevant: classifiedItems.length,
      highPriority: highPriorityCount,
      briefGenerated: true,
    };
  },
});
