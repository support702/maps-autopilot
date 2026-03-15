import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { callClaude } from "../lib/anthropic";
import { sendEmail } from "../lib/email";
import axios from "axios";

interface QuickAuditPayload {
  business_name?: string;
  city?: string;
  niche?: string;
  sales_rep_email?: string;
  [key: string]: unknown;
}

export const wf11SalesQuickAudit = task({
  id: "wf11-sales-quick-audit",
  retry: { maxAttempts: 2 },
  run: async (rawPayload: QuickAuditPayload) => {
    // Unwrap payload if wrapped by proxy, or use directly if already unwrapped
    const payload: QuickAuditPayload = rawPayload.business_name || rawPayload.city
      ? rawPayload
      : ((rawPayload as any).payload || rawPayload);

    // === GHL Field Mapping (normalize webhook field names) ===
    const businessName = (payload["Business Name"] || payload.business_name || "") as string;
    const city = (payload["City"] || payload.city || "") as string;
    const nicheKey = (
      Array.isArray(payload["Niche"])
        ? payload["Niche"][0]
        : payload["Niche"] || payload.niche || "mechanical"
    ) as string;
    const salesRepEmail = (payload["Sales Rep Email"] || payload.sales_rep_email || "") as string;

    if (!businessName || !city) {
      throw new Error("Invalid payload: business_name and city are required");
    }

    // Check territory conflict
    const { rows: conflicts } = await query(
      `SELECT client_id, business_name FROM clients
       WHERE LOWER(city) = LOWER($1) AND niche_key = $2 AND status = 'active'`,
      [city, nicheKey]
    );

    // Google Places search
    let competitors: Array<Record<string, unknown>> = [];
    let businessData: Record<string, unknown> = {};
    try {
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(businessName + " " + city)}&type=establishment&key=${process.env.GOOGLE_API_KEY}`;
      const { data } = await axios.get(searchUrl, { timeout: 10000 });
      if (data.results?.length > 0) {
        businessData = data.results[0];
      }

      // Pull top 5 competitors
      const { rows: [niche] } = await query(
        "SELECT * FROM niche_configs WHERE niche_key = $1",
        [nicheKey]
      );
      const nicheTerms = niche?.industry_terms?.search_terms?.[0] || nicheKey;
      const compUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(nicheTerms + " " + city)}&type=establishment&key=${process.env.GOOGLE_API_KEY}`;
      const { data: compData } = await axios.get(compUrl, { timeout: 10000 });
      competitors = (compData.results || []).slice(0, 5).map((r: Record<string, unknown>) => ({
        name: r.name,
        rating: r.rating,
        reviews: r.user_ratings_total,
        address: r.formatted_address,
      }));
    } catch (err) {
      console.error("Google Places API failed:", err);
    }

    // Determine market tier
    const competitorCount = competitors.length;
    const tier = competitorCount < 20 ? "A" : competitorCount < 50 ? "B" : "C";
    const guaranteeEligible = tier === "A" || tier === "B";

    // Claude audit report
    const auditPrompt = `Generate a one-page sales audit report for a prospective ${nicheKey} client.

Business: ${businessName}
City: ${city}
Google Data: ${JSON.stringify(businessData)}
Top Competitors: ${JSON.stringify(competitors)}
Market Tier: ${tier}
Territory Conflict: ${conflicts.length > 0 ? "YES — " + conflicts.map((c) => c.business_name).join(", ") : "NONE"}
Guarantee Eligible: ${guaranteeEligible}

Format as a professional audit including:
1. Business snapshot (reviews, rating, visibility)
2. Competitive landscape (top 5 competitors with review counts)
3. Market tier assessment
4. Opportunity score (1-10)
5. Recommended package (core/premium/full_seo)
6. Guarantee eligibility with recommended keyword

Return JSON: {"report_html": "full HTML formatted report", "opportunity_score": 8, "recommended_tier": "core"}`;

    const auditRaw = await callClaude(auditPrompt, undefined, 3000);
    let auditResult: Record<string, unknown> = {};
    try {
      auditResult = JSON.parse(auditRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    } catch {
      auditResult = { report_html: auditRaw, opportunity_score: 5, recommended_tier: "core" };
    }

    // Cache in prospect_audits
    await query(
      `INSERT INTO prospect_audits (business_name, city, niche_key, gbp_review_count, gbp_avg_rating,
       top_competitors, market_competition_level, guarantee_eligible, existing_client_conflict)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        businessName,
        city,
        nicheKey,
        (businessData as Record<string, number>).user_ratings_total || 0,
        (businessData as Record<string, number>).rating || 0,
        JSON.stringify(competitors),
        tier,
        guaranteeEligible,
        conflicts.length > 0,
      ]
    );

    // Email report to sales rep
    try {
      await sendEmail(
        salesRepEmail,
        `Quick Audit: ${businessName} — ${city}`,
        (auditResult.report_html as string) || "<p>Audit generated. See dashboard for details.</p>"
      );
    } catch {
      console.error("Failed to send audit email");
    }

    return {
      success: true,
      opportunity_score: auditResult.opportunity_score,
      recommended_tier: auditResult.recommended_tier,
      territory_conflict: conflicts.length > 0,
    };
  },
});
