# WF12 — PRE-CALL SCORING & PROJECTION ENGINE
## Logic Update Spec — Universal Client Model
## Date: March 11, 2026

---

## CONTEXT: WHY THIS UPDATE EXISTS

We're shifting from a "qualify or disqualify" model to a "serve everyone, flex the guarantee" model. Previously, WF12 scored leads and flagged unqualified prospects for rejection. Now, WF12 scores leads and generates an honest projection + track assignment so the rep knows exactly how to pitch every prospect — regardless of their starting position.

Nobody gets disqualified. Everyone gets served. The guarantee only applies where the data supports it. The rep's job is to present the right track with the right expectations.

---

## CURRENT WF12 LOGIC (what exists now)

**Trigger:** GHL webhook fires when prospect books a call (booking form submitted)

**Current flow:**
1. Receive booking form data: business_name, city, state, niche, reviews (self-reported), years_in_business
2. Call Google Places API with business_name + city to find actual listing
3. Pull actual review count, rating, GBP status
4. Pull top 3-5 competitors for primary keyword in same area (review counts, ratings, last post dates)
5. Count total real competitors for primary keyword
6. Classify market tier:
   - Tier A: < 20 competitors
   - Tier B: 20-50 competitors
   - Tier C: 50+ competitors
7. Score the lead:
   - HOT: 30+ reviews, 5+ years, Tier A, verified GBP
   - WARM: 10-30 reviews, 3+ years, Tier A or B, verified GBP
   - COOL: 0-10 reviews, 1-3 years, Tier B or C
   - COLD: <10 reviews, <1 year, Tier C
8. Determine guarantee eligibility: Yes (Tier A) / Soft (Tier B) / No (Tier C)
9. Store audit in prospect_audits table
10. Send Slack briefing to #maps-sales with lead score, market tier, guarantee eligibility, competitor data
11. Push contact data to GHL with tags
12. Generate Money Snapshot PDF (1-page pain summary)

---

## UPDATED WF12 LOGIC (what to build)

Everything above stays. The changes are **additions** — new output fields, new logic layer, new sales deck behavior. Don't break what works, add to it.

### CHANGE 1: Two-Dimensional Track Assignment

The old system used market tier (A/B/C) as the primary classifier. The new system uses **client strength × market difficulty** to assign a Track.

**Client Strength Score (0-100):**

```typescript
function calculateClientStrength(data: AuditData): number {
  let score = 0;
  
  // Reviews (max 40 points)
  if (data.reviewCount >= 100) score += 40;
  else if (data.reviewCount >= 50) score += 30;
  else if (data.reviewCount >= 30) score += 20;
  else if (data.reviewCount >= 10) score += 10;
  else score += 0;
  
  // Rating (max 15 points)
  if (data.rating >= 4.5) score += 15;
  else if (data.rating >= 4.0) score += 10;
  else if (data.rating >= 3.5) score += 5;
  else score += 0;
  
  // GBP completeness (max 20 points)
  // Check: verified, has photos, has posts in last 30 days, has products/services, has Q&A
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
  else score += 0;
  
  // Website quality (max 10 points) — from WF01B health check if available
  if (data.websiteGrade === 'A') score += 10;
  else if (data.websiteGrade === 'B') score += 7;
  else if (data.websiteGrade === 'C') score += 4;
  else if (data.websiteGrade === 'D') score += 2;
  else score += 0; // F or no website
  
  return score;
}
```

**Market Difficulty Score (0-100):**

