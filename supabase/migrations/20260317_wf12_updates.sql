-- WF12 Updates: Track Assignment + Keyword Gap Analysis
-- Date: 2026-03-17

-- ============================================================
-- 1. Add keyword gap columns to prospect_audits
-- ============================================================
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS client_strength_score INTEGER;
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS market_difficulty_score INTEGER;
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS assigned_track VARCHAR;
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS projection_data JSONB;
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS rep_talking_points TEXT;
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS review_gap_to_position3 INTEGER;
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS top3_avg_reviews INTEGER;
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS chain_dominance_detected BOOLEAN DEFAULT false;
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS keyword_gap_data JSONB;
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS keyword_gap_score INTEGER;
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS dominant_competitor_name VARCHAR;
ALTER TABLE prospect_audits ADD COLUMN IF NOT EXISTS dominant_competitor_keyword_count INTEGER;

-- ============================================================
-- 2. Add high_ticket_keywords column to niche_configs
-- ============================================================
ALTER TABLE niche_configs ADD COLUMN IF NOT EXISTS high_ticket_keywords JSONB;

-- ============================================================
-- 3. Seed high_ticket_keywords for existing niches
-- ============================================================

-- Mechanical / Auto Repair
UPDATE niche_configs
SET high_ticket_keywords = '["transmission repair", "engine repair", "brake repair", "auto AC repair", "check engine light", "oil change", "auto electrical repair", "timing belt replacement"]'::jsonb
WHERE niche_key = 'mechanical';

-- Auto Body
UPDATE niche_configs
SET high_ticket_keywords = '["auto body repair", "collision repair", "paint job", "dent repair", "frame straightening", "bumper repair", "insurance claim repair", "custom paint"]'::jsonb
WHERE niche_key = 'auto_body';

-- PDR (Paintless Dent Removal)
UPDATE niche_configs
SET high_ticket_keywords = '["paintless dent removal", "hail damage repair", "dent repair", "auto hail repair", "PDR service", "mobile dent repair", "door ding repair", "insurance hail claim repair"]'::jsonb
WHERE niche_key = 'pdr';

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO n8n_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO n8n_user;
