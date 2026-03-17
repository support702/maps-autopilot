/**
 * WF12 — Pre-Call Sales Intelligence Pipeline
 * Location: src/trigger/wf12-pre-call-pipeline.ts
 *
 * Fires when a prospect books a sales call via GHL webhook. Performs a full
 * intelligence sweep: Google Places lookup, market classification, revenue math,
 * Slack briefing, sales rep email, GHL tagging, and cold-lead alerting.
 *
 * Depends on: src/lib/db.ts, src/lib/email.ts, src/lib/ghl.ts
 * Output: prospect_audits row + static JSON for sales-deck-app + Slack post + email
 */

import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { sendEmail } from "../lib/email";
// GHL v2 API calls are made inline via fetch — no ghl.ts import needed
import axios from "axios";


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WF12Payload {
  // Standard snake_case fields
  business_name?: string;
  city?: string;
  state?: string;
  niche_key?: string;
  years_in_business?: string;
  has_gbp?: string;
  review_estimate?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  sales_rep_email?: string;
  sales_rep_name?: string;
  appointment_date?: string;
  appointment_time?: string;
  full_name?: string;
  first_name?: string;
  email?: string;
  phone?: string;
  // GHL sends capitalized field names with spaces — allow any key
  [key: string]: unknown;
}

interface PlaceResult {
  name: string;
  place_id: string;
  rating: number;
  user_ratings_total: number;
  photos?: unknown[];
}

type Track = "guarantee" | "aggressive" | "foundation";
type LeadTemperature = "Hot" | "Warm" | "Cool";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AVG_TICKETS: Record<string, number> = {
  mechanical: 450,
  hvac: 800,
  dental: 1200,
  plumbing: 350,
  roofing: 8500,
  default: 500,
};

const GUARANTEE_TEXT: Record<Track, string> = {
  guarantee: "Strong — Top 3 guarantee eligible",
  aggressive: "Moderate — Measurable improvement + 15 calls/month",
  foundation: "Premium — 90-day checkpoint, structured growth",
};

const REVIEW_ESTIMATE_MAP: Record<string, number> = {
  "0-10": 5,
  "10-30": 20,
  "30-100": 65,
  "100+": 150,
};

const OPERATOR_EMAIL = "tom@haildentpro.com";
const GHL_LOCATION_ID = "byAnQgTNCLUTYVhKUglZ";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseReviewEstimate(est: string): number {
  return REVIEW_ESTIMATE_MAP[est] || 10;
}

function classifyMarketTier(
  totalCompetitors: number,
  hasGbp: string
): MarketTier {
  if (totalCompetitors < 20 && hasGbp === "Yes") return "A";
  if (totalCompetitors >= 20 && totalCompetitors <= 50) return "B";
  return "C";
}

function classifyLeadTemperature(
  reviews: number,
  yearsStr: string,
  tier: MarketTier
): LeadTemperature {
  // Guard against undefined, null, or empty strings from missing GHL fields
  if (!yearsStr || typeof yearsStr !== "string") return "Cold";

  const has5Plus = yearsStr.includes("5");
  const has3Plus = yearsStr.includes("3") || has5Plus;

  if (reviews >= 30 && has5Plus && tier === "A") return "Hot";
  if (reviews >= 10 && has3Plus && (tier === "A" || tier === "B")) return "Warm";
  if (reviews < 10 && yearsStr.includes("1") && (tier === "B" || tier === "C"))
    return "Cool";
  return "Cold";
}

function calculateOpportunity(
  competitors: Array<{ user_ratings_total?: number }>,
  prospectReviews: number,
  prospectRank: number,
  nicheKey: string,
  avgTicket: number = 450
): {
  top3EstimatedCalls: string;
  prospectEstimatedCalls: string;
  opportunityGapCalls: string;
  opportunityMonthly: string;
  opportunityAnnual: string;
} {
  // Step 1: Estimate market search volume from competitor data
  const top10Competitors = competitors.slice(0, 10);
  const totalMarketReviews = top10Competitors.reduce(
    (sum, comp) => sum + (comp.user_ratings_total || 0),
    0
  );

  // Market demand tiers based on total reviews
  let dailySearches = 10; // default
  if (totalMarketReviews > 5000) {
    dailySearches = 70; // high demand (60-80)
  } else if (totalMarketReviews >= 2000) {
    dailySearches = 45; // medium demand (30-60)
  } else if (totalMarketReviews >= 500) {
    dailySearches = 22; // moderate demand (15-30)
  } else {
    dailySearches = 10; // low demand (5-15)
  }

  // Step 2: Niche-specific call rates (from niche_configs)
  const nicheCallRates: Record<string, number> = {
    mechanical: 0.15,
    hvac: 0.20,
    plumbing: 0.22,
    dental: 0.08,
    law: 0.05,
  };
  const callRate = nicheCallRates[nicheKey] || 0.15;

  // Step 3: Calculate estimated monthly calls for top 3
  const monthlySearches = dailySearches * 30;
  const top3Calls = Math.round(monthlySearches * 0.75 * callRate); // top 3 capture 75%
  const perPositionTop3 = Math.round(top3Calls / 3);

  // Step 4: Calculate prospect's current estimated calls
  const prospectShare = totalMarketReviews > 0 ? prospectReviews / totalMarketReviews : 0.01;
  const prospectCalls = Math.max(2, Math.round(monthlySearches * prospectShare * callRate));

  // Step 5: Calculate opportunity
  const additionalCalls = Math.max(5, perPositionTop3 - prospectCalls);

  // Step 6: Present as range (±20% for honesty)
  const opportunityMonthlyMid = additionalCalls * avgTicket;
  const opportunityLow = Math.round(opportunityMonthlyMid * 0.8);
  const opportunityHigh = Math.round(opportunityMonthlyMid * 1.2);
  const opportunityAnnualLow = opportunityLow * 12;
  const opportunityAnnualHigh = opportunityHigh * 12;

  const callsLow = Math.round(additionalCalls * 0.8);
  const callsHigh = Math.round(additionalCalls * 1.2);

  return {
    top3EstimatedCalls: `${perPositionTop3 - 5}-${perPositionTop3 + 5}`,
    prospectEstimatedCalls: `${prospectCalls}`,
    opportunityGapCalls: `${callsLow}-${callsHigh}`,
    opportunityMonthly: `$${opportunityLow.toLocaleString()}-$${opportunityHigh.toLocaleString()}`,
    opportunityAnnual: `$${opportunityAnnualLow.toLocaleString()}-$${opportunityAnnualHigh.toLocaleString()}`,
  };
}

