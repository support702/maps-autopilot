/**
 * WF28 Creative Intelligence — Weekly Scan
 * Location: src/trigger/wf28-creative-intel-weekly-scan.ts
 *
 * Orchestrator that runs every Sunday at 9AM CT (2PM UTC).
 * Flow: scan accounts → analyze (tier1/tier2) → detect patterns → store → report → discover
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { query } from "../lib/db.js";
import { wf28CreativeIntelScanAccount } from "./wf28-creative-intel-scan-account.js";
import { wf28CreativeIntelAnalyzeTier1 } from "./wf28-creative-intel-analyze-tier1.js";
import { wf28CreativeIntelAnalyzeTier2 } from "./wf28-creative-intel-analyze-tier2.js";
import { wf28CreativeIntelStore } from "./wf28-creative-intel-store.js";
import { wf28CreativeIntelDetectPatterns } from "./wf28-creative-intel-detect-patterns.js";
import { wf28CreativeIntelReport } from "./wf28-creative-intel-report.js";
import { wf28CreativeIntelDiscover } from "./wf28-creative-intel-discover.js";
import { DISCOVERY_KEYWORDS } from "./wf28-creative-intel-constants.js";

export const wf28CreativeIntelWeeklyScan = schedules.task({
  id: "wf28-creative-intel-weekly-scan",
  cron: "0 14 * * 0", // Sunday 9AM CT = 2PM UTC
  run: async () => {
    const scanDate = new Date().toISOString().split("T")[0];

    console.log(`WF28 weekly-scan: Starting scan for ${scanDate}`);

    // Step 1: Get all active tracked advertisers
    const advertisersResult = await query(
      `SELECT id, page_id, page_name, tier FROM tracked_advertisers WHERE status = 'active' ORDER BY tier, id`
    );
    const advertisers = advertisersResult.rows;

    if (advertisers.length === 0) {
      console.log("WF28 weekly-scan: No active advertisers to scan");
      return { scanned: 0, scanDate };
    }

    console.log(`WF28 weekly-scan: Scanning ${advertisers.length} advertisers`);

    // Step 2: Scan all accounts in parallel
    const scanBatchItems = advertisers.map((adv: any) => ({
      payload: {
        page_id: adv.page_id,
        page_name: adv.page_name,
        tier: adv.tier,
        scan_date: scanDate,
      },
      options: {
        idempotencyKey: `wf28-scan-${adv.page_id}-${scanDate}`,
      },
    }));

    const scanResults = await wf28CreativeIntelScanAccount.batchTriggerAndWait(scanBatchItems);

    // Collect scan results
    const scannedData: any[] = [];
    for (let i = 0; i < scanResults.runs.length; i++) {
      const result = scanResults.runs[i];
      const advertiser = advertisers[i];
      
      if (result.ok && Array.isArray(result.output)) {
        scannedData.push({
          advertiser_id: advertiser.id,
          page_id: advertiser.page_id,
          page_name: advertiser.page_name,
          tier: advertiser.tier,
          ads: result.output,
        });
      }
    }

    console.log(`WF28 weekly-scan: Scanned ${scannedData.length}/${advertisers.length} accounts successfully`);

    // Step 3: Analyze Tier 1 accounts (deep pattern analysis)
    const tier1Data = scannedData.filter((d) => d.tier === 1);
    const tier1Results: any[] = [];

    for (const data of tier1Data) {
      const analysisResult = await wf28CreativeIntelAnalyzeTier1.triggerAndWait({
        advertiser_id: data.advertiser_id,
        page_id: data.page_id,
        page_name: data.page_name,
        ads: data.ads,
        scan_date: scanDate,
      });

      if (analysisResult.ok) {
        tier1Results.push({
          advertiser_id: data.advertiser_id,
          page_name: data.page_name,
          ad_count: data.ads.length,
          analysis: analysisResult.output,
        });

        // Store ads + analysis
        await wf28CreativeIntelStore.triggerAndWait({
          advertiser_id: data.advertiser_id,
          tier: 1,
          scan_date: scanDate,
          ads: data.ads,
          analysis: analysisResult.output,
        });
      }
    }

    console.log(`WF28 weekly-scan: Analyzed ${tier1Results.length} Tier 1 accounts`);

    // Step 4: Analyze Tier 2 accounts (competitive intelligence)
    const tier2Data = scannedData.filter((d) => d.tier === 2);
    const tier2Results: any[] = [];

    for (const data of tier2Data) {
      const analysisResult = await wf28CreativeIntelAnalyzeTier2.triggerAndWait({
        advertiser_id: data.advertiser_id,
        page_name: data.page_name,
        ads: data.ads,
        scan_date: scanDate,
      });

      if (analysisResult.ok) {
        tier2Results.push({
          advertiser_id: data.advertiser_id,
          page_name: data.page_name,
          ad_count: data.ads.length,
          analysis: analysisResult.output,
        });

        // Store ads + analysis
        await wf28CreativeIntelStore.triggerAndWait({
          advertiser_id: data.advertiser_id,
          tier: 2,
          scan_date: scanDate,
          ads: data.ads,
          analysis: analysisResult.output,
        });
      }
    }

    console.log(`WF28 weekly-scan: Analyzed ${tier2Results.length} Tier 2 accounts`);

    // Step 5: Detect cross-account patterns (Tier 1 only)
    let patternsDetected = false;
    if (tier1Results.length > 0) {
      const patternsResult = await wf28CreativeIntelDetectPatterns.triggerAndWait({
        tier1_analyses: tier1Results,
        scan_date: scanDate,
      });

      patternsDetected = patternsResult.ok && patternsResult.output.patterns_detected;
      console.log(`WF28 weekly-scan: Pattern detection ${patternsDetected ? "successful" : "failed"}`);
    }

    // Step 6: Generate and post weekly report
    const reportResult = await wf28CreativeIntelReport.triggerAndWait({
      scan_date: scanDate,
      tier1_results: tier1Results,
      tier2_results: tier2Results,
    });

    console.log(`WF28 weekly-scan: Report ${reportResult.ok && reportResult.output.posted ? "posted" : "generation failed"}`);

    // Step 7: Run discovery scan (keyword-based)
    const discoveryResult = await wf28CreativeIntelDiscover.triggerAndWait({
      keywords: DISCOVERY_KEYWORDS,
      scan_date: scanDate,
    });

    const discovered = discoveryResult.ok ? discoveryResult.output.discovered : 0;
    console.log(`WF28 weekly-scan: Discovered ${discovered} new candidates`);

    return {
      scanned: scannedData.length,
      tier1_analyzed: tier1Results.length,
      tier2_analyzed: tier2Results.length,
      patterns_detected: patternsDetected,
      discovered_candidates: discovered,
      scan_date: scanDate,
    };
  },
});
