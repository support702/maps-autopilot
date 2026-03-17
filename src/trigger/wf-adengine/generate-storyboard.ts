// src/trigger/wf-adengine/generate-storyboard.ts
// Phase 1 — Generates a cinematic storyboard with scene descriptions and 5 anchor frame prompts.
// Called by the ad-engine orchestrator via triggerAndWait().unwrap().
// Uses Claude API for creative direction; saves storyboard to ad_engine_projects via db.ts.

import { task } from "@trigger.dev/sdk";
import { callClaude } from "../../lib/anthropic.js";
import { saveStoryboard, updateProjectStatus } from "./db.js";
import type { AdConcept, Storyboard, StoryboardScene } from "./types.js";

export const generateStoryboard = task({
  id: "ad-engine-generate-storyboard",
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 5000, maxTimeoutInMs: 30000 },
  run: async (payload: { projectId: string; concept: AdConcept }): Promise<Storyboard> => {
    const { projectId, concept } = payload;

    await updateProjectStatus(projectId, "storyboard_generating");

    const numScenes = concept.num_scenes || 6;
    const durationSeconds = concept.duration_seconds || 15;
    const includeFaces = concept.include_faces ?? false;
    const aspectRatios = (concept.aspect_ratios || ["1:1"]).join(", ");

    const systemPrompt = `You are a cinematic ad director and storyboard artist. Given a product, audience, and creative direction, generate a detailed storyboard with discrete scene descriptions.

For each scene, provide:
1. Scene number and name
2. Visual description (what the viewer sees)
3. Camera specification (lens, angle, movement)
4. Mood/lighting description
5. Duration in seconds
6. How it connects to the previous and next scene

Also generate:
- A Nano Banana Pro prompt for the ANCHOR FRAME (Scene 1) including camera specs, lighting, color grade, and aspect ratio
- 4 additional prompt variations for the anchor frame (5 total)
- A note about what visual elements must stay consistent across all scenes
- A suggested voiceover script if one wasn't provided

Rules:
- Total scenes should equal ${numScenes}
- Total duration should target ${durationSeconds} seconds
- If include_faces is ${includeFaces}, tell the story through environments, objects, and atmosphere
- Add camera model + lens + focal length to every prompt (e.g., "Shot on Sony A7R, 85mm f/1.8, shallow depth of field, rich bokeh")
- ${concept.visual_style === "anamorphic cinematic" ? 'Add "anamorphic shot" for cinematic look' : ""}
- Use 21:9 aspect ratio language for cinematic, 9:16 for social

CRITICAL: Return ONLY valid JSON matching this exact structure:
{
  "scenes": [
    {
      "scene_number": 1,
      "scene_name": "Scene Title",
      "visual_description": "Detailed description",
      "camera_spec": "Camera and lens details",
      "mood_lighting": "Lighting and mood",
      "duration_seconds": 2.5,
      "transition_notes": "How it connects"
    }
  ],
  "anchor_prompts": ["prompt 1", "prompt 2", "prompt 3", "prompt 4", "prompt 5"],
  "consistency_notes": "What must stay consistent",
  "suggested_script": "Optional voiceover script if not provided"
}`;

    const userPrompt = `Create a storyboard for this ad concept:

Product: ${concept.product_name}
Description: ${concept.product_description}
Target Audience: ${concept.target_audience}
Ad Objective: ${concept.ad_objective}
Creative Direction: ${concept.creative_direction}

${concept.camera_spec ? `Camera Spec: ${concept.camera_spec}` : ""}
${concept.visual_style ? `Visual Style: ${concept.visual_style}` : ""}
${concept.color_grade ? `Color Grade: ${concept.color_grade}` : ""}
${concept.brand_colors ? `Brand Colors: ${concept.brand_colors.join(", ")}` : ""}
${concept.music_mood ? `Music Mood: ${concept.music_mood}` : ""}
${!includeFaces ? "IMPORTANT: No people/faces. Tell the story through environments, objects, and atmosphere only." : ""}

Number of scenes: ${numScenes}
Target duration: ${durationSeconds} seconds
Aspect ratios: ${aspectRatios}`;

    const response = await callClaude(userPrompt, systemPrompt);

    // Parse JSON — strip markdown code fences if present
    let jsonStr = response.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      // Retry once with explicit JSON-only instruction appended
      const retryResponse = await callClaude(
        userPrompt + "\n\nReturn ONLY valid JSON. No markdown, no code fences, no explanation.",
        systemPrompt
      );
      let retryStr = retryResponse.trim();
      if (retryStr.startsWith("```")) {
        retryStr = retryStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      parsed = JSON.parse(retryStr);
    }

    // Map Claude's snake_case JSON to camelCase Storyboard interface
    const storyboard: Storyboard = {
      scenes: parsed.scenes as StoryboardScene[],
      anchorPrompts: (parsed.anchor_prompts || parsed.anchorPrompts) as string[],
      suggestedScript: (parsed.suggested_script || parsed.suggestedScript) as string | undefined,
    };

    // Validate required fields
    if (!storyboard.scenes || storyboard.scenes.length === 0) {
      throw new Error("Storyboard has no scenes");
    }
    if (!storyboard.anchorPrompts || storyboard.anchorPrompts.length === 0) {
      throw new Error("Storyboard has no anchor prompts");
    }

    await saveStoryboard(projectId, storyboard);

    return storyboard;
  },
});
