/**
 * WF-ADENGINE Phase 5: Voiceover Generation
 * Generates voiceover audio using ElevenLabs API
 */

import { task } from "@trigger.dev/sdk";
import { saveAsset } from "./db.js";
import { query } from "../../lib/db.js";

interface VoiceoverPayload {
  projectId: string;
  script: string;
}

export const generateVoiceover = task({
  id: "ad-engine-generate-voiceover",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: VoiceoverPayload) => {
    // Idempotency guard: skip generation if voiceover assets already exist
    const existing = await query(
      'SELECT asset_url FROM ad_engine_assets WHERE project_id = $1 AND phase = $2',
      [payload.projectId, 'voiceover']
    );
    if (existing.rows.length > 0) {
      console.log(`Voiceover assets already exist for project ${payload.projectId}, skipping generation`);
      return { audioUrls: existing.rows.map(r => r.asset_url), approvedUrl: existing.rows[0].asset_url };
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Default: Rachel
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY not set");
    }

    const audioUrls: string[] = [];

    // Generate 2 variations (different takes)
    for (let variation = 1; variation <= 2; variation++) {
      try {
        const voiceSettings = getVoiceSettings(variation);

        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: payload.script,
              model_id: "eleven_multilingual_v2",
              voice_settings: voiceSettings,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
        }

        // Get audio buffer
        const audioBuffer = await response.arrayBuffer();

        // Upload to storage (you'll need to implement uploadAudioToStorage)
        const audioUrl = await uploadAudioToStorage(
          audioBuffer,
          `${payload.projectId}-voiceover-${variation}.mp3`
        );

        audioUrls.push(audioUrl);

        // Save to database
        await saveAsset({
          project_id: payload.projectId,
          phase: "voiceover",
          variation_number: variation,
          asset_type: "audio",
          asset_url: audioUrl,
          prompt_used: payload.script,
          model_used: "elevenlabs",
        });
      } catch (error) {
        console.error(`Failed to generate voiceover variation ${variation}:`, error);
        // Continue with next variation
      }
    }

    return {
      audioUrls,
      approvedUrl: audioUrls[0], // Default to first variation
    };
  },
});

function getVoiceSettings(variation: number) {
  // Variation 1: Balanced (default)
  // Variation 2: More expressive
  if (variation === 1) {
    return {
      stability: 0.4,
      similarity_boost: 0.7,
      style: 0.5,
    };
  } else {
    return {
      stability: 0.3,
      similarity_boost: 0.75,
      style: 0.7,
    };
  }
}

/**
 * Upload audio to Slack via files.upload API and return the file URL.
 * Uses Slack as lightweight storage so voiceovers are accessible without S3.
 */
async function uploadAudioToStorage(
  audioBuffer: ArrayBuffer,
  filename: string
): Promise<string> {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const slackChannel = process.env.SLACK_CHANNEL_AD_ENGINE || "#ad-engine";

  if (!slackToken) {
    throw new Error("SLACK_BOT_TOKEN not set — cannot upload voiceover audio");
  }

  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("file", Buffer.from(audioBuffer), {
    filename,
    contentType: "audio/mpeg",
  });
  form.append("channels", slackChannel);
  form.append("title", filename);
  form.append("initial_comment", `Voiceover: ${filename}`);

  const response = await fetch("https://slack.com/api/files.upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${slackToken}`,
      ...form.getHeaders(),
    },
    body: form as unknown as BodyInit,
  });

  if (!response.ok) {
    throw new Error(`Slack files.upload HTTP error: ${response.status}`);
  }

  const result = (await response.json()) as {
    ok: boolean;
    error?: string;
    file?: { url_private_download?: string; url_private?: string };
  };

  if (!result.ok) {
    throw new Error(`Slack files.upload error: ${result.error}`);
  }

  return result.file?.url_private_download || result.file?.url_private || "";
}
