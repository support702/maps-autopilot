/**
 * Slack Notifications
 */

import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

/**
 * Post simple text message to #content-output
 */
export async function notifySlack(message: string): Promise<void> {
  try {
    await slack.chat.postMessage({
      channel: '#content-output',
      text: message,
    });

    console.log(`[Slack] Notification sent`);
  } catch (error) {
    console.error('[Slack] Failed to send notification:', error);
  }
}

/**
 * Post error notification to #maps-engineering
 */
export async function notifyError(error: Error, context: string): Promise<void> {
  try {
    await slack.chat.postMessage({
      channel: '#maps-engineering',
      text: `❌ Content Engine Error: ${context}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '❌ Content Engine Error',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Context:* ${context}`,
            },
            {
              type: 'mrkdwn',
              text: `*Error:* ${error.message}`,
            },
          ],
        },
      ],
    });

    console.log(`[Slack] Error notification sent: ${context}`);
  } catch (err) {
    console.error('[Slack] Failed to send error notification:', err);
  }
}