```typescript
function calculateMarketDifficulty(data: AuditData): number {
  let score = 0;
  
  // Competitor count (max 30 points — higher = harder)
  if (data.competitorCount >= 50) score += 30;
  else if (data.competitorCount >= 30) score += 20;
  else if (data.competitorCount >= 20) score += 15;
  else if (data.competitorCount >= 10) score += 8;
  else score += 0;
  
  // Top 3 average review count (max 30 points — higher = harder)
  const top3AvgReviews = data.top3Competitors.reduce((sum, c) => sum + c.reviewCount, 0) / 3;
  if (top3AvgReviews >= 300) score += 30;
  else if (top3AvgReviews >= 150) score += 20;
  else if (top3AvgReviews >= 75) score += 12;
  else if (top3AvgReviews >= 30) score += 5;
  else score += 0;
  
  // Review gap between client and #3 position (max 25 points)
  const reviewGap = data.top3Competitors[2].reviewCount - data.reviewCount;
  if (reviewGap > 200) score += 25;
  else if (reviewGap > 100) score += 18;
  else if (reviewGap > 50) score += 12;
  else if (reviewGap > 20) score += 5;
  else score += 0; // client is already close or ahead
  
  // Chain/brand dominance (max 15 points)
  // Detect if top 3 includes chains like Meineke, Jiffy Lube, Firestone, etc.
  const chainNames = ['meineke', 'jiffy lube', 'firestone', 'pep boys', 'midas', 'valvoline', 
                       'take 5', 'grease monkey', 'christian brothers', 'caliber collision',
                       'maaco', 'service king', 'gerber collision'];
  const chainCount = data.top3Competitors.filter(c => 
    chainNames.some(chain => c.name.toLowerCase().includes(chain))
  ).length;
  score += chainCount * 5;
  
  return score;
}
```

**Track Assignment Logic:**

```typescript
function assignTrack(clientStrength: number, marketDifficulty: number): Track {
  // Guarantee Track: strong client + manageable market
  if (clientStrength >= 55 && marketDifficulty <= 45) {
    return {
      name: 'Guarantee Track',
      label: 'guarantee',
      guaranteeEligible: true,
      guaranteeText: 'Top 3 in 90 days or we work free for up to 6 months',
      deckSlides: 'standard_with_guarantee' // Slides 7, 8, 9 (guarantee, territory, pricing)
    };
  }
  
  // Aggressive Improvement Track: moderate gap, winnable
  if (clientStrength >= 30 && marketDifficulty <= 65) {
    return {
      name: 'Aggressive Improvement Track',
      label: 'aggressive_improvement',
      guaranteeEligible: false,
      guaranteeText: 'Significant ranking improvement within 90 days. Top 5 positioning expected within 90 days, Top 3 within 6 months based on similar markets.',
      deckSlides: 'standard_no_guarantee' // Skip slide 7, use modified language on slides 8, 9
    };
  }
  
  // Foundation Track: big gap, long road, but still serviceable
  return {
    name: 'Foundation Track',
    label: 'foundation',
    guaranteeEligible: false,
    guaranteeText: 'Building your competitive foundation. Expect 6-9 months to reach competitive positioning. First 90 days focused on profile, reviews, and citations baseline.',
    deckSlides: 'foundation_roadmap' // Replace slides 5-7 with 90-day foundation roadmap
  };
}
```

### CHANGE 2: Realistic Timeline Projections

After track assignment, generate specific month-by-month projections based on the gap analysis. These projections feed into the sales deck and the rep briefing.

