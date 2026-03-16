// src/trigger/wf-adengine/db.ts
// Database queries for the WF-ADENGINE ad production engine.
// Wraps the shared pg Pool from src/lib/db.ts with ad-engine-specific operations.
// Used by all phase tasks for project, asset, and Slack message persistence.

import { query } from "../../lib/db.js";
import type { AdConcept, AdEngineAsset, SlackMessageRecord, Storyboard } from "./types.js";

/** Create a new ad engine project. Returns the generated UUID. */
export async function createProject(concept: AdConcept): Promise<string> {
  const { rows } = await query(
    `INSERT INTO ad_engine_projects (project_name, concept_config, status)
     VALUES ($1, $2, 'storyboard_pending')
     RETURNING id`,
    [concept.project_name, JSON.stringify(concept)]
  );
  return rows[0].id;
}

/** Update a project's status (e.g. 'anchor_pending', 'scenes_pending', 'render_complete'). */
export async function updateProjectStatus(projectId: string, status: string): Promise<void> {
  await query(
    `UPDATE ad_engine_projects SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, projectId]
  );
}

/** Save the storyboard JSON to a project and advance status to 'anchor_pending'. */
export async function saveStoryboard(projectId: string, storyboard: Storyboard): Promise<void> {
  await query(
    `UPDATE ad_engine_projects SET storyboard = $1, status = 'anchor_pending', updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(storyboard), projectId]
  );
}

/** Retrieve a project by ID. Returns null if not found. */
export async function getProject(projectId: string) {
  const { rows } = await query(
    `SELECT * FROM ad_engine_projects WHERE id = $1`,
    [projectId]
  );
  return rows[0] || null;
}

/** Save a generated asset (image, video, or audio). Returns the asset UUID. */
export async function saveAsset(asset: Omit<AdEngineAsset, "id">): Promise<string> {
  const { rows } = await query(
    `INSERT INTO ad_engine_assets
       (project_id, phase, scene_number, variation_number, asset_type, asset_url,
        prompt_used, model_used, kie_task_id, cost_credits)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      asset.project_id,
      asset.phase,
      asset.scene_number ?? null,
      asset.variation_number ?? null,
      asset.asset_type,
      asset.asset_url,
      asset.prompt_used ?? null,
      asset.model_used ?? null,
      asset.kie_task_id ?? null,
      asset.cost_credits ?? null,
    ]
  );
  return rows[0].id;
}

/** Mark an asset as approved. Returns the updated asset row. */
export async function approveAsset(assetId: string): Promise<AdEngineAsset> {
  const { rows } = await query(
    `UPDATE ad_engine_assets SET is_approved = true, approved_at = NOW()
     WHERE id = $1 RETURNING *`,
    [assetId]
  );
  return rows[0];
}

/** Get all approved assets for a project phase, ordered by scene number. */
export async function getApprovedAssets(projectId: string, phase: string): Promise<AdEngineAsset[]> {
  const { rows } = await query(
    `SELECT * FROM ad_engine_assets
     WHERE project_id = $1 AND phase = $2 AND is_approved = true
     ORDER BY scene_number`,
    [projectId, phase]
  );
  return rows;
}

/** Get all assets for a project phase (approved or not), ordered by scene then variation. */
export async function getPhaseAssets(projectId: string, phase: string): Promise<AdEngineAsset[]> {
  const { rows } = await query(
    `SELECT * FROM ad_engine_assets
     WHERE project_id = $1 AND phase = $2
     ORDER BY scene_number, variation_number`,
    [projectId, phase]
  );
  return rows;
}

/** Save a Slack message record for checkpoint tracking. Returns the record UUID. */
export async function saveSlackMessage(record: Omit<SlackMessageRecord, "id">): Promise<string> {
  const { rows } = await query(
    `INSERT INTO ad_engine_slack_messages
       (project_id, asset_id, slack_channel, slack_message_ts, checkpoint_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      record.project_id,
      record.asset_id ?? null,
      record.slack_channel,
      record.slack_message_ts,
      record.checkpoint_type,
    ]
  );
  return rows[0].id;
}

/** Look up a Slack message record by its Slack message timestamp. */
export async function getSlackMessageByTs(messageTs: string) {
  const { rows } = await query(
    `SELECT * FROM ad_engine_slack_messages WHERE slack_message_ts = $1`,
    [messageTs]
  );
  return rows[0] || null;
}

/** Check whether all scenes have at least one approved asset. */
export async function checkAllScenesApproved(
  projectId: string,
  totalScenes: number
): Promise<boolean> {
  const { rows } = await query(
    `SELECT COUNT(DISTINCT scene_number) as approved_count
     FROM ad_engine_assets
     WHERE project_id = $1 AND phase = 'scene' AND is_approved = true`,
    [projectId]
  );
  return Number(rows[0].approved_count) >= totalScenes;
}

/** Check whether all video clips have at least one approved asset per scene. */
export async function checkAllVideosApproved(
  projectId: string,
  totalScenes: number
): Promise<boolean> {
  const { rows } = await query(
    `SELECT COUNT(DISTINCT scene_number) as approved_count
     FROM ad_engine_assets
     WHERE project_id = $1 AND phase = 'video' AND is_approved = true`,
    [projectId]
  );
  return Number(rows[0].approved_count) >= totalScenes;
}

/** Sum all cost_credits across every asset in a project. */
export async function calculateProjectCost(projectId: string): Promise<number> {
  const { rows } = await query(
    `SELECT COALESCE(SUM(cost_credits), 0) as total_cost
     FROM ad_engine_assets
     WHERE project_id = $1`,
    [projectId]
  );
  return Number(rows[0].total_cost);
}
