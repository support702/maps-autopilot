-- WF26: Content Intelligence Engine
-- Migration: Create workflow_impact_alerts table
-- Date: 2026-03-14

-- Table: workflow_impact_alerts (links intelligence items to affected workflows)
CREATE TABLE IF NOT EXISTS workflow_impact_alerts (
  id SERIAL PRIMARY KEY,
  intelligence_id INTEGER REFERENCES content_intelligence(id),
  affected_workflows JSONB DEFAULT '[]',          -- array of workflow IDs like ["WF02", "WF14"]
  data_confirmation VARCHAR(20) DEFAULT 'UNCONFIRMED',  -- CONFIRMED, PROBABLE, UNCONFIRMED
  evidence TEXT,                                    -- Claude's reasoning/evidence text
  content_recommendation VARCHAR(20) DEFAULT 'MONITOR', -- MONITOR, REVIEW, URGENT_CHANGE
  status VARCHAR(20) DEFAULT 'new',                -- new, acknowledged, in_progress, resolved, dismissed
  reviewed_by VARCHAR(100),                        -- who reviewed it
  reviewed_at TIMESTAMPTZ,                         -- when reviewed
  resolution_notes TEXT,                           -- notes on resolution
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_impact_alerts_status ON workflow_impact_alerts(status);
CREATE INDEX IF NOT EXISTS idx_workflow_impact_alerts_intelligence_id ON workflow_impact_alerts(intelligence_id);
CREATE INDEX IF NOT EXISTS idx_workflow_impact_alerts_recommendation ON workflow_impact_alerts(content_recommendation);
CREATE INDEX IF NOT EXISTS idx_workflow_impact_alerts_created_at ON workflow_impact_alerts(created_at DESC);
