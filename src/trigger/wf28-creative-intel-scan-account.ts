/**
 * WF28 Creative Intelligence — Scan Account
 * Location: src/trigger/wf28-creative-intel-scan-account.ts
 *
 * Pulls all active ads from a single advertiser's Page ID via Meta Ad Library API.
 * Returns: ad data with copy, format, runtime, and creative metadata
 */

import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

const scanAccountInput = z.object({
  page_id: z.string(),
  page_name: z.string(),
  tier: z.number(),
  scan_date: z.string(),
});

export interface AdData {
  meta_ad_id: string;
  page_id: string;
  page_name: string;
  ad_creation_time: string;
  delivery_start_time: string;
  delivery_stop_time: string | null;
  ad_copy: string[];
  headlines: string[];
  descriptions: string[];
  snapshot_url: string;
  media_type: string;
  publisher_platforms: string[];
  days_running: number;
  variation_count: number;
}

export const wf28CreativeIntelScanAccount = schemaTask({
  id: "wf28-creative-intel-scan-account",
  schema: scanAccountInput,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    randomize: true,
  },
  run: async (payload): Promise<AdData[]> => {
    const { page_id, page_name, scan_date } = payload;

    const accessToken = process.env.META_AD_LIBRARY_ACCESS_TOKEN;
    if (!accessToken) {
      console.error("WF28 scan-account: Missing META_AD_LIBRARY_ACCESS_TOKEN");
      return [];
    }

    // Meta Ad Library API endpoint
    const baseUrl = "https://graph.facebook.com/v19.0/ads_archive";
    const params = new URLSearchParams({
      access_token: accessToken,
      ad_reached_countries: "US",
      search_page_ids: page_id,
      ad_active_status: "ALL", // Get active AND inactive
      fields: [
        "id",
        "ad_creation_time",
        "ad_creative_bodies",
        "ad_creative_link_captions",
        "ad_creative_link_descriptions",
        "ad_creative_link_titles",
        "ad_delivery_start_time",
        "ad_delivery_stop_time",
        "ad_snapshot_url",
        "page_id",
        "page_name",
        "publisher_platforms",
        "languages",
        "media_type",
      ].join(","),
      limit: "100",
    });

    try {
      const response = await fetch(`${baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`WF28 scan-account: API error for ${page_name}:`, errorText);
        return [];
      }

      const data = await response.json();
      const ads = data.data || [];

      console.log(`WF28 scan-account: Found ${ads.length} ads for ${page_name}`);

      // Transform API response to AdData format
      const adData: AdData[] = ads.map((ad: any) => {
        const creationTime = ad.ad_creation_time || null;
        const startTime = ad.ad_delivery_start_time || null;
        const stopTime = ad.ad_delivery_stop_time || null;

        // Calculate days running
        let daysRunning = 0;
        if (startTime) {
          const start = new Date(startTime);
          const end = stopTime ? new Date(stopTime) : new Date();
          daysRunning = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }

        return {
          meta_ad_id: ad.id,
          page_id: ad.page_id || page_id,
          page_name: ad.page_name || page_name,
          ad_creation_time: creationTime,
          delivery_start_time: startTime,
          delivery_stop_time: stopTime,
          ad_copy: ad.ad_creative_bodies || [],
          headlines: ad.ad_creative_link_titles || [],
          descriptions: ad.ad_creative_link_descriptions || [],
          snapshot_url: ad.ad_snapshot_url || "",
          media_type: ad.media_type || "unknown",
          publisher_platforms: ad.publisher_platforms || [],
          days_running: daysRunning,
          variation_count: (ad.ad_creative_bodies || []).length,
        };
      });

      return adData;
    } catch (error) {
      console.error(`WF28 scan-account: Error scanning ${page_name}:`, error);
      return [];
    }
  },
});
