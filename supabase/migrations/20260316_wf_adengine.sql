-- WF-ADENGINE: AI Ad Production Engine Database Schema
-- Created: 2026-03-16

CREATE TABLE IF NOT EXISTS ad_engine_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  concept_config JSONB NOT NULL,
  storyboard JSONB,
  status TEXT DEFAULT 'storyboard_pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adengine_status ON ad_engine_projects(status);
CREATE INDEX IF NOT EXISTS idx_adengine_created ON ad_engine_projects(created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_adengine_assets_project ON ad_engine_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_adengine_assets_phase ON ad_engine_assets(phase);
CREATE INDEX IF NOT EXISTS idx_adengine_assets_approved ON ad_engine_assets(is_approved);

CREATE TABLE IF NOT EXISTS ad_engine_slack_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ad_engine_projects(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES ad_engine_assets(id) ON DELETE CASCADE,
  slack_channel TEXT NOT NULL,
  slack_message_ts TEXT NOT NULL,
  checkpoint_type TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adengine_slack_project ON ad_engine_slack_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_adengine_slack_ts ON ad_engine_slack_messages(slack_message_ts);
CREATE INDEX IF NOT EXISTS idx_adengine_slack_resolved ON ad_engine_slack_messages(resolved);
