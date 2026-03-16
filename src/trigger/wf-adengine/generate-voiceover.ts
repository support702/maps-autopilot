/**
 * WF-ADENGINE Phase 5: Voiceover Generation
 * Generates voiceover audio using ElevenLabs API
 */

import { task } from "@trigger.dev/sdk";
import { saveAsset } from "./db.js";

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
              "Authorization": `Bearer ${apiKey}`,
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
          projectId: payload.projectId,
          phase: "voiceover",
          variationNumber: variation,
          assetType: "audio",
          assetUrl: audioUrl,
          promptUsed: payload.script,
          modelUsed: "elevenlabs",
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
 * Upload audio to storage
 * TODO: Implement based on your storage solution (S3, Supabase Storage, etc.)
 */
async function uploadAudioToStorage(
  audioBuffer: ArrayBuffer,
  filename: string
): Promise<string> {
  // Placeholder - implement based on your storage solution
  // For now, return a mock URL
  // In production, upload to S3, Supabase Storage, or similar
  
  // Example with Supabase Storage:
  // const { data, error } = await supabase.storage
  //   .from('ad-engine-assets')
  //   .upload(filename, audioBuffer, { contentType: 'audio/mpeg' });
  // if (error) throw error;
  // return supabase.storage.from('ad-engine-assets').getPublicUrl(filename).data.publicUrl;

  console.warn("Audio storage not implemented - returning placeholder URL");
  return `https://storage.example.com/voiceovers/${filename}`;
}