// ---------------------------------------------------------------------------
// NEW: Two-Dimensional Scoring & Track Assignment
// ---------------------------------------------------------------------------

interface AuditData {
  reviewCount: number;
  rating: number;
  gbpVerified: boolean;
  photosCount: number;
  lastPostWithin30Days: boolean;
  hasProducts: boolean;
  hasServices: boolean;
  hasQA: boolean;
  yearsInBusiness: number;
  websiteGrade?: string;
  competitorCount: number;
  top3Competitors: Array<{ name: string; user_ratings_total: number; rating: number }>;
  nicheAvgTicket: number;
}

interface MonthlyProjection {
  month: number;
  estimatedRank: number;
  estimatedReviews: number;
  estimatedCalls: string;
  keyMilestone: string;
}

interface TrackInfo {
  name: string;
  label: Track;
  guaranteeEligible: boolean;
  guaranteeText: string;
  deckSlides: string;
}

interface Projection {
  track: TrackInfo;
  projections: MonthlyProjection[];
  reviewGapAnalysis: {
    currentReviews: number;
    top3AverageReviews: number;
    position3Reviews: number;
    estimatedMonthsToClose: number;
  };
  revenueEstimate: {
    avgTicket: number;
    estimatedMonth3Calls: string;
    estimatedMonth3Revenue: string;
  };
}

function calculateClientStrength(data: AuditData): number {
  let score = 0;

  // Reviews (max 40 points)
  if (data.reviewCount >= 100) score += 40;
  else if (data.reviewCount >= 50) score += 30;
  else if (data.reviewCount >= 30) score += 20;
  else if (data.reviewCount >= 10) score += 10;

  // Rating (max 15 points)
  if (data.rating >= 4.5) score += 15;
  else if (data.rating >= 4.0) score += 10;
  else if (data.rating >= 3.5) score += 5;

  // GBP completeness (max 20 points)
  let gbpPoints = 0;
  if (data.gbpVerified) gbpPoints += 8;
  if (data.photosCount >= 10) gbpPoints += 4;
  if (data.lastPostWithin30Days) gbpPoints += 4;
  if (data.hasProducts || data.hasServices) gbpPoints += 2;
  if (data.hasQA) gbpPoints += 2;
  score += gbpPoints;

  // Years in business (max 15 points)
  if (data.yearsInBusiness >= 5) score += 15;
  else if (data.yearsInBusiness >= 3) score += 10;
  else if (data.yearsInBusiness >= 1) score += 5;

  // Website quality (max 10 points)
  if (data.websiteGrade === "A") score += 10;
  else if (data.websiteGrade === "B") score += 7;
  else if (data.websiteGrade === "C") score += 4;
  else if (data.websiteGrade === "D") score += 2;

  return score;
}

function calculateMarketDifficulty(data: AuditData): number {
  let score = 0;

  // Competitor count (max 30 points)
  if (data.competitorCount >= 50) score += 30;
  else if (data.competitorCount >= 30) score += 20;
  else if (data.competitorCount >= 20) score += 15;
  else if (data.competitorCount >= 10) score += 8;

  // Top 3 average review count (max 30 points)
  const top3AvgReviews =
    data.top3Competitors.reduce((sum, c) => sum + c.user_ratings_total, 0) / 3;
  if (top3AvgReviews >= 300) score += 30;
  else if (top3AvgReviews >= 150) score += 20;
  else if (top3AvgReviews >= 75) score += 12;
  else if (top3AvgReviews >= 30) score += 5;

  // Review gap (max 25 points)
  const reviewGap =
    data.top3Competitors[2]?.user_ratings_total - data.reviewCount;
  if (reviewGap > 200) score += 25;
  else if (reviewGap > 100) score += 18;
  else if (reviewGap > 50) score += 12;
  else if (reviewGap > 20) score += 5;

  // Chain dominance (max 15 points)
  const chainNames = [
    "meineke",
    "jiffy lube",
    "firestone",
    "pep boys",
    "midas",
    "valvoline",
    "take 5",
    "grease monkey",
    "christian brothers",
    "caliber collision",
    "maaco",
    "service king",
    "gerber collision",
  ];
  const chainCount = data.top3Competitors.filter((c) =>
    chainNames.some((chain) => c.name.toLowerCase().includes(chain))
  ).length;
  score += chainCount * 5;

  return score;
}

function assignTrack(
  clientStrength: number,
  marketDifficulty: number
): TrackInfo {
  // Guarantee Track: strong client + manageable market
  if (clientStrength >= 55 && marketDifficulty <= 45) {
    return {
      name: "Guarantee Track",
      label: "guarantee",
      guaranteeEligible: true,
      guaranteeText:
        "Top 3 in 90 days or we work free for up to 6 months",
      deckSlides: "standard_with_guarantee",
    };
  }

  // Aggressive Improvement Track: moderate gap, winnable
  // Expanded thresholds: client >= 25 and market <= 75
  // Special case: strong clients (70+) can handle tougher markets (up to 90)
  const aggressiveEligible =
    (clientStrength >= 25 && marketDifficulty <= 75) ||
    (clientStrength >= 70 && marketDifficulty <= 90);
    
  if (aggressiveEligible) {
    return {
      name: "Aggressive Improvement Track",
      label: "aggressive",
      guaranteeEligible: false,
      guaranteeText:
        "Significant ranking improvement within 90 days. Top 5 positioning expected within 90 days, Top 3 within 6 months based on similar markets.",
      deckSlides: "standard_no_guarantee",
    };
  }

  // Foundation Track: big gap, long road
  return {
    name: "Foundation Track",
    label: "foundation",
    guaranteeEligible: false,
    guaranteeText:
      "Building your competitive foundation. Expect 6-9 months to reach competitive positioning. First 90 days focused on profile, reviews, and citations baseline.",
    deckSlides: "foundation_roadmap",
  };
}

