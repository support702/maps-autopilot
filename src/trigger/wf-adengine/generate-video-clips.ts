/**
 * WF-ADENGINE Phase 4: Video Animation
 * Animates approved scene frames using Kling 3.0
 */

import { task } from "@trigger.dev/sdk";
import { generateVideo } from "./kie-api-client.js";
import { saveAsset } from "./db.js";

interface VideoClipsPayload {
  projectId: string;
  approvedFrames: Record<number, string>; // { sceneNumber: imageUrl }
  anchorImageUrl: string;
  scenes: Array<{
    scene_number: number;
    scene_name: string;
    visual_description: string;
    camera_spec: string;
    duration_seconds: number;
  }>;
  aspectRatio: string;
}

export const generateVideoClips = task({
  id: "ad-engine-generate-video-clips",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 10000,
    maxTimeoutInMs: 60000,
  },
  run: async (payload: VideoClipsPayload) => {
    const clips: Array<{
      sceneNumber: number;
      sceneName: string;
      videoUrls: string[];
    }> = [];

    for (const scene of payload.scenes) {
      const frameUrl = payload.approvedFrames[scene.scene_number];
      if (!frameUrl) continue;

      const videoUrls: string[] = [];

      // Generate 2 variations per scene
      for (let variation = 1; variation <= 2; variation++) {
        // Animation prompt based on scene description
        const animationPrompt = generateAnimationPrompt(scene, variation);

        try {
          const videoUrl = await generateVideo({
            prompt: animationPrompt,
            startFrameUrl: frameUrl,
            duration: String(Math.min(scene.duration_seconds, 5)), // Max 5s per clip
            aspectRatio: payload.aspectRatio,
            mode: "pro", // 1080p quality
            sound: false, // We add voiceover separately
          });

          videoUrls.push(videoUrl);

          // Save to database
          await saveAsset({
            projectId: payload.projectId,
            phase: "video",
            sceneNumber: scene.scene_number,
            variationNumber: variation,
            assetType: "video",
            assetUrl: videoUrl,
            promptUsed: animationPrompt,
            modelUsed: "kling-3.0",
          });
        } catch (error) {
          console.error(
            `Failed to generate video for scene ${scene.scene_number}, variation ${variation}:`,
            error
          );
          // Continue with next variation
        }
      }

      clips.push({
        sceneNumber: scene.scene_number,
        sceneName: scene.scene_name,
        videoUrls,
      });
    }

    return { clips };
  },
});

function generateAnimationPrompt(
  scene: {
    scene_name: string;
    visual_description: string;
    camera_spec: string;
  },
  variation: number
): string {
  const cameraMovements = [
    "Slow dolly forward with subtle handheld drift",
    "Gentle pan across scene with shallow depth of field",
    "Static shot with atmospheric movement in background",
    "Slow zoom in with cinematic focus pull",
  ];

  const movement = cameraMovements[variation % cameraMovements.length];

  return `${scene.visual_description}. ${movement}. ${scene.camera_spec}. Generate in slow motion for maximum editing flexibility. Cinematic composition with rich detail.`;
}
