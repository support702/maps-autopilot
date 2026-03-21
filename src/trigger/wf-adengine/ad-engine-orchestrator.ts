/**
 * WF-ADENGINE Orchestrator
 * Main workflow that coordinates all phases with human checkpoints
 */

import { schemaTask, wait } from "@trigger.dev/sdk";
import { z } from "zod";
import { createProject, updateProjectStatus, getApprovedAssets, calculateProjectCost } from "./db.js";
import { generateStoryboard } from "./generate-storyboard.js";
import { generateAnchorFrames } from "./generate-anchor-frames.js";
import { generateSceneFrames } from "./generate-scene-frames.js";
import { generateVideoClips } from "./generate-video-clips.js";
import { generateVoiceover } from "./generate-voiceover.js";
import { postToSlack, postImagesToSlack, postVideosToSlack } from "./slack-checkpoint.js";

const AdConceptSchema = z.object({
  // REQUIRED
  project_name: z.string(),
  product_name: z.string(),
  product_description: z.string(),
  target_audience: z.string(),
  ad_objective: z.string(),
  creative_direction: z.string(),
  
  // OPTIONAL
  product_images: z.array(z.string()).optional(),
  brand_colors: z.array(z.string()).optional(),
  reference_ad_url: z.string().optional(),
  voiceover_script: z.string().optional(),
  music_mood: z.string().optional(),
  num_scenes: z.number().default(6),
  duration_seconds: z.number().default(15),
  aspect_ratios: z.array(z.string()).default(["1:1"]),
  include_faces: z.boolean().default(false),
  camera_spec: z.string().optional(),
  visual_style: z.string().default("anamorphic cinematic"),
  color_grade: z.string().default("warm golden with slight desaturation"),
});

