-- WF28 Creative Intelligence Scanner Database Schema
-- Created: 2026-03-15
-- Tables: tracked_advertisers, ad_snapshots, creative_patterns, pattern_library, discovery_candidates

-- Tracked advertisers (curated list)
CREATE TABLE IF NOT EXISTS tracked_advertisers (
  id SERIAL PRIMARY KEY,
  page_id VARCHAR(50) UNIQUE NOT NULL,
  page_name VARCHAR(200) NOT NULL,
  tier INTEGER NOT NULL CHECK (tier IN (1, 2)), -- 1 = study, 2 = monitor
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'removed')),
  added_by VARCHAR(50) DEFAULT 'seed', -- seed, discovery, manual
  discovered_via VARCHAR(100), -- keyword that found them, if discovery
  quality_score DECIMAL(3,1), -- Haiku assessment score (discovery only)
  first_scanned_at TIMESTAMPTZ,
  last_scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ta_tier ON tracked_advertisers(tier);
CREATE INDEX IF NOT EXISTS idx_ta_status ON tracked_advertisers(status);

-- Ad snapshots (every ad from every scan)
CREATE TABLE IF NOT EXISTS ad_snapshots (
  id SERIAL PRIMARY KEY,
  advertiser_id INTEGER REFERENCES tracked_advertisers(id) ON DELETE CASCADE,
  meta_ad_id VARCHAR(100) NOT NULL,
  page_id VARCHAR(50) NOT NULL,
  page_name VARCHAR(200),
  ad_creation_time TIMESTAMPTZ,
  delivery_start_time TIMESTAMPTZ,
  delivery_stop_time TIMESTAMPTZ, -- null = still running
  ad_copy TEXT[], -- array of copy variations
  headlines TEXT[],
  descriptions TEXT[],
  snapshot_url TEXT, -- URL to view full creative
  media_type VARCHAR(20), -- image, video, carousel
  publisher_platforms TEXT[], -- ['facebook', 'instagram']
  days_running INTEGER, -- calculated
  is_active BOOLEAN DEFAULT true,
  variation_count INTEGER DEFAULT 1,
  scan_date DATE DEFAULT CURRENT_DATE,
  first_seen_date DATE, -- first time we saw this ad
  last_seen_date DATE, -- last scan where it was active
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_as_advertiser ON ad_snapshots(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_as_meta_ad ON ad_snapshots(meta_ad_id);
CREATE INDEX IF NOT EXISTS idx_as_scan_date ON ad_snapshots(scan_date);
CREATE INDEX IF NOT EXISTS idx_as_active ON ad_snapshots(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_as_ad_scan ON ad_snapshots(meta_ad_id, scan_date);

-- Creative patterns (per-account analysis results)
CREATE TABLE IF NOT EXISTS creative_patterns (
  id SERIAL PRIMARY KEY,
  advertiser_id INTEGER REFERENCES tracked_advertisers(id) ON DELETE CASCADE,
  scan_date DATE DEFAULT CURRENT_DATE,
  tier INTEGER NOT NULL,
  analysis JSONB NOT NULL, -- full Sonnet/Haiku analysis output
  format_distribution JSONB,
  hook_patterns JSONB,
  copy_structure JSONB,
  offer_framing JSONB,
  testing_velocity JSONB,
  longevity_insights JSONB,
  actionable_takeaways JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_advertiser ON creative_patterns(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_cp_scan ON creative_patterns(scan_date);

-- Pattern library (cross-account insights that accumulate over time)
CREATE TABLE IF NOT EXISTS pattern_library (
  id SERIAL PRIMARY KEY,
  scan_date DATE DEFAULT CURRENT_DATE,
  universal_patterns JSONB, -- patterns seen across multiple Tier 1
  emerging_trends JSONB, -- trends shifting this week
  format_consensus JSONB, -- what formats are winning/declining
  hook_consensus JSONB, -- what hooks work/saturated
  creative_brief_recommendations JSONB, -- auto-generated creative briefs
  changes_from_previous JSONB, -- diff from last scan
  raw_analysis JSONB, -- full Sonnet output
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pl_scan ON pattern_library(scan_date);

-- Discovery candidates (pending approval)
CREATE TABLE IF NOT EXISTS discovery_candidates (
  id SERIAL PRIMARY KEY,
  page_id VARCHAR(50) NOT NULL,
  page_name VARCHAR(200) NOT NULL,
  active_ad_count INTEGER,
  longest_running_days INTEGER,
  format_breakdown JSONB, -- {video: X, static: X, carousel: X}
  sample_copy TEXT,
  quality_score DECIMAL(3,1),
  discovered_via_keyword VARCHAR(200),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved_tier1', 'approved_tier2', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dc_status ON discovery_candidates(status);

-- Insert seed accounts
INSERT INTO tracked_advertisers (page_id, page_name, tier, notes, added_by, status)
VALUES
  ('116482854782233', 'Alex Hormozi', 1, 'Gold standard direct response. Bold, math-heavy, no fluff.', 'seed', 'active'),
  ('562378543780840', 'King Kong', 1, 'Fantastic agency creative. Strong hooks, professional production.', 'seed', 'active'),
  ('100845848575661', 'Bad Marketing', 2, 'Competitor. Watch offers and claims.', 'seed', 'active')
ON CONFLICT (page_id) DO NOTHING;

-- Note: Jumper Media page_id needs to be looked up via keyword search
