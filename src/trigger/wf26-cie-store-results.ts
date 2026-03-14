/**
 * WF26 CIE — Store Results
 * Location: src/trigger/wf26-cie-store-results.ts
 *
 * Persists scan results and generated briefs to the database.
 * Stores raw classified items to content_intelligence table and
 * the generated brief/scripts to content_briefs table.
 * Fired via trigger() (fire-and-forget) by orchestrators.
 */

import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { query } from "../lib/db.js";

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

const contentScriptSchema = z.object({
  title: z.string(),
  script: z.string(),
  platform: z.string(),
});

const storeResultsInput = z.object({
  scanDate: z.string(),
  scanType: z.enum(["sunday", "wednesday"]),
  classifiedItems: z.array(classifiedItemSchema),
  brief: z.string(),
  actionItems: z.array(z.string()),
  contentScripts: z.array(contentScriptSchema),
  clientImpact: z.string(),
  stats: z.object({
    totalScanned: z.number(),
    relevant: z.number(),
    highPriority: z.number(),
  }),
});

export const wf26CieStoreResults = schemaTask({
  id: "wf26-cie-store-results",
  schema: storeResultsInput,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    randomize: true,
  },
  run: async (payload) => {
    const {
      scanDate,
      scanType,
      classifiedItems,
      brief,
      actionItems,
      contentScripts,
      clientImpact,
      stats,
    } = payload;

    // Store each classified item to content_intelligence
    let itemsStored = 0;
    for (const item of classifiedItems) {
      await query(
        `INSERT INTO content_intelligence
           (scan_date, source, title, url, description, relevance_score,
            category, urgency, actionability, scan_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (scan_date, source, url)
         DO UPDATE SET
           relevance_score = EXCLUDED.relevance_score,
           category = EXCLUDED.category,
           urgency = EXCLUDED.urgency,
           actionability = EXCLUDED.actionability`,
        [
          scanDate,
          item.source,
          item.title,
          item.url,
          item.description,
          item.relevanceScore,
          item.category,
          item.urgency,
          item.actionability,
          scanType,
        ]
      );
      itemsStored++;
    }

    // Store the generated brief to content_briefs
    await query(
      `INSERT INTO content_briefs
         (scan_date, scan_type, brief, action_items, content_scripts,
          client_impact, total_scanned, relevant_count, high_priority_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (scan_date, scan_type)
       DO UPDATE SET
         brief = EXCLUDED.brief,
         action_items = EXCLUDED.action_items,
         content_scripts = EXCLUDED.content_scripts,
         client_impact = EXCLUDED.client_impact,
         total_scanned = EXCLUDED.total_scanned,
         relevant_count = EXCLUDED.relevant_count,
         high_priority_count = EXCLUDED.high_priority_count`,
      [
        scanDate,
        scanType,
        brief,
        JSON.stringify(actionItems),
        JSON.stringify(contentScripts),
        clientImpact,
        stats.totalScanned,
        stats.relevant,
        stats.highPriority,
      ]
    );

    return { itemsStored, briefStored: true, scanDate, scanType };
  },
});
