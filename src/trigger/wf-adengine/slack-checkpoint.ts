/**
 * WF-ADENGINE Slack Integration
 * Handles posting to Slack and processing reactions for human checkpoints
 */

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
  assetIds: string[];
}

interface SlackVideoOptions extends SlackMessageOptions {
  videos: string[];
  assetIds: string[];
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
 * Post images to Slack — each image as a SEPARATE message for individual reactions.
 * Each message is linked to its specific asset_id in ad_engine_slack_messages.
 */
export async function postImagesToSlack(options: SlackImageOptions): Promise<void> {
  if (!SLACK_BOT_TOKEN) {
    console.warn("SLACK_BOT_TOKEN not set - skipping Slack notification");
    return;
  }

  const totalImages = options.images.length;

  // Post header message first
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL,
      text: options.message,
      mrkdwn: true,
    }),
  });

  // Post each image as a separate message
  for (let i = 0; i < totalImages; i++) {
    const imageUrl = options.images[i];
    const assetId = options.assetIds[i];
    const label = `Option ${i + 1} of ${totalImages}`;

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL,
        text: label,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${label}*${options.sceneNumber ? ` — Scene ${options.sceneNumber}` : ""}`,
            },
          },
          {
            type: "image",
            image_url: imageUrl,
            alt_text: label,
          },
        ],
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack API error posting image ${i + 1}: ${data.error}`);
    }

    // Save each message with its specific asset_id
    if (options.checkpointType) {
      await saveSlackMessage({
        projectId: options.projectId,
        slackMessageTs: data.ts,
        checkpointType: options.checkpointType,
        sceneNumber: options.sceneNumber,
        assetId,
      });
    }
  }
}

/**
 * Post videos to Slack — each video as a SEPARATE message for individual reactions.
 * Each message is linked to its specific asset_id in ad_engine_slack_messages.
 */
export async function postVideosToSlack(options: SlackVideoOptions): Promise<void> {
  if (!SLACK_BOT_TOKEN) {
    console.warn("SLACK_BOT_TOKEN not set - skipping Slack notification");
    return;
  }

  const totalVideos = options.videos.length;

  // Post header message first
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL,
      text: options.message,
      mrkdwn: true,
    }),
  });

  // Post each video as a separate message so each can be individually reacted to
  for (let i = 0; i < totalVideos; i++) {
    const videoUrl = options.videos[i];
    const assetId = options.assetIds[i];
    const label = `Option ${i + 1} of ${totalVideos}`;

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL,
        text: `*${label}*${options.sceneNumber ? ` — Scene ${options.sceneNumber}` : ""}: ${videoUrl}`,
        mrkdwn: true,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack API error posting video ${i + 1}: ${data.error}`);
    }

    // Save each message with its specific asset_id
    if (options.checkpointType) {
      await saveSlackMessage({
        projectId: options.projectId,
        slackMessageTs: data.ts,
        checkpointType: options.checkpointType,
        sceneNumber: options.sceneNumber,
        assetId,
      });
    }
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
    // Mark the asset as approved in the DB — the orchestrator polls for this
    if (slackMessage.asset_id) {
      await query(
        `UPDATE ad_engine_assets
         SET is_approved = true, approved_at = NOW()
         WHERE id = $1`,
        [slackMessage.asset_id]
      );
    }

    // Mark slack message as resolved
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
  assetId?: string;
}): Promise<void> {
  await query(
    `INSERT INTO ad_engine_slack_messages
     (project_id, asset_id, slack_message_ts, slack_channel, checkpoint_type)
     VALUES ($1, $2, $3, $4, $5)`,
    [data.projectId, data.assetId ?? null, data.slackMessageTs, SLACK_CHANNEL, data.checkpointType]
  );
}

async function getAssetById(assetId: string) {
  const result = await query(
    `SELECT * FROM ad_engine_assets WHERE id = $1`,
    [assetId]
  );
  return result.rows[0];
}