```typescript
function generateProjection(
  clientStrength: number, 
  marketDifficulty: number, 
  track: Track, 
  data: AuditData
): Projection {
  
  const reviewGap = data.top3Competitors[2].reviewCount - data.reviewCount;
  const currentRank = data.currentRankPosition || 20; // default to 20 if unknown
  
  // Estimate review velocity we can generate (reviews/month)
  // Conservative: 8-12 new reviews/month with review surge campaign
  const estimatedReviewsPerMonth = 10;
  
  // Estimate months to close review gap with #3
  const monthsToCloseReviewGap = reviewGap > 0 
    ? Math.ceil(reviewGap / estimatedReviewsPerMonth) 
    : 0;
  
  // Estimate ranking improvement trajectory
  // With full GBP optimization + citations + reviews, typical improvement:
  // Month 1: 3-5 position improvement (citations index, GBP optimized)
  // Month 2: 5-10 position improvement (review velocity kicks in, posts building)
  // Month 3: 8-15 position improvement (full effect of all signals)
  
  let projection: MonthlyProjection[];
  
  if (track.label === 'guarantee') {
    projection = [
      {
        month: 1,
        estimatedRank: Math.max(1, currentRank - 5),
        estimatedReviews: data.reviewCount + estimatedReviewsPerMonth,
        estimatedCalls: '5-10 new tracked calls',
        keyMilestone: 'GBP fully optimized, citations submitted, review surge launched, call tracking live'
      },
      {
        month: 3,
        estimatedRank: Math.max(1, Math.min(3, currentRank - 12)),
        estimatedReviews: data.reviewCount + (estimatedReviewsPerMonth * 3),
        estimatedCalls: '15-30 tracked calls/month',
        keyMilestone: 'Top 3 positioning for primary keyword, review gap significantly closed'
      },
      {
        month: 6,
        estimatedRank: Math.max(1, Math.min(2, currentRank - 15)),
        estimatedReviews: data.reviewCount + (estimatedReviewsPerMonth * 6),
        estimatedCalls: '25-50 tracked calls/month',
        keyMilestone: 'Dominant Maps position, review velocity sustaining, Money Sheet showing clear ROI'
      }
    ];
  } else if (track.label === 'aggressive_improvement') {
    projection = [
      {
        month: 1,
        estimatedRank: Math.max(1, currentRank - 3),
        estimatedReviews: data.reviewCount + estimatedReviewsPerMonth,
        estimatedCalls: '3-8 new tracked calls',
        keyMilestone: 'GBP rebuilt, citations submitted, review surge launched'
      },
      {
        month: 3,
        estimatedRank: Math.max(1, currentRank - 8),
        estimatedReviews: data.reviewCount + (estimatedReviewsPerMonth * 3),
        estimatedCalls: '10-20 tracked calls/month',
        keyMilestone: 'Top 5-7 positioning, noticeable call increase, citation network indexing'
      },
      {
        month: 6,
        estimatedRank: Math.max(1, Math.min(3, currentRank - 14)),
        estimatedReviews: data.reviewCount + (estimatedReviewsPerMonth * 6),
        estimatedCalls: '20-35 tracked calls/month',
        keyMilestone: 'Approaching Top 3, review parity with competitors, strong Maps presence'
      }
    ];
  } else { // foundation
    projection = [
      {
        month: 1,
        estimatedRank: Math.max(1, currentRank - 2),
        estimatedReviews: data.reviewCount + estimatedReviewsPerMonth,
        estimatedCalls: '1-5 new tracked calls',
        keyMilestone: 'GBP created/rebuilt from scratch, initial citations submitted, review collection started'
      },
      {
        month: 3,
        estimatedRank: Math.max(1, currentRank - 5),
        estimatedReviews: data.reviewCount + (estimatedReviewsPerMonth * 3),
        estimatedCalls: '5-12 tracked calls/month',
        keyMilestone: 'Profile competitive with bottom of page 1, citation network building, review base growing'
      },
      {
        month: 6,
        estimatedRank: Math.max(1, currentRank - 10),
        estimatedReviews: data.reviewCount + (estimatedReviewsPerMonth * 6),
        estimatedCalls: '10-20 tracked calls/month',
        keyMilestone: 'Approaching Top 5-7, competitive profile, consistent review velocity'
      },
      {
        month: 9,
        estimatedRank: Math.max(1, currentRank - 14),
        estimatedReviews: data.reviewCount + (estimatedReviewsPerMonth * 9),
        estimatedCalls: '15-30 tracked calls/month',
        keyMilestone: 'Competing for Top 3, strong profile authority, established review reputation'
      }
    ];
  }
  
  return {
    track: track,
    projections: projection,
    reviewGapAnalysis: {
      currentReviews: data.reviewCount,
      top3AverageReviews: Math.round(data.top3Competitors.reduce((s, c) => s + c.reviewCount, 0) / 3),
      position3Reviews: data.top3Competitors[2].reviewCount,
      estimatedMonthsToClose: monthsToCloseReviewGap
    },
    revenueEstimate: {
      avgTicket: data.nicheAvgTicket || 400, // default for auto repair
      estimatedMonth3Calls: projection.find(p => p.month === 3)?.estimatedCalls || '5-15',
      estimatedMonth3Revenue: `$${(data.nicheAvgTicket || 400) * 10}-${(data.nicheAvgTicket || 400) * 25}/month`
    }
  };
}
```