function generateProjection(
  clientStrength: number,
  marketDifficulty: number,
  track: TrackInfo,
  data: AuditData,
  currentRank: number
): Projection {
  const reviewGap =
    data.top3Competitors[2]?.user_ratings_total - data.reviewCount;
  const estimatedReviewsPerMonth = 10;
  const monthsToCloseReviewGap =
    reviewGap > 0 ? Math.ceil(reviewGap / estimatedReviewsPerMonth) : 0;

  let projections: MonthlyProjection[];

  if (track.label === "guarantee") {
    projections = [
      {
        month: 1,
        estimatedRank: Math.max(1, currentRank - 5),
        estimatedReviews: data.reviewCount + estimatedReviewsPerMonth,
        estimatedCalls: "5-10 new tracked calls",
        keyMilestone:
          "GBP fully optimized, citations submitted, review surge launched, call tracking live",
      },
      {
        month: 3,
        estimatedRank: Math.max(1, Math.min(3, currentRank - 12)),
        estimatedReviews: data.reviewCount + estimatedReviewsPerMonth * 3,
        estimatedCalls: "15-30 tracked calls/month",
        keyMilestone:
          "Top 3 positioning for primary keyword, review gap significantly closed",
      },
      {
        month: 6,
        estimatedRank: Math.max(1, Math.min(2, currentRank - 15)),
        estimatedReviews: data.reviewCount + estimatedReviewsPerMonth * 6,
        estimatedCalls: "25-50 tracked calls/month",
        keyMilestone:
          "Dominant Maps position, review velocity sustaining, Money Sheet showing clear ROI",
      },
    ];
  } else if (track.label === "aggressive") {
    projections = [
      {
        month: 1,
        estimatedRank: Math.max(1, currentRank - 3),
        estimatedReviews: data.reviewCount + estimatedReviewsPerMonth,
        estimatedCalls: "3-8 new tracked calls",
        keyMilestone:
          "GBP rebuilt, citations submitted, review surge launched",
      },
      {
        month: 3,
        estimatedRank: Math.max(1, currentRank - 8),
        estimatedReviews: data.reviewCount + estimatedReviewsPerMonth * 3,
        estimatedCalls: "10-20 tracked calls/month",
        keyMilestone:
          "Top 5-7 positioning, noticeable call increase, citation network indexing",
      },
      {
        month: 6,
        estimatedRank: Math.max(1, Math.min(3, currentRank - 14)),
        estimatedReviews: data.reviewCount + estimatedReviewsPerMonth * 6,
        estimatedCalls: "20-35 tracked calls/month",
        keyMilestone:
          "Approaching Top 3, review parity with competitors, strong Maps presence",
      },
    ];
  } else {
    // foundation
    projections = [
      {
        month: 1,
        estimatedRank: Math.max(1, currentRank - 2),
        estimatedReviews: data.reviewCount + estimatedReviewsPerMonth,
        estimatedCalls: "1-5 new tracked calls",
        keyMilestone:
          "GBP created/rebuilt from scratch, initial citations submitted, review collection started",
      },
      {
        month: 3,
        estimatedRank: Math.max(1, currentRank - 5),
        estimatedReviews: data.reviewCount + estimatedReviewsPerMonth * 3,
        estimatedCalls: "5-12 tracked calls/month",
        keyMilestone:
          "Profile competitive with bottom of page 1, citation network building, review base growing",
      },
      {
        month: 6,
        estimatedRank: Math.max(1, currentRank - 10),
        estimatedReviews: data.reviewCount + estimatedReviewsPerMonth * 6,
        estimatedCalls: "10-20 tracked calls/month",
        keyMilestone:
          "Approaching Top 5-7, competitive profile, consistent review velocity",
      },
      {
        month: 9,
        estimatedRank: Math.max(1, currentRank - 14),
        estimatedReviews: data.reviewCount + estimatedReviewsPerMonth * 9,
        estimatedCalls: "15-30 tracked calls/month",
        keyMilestone:
          "Competing for Top 3, strong profile authority, established review reputation",
      },
    ];
  }

  const top3AvgReviews = Math.round(
    data.top3Competitors.reduce((s, c) => s + c.user_ratings_total, 0) / 3
  );

  return {
    track,
    projections,
    reviewGapAnalysis: {
      currentReviews: data.reviewCount,
      top3AverageReviews: top3AvgReviews,
      position3Reviews: data.top3Competitors[2]?.user_ratings_total || 0,
      estimatedMonthsToClose: monthsToCloseReviewGap,
    },
    revenueEstimate: {
      avgTicket: data.nicheAvgTicket,
      estimatedMonth3Calls:
        projections.find((p) => p.month === 3)?.estimatedCalls || "5-15",
      estimatedMonth3Revenue: `$${data.nicheAvgTicket * 10}-${data.nicheAvgTicket * 25}/month`,
    },
  };
}

function generateRepTalkingPoints(track: TrackInfo, projection: Projection): string {
  if (track.label === "guarantee") {
    return `• Lead with guarantee confidently: "Based on your market, we guarantee Top 3 in 90 days or we work free."\n• Territory close: "Your area is open now — once another shop locks in, that spot is gone."\n• Money math: "${projection.revenueEstimate.estimatedMonth3Revenue} in new monthly revenue by Month 3."`;
  }

  if (track.label === "aggressive") {
    return `• Open with: "My job is to run your numbers and see which track you're on."\n• Position as: "You're in a competitive market but the gap is closeable. Here's what Month 1, 3, and 6 look like."\n• Don't mention guarantee unless they ask. If they ask: "The guarantee applies in less competitive markets. Your market is tougher, but the results path is clear."\n• Close on progress: "You'll see the Money Sheet every month proving the needle is moving."`;
  }

  // foundation
  return `• Open with: "My job is to run your numbers and give you an honest picture."\n• Position as: "90-Day Foundation Sprint — we're building your competitive base from scratch."\n• Set timeline: "Months 1-3 are foundation. Months 3-6 are climbing. Months 6-9 are competing for Top 3."\n• Close on investment: "Every month you wait, the gap gets wider. Starting now means you're competitive in 6 months instead of 12."\n• Money Sheet is key: "You'll see progress every single month in real numbers."`;
}

