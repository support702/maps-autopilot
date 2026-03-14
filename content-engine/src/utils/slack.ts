import { WebClient } from '@slack/web-api';

const DEFAULT_CHANNEL = '#content-output';

function getSlackClient(): WebClient | null {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn('[Slack] SLACK_BOT_TOKEN not set — notifications disabled');
    return null;
  }
  return new WebClient(token);
}

export async function notifySlack(
  message: string,
  channel: string = DEFAULT_CHANNEL
): Promise<void> {
  const client = getSlackClient();
  if (!client) return;

  try {
    await client.chat.postMessage({
      channel,
      text: message,
    });
    console.log(`[Slack] Notification sent to ${channel}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn(`[Slack] Failed to send notification: ${errorMessage}`);
  }
}