### CHANGE 3: Updated Slack Briefing Format

The Slack message to #maps-sales now includes the track, projection, and rep talking points.

```typescript
const slackBriefing = {
  channel: '#maps-sales',
  blocks: [
    // Header
    {
      type: 'header',
      text: `New Booking: ${data.businessName} — ${track.name}`
    },
    // Lead Info
    {
      type: 'section',
      text: [
        `*Business:* ${data.businessName}`,
        `*City:* ${data.city}, ${data.state}`,
        `*Self-reported reviews:* ${data.selfReportedReviews} | *Actual:* ${data.reviewCount}`,
        `*Rating:* ${data.rating} ⭐`,
        `*Years in business:* ${data.yearsInBusiness}`,
        `*Call time:* ${data.bookingDateTime}`
      ].join('\n')
    },
    // Track Assignment
    {
      type: 'section',
      text: [
        `*🎯 TRACK: ${track.name.toUpperCase()}*`,
        `*Client Strength:* ${clientStrength}/100`,
        `*Market Difficulty:* ${marketDifficulty}/100`,
        `*Guarantee:* ${track.guaranteeEligible ? '✅ YES — Full Top 3 in 90 days' : '❌ NO — ' + track.guaranteeText}`,
        `*Deck mode:* ${track.deckSlides}`
      ].join('\n')
    },
    // Competitor Snapshot
    {
      type: 'section',
      text: [
        `*Top 3 Competitors:*`,
        ...data.top3Competitors.map((c, i) => 
          `  #${i+1} ${c.name} — ${c.reviewCount} reviews, ${c.rating}⭐`
        ),
        `*Review gap to #3:* ${data.top3Competitors[2].reviewCount - data.reviewCount} reviews`,
        `*Total competitors:* ${data.competitorCount}`
      ].join('\n')
    },
    // Projection
    {
      type: 'section',
      text: [
        `*📊 PROJECTION:*`,
        ...projection.projections.map(p => 
          `  Month ${p.month}: Rank ~#${p.estimatedRank}, ~${p.estimatedReviews} reviews, ${p.estimatedCalls}`
        )
      ].join('\n')
    },
    // Rep Talking Points
    {
      type: 'section',
      text: [
        `*🗣️ REP TALKING POINTS:*`,
        track.label === 'guarantee' 
          ? `• Lead with guarantee confidently: "Based on your market, we guarantee Top 3 in 90 days or we work free."\n• Territory close: "Your area is open now — once another shop locks in, that spot is gone."\n• Money math: "${projection.revenueEstimate.estimatedMonth3Revenue} in new monthly revenue by Month 3."`
          : track.label === 'aggressive_improvement'
          ? `• Open with: "My job is to run your numbers and see which track you're on."\n• Position as: "You're in a competitive market but the gap is closeable. Here's what Month 1, 3, and 6 look like."\n• Don't mention guarantee unless they ask. If they ask: "The guarantee applies in less competitive markets. Your market is tougher, but the results path is clear."\n• Close on progress: "You'll see the Money Sheet every month proving the needle is moving."`
          : `• Open with: "My job is to run your numbers and give you an honest picture."\n• Position as: "90-Day Foundation Sprint — we're building your competitive base from scratch."\n• Set timeline: "Months 1-3 are foundation. Months 3-6 are climbing. Months 6-9 are competing for Top 3."\n• Close on investment: "Every month you wait, the gap gets wider. Starting now means you're competitive in 6 months instead of 12."\n• Money Sheet is key: "You'll see progress every single month in real numbers."`
      ].join('\n')
    },
    // Sales Deck Link
    {
      type: 'section',
      text: `*📊 Deck:* ${data.deckUrl}\n*💰 Money Snapshot:* ${data.snapshotUrl}`
    }
  ]
};
```

### CHANGE 4: Updated GHL Tags

Replace the old binary tags with track-based tags:

**Remove these tags:**
```
Guarantee Eligible
Guarantee Soft
Guarantee None
```

**Add these tags:**
```
Track - Guarantee
Track - Aggressive Improvement
Track - Foundation
```

**Keep these tags (still useful):**
```
Lead Score - Hot
Lead Score - Warm
Lead Score - Cool
Lead Score - Cold
Market Tier A
Market Tier B
Market Tier C
Audit Complete
```

### CHANGE 5: Sales Deck Conditional Slides

The sales deck already has conditional slides (7A/7B/7C/7D per the existing app at 147.182.235.147:3008). Update the logic:

**Guarantee Track clients see:**
- Slide 7A: Full guarantee with "Top 3 in 90 days or we work free for up to 6 months"
- Standard slides 8-9 (territory + pricing)

**Aggressive Improvement Track clients see:**
- Slide 7B: "Aggressive Improvement Track" — Month 1/3/6 projection visual with realistic milestones
- No guarantee language
- Modified slide 8: territory lock still applies
- Standard slide 9: same pricing (no discount)

**Foundation Track clients see:**
- Slide 7C: "90-Day Foundation Sprint" — Month 1/3/6/9 roadmap visual
- Emphasis on "building from scratch" language
- Slide showing what the foundation includes
- Modified slide 8: territory lock still applies
- Standard slide 9: same pricing (no discount)

### CHANGE 6: Updated prospect_audits Table

Add these columns to the existing prospect_audits table:

```sql
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS client_strength_score INTEGER;
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS market_difficulty_score INTEGER;
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS assigned_track VARCHAR; -- 'guarantee', 'aggressive_improvement', 'foundation'
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS projection_data JSONB; -- full month-by-month projection
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS rep_talking_points TEXT;
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS review_gap_to_position3 INTEGER;
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS top3_avg_reviews INTEGER;
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS chain_dominance_detected BOOLEAN DEFAULT false;
```

### CHANGE 7: No More "Decline" or "Cancel" Recommendations

The old system could recommend "Operator review — doesn't meet Phase A criteria" for Cold leads, and the operator could cancel the call. 

**Remove this entirely.** Every lead gets a call. The rep just uses the right track. The Slack briefing never says "cancel" — it says "Foundation Track — here's how to pitch them."

The only exception is territory conflict (existing client within 5 miles on same keyword). That's still a hard block.

---

## WHAT DOESN'T CHANGE

- Google Places API call logic — same
- Competitor data pull — same  
- Money Snapshot PDF generation — same
- Slack notification channel — same
- GHL contact push — same
- prospect_audits table structure (additive columns only) — same
- Territory conflict check — same
- Website health check (if URL provided) — same
- Booking form fields: Business Name, City + State, Approximate Google reviews, Years in business — same (reduced from 6 to 4 fields; website URL and GBP status removed)

---

## TESTING CHECKLIST

After building, test with these scenarios:

1. **Strong client + weak market** (e.g., 80 reviews, 4.8 rating, 5+ years, 12 competitors with top 3 avg 60 reviews) → Should assign Guarantee Track

2. **Moderate client + moderate market** (e.g., 25 reviews, 4.3 rating, 3 years, 35 competitors with top 3 avg 150 reviews) → Should assign Aggressive Improvement Track

3. **Weak client + strong market** (e.g., 8 reviews, 4.0 rating, 1 year, 60 competitors with top 3 avg 280 reviews) → Should assign Foundation Track

4. **Weak client + weak market** (e.g., 5 reviews, 4.5 rating, 2 years, 8 competitors with top 3 avg 25 reviews) → Could go Aggressive Improvement — small gap despite weak client

5. **Strong client + strong market** (e.g., 90 reviews, 4.7 rating, 10 years, 55 competitors with top 3 avg 300 reviews) → Should assign Aggressive Improvement, not Guarantee — market is too tough despite strong client

Verify each test produces: correct track assignment, realistic projections, appropriate rep talking points, correct deck slide mode, and proper GHL tags.
