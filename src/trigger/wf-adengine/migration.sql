-- WF-ADENGINE: AI Ad Production Engine schema
-- Run on VPS: docker exec -it maps-autopilot-db psql -U n8n_user -d maps_autopilot -f /path/to/migration.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Projects table: one row per ad production run
CREATE TABLE IF NOT EXISTS ad_engine_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  concept_config JSONB NOT NULL,
  storyboard JSONB,
  status TEXT DEFAULT 'storyboard_pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets table: images, videos, and audio produced during each phase
CREATE TABLE IF NOT EXISTS ad_engine_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ad_engine_projects(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  scene_number INTEGER,
  variation_number INTEGER,
  asset_type TEXT NOT NULL,
  asset_url TEXT NOT NULL,
  prompt_used TEXT,
  model_used TEXT,
  kie_task_id TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  trim_start_seconds FLOAT,
  trim_end_seconds FLOAT,
  speed_multiplier FLOAT DEFAULT 1.3,
  cost_credits FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Slack message tracking for checkpoint approval flows
CREATE TABLE IF NOT EXISTS ad_engine_slack_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ad_engine_projects(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES ad_engine_assets(id) ON DELETE SET NULL,
  slack_channel TEXT NOT NULL,
  slack_message_ts TEXT NOT NULL,
  checkpoint_type TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ad_assets_project ON ad_engine_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_ad_assets_phase ON ad_engine_assets(project_id, phase);
CREATE INDEX IF NOT EXISTS idx_ad_assets_approved ON ad_engine_assets(project_id, phase, is_approved);
CREATE INDEX IF NOT EXISTS idx_ad_slack_ts ON ad_engine_slack_messages(slack_message_ts);
CREATE INDEX IF NOT EXISTS idx_ad_slack_project ON ad_engine_slack_messages(project_id);

-- Permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO n8n_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO n8n_user;