// ---------------------------------------------------------------------------
// NEW: Keyword Gap Analysis
// ---------------------------------------------------------------------------

interface KeywordVisibility {
  keyword: string;
  prospectVisible: boolean;
  prospectRank: number | null;
  dominantCompetitor: string | null;
  dominantCompetitorRank: number | null;
}

interface KeywordGapResult {
  keywords: KeywordVisibility[];
  gapScore: number; // 0-100 (100 = visible for all keywords)
  totalKeywords: number;
  visibleCount: number;
  missingCount: number;
  dominantCompetitorName: string;
  dominantCompetitorKeywordCount: number;
}

async function checkKeywordVisibility(
  keyword: string,
  city: string,
  state: string,
  prospectPlaceId: string | null
): Promise<KeywordVisibility> {
  try {
    const searchQuery = `${keyword} in ${city} ${state}`;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${process.env.GOOGLE_API_KEY}`;
    const { data } = await axios.get(url, { timeout: 10000 });

    const results: Array<{ place_id: string; name: string }> = data.results || [];

    // Check if prospect appears in results
    let prospectVisible = false;
    let prospectRank: number | null = null;
    if (prospectPlaceId) {
      const idx = results.findIndex((r) => r.place_id === prospectPlaceId);
      if (idx !== -1) {
        prospectVisible = true;
        prospectRank = idx + 1;
      }
    }

    // Find the top competitor (first result that isn't the prospect)
    const topResult = results.find((r) => r.place_id !== prospectPlaceId);

    return {
      keyword,
      prospectVisible,
      prospectRank,
      dominantCompetitor: topResult?.name || null,
      dominantCompetitorRank: topResult ? 1 : null,
    };
  } catch (err) {
    console.error(`[WF12] Keyword visibility check failed for "${keyword}":`, err);
    return {
      keyword,
      prospectVisible: false,
      prospectRank: null,
      dominantCompetitor: null,
      dominantCompetitorRank: null,
    };
  }
}

async function runKeywordGapAnalysis(
  keywords: string[],
  city: string,
  state: string,
  prospectPlaceId: string | null
): Promise<KeywordGapResult> {
  // Check each keyword (run sequentially to avoid rate limits)
  const results: KeywordVisibility[] = [];
  for (const keyword of keywords) {
    const result = await checkKeywordVisibility(keyword, city, state, prospectPlaceId);
    results.push(result);
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  const visibleCount = results.filter((r) => r.prospectVisible).length;
  const missingCount = results.length - visibleCount;
  const gapScore = results.length > 0 ? Math.round((visibleCount / results.length) * 100) : 0;

  // Find the most dominant competitor (appears most often as #1)
  const competitorCounts: Record<string, number> = {};
  for (const r of results) {
    if (r.dominantCompetitor) {
      competitorCounts[r.dominantCompetitor] = (competitorCounts[r.dominantCompetitor] || 0) + 1;
    }
  }
  const sortedCompetitors = Object.entries(competitorCounts).sort((a, b) => b[1] - a[1]);
  const dominantCompetitorName = sortedCompetitors[0]?.[0] || "Unknown";
  const dominantCompetitorKeywordCount = sortedCompetitors[0]?.[1] || 0;

  return {
    keywords: results,
    gapScore,
    totalKeywords: results.length,
    visibleCount,
    missingCount,
    dominantCompetitorName,
    dominantCompetitorKeywordCount,
  };
}

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const wf12PreCallPipeline = task({
  id: "wf12-pre-call-pipeline",
  retry: { maxAttempts: 2 },
  run: async (rawPayload: WF12Payload) => {
    // Unwrap if proxy-wrapped (check both GHL and snake_case field names)
    const payload: WF12Payload =
      rawPayload.business_name || rawPayload.city ||
      rawPayload["Business Name"] || rawPayload["City"]
        ? rawPayload
        : ((rawPayload as unknown as Record<string, unknown>).payload as WF12Payload) ||
          rawPayload;

    // ------------------------------------------------------------------
    // GHL Field Mapping: GHL sends capitalized names with spaces;
    // map to local variables used throughout the pipeline.
    // ------------------------------------------------------------------

    const business_name =
      (payload["Business Name"] as string) || payload.business_name || "";
    const city =
      (payload["City"] as string) || payload.city || "";
    const state =
      (payload["State"] as string) || payload.state || "TX";
    const niche_key =
      (payload["Niche Key"] as string) || payload.niche_key || "mechanical";
    const website_url =
      (payload["Website URL"] as string) || (payload as Record<string, unknown>).website_url as string || "";
    const has_gbp =
      (payload["Do you have a Google Business Profile?"] as string) ||
      payload.has_gbp || "Yes";

    // Handle dropdown arrays (GHL sends some fields as arrays)
    const review_estimate_raw = payload["Roughly how many Google reviews do you have?"];
    const review_estimate = Array.isArray(review_estimate_raw)
      ? (review_estimate_raw[0] as string)
      : (review_estimate_raw as string) || payload.review_estimate || "";

    const years_raw = payload["How long have you been in business?"];
    const years_in_business = Array.isArray(years_raw)
      ? (years_raw[0] as string)
      : (years_raw as string) || payload.years_in_business || "";

    // Contact info
    const contact_name =
      (payload.full_name as string) || payload.contact_name ||
      (payload.first_name as string) || "";
    const contact_email =
      (payload.email as string) || payload.contact_email || "";
    const contact_phone =
      (payload.phone as string) || payload.contact_phone || "";

    // Sales rep defaults
    const sales_rep_email =
      payload.sales_rep_email || "tom@haildentpro.com";
    const sales_rep_name =
      payload.sales_rep_name || "Chris";

    // Pass-through fields (no GHL alternate names)
    const appointment_date = payload.appointment_date || "";
    const appointment_time = payload.appointment_time || "";

    console.log(
      `[WF12] Starting pre-call pipeline for: ${business_name} in ${city}, ${state}`
    );

    // ------------------------------------------------------------------
    // Step 1: Google Places — prospect + competitors
    // ------------------------------------------------------------------

    let prospectPlace: PlaceResult | null = null;
    let allCompetitors: PlaceResult[] = [];

    try {
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        business_name + " " + city + " " + state
      )}&key=${process.env.GOOGLE_API_KEY}`;
      const { data: searchData } = await axios.get(searchUrl, {
        timeout: 10000,
      });

      if (searchData.results?.length > 0) {
        const r = searchData.results[0];
        prospectPlace = {
          name: r.name,
          place_id: r.place_id,
          rating: r.rating || 0,
          user_ratings_total: r.user_ratings_total || 0,
          photos: r.photos,
        };
      }
    } catch (err) {
      console.error("[WF12] Google Places prospect search failed:", err);
    }

    // ------------------------------------------------------------------
    // Step 2: Load niche config
    // ------------------------------------------------------------------

    const { rows: nicheRows } = await query(
      "SELECT * FROM niche_configs WHERE niche_key = $1",
      [niche_key]
    );
    const nicheConfig = nicheRows[0] || null;
    const nicheName = nicheConfig?.niche_name || niche_key;

    // Search for competitors using niche name
    try {
      const compUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        nicheName + " in " + city + " " + state
      )}&key=${process.env.GOOGLE_API_KEY}`;
      const { data: compData } = await axios.get(compUrl, { timeout: 10000 });

      if (compData.results?.length > 0) {
        allCompetitors = compData.results
          .filter(
            (r: Record<string, unknown>) =>
              r.place_id !== prospectPlace?.place_id
          )
          .map((r: Record<string, unknown>) => ({
            name: r.name as string,
            place_id: r.place_id as string,
            rating: (r.rating as number) || 0,
            user_ratings_total: (r.user_ratings_total as number) || 0,
            photos: r.photos,
          }));
      }
    } catch (err) {
      console.error("[WF12] Google Places competitor search failed:", err);
    }

    // Sort by review count descending, take top 5 for analysis, top 3 for display
    allCompetitors.sort(
      (a, b) => b.user_ratings_total - a.user_ratings_total
    );
    const topCompetitors = allCompetitors.slice(0, 3);
    const totalCompetitors = allCompetitors.length;

    const prospectReviews = prospectPlace?.user_ratings_total || 0;
    const prospectRating = prospectPlace?.rating || 0;

    // Determine prospect rank among all competitors
    const allSorted = [...allCompetitors];
    if (prospectPlace) {
      allSorted.push(prospectPlace);
      allSorted.sort((a, b) => b.user_ratings_total - a.user_ratings_total);
    }
    const prospectRank =
      allSorted.findIndex(
        (p) => p.place_id === prospectPlace?.place_id
      ) + 1 || totalCompetitors + 1;

    // Review gap: how many reviews behind the average of top 3
    const top3AvgReviews =
      topCompetitors.length > 0
        ? Math.round(
            topCompetitors.reduce(
              (sum, c) => sum + c.user_ratings_total,
              0
            ) / topCompetitors.length
          )
        : 0;
    const reviewGap = Math.max(0, top3AvgReviews - prospectReviews);

    // ------------------------------------------------------------------
    // Step 3: NEW - Two-Dimensional Scoring & Track Assignment
    // ------------------------------------------------------------------

    // Parse years in business to number
    let yearsNum = 0;
    if (years_in_business) {
      if (years_in_business.includes("5")) yearsNum = 5;
      else if (years_in_business.includes("3")) yearsNum = 3;
      else if (years_in_business.includes("1")) yearsNum = 1;
    }

    // Build audit data for scoring
    const auditData: AuditData = {
      reviewCount: prospectReviews,
      rating: prospectRating,
      gbpVerified: has_gbp === "Yes",
      photosCount: (prospectPlace?.photos as unknown[] | undefined)?.length || 0,
      lastPostWithin30Days: false, // TODO: check posts if available
      hasProducts: false, // TODO: check if available
      hasServices: false, // TODO: check if available
      hasQA: false, // TODO: check if available
      yearsInBusiness: yearsNum,
      websiteGrade: undefined, // TODO: from WF01B if available
      competitorCount: totalCompetitors,
      top3Competitors: topCompetitors.map(c => ({
        name: c.name,
        user_ratings_total: c.user_ratings_total,
        rating: c.rating
      })),
      nicheAvgTicket: AVG_TICKETS[niche_key] || AVG_TICKETS.default,
    };

    const clientStrength = calculateClientStrength(auditData);
    const marketDifficulty = calculateMarketDifficulty(auditData);
    const track = assignTrack(clientStrength, marketDifficulty);
    const projection = generateProjection(
      clientStrength,
      marketDifficulty,
      track,
      auditData,
      prospectRank
    );
    const repTalkingPoints = generateRepTalkingPoints(track, projection);

    // Keep old tier/temperature for compatibility (use in some places)
    const tier = classifyMarketTier(totalCompetitors, has_gbp);
    const estimatedReviews = parseReviewEstimate(review_estimate);
    const temperature: LeadTemperature =
      track.label === "guarantee"
        ? "Hot"
        : track.label === "aggressive"
          ? "Warm"
          : "Cool";

    console.log(
      `[WF12] Track: ${track.name}, Client Strength: ${clientStrength}/100, Market Difficulty: ${marketDifficulty}/100, Competitors: ${totalCompetitors}`
    );

    // ------------------------------------------------------------------
    // Step 3.5: Keyword Gap Analysis
    // ------------------------------------------------------------------

    let keywordGapResult: KeywordGapResult | null = null;

    try {
      // Load high_ticket_keywords from niche_configs
      const highTicketKeywords: string[] = nicheConfig?.high_ticket_keywords || [];

      if (highTicketKeywords.length > 0) {
        console.log(`[WF12] Running keyword gap analysis for ${highTicketKeywords.length} keywords`);
        keywordGapResult = await runKeywordGapAnalysis(
          highTicketKeywords,
          city,
          state,
          prospectPlace?.place_id || null
        );
        console.log(`[WF12] Keyword gap score: ${keywordGapResult.gapScore}/100 (${keywordGapResult.visibleCount}/${keywordGapResult.totalKeywords} visible)`);
      } else {
        console.log("[WF12] No high_ticket_keywords configured for niche, skipping keyword gap analysis");
      }
    } catch (err) {
      console.error("[WF12] Keyword gap analysis failed (non-critical):", err);
    }

    // ------------------------------------------------------------------
    // Step 4: Revenue math
    // ------------------------------------------------------------------

    const avgTicket = AVG_TICKETS[niche_key] || AVG_TICKETS.default;
    const callOpportunity = calculateOpportunity(
      allCompetitors,
      prospectPlace?.user_ratings_total || 0,
      prospectRank,
      niche_key,
      avgTicket
    );
    const monthlyPrice = nicheConfig?.suggested_price || 500;
    const setupFee = monthlyPrice * 3;

    // ------------------------------------------------------------------
    // Step 5: Save to database
    // ------------------------------------------------------------------

    const auditId = `${niche_key}-${city
      .toLowerCase()
      .replace(/\s+/g, "-")}-${Date.now()}`;

    const competitorData = {
      competitors: topCompetitors,
      market_tier: tier,
      lead_temperature: temperature,
      offer_path: tier === "A" ? "Core" : "Premium",
      top3_estimated_calls: callOpportunity.top3EstimatedCalls,
      prospect_estimated_calls: callOpportunity.prospectEstimatedCalls,
      opportunity_gap_calls: callOpportunity.opportunityGapCalls,
      opportunity_monthly: callOpportunity.opportunityMonthly,
      opportunity_annual: callOpportunity.opportunityAnnual,
      avg_ticket: avgTicket,
      monthly_price: monthlyPrice,
      setup_fee: setupFee,
      sales_rep_email: sales_rep_email,
      sales_rep_name: sales_rep_name,
      appointment_date: appointment_date,
      appointment_time: appointment_time,
      prospect_rank: prospectRank,
      review_gap: reviewGap,
      contact_name: contact_name,
      contact_email: contact_email,
      audit_id: auditId,
      state: state,
    };

    try {
      await query(
        `INSERT INTO prospect_audits (
          business_name, city, niche_key,
          gbp_review_count, gbp_avg_rating, top_competitors,
          market_competition_level, guarantee_eligible,
          client_strength_score, market_difficulty_score,
          assigned_track, projection_data, rep_talking_points,
          review_gap_to_position3, top3_avg_reviews,
          chain_dominance_detected,
          keyword_gap_data, keyword_gap_score,
          dominant_competitor_name, dominant_competitor_keyword_count,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())`,
        [
          business_name,
          city,
          niche_key,
          prospectReviews,
          prospectRating,
          JSON.stringify(competitorData),
          tier,
          track.guaranteeEligible,
          clientStrength,
          marketDifficulty,
          track.label,
          JSON.stringify(projection),
          repTalkingPoints,
          reviewGap,
          top3AvgReviews,
          topCompetitors.some((c) =>
            [
              "meineke",
              "jiffy lube",
              "firestone",
              "pep boys",
              "midas",
              "valvoline",
            ].some((chain) => c.name.toLowerCase().includes(chain))
          ),
          keywordGapResult ? JSON.stringify(keywordGapResult) : null,
          keywordGapResult ? `${keywordGapResult.visibleCount}/${keywordGapResult.totalKeywords}` : null,
          keywordGapResult?.dominantCompetitor || null,
          keywordGapResult?.dominantCompetitorKeywordCount || null,
        ]
      );
    } catch (err) {
      console.error("[WF12] Failed to insert prospect_audits:", err);
    }

    // Write static JSON for the sales deck app (via SSH to VPS)
    const deckData = {
      audit_id: auditId,
      prospect_name: business_name,
      prospect_city: city,
      prospect_state: state,
      niche_label: nicheName,
      prospect_rank: `#${prospectRank}`,
      prospect_reviews: String(prospectReviews),
      prospect_rating: String(prospectRating),
      comp1_name: topCompetitors[0]?.name || "",
      comp1_reviews: String(topCompetitors[0]?.user_ratings_total || 0),
      comp1_rating: String(topCompetitors[0]?.rating || 0),
      comp2_name: topCompetitors[1]?.name || "",
      comp2_reviews: String(topCompetitors[1]?.user_ratings_total || 0),
      comp2_rating: String(topCompetitors[1]?.rating || 0),
      comp3_name: topCompetitors[2]?.name || "",
      comp3_reviews: String(topCompetitors[2]?.user_ratings_total || 0),
      comp3_rating: String(topCompetitors[2]?.rating || 0),
      review_gap: String(reviewGap),
      top3_estimated_calls: callOpportunity.top3EstimatedCalls,
      prospect_estimated_calls: callOpportunity.prospectEstimatedCalls,
      opportunity_gap_calls: callOpportunity.opportunityGapCalls,
      opportunity_monthly: callOpportunity.opportunityMonthly,
      opportunity_annual: callOpportunity.opportunityAnnual,
      avg_ticket: String(avgTicket),
      monthly_price: String(monthlyPrice),
      setup_fee: String(setupFee),
      market_tier: tier,
      track: track.label,
      keywordGap: keywordGapResult ? {
        score: keywordGapResult.gapScore,
        total: keywordGapResult.totalKeywords,
        visible: keywordGapResult.visibleCount,
        missing: keywordGapResult.totalKeywords - keywordGapResult.visibleCount,
        dominantCompetitor: keywordGapResult.dominantCompetitor || 'Unknown',
        dominantCompetitorKeywords: keywordGapResult.dominantCompetitorKeywordCount || 0,
        keywords: keywordGapResult.keywords.map(k => ({
          keyword: k.keyword,
          visible: k.prospectVisible,
          rank: k.prospectRank
        }))
      } : undefined,
    };

    // Step 7: Upload audit JSON to VPS via HTTP
    try {
      const uploadResponse = await fetch('http://147.182.235.147:3009/upload-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: process.env.TRIGGER_SECRET_KEY,
          auditId: auditId,
          data: deckData,
        }),
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
      }

      const uploadResult = await uploadResponse.json() as Record<string, unknown>;
      console.log(`[WF12] ✅ Audit JSON uploaded to VPS`, { filename: uploadResult.filename });
    } catch (error) {
      console.error('[WF12] Failed to upload audit JSON to VPS', { error });
      throw error; // This is critical — deck won't work without the JSON
    }

    // ------------------------------------------------------------------
    // Step 6: Generate deck URL
    // ------------------------------------------------------------------

    const deckUrl = `http://147.182.235.147:3008/deck/${auditId}?tier=${tier}`;

    // ------------------------------------------------------------------
    // Step 7: Slack briefing
    // ------------------------------------------------------------------

    // Territory conflict check
    let conflictStatus = "✅ Open — no conflicts";
    try {
      const { rows: conflicts } = await query(
        `SELECT client_id, business_name FROM clients
         WHERE LOWER(city) = LOWER($1) AND niche_key = $2 AND status = 'active'`,
        [city, niche_key]
      );
      if (conflicts.length > 0) {
        conflictStatus = `⚠️ CONFLICT: ${conflicts
          .map((c) => c.business_name)
          .join(", ")}`;
      }
    } catch (err) {
      console.error("[WF12] Territory conflict check failed:", err);
    }

    // Qualification checklist
    const reviews = parseReviewEstimate(review_estimate);
    const yrs = years_in_business;
    const qualChecks = [
      { label: "Has GBP", pass: has_gbp === "Yes" },
      { label: "10+ reviews", pass: reviews >= 10 },
      {
        label: "3+ years",
        pass: yrs ? (yrs.includes("3") || yrs.includes("5")) : false,
      },
      { label: "Market Tier A/B", pass: tier === "A" || tier === "B" },
      {
        label: "No territory conflict",
        pass: conflictStatus.startsWith("✅"),
      },
      {
        label: "Guarantee eligible",
        pass: tier === "A" || tier === "B",
      },
    ];
    const passCount = qualChecks.filter((q) => q.pass).length;
    const checklistText = qualChecks
      .map((q) => `${q.pass ? "✅" : "❌"} ${q.label}`)
      .join("\n");

    const slackMessage = {
      blocks: [
        // Header
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `New Booking: ${business_name} — ${track.name}`,
          },
        },
        // Lead Info
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: [
              `*Business:* ${business_name}`,
              `*City:* ${city}, ${state}`,
              `*Self-reported reviews:* ${review_estimate} | *Actual:* ${prospectReviews}`,
              `*Rating:* ${prospectRating} ⭐`,
              `*Years in business:* ${years_in_business}`,
              `*Call time:* ${appointment_date} at ${appointment_time}`,
            ].join("\n"),
          },
        },
        // Track Assignment
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: [
              `*🎯 TRACK: ${track.name.toUpperCase()}*`,
              `*Client Strength:* ${clientStrength}/100`,
              `*Market Difficulty:* ${marketDifficulty}/100`,
              `*Guarantee:* ${track.guaranteeEligible ? "✅ YES — Full Top 3 in 90 days" : "❌ NO — " + track.guaranteeText}`,
              `*Deck mode:* ${track.deckSlides}`,
            ].join("\n"),
          },
        },
        // Competitor Snapshot
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: [
              `*Top 3 Competitors:*`,
              ...topCompetitors.map(
                (c, i) =>
                  `  #${i + 1} ${c.name} — ${c.user_ratings_total} reviews, ${c.rating}⭐`
              ),
              `*Review gap to #3:* ${reviewGap} reviews`,
              `*Total competitors:* ${totalCompetitors}`,
            ].join("\n"),
          },
        },
        // Projection
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: [
              `*📊 PROJECTION:*`,
              ...projection.projections.map(
                (p) =>
                  `  Month ${p.month}: Rank ~#${p.estimatedRank}, ~${p.estimatedReviews} reviews, ${p.estimatedCalls}`
              ),
            ].join("\n"),
          },
        },
        // Rep Talking Points
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*🗣️ REP TALKING POINTS:*\n${repTalkingPoints}`,
          },
        },
        // Sales Deck Link
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*📊 Deck:* ${deckUrl}`,
          },
        },
      ],
    };

    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await axios.post(process.env.SLACK_WEBHOOK_URL, slackMessage);
      } catch (err) {
        console.error("[WF12] Slack post failed:", err);
      }
    }

    // ------------------------------------------------------------------

    // ------------------------------------------------------------------
    // Step 7.5: Generate Money Snapshot PDF
    // ------------------------------------------------------------------

    let pdfPath: string | null = null;
    const snapshotUrl = `http://147.182.235.147:3008/snapshot/${auditId}`;

    try {
      const puppeteer = await import("puppeteer");
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();

      await page.goto(snapshotUrl, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      // Wait for content to render
      await page.waitForSelector("[data-snapshot-ready]", { timeout: 10000 });

      pdfPath = `/tmp/snapshot-${auditId}.pdf`;
      await page.pdf({
        path: pdfPath,
        format: "Letter",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });

      await browser.close();

      console.log(`[WF12] PDF generated: ${pdfPath}`);

      // Upload PDF to Slack
      if (process.env.SLACK_BOT_TOKEN && pdfPath) {
        try {
          const FormData = (await import("form-data")).default;
          const fs = await import("fs");

          const form = new FormData();
          form.append("file", fs.createReadStream(pdfPath));
          form.append("channels", "maps-sales"); // Replace with actual channel ID if needed
          form.append("initial_comment", `💰 Money Snapshot for ${business_name}`);

          await axios.post("https://slack.com/api/files.upload", form, {
            headers: {
              ...form.getHeaders(),
              Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            },
          });

          console.log("[WF12] PDF uploaded to Slack");
        } catch (err) {
          console.error("[WF12] Slack PDF upload failed:", err);
        }
      }
    } catch (err) {
      console.error("[WF12] PDF generation failed:", err);
    }

    // Step 8: Email sales rep
    // ------------------------------------------------------------------

    const emailHtml = `
<div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
  <h2 style="color: #1a1a2e;">🎯 Pre-Call Briefing: ${business_name}</h2>
  <p><strong>Market:</strong> ${city}, ${state} | <strong>Tier:</strong> ${tier} | <strong>Temperature:</strong> ${temperature}</p>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr style="background: #f0f0f5;">
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reviews</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">${prospectReviews} (⭐ ${prospectRating})</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Current Rank</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">#${prospectRank}</td>
    </tr>
    <tr style="background: #f0f0f5;">
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Review Gap</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">${reviewGap} reviews behind top 3</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Top 3 Est. Calls</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">${callOpportunity.top3EstimatedCalls}/month</td>
    </tr>
    <tr style="background: #f0f0f5;">
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Your Est. Calls</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">${callOpportunity.prospectEstimatedCalls}/month</td>
    </tr>
    <tr style="background: #d4edda;">
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Opportunity Gap</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>${callOpportunity.opportunityGapCalls} additional calls/month</strong></td>
    </tr>
    <tr style="background: #fff3cd;">
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>New Revenue Potential</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>${callOpportunity.opportunityMonthly}/month (${callOpportunity.opportunityAnnual}/year)</strong></td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Territory</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">${conflictStatus}</td>
    </tr>
    <tr style="background: #f0f0f5;">
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Guarantee</strong></td>
      <td style="padding: 8px; border: 1px solid #ddd;">${GUARANTEE_TEXT[track.label]}</td>
    </tr>
  </table>

  <h3>Top Competitors</h3>
  <table style="width: 100%; border-collapse: collapse; margin: 8px 0;">
    <tr style="background: #1a1a2e; color: white;">
      <th style="padding: 8px; text-align: left;">Name</th>
      <th style="padding: 8px; text-align: center;">Reviews</th>
      <th style="padding: 8px; text-align: center;">Rating</th>
    </tr>
    ${topCompetitors
      .map(
        (c, i) => `
    <tr style="background: ${i % 2 === 0 ? "#f9f9f9" : "#fff"};">
      <td style="padding: 8px; border: 1px solid #ddd;">${c.name}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${c.user_ratings_total}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">⭐ ${c.rating}</td>
    </tr>`
      )
      .join("")}
  </table>

  <h3>Qualification (${passCount}/6)</h3>
  <pre style="background: #f5f5f5; padding: 12px; border-radius: 4px;">${checklistText}</pre>

  <h3>Offer Path</h3>
  <p>→ Show <strong>${tier === "A" ? "Core" : "Premium"}</strong> pricing ($${monthlyPrice}/mo + $${setupFee} setup)</p>

  <div style="text-align: center; margin: 24px 0;">
    <a href="${deckUrl}" style="background: #1a1a2e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px;">Open Sales Deck</a>
  </div>

  <p style="color: #666; font-size: 13px;">Call scheduled: ${appointment_date} at ${appointment_time} | Contact: ${contact_name} (${contact_email})</p>
</div>`;

    try {
      await sendEmail(
        sales_rep_email,
        `🎯 Pre-Call Briefing: ${business_name} — ${city}, ${state}`,
        emailHtml
      );
    } catch (err) {
      console.error("[WF12] Sales rep email failed:", err);
    }

    // ------------------------------------------------------------------
    // Step 9: Create/update GHL contact via v2 API
    // ------------------------------------------------------------------

    const GHL_V2_BASE = "https://services.leadconnectorhq.com";
    const ghlV2Headers = {
      Authorization: `Bearer ${process.env.GHL_API_KEY}`,
      Version: "2021-07-28",
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    let ghlContactId: string | null = null;

    try {
      const createRes = await fetch(
        `${GHL_V2_BASE}/contacts/?locationId=${GHL_LOCATION_ID}`,
        {
          method: "POST",
          headers: ghlV2Headers,
          body: JSON.stringify({
            locationId: GHL_LOCATION_ID,
            firstName: contact_name,
            email: contact_email,
            phone: contact_phone || "",
            tags: [
              `Track - ${track.name}`,
              `Lead Score - ${temperature}`,
              "Audit Complete",
            ],
          }),
        }
      );

      const createData = await createRes.json() as Record<string, unknown>;
      const contactObj = createData.contact as Record<string, unknown> | undefined;
      ghlContactId = (contactObj?.id as string) || null;

      console.log("[WF12] GHL v2 contact created/updated", {
        ghlContactId,
        status: createRes.status,
      });
    } catch (err) {
      console.error("[WF12] GHL v2 contact create failed (non-critical):", err);
    }

    // ------------------------------------------------------------------
    // Step 10: Push custom fields to GHL contact with audit data
    // ------------------------------------------------------------------

    // Use payload contact_id if GHL create didn't return one
    const contactIdForUpdate =
      ghlContactId ||
      (payload.contact_id as string) ||
      (payload.contactId as string) ||
      null;

    if (contactIdForUpdate) {
      try {
        const updateRes = await fetch(
          `${GHL_V2_BASE}/contacts/${contactIdForUpdate}`,
          {
            method: "PUT",
            headers: ghlV2Headers,
            body: JSON.stringify({
              customFields: [
                { key: "audit_url", field_value: `http://147.182.235.147:3008/snapshot/${auditId}` },
                { key: "market_tier", field_value: tier },
                { key: "review_count", field_value: String(prospectReviews) },
                { key: "competitor_count", field_value: String(totalCompetitors) },
                { key: "opportunity_monthly", field_value: callOpportunity.opportunityMonthly },
              ],
              tags: [
                `Market Tier ${tier}`,
                `Lead Score - ${temperature}`,
                "Audit Complete",
              ],
            }),
          }
        );

        console.log("[WF12] Updated GHL contact with audit data", {
          contactId: contactIdForUpdate,
          status: updateRes.status,
        });
      } catch (err) {
        console.warn(
          "[WF12] Failed to update GHL contact custom fields (non-critical):",
          err
        );
      }
    }

    // ------------------------------------------------------------------
    // Step 11: Return result (Cold lead alert removed - every lead gets served)
    // ------------------------------------------------------------------

    console.log(
      `[WF12] Pipeline complete for ${business_name}. Tier: ${tier}, Temp: ${temperature}`
    );

    return {
      success: true,
      audit_id: auditId,
      business_name: business_name,
      market_tier: tier,
      lead_temperature: temperature,
      deck_url: deckUrl,
      top3_estimated_calls: callOpportunity.top3EstimatedCalls,
      prospect_estimated_calls: callOpportunity.prospectEstimatedCalls,
      opportunity_gap_calls: callOpportunity.opportunityGapCalls,
      opportunity_monthly: callOpportunity.opportunityMonthly,
      opportunity_annual: callOpportunity.opportunityAnnual,
    };
  },
});
