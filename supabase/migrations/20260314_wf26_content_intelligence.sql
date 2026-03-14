-- WF26: Content Intelligence Engine
-- Migration: Create content_intelligence and content_briefs tables
-- Date: 2026-03-14

-- Table 1: content_intelligence (raw scan items with classification)
CREATE TABLE IF NOT EXISTS content_intelligence (
  id SERIAL PRIMARY KEY,
  scan_date DATE NOT NULL,
  scan_type VARCHAR(20) NOT NULL DEFAULT 'sunday', -- 'sunday' or 'wednesday'
  source VARCHAR(100) NOT NULL, -- source category
  title TEXT NOT NULL,
  url TEXT,
  description TEXT,
  relevance_score INTEGER DEFAULT 0, -- 1-10
  category VARCHAR(50), -- algorithm_update, gbp_feature, ai_search, content_strategy, review_management, competitor_intel, industry_news
  urgency VARCHAR(20), -- immediate, this_week, informational
  actionability VARCHAR(10), -- high, medium, low
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scan_date, source, url)
);

-- Table 2: content_briefs (generated briefs and scripts)
CREATE TABLE IF NOT EXISTS content_briefs (
  id SERIAL PRIMARY KEY,
  scan_date DATE NOT NULL,
  scan_type VARCHAR(20) NOT NULL DEFAULT 'sunday',
  brief TEXT NOT NULL,
  action_items JSONB DEFAULT '[]',
  content_scripts JSONB DEFAULT '[]',
  client_impact TEXT,
  stats JSONB DEFAULT '{}', -- {totalScanned, relevant, highPriority}
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scan_date, scan_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_intelligence_scan_date ON content_intelligence(scan_date);
CREATE INDEX IF NOT EXISTS idx_content_intelligence_category ON content_intelligence(category);
CREATE INDEX IF NOT EXISTS idx_content_intelligence_relevance ON content_intelligence(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_content_briefs_scan_date ON content_briefs(scan_date);
