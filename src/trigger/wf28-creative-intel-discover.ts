/**
 * WF28 Creative Intelligence — Discovery
 * Keyword-based discovery of new advertisers via Meta Ad Library.
 * Assesses quality with Haiku, posts candidates to Slack for approval.
 */

import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "../lib/db.js";
import { DISCOVERY_THRESHOLDS } from "./wf28-creative-intel-constants.js";

const discoverInput = z.object({
  keywords: z.array(z.string()),
  scan_date: z.string(),
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const wf28CreativeIntelDiscover = schemaTask({
  id: "wf28-creative-intel-discover",
  schema: discoverInput,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    randomize: true,
  },
  run: async (payload) => {
    const { keywords, scan_date } = payload;

    const accessToken = process.env.META_AD_LIBRARY_ACCESS_TOKEN;
    if (!accessToken) {
      console.error("WF28 discover: Missing META_AD_LIBRARY_ACCESS_TOKEN");
      return { discovered: 0, candidates: [] };
    }

    // Get existing tracked page_ids to avoid duplicates
    const existingResult = await query(
      `SELECT page_id FROM tracked_advertisers WHERE status = 'active'`
    );
    const existingPageIds = new Set(existingResult.rows.map((r: any) => r.page_id));

    const candidates: any[] = [];

    // Search for each keyword
    for (const keyword of keywords) {
      try {
        const baseUrl = "https://graph.facebook.com/v19.0/ads_archive";
        const params = new URLSearchParams({
          access_token: accessToken,
          ad_reached_countries: "US",
          search_terms: keyword,
          ad_active_status: "ACTIVE",
          fields: "page_id,page_name,ad_creative_bodies,ad_delivery_start_time,media_type",
          limit: "30",
        });

        const response = await fetch(`${baseUrl}?${params.toString()}`);
        if (!response.ok) continue;

        const data = await response.json();
        const ads = data.data || [];

        // Group ads by page_id
        const byPage = new Map<string, any[]>();
        for (const ad of ads) {
          if (!ad.page_id || existingPageIds.has(ad.page_id)) continue;
          if (!byPage.has(ad.page_id)) {
            byPage.set(ad.page_id, []);
          }
          byPage.get(ad.page_id)!.push(ad);
        }

        // Assess each new page
        for (const [page_id, pageAds] of byPage) {
          if (pageAds.length < DISCOVERY_THRESHOLDS.MIN_ACTIVE_ADS) continue;

          const page_name = pageAds[0].page_name || "Unknown";
          const sample = pageAds.slice(0, DISCOVERY_THRESHOLDS.SAMPLE_SIZE);

          // Quick quality assessment with Haiku
          const sampleText = sample.map((ad, i) => {
            const copy = (ad.ad_creative_bodies || []).join(" ");
            return `Ad ${i + 1}: ${copy.substring(0, 150)}`;
          }).join("\n");

          const prompt = `Rate this advertiser's creative quality (1-10):

Advertiser: ${page_name}
Active ads: ${pageAds.length}
Sample (${sample.length} ads):
${sampleText}

Score based on: creative quality, relevance to local business marketing, production value.
Return only: {"quality_score": X, "reasoning": "brief reason"}`;

          const aiResponse = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 256,
            messages: [{ role: "user", content: prompt }],
          });

          const block = aiResponse.content[0];
          const rawText = block.type === "text" ? block.text : "{}";
          let assessment: any = { quality_score: 0, reasoning: "Parse error" };

          try {
            assessment = JSON.parse(rawText.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
          } catch {}

          if (assessment.quality_score >= DISCOVERY_THRESHOLDS.MIN_QUALITY_SCORE) {
            // Count format breakdown
            const formatBreakdown = {
              video: pageAds.filter((a: any) => a.media_type === "video").length,
              static: pageAds.filter((a: any) => a.media_type === "image").length,
              carousel: pageAds.filter((a: any) => a.media_type === "carousel").length,
            };

            // Calculate longest running
            const longestRunning = Math.max(...pageAds.map((a: any) => {
              if (!a.ad_delivery_start_time) return 0;
              const start = new Date(a.ad_delivery_start_time);
              const now = new Date();
              return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            }));

            const sampleCopy = sample[0]?.ad_creative_bodies?.[0] || "No copy available";

            // Save to discovery_candidates
            await query(
              `INSERT INTO discovery_candidates (
                page_id, page_name, active_ad_count, longest_running_days,
                format_breakdown, sample_copy, quality_score, discovered_via_keyword
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT DO NOTHING`,
              [
                page_id,
                page_name,
                pageAds.length,
                longestRunning,
                formatBreakdown,
                sampleCopy.substring(0, 500),
                assessment.quality_score,
                keyword,
              ]
            );

            candidates.push({
              page_id,
              page_name,
              active_ad_count: pageAds.length,
              quality_score: assessment.quality_score,
              discovered_via: keyword,
            });

            console.log(`WF28 discover: Found candidate ${page_name} (score: ${assessment.quality_score})`);
          }
        }
      } catch (error) {
        console.error(`WF28 discover: Error searching keyword "${keyword}":`, error);
      }
    }

    console.log(`WF28 discover: Found ${candidates.length} new candidates`);
    return { discovered: candidates.length, candidates };
  },
});
