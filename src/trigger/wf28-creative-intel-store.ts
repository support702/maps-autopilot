/**
 * WF28 Creative Intelligence — Store Results
 * Saves ad snapshots and creative patterns to database.
 */

import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { query } from "../lib/db.js";
import type { AdData } from "./wf28-creative-intel-scan-account.js";
import type { Tier1Analysis } from "./wf28-creative-intel-analyze-tier1.js";
import type { Tier2Analysis } from "./wf28-creative-intel-analyze-tier2.js";

const storeInput = z.object({
  advertiser_id: z.number(),
  tier: z.number(),
  scan_date: z.string(),
  ads: z.array(z.any()),
  analysis: z.any().optional(),
});

export const wf28CreativeIntelStore = schemaTask({
  id: "wf28-creative-intel-store",
  schema: storeInput,
  run: async (payload) => {
    const { advertiser_id, tier, scan_date, ads, analysis } = payload;

    // Update last_scanned_at for advertiser
    await query(
      `UPDATE tracked_advertisers SET last_scanned_at = NOW() WHERE id = $1`,
      [advertiser_id]
    );

    // Insert ad snapshots
    let storedAds = 0;
    for (const ad of ads as AdData[]) {
      try {
        await query(
          `INSERT INTO ad_snapshots (
            advertiser_id, meta_ad_id, page_id, page_name,
            ad_creation_time, delivery_start_time, delivery_stop_time,
            ad_copy, headlines, descriptions, snapshot_url,
            media_type, publisher_platforms, days_running,
            is_active, variation_count, scan_date,
            first_seen_date, last_seen_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (meta_ad_id, scan_date) DO UPDATE SET
            delivery_stop_time = EXCLUDED.delivery_stop_time,
            days_running = EXCLUDED.days_running,
            is_active = EXCLUDED.is_active,
            last_seen_date = EXCLUDED.scan_date`,
          [
            advertiser_id,
            ad.meta_ad_id,
            ad.page_id,
            ad.page_name,
            ad.ad_creation_time,
            ad.delivery_start_time,
            ad.delivery_stop_time,
            ad.ad_copy,
            ad.headlines,
            ad.descriptions,
            ad.snapshot_url,
            ad.media_type,
            ad.publisher_platforms,
            ad.days_running,
            ad.delivery_stop_time === null,
            ad.variation_count,
            scan_date,
            scan_date, // first_seen_date (updated only on insert)
            scan_date, // last_seen_date
          ]
        );
        storedAds++;
      } catch (error) {
        console.error(`WF28 store: Error storing ad ${ad.meta_ad_id}:`, error);
      }
    }

    console.log(`WF28 store: Stored ${storedAds}/${ads.length} ads for advertiser ${advertiser_id}`);

    // Store creative patterns if analysis exists
    if (analysis) {
      try {
        if (tier === 1) {
          const t1 = analysis as Tier1Analysis;
          await query(
            `INSERT INTO creative_patterns (
              advertiser_id, scan_date, tier, analysis,
              format_distribution, hook_patterns, copy_structure,
              offer_framing, testing_velocity, longevity_insights,
              actionable_takeaways
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              advertiser_id,
              scan_date,
              tier,
              { raw_analysis: t1.raw_analysis },
              t1.format_distribution,
              t1.hook_patterns,
              t1.copy_structure,
              t1.offer_framing,
              t1.testing_velocity,
              t1.longevity_insights,
              t1.actionable_takeaways,
            ]
          );
        } else if (tier === 2) {
          const t2 = analysis as Tier2Analysis;
          await query(
            `INSERT INTO creative_patterns (
              advertiser_id, scan_date, tier, analysis
            ) VALUES ($1, $2, $3, $4)`,
            [
              advertiser_id,
              scan_date,
              tier,
              {
                primary_offers: t2.primary_offers,
                claims_made: t2.claims_made,
                angles_pushed: t2.angles_pushed,
                positioning_notes: t2.positioning_notes,
                new_ads_count: t2.new_ads_count,
                actionable_insights: t2.actionable_insights,
              },
            ]
          );
        }
        console.log(`WF28 store: Stored creative patterns for advertiser ${advertiser_id}`);
      } catch (error) {
        console.error(`WF28 store: Error storing creative patterns:`, error);
      }
    }

    return {
      stored_ads: storedAds,
      total_ads: ads.length,
      patterns_stored: !!analysis,
    };
  },
});
