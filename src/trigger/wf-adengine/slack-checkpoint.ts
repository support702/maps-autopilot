/**
 * WF-ADENGINE Slack Integration
 * Handles posting to Slack and processing reactions for human checkpoints
 */

import { runs } from "@trigger.dev/sdk";
import { query } from "../../lib/db.js";

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL_AD_ENGINE || "#ad-engine";

interface SlackMessageOptions {
  projectId: string;
  message: string;
  checkpointType?: string;
  sceneNumber?: number;
}

interface SlackImageOptions extends SlackMessageOptions {
  images: string[];
}

interface SlackVideoOptions extends SlackMessageOptions {
  videos: string[];
}

/**
 * Post a text message to Slack
 */
export async function postToSlack(message: string): Promise<void> {
  if (!SLACK_BOT_TOKEN) {
    console.warn("SLACK_BOT_TOKEN not set - skipping Slack notification");
    return;
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL,
      text: message,
      mrkdwn: true,
    }),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }
}

/**
 * Post images to Slack with reaction prompts
 */
export async function postImagesToSlack(options: SlackImageOptions): Promise<void> {
  if (!SLACK_BOT_TOKEN) {
    console.warn("SLACK_BOT_TOKEN not set - skipping Slack notification");
    return;
  }

  // Post message with image attachments
  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: options.message,
      },
    },
  ];

  // Add image blocks
  for (const imageUrl of options.images) {
    blocks.push({
      type: "image",
      image_url: imageUrl,
      alt_text: `Scene ${options.sceneNumber || "preview"}`,
    });
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL,
      text: options.message,
      blocks,
    }),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  // Save Slack message reference for webhook handling
  if (options.checkpointType) {
    await saveSlackMessage({
      projectId: options.projectId,
      slackMessageTs: data.ts,
      checkpointType: options.checkpointType,
      sceneNumber: options.sceneNumber,
    });
  }
}

/**
 * Post videos to Slack with reaction prompts
 */
