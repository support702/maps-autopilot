// src/trigger/wf-adengine/generate-scene-frames.ts
// Phase 3 — Generates 3 frame variations per scene (scenes 2-N) using Kie.ai Nano Banana Pro
// image-to-image with the approved anchor frame as reference for visual consistency.
// Called by the ad-engine orchestrator via triggerAndWait().unwrap().
// Uses Claude to generate prompt variations; saves each frame to ad_engine_assets via db.ts.

import { task } from "@trigger.dev/sdk";
import { callClaude } from "../../lib/anthropic.js";
import { generateImage } from "./kie-api-client.js";
import { saveAsset, updateProjectStatus } from "./db.js";
import type { StoryboardScene, SceneFrameResult } from "./types.js";

const VARIATIONS_PER_SCENE = 3;

/** Build fallback prompts from scene data when Claude returns unparseable JSON. */
function buildFallbackPrompts(scene: StoryboardScene): string[] {
  return [
    `${scene.visual_description}. ${scene.camera_spec}. ${scene.mood_lighting}. Use the same style, lighting, and aesthetic from the reference image.`,
    `${scene.visual_description}. ${scene.camera_spec}. Slightly different angle. ${scene.mood_lighting}. Match the reference image style.`,
    `${scene.visual_description}. Close-up detail shot. ${scene.mood_lighting}. Consistent with reference image aesthetic.`,
  ];
}

export const generateSceneFrames = task({
  id: "ad-engine-generate-scene-frames",
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 10000, maxTimeoutInMs: 60000 },
  run: async (payload: {
    projectId: string;
    anchorImageUrl: string;
    scenes: StoryboardScene[];
    productImages: string[];
    aspectRatio: string;
    cameraSpec?: string;
    visualStyle?: string;
    colorGrade?: string;
  }): Promise<{ scenes: SceneFrameResult[] }> => {
    const {
      projectId,
      anchorImageUrl,
      scenes,
      productImages,
      aspectRatio,
      cameraSpec,
      visualStyle,
      colorGrade,
    } = payload;

    if (!anchorImageUrl) {
      throw new Error("No anchor image URL provided");
    }
    if (!scenes || scenes.length === 0) {
      throw new Error("No scenes provided");
    }

    await updateProjectStatus(projectId, "scenes_generating");

    // Skip scene 1 (that's the anchor frame) — generate for scenes 2+
    const scenesToGenerate = scenes.filter((s) => s.scene_number > 1);
    const results: SceneFrameResult[] = [];

    for (const scene of scenesToGenerate) {
      const prompts = await generateScenePrompts(scene, cameraSpec, visualStyle, colorGrade);

      const sceneImageUrls: string[] = [];
      const sceneAssetIds: string[] = [];

      for (let v = 0; v < prompts.length; v++) {
        const fullPrompt = `${prompts[v]} — Use the same style, lighting, and aesthetic from the reference image.`;
        const referenceImages = [anchorImageUrl, ...productImages].filter(Boolean);

        const { imageUrl, taskId } = await generateImage({
          prompt: fullPrompt,
          referenceImages,
          aspectRatio,
          resolution: "4K",
        });

        sceneImageUrls.push(imageUrl);

        const assetId = await saveAsset({
          project_id: projectId,
          phase: "scene",
          scene_number: scene.scene_number,
          variation_number: v + 1,
          asset_type: "image",
          asset_url: imageUrl,
          prompt_used: fullPrompt,
          model_used: "nano-banana-pro",
          kie_task_id: taskId,
          cost_credits: 0.12,
        });

        sceneAssetIds.push(assetId);
      }

      results.push({
        sceneNumber: scene.scene_number,
        sceneName: scene.scene_name,
        imageUrls: sceneImageUrls,
        assetIds: sceneAssetIds,
      });
    }

    await updateProjectStatus(projectId, "scenes_review");

    return { scenes: results };
  },
});

/**
 * Ask Claude to generate prompt variations for a single scene.
 * Falls back to template-based prompts if Claude returns invalid JSON.
 */
async function generateScenePrompts(
  scene: StoryboardScene,
  cameraSpec?: string,
  visualStyle?: string,
  colorGrade?: string
): Promise<string[]> {
  const promptRequest = `Generate ${VARIATIONS_PER_SCENE} Nano Banana Pro image generation prompt variations for this scene.

Scene ${scene.scene_number}: "${scene.scene_name}"
Visual: ${scene.visual_description}
Camera: ${scene.camera_spec}
Mood: ${scene.mood_lighting}

${cameraSpec ? `Camera Spec Override: ${cameraSpec}` : ""}
${visualStyle ? `Visual Style: ${visualStyle}` : ""}
${colorGrade ? `Color Grade: ${colorGrade}` : ""}

Each prompt must:
- Be detailed and specific for photorealistic image generation
- Reference the same style, lighting, and aesthetic as the anchor image
- Include camera model, lens, focal length
- Be a single paragraph, no line breaks

Return ONLY a JSON array of ${VARIATIONS_PER_SCENE} prompt strings: ["prompt1", "prompt2", "prompt3"]`;

  const promptResponse = await callClaude(
    promptRequest,
    "You are an expert AI image prompt engineer specializing in cinematic ad production. Return ONLY valid JSON."
  );

  try {
    let jsonStr = promptResponse.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return buildFallbackPrompts(scene);
    }
    return parsed.slice(0, VARIATIONS_PER_SCENE);
  } catch {
    return buildFallbackPrompts(scene);
  }
}