export const adEngineOrchestrator = schemaTask({
  id: "ad-engine-orchestrator",
  schema: AdConceptSchema,
  maxDuration: 86400, // 24 hours — allows time for human approvals
  retry: {
    maxAttempts: 1,
    factor: 2,
    minTimeoutInMs: 10000,
    maxTimeoutInMs: 60000,
  },
  run: async (payload, { ctx }) => {
    console.log(`Orchestrator started for ${payload.project_name} — run ID: ${ctx.run.id}`);
    // ========================================
    // SETUP
    // ========================================
    const projectId = await createProject({
      project_name: payload.project_name,
      concept_config: payload,
      status: "storyboard_pending",
    });

    await postToSlack(`🎬 *${payload.project_name}* — Pipeline started\nProject ID: ${projectId}`);

    // ========================================
    // PHASE 1: Generate Storyboard
    // ========================================
    await updateProjectStatus(projectId, "storyboard_generating");

    const storyboard = await generateStoryboard.triggerAndWait({
      projectId,
      concept: payload,
    }).then((result) => {
      if (result.ok) return result.output;
      throw new Error(`Storyboard generation failed: ${result.error}`);
    });

    await postToSlack(
      `📋 *${payload.project_name}* — Storyboard ready\n` +
      `${storyboard.scenes.length} scenes generated`
    );

    // ========================================
    // PHASE 2: Generate Anchor Frames
    // ========================================
    await updateProjectStatus(projectId, "anchor_generating");

    const anchorFrames = await generateAnchorFrames.triggerAndWait({
      projectId,
      prompts: storyboard.anchorPrompts,
      aspectRatio: payload.aspect_ratios[0],
    }).then((result) => {
      if (result.ok) return result.output;
      throw new Error(`Anchor frames generation failed: ${result.error}`);
    });

    // Post to Slack and wait for human approval
    await updateProjectStatus(projectId, "anchor_review");
    
    await postImagesToSlack({
      projectId,
      images: anchorFrames.imageUrls,
      assetIds: anchorFrames.assetIds,
      message: `🖼️ *${payload.project_name}* — Anchor Frame Options\nPick your favorite. React with ✅ on the winner.`,
      checkpointType: "anchor_review",
    });

    // ★ HUMAN CHECKPOINT 1: Poll DB until anchor is approved
    let approvedAnchorUrl = "";
    while (true) {
      const approved = await getApprovedAssets(projectId, "anchor");
      if (approved.length > 0) {
        approvedAnchorUrl = approved[0].asset_url;
        break;
      }
      await wait.for({ seconds: 15 });
    }

    await postToSlack(`✅ Anchor frame approved for *${payload.project_name}*`);

    // ========================================
    // PHASE 3: Generate Scene Frames
    // ========================================
    await updateProjectStatus(projectId, "scenes_generating");

    const sceneFrames = await generateSceneFrames.triggerAndWait({
      projectId,
      anchorImageUrl: approvedAnchorUrl,
      scenes: storyboard.scenes,
      productImages: payload.product_images || [],
      aspectRatio: payload.aspect_ratios[0],
      cameraSpec: payload.camera_spec,
      visualStyle: payload.visual_style,
      colorGrade: payload.color_grade,
    }).then((result) => {
      if (result.ok) return result.output;
      throw new Error(`Scene frames generation failed: ${result.error}`);
    });

    // Post scene images to Slack grouped by scene
    await updateProjectStatus(projectId, "scenes_review");

    for (const scene of sceneFrames.scenes) {
      await postImagesToSlack({
        projectId,
        images: scene.imageUrls,
        assetIds: scene.assetIds,
        message: `🖼️ *${payload.project_name}* — Scene ${scene.sceneNumber}: "${scene.sceneName}"\nPick your favorite. React ✅ on the winner.`,
        checkpointType: "scene_review",
        sceneNumber: scene.sceneNumber,
      });
    }

    // ★ HUMAN CHECKPOINT 2: Poll DB until all scenes are approved
    // Scene 1 is the anchor (phase="anchor"), not a scene frame.
    // Only scenes 2+ are generated as phase="scene", so expect (total - 1) approvals.
    const totalScenes = storyboard.scenes.length - 1;
    let approvedSceneUrls: Record<number, string> = {};
    while (true) {
      const approved = await getApprovedAssets(projectId, "scene");
      const byScene: Record<number, string> = {};
      for (const asset of approved) {
        if (asset.scene_number != null) {
          byScene[asset.scene_number] = asset.asset_url;
        }
      }
      if (Object.keys(byScene).length >= totalScenes) {
        approvedSceneUrls = byScene;
        break;
      }
      await wait.for({ seconds: 15 });
    }

    await postToSlack(`✅ All scenes approved for *${payload.project_name}*`);

    // ========================================
    // PHASE 4: Generate Video Clips
    // ========================================
    await updateProjectStatus(projectId, "video_generating");

    const videoClips = await generateVideoClips.triggerAndWait({
      projectId,
      approvedFrames: approvedSceneUrls,
      anchorImageUrl: approvedAnchorUrl,
      scenes: storyboard.scenes,
      aspectRatio: payload.aspect_ratios[0],
    }).then((result) => {
      if (result.ok) return result.output;
      throw new Error(`Video clips generation failed: ${result.error}`);
    });

    // Post video clips to Slack
    await updateProjectStatus(projectId, "video_review");

    for (const clip of videoClips.clips) {
      await postVideosToSlack({
        projectId,
        videos: clip.videoUrls,
        assetIds: clip.assetIds,
        message: `🎬 *${payload.project_name}* — Scene ${clip.sceneNumber} Animation\nPick your favorite. React ✅. You only need 2-3 good seconds from each.`,
        checkpointType: "video_review",
        sceneNumber: clip.sceneNumber,
      });
    }

    // ★ HUMAN CHECKPOINT 3: Poll DB until all video clips are approved
    let approvedClipUrls: string[] = [];
    while (true) {
      const approved = await getApprovedAssets(projectId, "video");
      const byScene: Record<number, string> = {};
      for (const asset of approved) {
        if (asset.scene_number != null) {
          byScene[asset.scene_number] = asset.asset_url;
        }
      }
      if (Object.keys(byScene).length >= totalScenes) {
        // Build ordered array by scene number
        approvedClipUrls = Object.keys(byScene)
          .map(Number)
          .sort((a, b) => a - b)
          .map((sceneNum) => byScene[sceneNum]);
        break;
      }
      await wait.for({ seconds: 15 });
    }

    await postToSlack(`✅ All video clips approved for *${payload.project_name}*`);

    // ========================================
    // PHASE 5: Generate Voiceover
    // ========================================
    await updateProjectStatus(projectId, "voiceover_generating");

    const voiceover = await generateVoiceover.triggerAndWait({
      projectId,
      script: payload.voiceover_script || storyboard.suggestedScript || "",
    }).then((result) => {
      if (result.ok) return result.output;
      throw new Error(`Voiceover generation failed: ${result.error}`);
    });

    // Post voiceover options to Slack
    await updateProjectStatus(projectId, "voiceover_review");

    await postToSlack(
      `🎤 *${payload.project_name}* — Voiceover Options\n` +
      `Pick your favorite. React ✅.\n` +
      voiceover.audioUrls.map((url, i) => `Option ${i + 1}: ${url}`).join("\n")
    );

    // ★ HUMAN CHECKPOINT 4: Poll DB until voiceover is approved
    let approvedVoiceoverUrl = "";
    while (true) {
      const approved = await getApprovedAssets(projectId, "voiceover");
      if (approved.length > 0) {
        approvedVoiceoverUrl = approved[0].asset_url;
        break;
      }
      await wait.for({ seconds: 15 });
    }

    // ========================================
    // FINAL: Deliver all approved assets
    // ========================================
    await updateProjectStatus(projectId, "assets_delivered");

    await postToSlack(
      `✅ *${payload.project_name}* — ALL ASSETS READY\n\n` +
      `📹 *Approved video clips:*\n` +
      approvedClipUrls.map((url, i) => `Scene ${i + 1}: ${url}`).join("\n") +
      `\n\n🎤 *Voiceover:* ${approvedVoiceoverUrl}\n\n` +
      `Open CapCut and assemble your ad!\n` +
      `💰 Total cost: $${await calculateProjectCost(projectId)}`
    );

    return {
      projectId,
      status: "assets_delivered",
      approvedClips: approvedClipUrls,
      voiceoverUrl: approvedVoiceoverUrl,
    };
  },
});