export async function postVideosToSlack(options: SlackVideoOptions): Promise<void> {
  if (!SLACK_BOT_TOKEN) {
    console.warn("SLACK_BOT_TOKEN not set - skipping Slack notification");
    return;
  }

  // Post message with video links
  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: options.message,
      },
    },
  ];

  // Add video links
  for (let i = 0; i < options.videos.length; i++) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Option ${i + 1}:* ${options.videos[i]}`,
      },
    });
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL,
      text: options.message,
      blocks,
    }),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  // Save Slack message reference
  if (options.checkpointType) {
    await saveSlackMessage({
      projectId: options.projectId,
      slackMessageTs: data.ts,
      checkpointType: options.checkpointType,
      sceneNumber: options.sceneNumber,
    });
  }
}

/**
 * Handle Slack reaction events
 * Called by webhook when user adds a reaction
 */
export async function handleSlackReaction(event: {
  reaction: string;
  item: { ts: string; channel: string };
  user: string;
}): Promise<void> {
  // Look up which project/asset this message belongs to
  const result = await query(
    `SELECT * FROM ad_engine_slack_messages WHERE slack_message_ts = $1`,
    [event.item.ts]
  );

  if (!result.rows || result.rows.length === 0) {
    console.log("Slack message not found in database");
    return;
  }

  const slackMessage = result.rows[0];

  // Handle approval (✅ reaction)
  if (event.reaction === "white_check_mark") {
    // Get the asset that was approved
    if (slackMessage.asset_id) {
      await query(
        `UPDATE ad_engine_assets 
         SET is_approved = true, approved_at = NOW() 
         WHERE id = $1`,
        [slackMessage.asset_id]
      );
    }

    const checkpointType = slackMessage.checkpoint_type;
    const projectId = slackMessage.project_id;

    // Complete the appropriate wait token
    if (checkpointType === "anchor_review") {
      const asset = await getAssetById(slackMessage.asset_id);
      await runs.completeWaitForToken({
        token: `anchor-approval-${projectId}`,
        data: { approvedImageUrl: asset.asset_url },
      });
    } else if (checkpointType === "scene_review") {
      // Check if all scenes are approved
      const allApproved = await checkAllScenesApproved(projectId);
      if (allApproved) {
        const approvedUrls = await getApprovedSceneUrls(projectId);
        await runs.completeWaitForToken({
          token: `scenes-approval-${projectId}`,
          data: { approvedSceneUrls: approvedUrls },
        });
      }
    } else if (checkpointType === "video_review") {
      const allApproved = await checkAllVideosApproved(projectId);
      if (allApproved) {
        const approvedUrls = await getApprovedClipUrls(projectId);
        await runs.completeWaitForToken({
          token: `videos-approval-${projectId}`,
          data: { approvedClipUrls: approvedUrls },
        });
      }
    } else if (checkpointType === "voiceover_review") {
      const asset = await getAssetById(slackMessage.asset_id);
      await runs.completeWaitForToken({
        token: `voiceover-approval-${projectId}`,
        data: { approvedUrl: asset.asset_url },
      });
    }

    // Mark checkpoint as resolved
    await query(
      `UPDATE ad_engine_slack_messages 
       SET resolved = true, resolved_at = NOW() 
       WHERE id = $1`,
      [slackMessage.id]
    );
  }

  // Handle regeneration request (🔄 reaction)
  if (event.reaction === "arrows_counterclockwise") {
    // TODO: Trigger regeneration for this specific asset
    console.log("Regeneration requested for", slackMessage);
  }
}

// Helper functions

async function saveSlackMessage(data: {
  projectId: string;
  slackMessageTs: string;
  checkpointType: string;
  sceneNumber?: number;
}): Promise<void> {
  await query(
    `INSERT INTO ad_engine_slack_messages 
     (project_id, slack_message_ts, slack_channel, checkpoint_type) 
     VALUES ($1, $2, $3, $4)`,
    [data.projectId, data.slackMessageTs, SLACK_CHANNEL, data.checkpointType]
  );
}

async function getAssetById(assetId: string) {
  const result = await query(
    `SELECT * FROM ad_engine_assets WHERE id = $1`,
    [assetId]
  );
  return result.rows[0];
}

async function checkAllScenesApproved(projectId: string): Promise<boolean> {
  const result = await query(
    `SELECT COUNT(*) as total, 
            COUNT(CASE WHEN is_approved THEN 1 END) as approved
     FROM ad_engine_assets 
     WHERE project_id = $1 AND phase = 'scene'`,
    [projectId]
  );
  const { total, approved } = result.rows[0];
  return total > 0 && total === approved;
}

async function checkAllVideosApproved(projectId: string): Promise<boolean> {
  const result = await query(
    `SELECT COUNT(DISTINCT scene_number) as total_scenes,
            COUNT(DISTINCT CASE WHEN is_approved THEN scene_number END) as approved_scenes
     FROM ad_engine_assets 
     WHERE project_id = $1 AND phase = 'video'`,
    [projectId]
  );
  const { total_scenes, approved_scenes } = result.rows[0];
  return total_scenes > 0 && total_scenes === approved_scenes;
}

async function getApprovedSceneUrls(projectId: string): Promise<Record<number, string>> {
  const result = await query(
    `SELECT scene_number, asset_url 
     FROM ad_engine_assets 
     WHERE project_id = $1 AND phase = 'scene' AND is_approved = true
     ORDER BY scene_number`,
    [projectId]
  );
  
  const urls: Record<number, string> = {};
  for (const row of result.rows) {
    urls[row.scene_number] = row.asset_url;
  }
  return urls;
}

async function getApprovedClipUrls(projectId: string): Promise<string[]> {
  const result = await query(
    `SELECT asset_url 
     FROM ad_engine_assets 
     WHERE project_id = $1 AND phase = 'video' AND is_approved = true
     ORDER BY scene_number`,
    [projectId]
  );
  return result.rows.map((row) => row.asset_url);
}
