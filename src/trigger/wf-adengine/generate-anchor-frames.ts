// src/trigger/wf-adengine/generate-anchor-frames.ts
// Phase 2 — Generates 5 anchor frame variations using Kie.ai Nano Banana Pro text-to-image.
// Called by the ad-engine orchestrator via triggerAndWait().unwrap().
// Each generated image is saved as an asset in ad_engine_assets via db.ts.

import { task } from "@trigger.dev/sdk";
import { generateImage } from "./kie-api-client.js";
import { saveAsset, updateProjectStatus } from "./db.js";

export const generateAnchorFrames = task({
  id: "ad-engine-generate-anchor-frames",
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 5000, maxTimeoutInMs: 30000 },
  run: async (payload: {
    projectId: string;
    prompts: string[];
    aspectRatio: string;
  }): Promise<{ imageUrls: string[]; assetIds: string[] }> => {
    const { projectId, prompts, aspectRatio } = payload;

    console.log(`Generating ${payload.prompts.length} anchor frames for project ${payload.projectId}`);

    if (!prompts || prompts.length === 0) {
      throw new Error("No anchor prompts provided");
    }

    await updateProjectStatus(projectId, "anchor_generating");

    const imageUrls: string[] = [];
    const assetIds: string[] = [];

    for (let i = 0; i < prompts.length; i++) {
      const { imageUrl, taskId } = await generateImage({
        prompt: prompts[i],
        aspectRatio,
        resolution: "4K",
      });

      imageUrls.push(imageUrl);

      const assetId = await saveAsset({
        project_id: projectId,
        phase: "anchor",
        variation_number: i + 1,
        asset_type: "image",
        asset_url: imageUrl,
        prompt_used: prompts[i],
        model_used: "nano-banana-pro",
        kie_task_id: taskId,
        cost_credits: 0.12,
      });

      assetIds.push(assetId);
    }

    await updateProjectStatus(projectId, "anchor_review");

    return { imageUrls, assetIds };
  },
});
