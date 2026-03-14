/**
 * WF26 CIE — Wednesday Scan (Lighter)
 * Location: src/trigger/wf26-cie-wednesday-scan.ts
 *
 * Orchestrator that runs every Wednesday at 8AM CT (1PM UTC).
 * Performs a lighter mid-week scan across 3 priority categories:
 * Google algorithm updates, GBP updates, and competitor intelligence.
 * Same flow as Sunday but with fewer sources.
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

const WEDNESDAY_SOURCES = [
  {
    source: "google_algorithm",
    query: "Google algorithm update local search ranking",
  },
  {
    source: "gbp_updates",
    query: "Google Business Profile new features updates",
  },
  {
    source: "competitor_intel",
    query: "local SEO competitor analysis tools strategy",
  },
];

export const wf26CieWednesdayScan = schedules.task({
  id: "wf26-cie-wednesday-scan",
  cron: "0 13 * * 3",
  run: async () => {
    const scanDate = new Date().toISOString().split("T")[0];

    // Step 1: Scan sources in parallel via batchTriggerAndWait
    const scanBatchItems = WEDNESDAY_SOURCES.map((src) => ({
      payload: {
        source: src.source,
        query: src.query,
        scanDate,
        maxResults: 10,
      },
      options: {
        idempotencyKey: `cie-wed-${src.source}-${scanDate}`,
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
      console.log("WF26 Wednesday: no items found across all sources");
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
      scanType: "wednesday" as const,
    });

    const classifiedItems = classifyResult.ok ? classifyResult.output : [];

    // Step 3: Generate brief
    const briefResult = await wf26CieGenerateBrief.triggerAndWait({
      classifiedItems,
      scanType: "wednesday" as const,
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
      scanType: "wednesday" as const,
      stats,
    });

    await wf26CieStoreResults.trigger({
      scanDate,
      scanType: "wednesday" as const,
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
      scanType: "wednesday",
      totalScanned: allItems.length,
      relevant: classifiedItems.length,
      highPriority: highPriorityCount,
      briefGenerated: true,
    };
  },
});
