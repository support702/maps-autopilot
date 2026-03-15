/**
 * WF28 Creative Intelligence Scanner — Constants
 * Seed accounts, discovery keywords, tier definitions
 */

export const SEED_ACCOUNTS = {
  tier1_study: [
    {
      name: "Alex Hormozi",
      page_id: "116482854782233",
      tier: 1,
      notes: "Gold standard direct response. Bold, math-heavy, no fluff.",
    },
    {
      name: "King Kong",
      page_id: "562378543780840",
      tier: 1,
      notes: "Fantastic agency creative. Strong hooks, professional production.",
    },
  ],
  tier2_monitor: [
    {
      name: "Bad Marketing",
      page_id: "100845848575661",
      tier: 2,
      notes: "Competitor. Watch offers and claims.",
    },
    // Jumper Media page_id to be discovered via keyword search
  ],
};

export const DISCOVERY_KEYWORDS = [
  // Direct service keywords (find competitors)
  "Google Maps ranking",
  "local SEO service",
  "Google Business Profile management",
  "get more Google reviews",
  "rank on Google Maps",
  "GBP optimization",
  
  // Broader marketing keywords (find aspirational creative)
  "marketing agency",
  "grow your business",
  "get more customers",
  "digital marketing agency",
  
  // Niche-specific (find who's targeting your audience)
  "mechanic marketing",
  "auto repair leads",
  "HVAC marketing",
  "dental marketing",
  "home service leads",
  
  // Direct response patterns (find great creative regardless of niche)
  "book a call",
  "free audit",
  "guaranteed results",
  "scale your business",
];

export const DISCOVERY_THRESHOLDS = {
  MIN_ACTIVE_ADS: 10, // Minimum active ads to consider
  MIN_QUALITY_SCORE: 6, // Minimum Haiku quality score to approve
  SAMPLE_SIZE: 5, // Number of ads to sample for quality assessment
};

export const TIER_DEFINITIONS = {
  1: {
    name: "Study",
    description: "Reverse-engineer creative quality",
    analysis: "deep", // Sonnet analysis
  },
  2: {
    name: "Monitor",
    description: "Competitive intelligence",
    analysis: "light", // Haiku analysis
  },
};
