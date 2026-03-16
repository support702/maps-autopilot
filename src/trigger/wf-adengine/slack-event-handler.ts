/**
 * WF-ADENGINE Slack Event Handler
 * Processes Slack reaction events to handle ad engine checkpoints
 */

import { task } from "@trigger.dev/sdk";
import { handleSlackReaction } from "./slack-checkpoint.js";

interface SlackReactionEvent {
  type: string;
  reaction: string;
  user: string;
  item: {
    type: string;
    channel: string;
    ts: string;
  };
  event_ts: string;
}

interface SlackEventPayload {
  event: SlackReactionEvent;
}

export const slackEventHandler = task({
  id: "ad-engine-slack-event-handler",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: SlackEventPayload) => {
    const { event } = payload;

    if (!event || event.type !== "reaction_added") {
      return { skipped: true, reason: "Not a reaction_added event" };
    }

    await handleSlackReaction({
      reaction: event.reaction,
      item: { ts: event.item.ts, channel: event.item.channel },
      user: event.user,
    });

    return {
      success: true,
      reaction: event.reaction,
      messageTs: event.item.ts,
      channel: event.item.channel,
    };
  },
});
