# WF-ADENGINE: Universal AI Ad Production Engine
## Trigger.dev Workflow Specification

---

## OVERVIEW

A universal, niche-agnostic AI video ad production pipeline that takes a simple concept config and produces cinematic-quality video ads with minimal human interaction. Based on proven workflows extracted from 9 top AI ad creators.

This is NOT a Maps Autopilot-specific tool. It produces ads for any product, any niche, any industry.

---

## ARCHITECTURE

```
INPUT: Concept Config (JSON)
  ↓
PHASE 1: Storyboard Generation (Claude API) — AUTOMATED
  ↓
PHASE 2: Anchor Frame Generation (Kie.ai → Nano Banana Pro) — AUTOMATED
  ↓
★ HUMAN CHECKPOINT 1: Pick winning anchor frame via Slack
  ↓
PHASE 3: Scene Frame Generation (Kie.ai → Nano Banana Pro image-to-image) — AUTOMATED
  ↓
★ HUMAN CHECKPOINT 2: Pick winning frames via Slack (option to request fixes)
  ↓
PHASE 4: Video Animation (Kie.ai → Kling 3.0 image-to-video) — AUTOMATED
  ↓
★ HUMAN CHECKPOINT 3: Pick winning clips via Slack
  ↓
PHASE 5: Voiceover Generation (ElevenLabs API) — AUTOMATED
  ↓
PHASE 6: Assembly & Render (Remotion on Mac Mini) — AUTOMATED
  ↓
★ HUMAN CHECKPOINT 4: Final review via Slack (approve or iterate)
  ↓
OUTPUT: Rendered video ad (1080x1080 + 1080x1920 + 1920x1080)
```

---

## INPUT: CONCEPT CONFIG

```typescript
interface AdConcept {
  // REQUIRED
  project_name: string;             // "maps-autopilot-empty-to-full"
  product_name: string;             // "Maps Autopilot" or "Rose Teddy Bear" or "Nike"
  product_description: string;      // Brief description of what the product/service is
  target_audience: string;          // "Auto repair shop owners, 35-60, blue collar"
  ad_objective: string;             // "Book a free Maps Audit call"
  creative_direction: string;       // "Cinematic story: empty shop transforms to thriving shop"
  
  // OPTIONAL — enhances quality
  product_images?: string[];        // URLs to product images on white background
  brand_colors?: string[];          // ["#0A0A0C", "#F5820A"]
  reference_ad_url?: string;        // URL to a competitor/inspiration ad to analyze
  voiceover_script?: string;        // Pre-written script, or leave blank for AI generation
  music_mood?: string;              // "upbeat building energy" or "dramatic cinematic"
  num_scenes?: number;              // Default: 6
  duration_seconds?: number;        // Target duration. Default: 15
  aspect_ratios?: string[];         // ["1:1", "9:16", "16:9"] — renders all specified
  include_faces?: boolean;          // Default: false (safer for photorealism)
  
  // STYLE CONTROLS (from Creator 8/9 insights)
  camera_spec?: string;             // "Sony A7R, 85mm f/1.8" — defaults to cinematic preset
  visual_style?: string;            // "anamorphic cinematic" | "UGC organic" | "product commercial" | "lifestyle"
  color_grade?: string;             // "warm golden" | "cool desaturated" | "high contrast moody"
}
```

### Example Config — Maps Autopilot:
```json
{
  "project_name": "maps-autopilot-empty-to-full",
  "product_name": "Maps Autopilot",
  "product_description": "Local SEO service that optimizes Google Business Profiles to get auto repair shops into the Top 3 on Google Maps for high-ticket searches like transmission repair, brake repair, AC repair",
  "target_audience": "Auto repair shop owners, 35-60, male, blue collar, scrolling Facebook at night",
  "ad_objective": "Book a free 15-minute Maps Audit call",
  "creative_direction": "Cinematic story: empty auto repair shop with no calls transforms into a thriving shop with all bays full after Google Maps optimization. No people — the shop environment IS the character. Empty to full. Silent to ringing. Dead to alive.",
  "brand_colors": ["#0A0A0C", "#F5820A"],
  "voiceover_script": "The shops in the Top 3 on Google Maps in your city aren't living on oil changes. They're getting the $2,500 transmission rebuilds, the $800 brake jobs, the $1,200 AC repairs. Every month. If your shop isn't showing up for these searches, that money's going to someone else. We fix that in about 90 days for qualifying shops. Link below.",
  "music_mood": "building tension to triumphant resolution",
  "num_scenes": 6,
  "duration_seconds": 15,
  "aspect_ratios": ["1:1", "9:16"],
  "include_faces": false,
  "camera_spec": "Sony A7III, 35mm f/2.8 for wide shots, 85mm f/1.8 for close-ups",
  "visual_style": "anamorphic cinematic",
  "color_grade": "warm golden with slight desaturation"
}
```

---

## PHASE 1: STORYBOARD GENERATION

**Trigger:** Concept config submitted (webhook, Slack command, or manual trigger)

**Action:** Call Claude API (claude-sonnet-4-6) with this system prompt:

```
You are a cinematic ad director and storyboard artist. Given a product, audience, 
and creative direction, generate a detailed storyboard with discrete scene descriptions.

For each scene, provide:
1. Scene number and name
2. Visual description (what the viewer sees)
3. Camera specification (lens, angle, movement)
4. Mood/lighting description
5. Duration in seconds
6. How it connects to the previous and next scene

Also generate:
- A Nano Banana Pro prompt for the ANCHOR FRAME (Scene 1) including camera specs, 
  lighting, color grade, and aspect ratio
- 4 additional prompt variations for the anchor frame
- A note about what visual elements must stay consistent across all scenes

Rules:
- Total scenes should equal {num_scenes}
- Total duration should target {duration_seconds} seconds
- If include_faces is false, tell the story through environments, objects, and atmosphere
- Add camera model + lens + focal length to every prompt (e.g., "Shot on Sony A7R, 85mm f/1.8, shallow depth of field, rich bokeh")
- Add "anamorphic shot" for cinematic look when visual_style is "anamorphic cinematic"
- Use 21:9 aspect ratio language for cinematic, 9:16 for social
```

**Output:** Storyboard JSON with scene descriptions + 5 anchor frame prompt variations

**Stored in:** PostgreSQL `ad_engine_projects` table + posted to Slack #ad-engine

---

## PHASE 2: ANCHOR FRAME GENERATION

**Trigger:** Phase 1 completes

**Action:** Call Kie.ai API → Nano Banana Pro text-to-image

```
POST https://api.kie.ai/api/v1/jobs/createTask
{
  "model": "google/nano-banana-pro/text-to-image",
  "input": {
    "prompt": "{anchor_prompt_variation_N}",
    "aspect_ratio": "{aspect_ratio}"
  }
}
```

- Generate all 5 prompt variations (5 API calls)
- Poll for completion via `GET /api/v1/jobs/getTaskDetails?taskId={taskId}`
- Download all 5 images

**Output:** 5 anchor frame images saved to storage

**Slack notification:** Post all 5 images to #ad-engine with message:
```
🎬 *{project_name}* — Anchor Frame Options
Pick your favorite. React with ✅ on the winner.
React with 🔄 to regenerate all with new prompts.
```

---

## ★ HUMAN CHECKPOINT 1: Anchor Frame Selection

**Trigger:** Slack reaction (✅ emoji) on one of the 5 images

**Action:** Webhook fires, stores the selected anchor frame as `anchor_image_url`

**Alternative flows:**
- 🔄 reaction → regenerate Phase 2 with tweaked prompts
- 💬 thread reply with instructions → Claude API interprets feedback, adjusts prompts, regenerates

---

## PHASE 3: SCENE FRAME GENERATION

**Trigger:** Anchor frame approved

**Action:** For each scene (2 through N):

1. Call Claude API to generate 3 Nano Banana Pro prompt variations per scene, incorporating:
   - The scene description from the storyboard
   - Reference to the anchor image: "Use the same style, lighting, and aesthetic from the reference image"
   - Camera specs from the concept config
   - Any product images as additional references

2. Call Kie.ai API → Nano Banana Pro image-to-image for each variation:
```
POST https://api.kie.ai/api/v1/jobs/createTask
{
  "model": "google/nano-banana-pro/text-to-image",
  "input": {
    "prompt": "{scene_prompt} — Use the same style, lighting, and aesthetic from the reference image.",
    "input_urls": ["{anchor_image_url}", "{product_image_url}"],
    "aspect_ratio": "{aspect_ratio}"
  }
}
```

3. Generate 3 variations × (N-1) scenes = typically 15 images

**Output:** 3 image options per scene

**Slack notification:** Post images grouped by scene:
```
🎬 *{project_name}* — Scene 2: "The Silent Phone"
Pick your favorite for this scene. React ✅ on the winner.

🎬 *{project_name}* — Scene 3: "The Competitor's Shop"  
Pick your favorite for this scene. React ✅ on the winner.

[etc.]
```

---

## ★ HUMAN CHECKPOINT 2: Scene Frame Selection

**Trigger:** ✅ reactions on one image per scene

**Optional:** User can reply in thread with fix instructions:
- "Remove the plant in the background" → Claude API generates an edit prompt → Kie.ai re-generates with the edit
- "Make the lighting warmer" → Same flow
- User can also upload a manually edited image (Photoshop fix) to replace a generation

**Action:** Store all approved scene frames as `scene_frames[]`

---

## PHASE 4: VIDEO ANIMATION

**Trigger:** All scene frames approved

**Action:** For each approved frame:

1. Call Claude API to generate a Kling 3.0 animation prompt based on:
   - The scene description
   - The approved image
   - Direction: "Generate in slow motion for maximum editing flexibility"
   - Camera movement instructions (dolly, pan, zoom, static with handheld drift)

2. Call Kie.ai API → Kling 3.0 image-to-video:
```
POST https://api.kie.ai/api/v1/jobs/createTask
{
  "model": "kling/3.0",
  "input": {
    "prompt": "{animation_prompt}",
    "input_urls": ["{approved_scene_frame_url}"],
    "duration": "5",
    "aspect_ratio": "{aspect_ratio}"
  }
}
```

   **For scenes requiring precise motion (optional):**
   If the storyboard specifies a start AND end frame (e.g., "empty shop → full shop"), use both:
```
{
  "input": {
    "prompt": "{animation_prompt}",
    "start_frame": "{scene_N_frame_url}",
    "end_frame": "{scene_N_end_frame_url}",
    "duration": "5"
  }
}
```

3. Generate 2 variations per scene (to have options)

**Output:** 2 video clip options per scene

**Slack notification:** Post video clips grouped by scene:
```
🎬 *{project_name}* — Scene 1 Animation Options
Pick your favorite. React ✅ on the winner.
Remember: you only need 2-3 good seconds from each clip.
```

---

## ★ HUMAN CHECKPOINT 3: Video Clip Selection

**Trigger:** ✅ reactions on one clip per scene

**Optional:** User can reply with "regenerate scene 3" or "try a different camera movement for scene 5" → triggers re-generation of that specific scene only

**Action:** Store all approved clips as `approved_clips[]` with timestamps if user specifies which seconds to use (e.g., "use 0:02-0:04")

---

## PHASE 5: VOICEOVER GENERATION

**Trigger:** Video clips approved (can also run in parallel with Phase 4)

**Action:**

1. If `voiceover_script` provided in config, use it directly
2. If not, call Claude API to generate a script based on the concept config

3. Call ElevenLabs API to generate voiceover:
```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
{
  "text": "{voiceover_script}",
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.4,
    "similarity_boost": 0.7,
    "style": 0.5
  }
}
```

4. Generate 2 voiceover variations (different takes)

**Output:** 2 voiceover MP3 files

**Slack notification:** Post both audio files for review. User picks one or requests adjustments.

---

## PHASE 6: ASSEMBLY & RENDER

**Trigger:** All clips + voiceover approved

**Action:** Remotion on Mac Mini assembles the final ad:

1. **Music selection:** Use a pre-curated library of royalty-free tracks categorized by mood. Match to `music_mood` from config. Alternatively, generate via Suno API through Kie.ai.

2. **Timeline assembly:**
   - Layer music track as the base (determines beat points)
   - Place video clips in scene order, trimmed to approved timestamps
   - Apply speed ramp (1.2x-1.5x default, adjustable per clip)
   - Add transitions that flow with motion direction (Creator 7's technique)
   - Layer voiceover, synced to scene transitions
   - Lower music to -9dB to -12dB under voiceover
   - Add CTA end card (last 2-3 seconds) with brand colors and text

3. **Post-processing:**
   - Apply color grade matching `color_grade` from config
   - Add subtle film grain for cinematic texture (optional)
   - Apply slight zoom/ken burns to static clips for added dynamism

4. **Render all specified aspect ratios:**
   - 1080x1080 (Facebook/Instagram feed)
   - 1080x1920 (Stories/Reels/TikTok)
   - 1920x1080 (YouTube/landscape)

**Output:** Rendered MP4 files in all specified formats

**Slack notification:**
```
🎬 *{project_name}* — FINAL AD READY FOR REVIEW
[video preview]
React ✅ to approve for launch.
React 🔄 to request changes (reply in thread with specifics).
```

---

## ★ HUMAN CHECKPOINT 4: Final Approval

**Trigger:** ✅ reaction on final ad

**Action:** 
- Copy rendered files to a designated output folder / cloud storage
- Post download links to Slack
- Update project status to "approved"
- Log total cost (API credits used across all phases)

**Alternative:** 🔄 reaction + thread reply with changes → specific phase re-triggers based on feedback:
- "Scene 3 clip doesn't work" → back to Phase 4 for scene 3 only
- "Voiceover too fast" → back to Phase 5
- "Music doesn't fit" → back to Phase 6 with new track
- "Start over with different concept" → back to Phase 1

---

## DATABASE SCHEMA

```sql
CREATE TABLE ad_engine_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  concept_config JSONB NOT NULL,
  storyboard JSONB,
  status TEXT DEFAULT 'storyboard_pending',
  -- Status flow: storyboard_pending → anchor_pending → anchor_review → 
  --              scenes_pending → scenes_review → video_pending → video_review →
  --              voiceover_pending → assembly_pending → final_review → approved
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ad_engine_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ad_engine_projects(id),
  phase TEXT NOT NULL,           -- 'anchor', 'scene', 'video', 'voiceover', 'render'
  scene_number INTEGER,
  variation_number INTEGER,
  asset_type TEXT NOT NULL,      -- 'image', 'video', 'audio'
  asset_url TEXT NOT NULL,
  prompt_used TEXT,
  model_used TEXT,               -- 'nano-banana-pro', 'kling-3.0', 'elevenlabs'
  kie_task_id TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  trim_start_seconds FLOAT,     -- For video clips: which seconds to use
  trim_end_seconds FLOAT,
  speed_multiplier FLOAT DEFAULT 1.3,
  cost_credits FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ad_engine_slack_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES ad_engine_projects(id),
  asset_id UUID REFERENCES ad_engine_assets(id),
  slack_channel TEXT NOT NULL,
  slack_message_ts TEXT NOT NULL,
  checkpoint_type TEXT NOT NULL,  -- 'anchor_review', 'scene_review', 'video_review', 'final_review'
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ
);
```

---

## SLACK INTEGRATION

### Channel: #ad-engine

### Incoming (from workflow):
- Image/video previews with reaction prompts
- Status updates ("Phase 3 complete, 15 images generated")
- Cost tracking ("Total spend so far: $4.20")

### Outgoing (from human):
- ✅ reaction = approve this asset
- 🔄 reaction = regenerate this asset
- ❌ reaction = reject and skip
- Thread replies = specific feedback (interpreted by Claude API)

### Slash commands (optional future):
- `/ad-new {concept}` — starts a new project
- `/ad-status` — shows current project pipeline status
- `/ad-cost` — shows total credits spent

---

## COST ESTIMATES

| Phase | API | Cost Per Call | Calls Per Project | Total |
|-------|-----|-------------|-------------------|-------|
| Storyboard | Claude API | ~$0.02 | 1 | $0.02 |
| Anchor frames | Nano Banana Pro | ~$0.05-0.12 | 5 | $0.25-0.60 |
| Scene frames | Nano Banana Pro | ~$0.05-0.12 | 15 (3×5 scenes) | $0.75-1.80 |
| Fix/edit prompts | Nano Banana Pro | ~$0.05-0.12 | ~5 (estimated) | $0.25-0.60 |
| Video clips | Kling 3.0 | ~$0.50-1.00 | 12 (2×6 scenes) | $6.00-12.00 |
| Voiceover | ElevenLabs | ~$0.05 | 2 | $0.10 |
| Music (if Suno) | Suno API | ~$0.10 | 1 | $0.10 |
| Assembly | Remotion (local) | Free | 1 | $0.00 |
| **TOTAL** | | | | **$7.50-15.00** |

A finished cinematic video ad for $7.50-15.00 in API credits.

---

## SCALING MODEL

Once the workflow is proven:

**Batch mode:** Submit 5 concept configs at once. Workflow runs all 5 in parallel. Human reviews batched by phase. 5 finished ads per day.

**Hook rotation:** Same concept config, change only `creative_direction` and `voiceover_script`. Generate 10 variations with different hooks. Test all 10 on Facebook.

**Niche expansion:** Same workflow, different `product_description` and `target_audience`. Auto repair → HVAC → dental → plumbing. Zero code changes.

**Template library:** Save winning concept configs as templates. "Empty to Full Shop" becomes a reusable template that any niche can use.

---

## OPENCLAW BUILD COMMAND

```
Use Claude Code. Read ~/maps-autopilot/docs/specs/WF-ADENGINE-SPEC.md and build Phases 1-5 only. Skip Phase 6 (Remotion assembly) for now. Final output is raw clips + voiceover posted to Slack for manual editing in CapCut.

Also read ~/maps-autopilot/docs/specs/AI-VIDEO-AD-WORKFLOW-ANALYSIS.md for workflow context.

This is a set of Trigger.dev tasks at ~/maps-autopilot/src/trigger/wf-adengine/

Dependencies:
- Kie.ai API (Nano Banana Pro, Kling 3.0) — key in env as KIE_API_KEY  
- Claude API — key in env as ANTHROPIC_API_KEY
- ElevenLabs API — key in env as ELEVENLABS_API_KEY
- Slack API — key in env as SLACK_BOT_TOKEN
- PostgreSQL — connection in env as DATABASE_URL

Build in phases:
Phase 1: Database schema + project creation task + Slack integration
Phase 2: Storyboard generation (Claude API) + anchor frame generation (Kie.ai)
Phase 3: Slack checkpoint system (reaction-based approval using wait.forToken)
Phase 4: Scene frame generation + video animation
Phase 5: Voiceover via ElevenLabs + final asset delivery to Slack

Test with the Maps Autopilot concept config in the spec.

Deploy to Trigger.dev after each phase passes tests.
git add -A && git commit -m "WF-ADENGINE: AI ad production engine phases 1-5" && git push
Run with --dangerously-skip-permissions.
```

---

## TRIGGER.DEV v4 IMPLEMENTATION DETAILS

### MCP Configuration

Add to the project's MCP config or Claude Code config:
```json
{
  "mcpServers": {
    "trigger": {
      "args": ["trigger.dev@4.4.0", "mcp"],
      "command": "npx"
    }
  }
}
```

### SDK Version
Use `@trigger.dev/sdk` v4. All tasks use `task()`, `schemaTask()`, or `schedules.task()`.
**NEVER** use v2 `client.defineJob()` syntax — it will break everything.

### File Structure
```
~/maps-autopilot/src/trigger/wf-adengine/
├── ad-engine-orchestrator.ts    # Main orchestrator task
├── generate-storyboard.ts       # Phase 1: Claude API storyboard
├── generate-anchor-frames.ts    # Phase 2: Nano Banana Pro anchor images
├── generate-scene-frames.ts     # Phase 3: Nano Banana Pro scene images
├── generate-video-clips.ts      # Phase 4: Kling 3.0 animation
├── generate-voiceover.ts        # Phase 5: ElevenLabs voiceover
├── slack-checkpoint.ts          # Slack posting + approval webhook handler
├── kie-api-client.ts            # Kie.ai API helper (create task, poll status)
├── types.ts                     # TypeScript interfaces (AdConcept, etc.)
└── db.ts                        # PostgreSQL queries
```

### Task Architecture

Use the **Orchestrator + Processor pattern**. The orchestrator task manages the full pipeline, calling child tasks for each phase and waiting for human approvals between them.

```ts
// ad-engine-orchestrator.ts
import { schemaTask, wait } from "@trigger.dev/sdk";
import { z } from "zod";
import { generateStoryboard } from "./generate-storyboard.js";
import { generateAnchorFrames } from "./generate-anchor-frames.js";
import { generateSceneFrames } from "./generate-scene-frames.js";
import { generateVideoClips } from "./generate-video-clips.js";
import { generateVoiceover } from "./generate-voiceover.js";
import { postToSlack, postImagesToSlack, postVideosToSlack } from "./slack-checkpoint.js";

export const adEngineOrchestrator = schemaTask({
  id: "ad-engine-orchestrator",
  schema: z.object({
    project_name: z.string(),
    product_name: z.string(),
    product_description: z.string(),
    target_audience: z.string(),
    ad_objective: z.string(),
    creative_direction: z.string(),
    product_images: z.array(z.string()).optional(),
    brand_colors: z.array(z.string()).optional(),
    voiceover_script: z.string().optional(),
    music_mood: z.string().optional(),
    num_scenes: z.number().default(6),
    duration_seconds: z.number().default(15),
    aspect_ratios: z.array(z.string()).default(["1:1"]),
    include_faces: z.boolean().default(false),
    camera_spec: z.string().optional(),
    visual_style: z.string().default("anamorphic cinematic"),
    color_grade: z.string().default("warm golden with slight desaturation"),
  }),
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 10000,
    maxTimeoutInMs: 60000,
  },
  run: async (payload) => {
    // Create project in database
    const projectId = await createProject(payload);

    await postToSlack(`🎬 *${payload.project_name}* — Pipeline started`);

    // ========================================
    // PHASE 1: Generate Storyboard
    // ========================================
    const storyboard = await generateStoryboard.triggerAndWait({
      projectId,
      concept: payload,
    }).unwrap();

    await postToSlack(
      `📋 *${payload.project_name}* — Storyboard ready\n` +
      `${storyboard.scenes.length} scenes generated`
    );

    // ========================================
    // PHASE 2: Generate Anchor Frames
    // ========================================
    const anchorFrames = await generateAnchorFrames.triggerAndWait({
      projectId,
      prompts: storyboard.anchorPrompts, // 5 variations
      aspectRatio: payload.aspect_ratios[0],
    }).unwrap();

    // Post to Slack and wait for human approval
    await postImagesToSlack({
      projectId,
      images: anchorFrames.imageUrls,
      message: `🖼️ *${payload.project_name}* — Anchor Frame Options\nPick your favorite. React with ✅ on the winner.`,
      checkpointType: "anchor_review",
    });

    // ★ HUMAN CHECKPOINT 1: Wait for Slack reaction
    const anchorApproval = await wait.forToken({
      token: `anchor-approval-${projectId}`,
      timeoutInSeconds: 86400, // 24 hour timeout
    });
    const approvedAnchorUrl = anchorApproval.data.approvedImageUrl;

    // ========================================
    // PHASE 3: Generate Scene Frames
    // ========================================
    const sceneFrames = await generateSceneFrames.triggerAndWait({
      projectId,
      anchorImageUrl: approvedAnchorUrl,
      scenes: storyboard.scenes,
      productImages: payload.product_images || [],
      aspectRatio: payload.aspect_ratios[0],
      cameraSpec: payload.camera_spec,
      visualStyle: payload.visual_style,
      colorGrade: payload.color_grade,
    }).unwrap();

    // Post scene images to Slack grouped by scene
    for (const scene of sceneFrames.scenes) {
      await postImagesToSlack({
        projectId,
        images: scene.imageUrls,
        message: `🖼️ *${payload.project_name}* — Scene ${scene.sceneNumber}: "${scene.sceneName}"\nPick your favorite. React ✅ on the winner.`,
        checkpointType: "scene_review",
        sceneNumber: scene.sceneNumber,
      });
    }

    // ★ HUMAN CHECKPOINT 2: Wait for all scene approvals
    const sceneApprovals = await wait.forToken({
      token: `scenes-approval-${projectId}`,
      timeoutInSeconds: 86400,
    });
    const approvedSceneUrls = sceneApprovals.data.approvedSceneUrls; // { sceneNumber: url }

    // ========================================
    // PHASE 4: Generate Video Clips
    // ========================================
    const videoClips = await generateVideoClips.triggerAndWait({
      projectId,
      approvedFrames: approvedSceneUrls,
      anchorImageUrl: approvedAnchorUrl,
      scenes: storyboard.scenes,
      aspectRatio: payload.aspect_ratios[0],
    }).unwrap();

    // Post video clips to Slack
    for (const clip of videoClips.clips) {
      await postVideosToSlack({
        projectId,
        videos: clip.videoUrls,
        message: `🎬 *${payload.project_name}* — Scene ${clip.sceneNumber} Animation\nPick your favorite. React ✅. You only need 2-3 good seconds from each.`,
        checkpointType: "video_review",
        sceneNumber: clip.sceneNumber,
      });
    }

    // ★ HUMAN CHECKPOINT 3: Wait for video approvals
    const videoApprovals = await wait.forToken({
      token: `videos-approval-${projectId}`,
      timeoutInSeconds: 86400,
    });
    const approvedClipUrls = videoApprovals.data.approvedClipUrls;

    // ========================================
    // PHASE 5: Generate Voiceover
    // ========================================
    const voiceover = await generateVoiceover.triggerAndWait({
      projectId,
      script: payload.voiceover_script || storyboard.suggestedScript,
    }).unwrap();

    // Post voiceover options to Slack
    await postToSlack(
      `🎤 *${payload.project_name}* — Voiceover Options\n` +
      `Pick your favorite. React ✅.`
    );
    // Attach audio files to Slack message

    // ★ HUMAN CHECKPOINT 4: Wait for voiceover approval
    const voiceoverApproval = await wait.forToken({
      token: `voiceover-approval-${projectId}`,
      timeoutInSeconds: 86400,
    });

    // ========================================
    // FINAL: Deliver all approved assets
    // ========================================
    await postToSlack(
      `✅ *${payload.project_name}* — ALL ASSETS READY\n\n` +
      `📹 *Approved video clips:*\n` +
      approvedClipUrls.map((url: string, i: number) => `Scene ${i + 1}: ${url}`).join("\n") +
      `\n\n🎤 *Voiceover:* ${voiceover.approvedUrl}\n\n` +
      `Open CapCut and assemble your ad!\n` +
      `💰 Total cost: $${await calculateProjectCost(projectId)}`
    );

    return {
      projectId,
      status: "assets_delivered",
      approvedClips: approvedClipUrls,
      voiceoverUrl: voiceover.approvedUrl,
    };
  },
});
```

### Child Task Pattern (example: anchor frame generation)

```ts
// generate-anchor-frames.ts
import { task } from "@trigger.dev/sdk";
import { createKieTask, pollKieTask } from "./kie-api-client.js";
import { saveAsset } from "./db.js";

export const generateAnchorFrames = task({
  id: "ad-engine-generate-anchor-frames",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: {
    projectId: string;
    prompts: string[];
    aspectRatio: string;
  }) => {
    const imageUrls: string[] = [];

    for (const prompt of payload.prompts) {
      // Create Kie.ai task for Nano Banana Pro
      const taskId = await createKieTask({
        model: "google/nano-banana-pro/text-to-image",
        input: {
          prompt,
          aspect_ratio: payload.aspectRatio,
        },
      });

      // Poll until complete (Kie.ai is async)
      const result = await pollKieTask(taskId, {
        maxAttempts: 30,
        intervalMs: 5000, // check every 5 seconds
      });

      const imageUrl = result.output.image_url;
      imageUrls.push(imageUrl);

      // Save to database
      await saveAsset({
        projectId: payload.projectId,
        phase: "anchor",
        assetType: "image",
        assetUrl: imageUrl,
        promptUsed: prompt,
        modelUsed: "nano-banana-pro",
        kieTaskId: taskId,
      });
    }

    return { imageUrls };
  },
});
```

### Kie.ai API Client

```ts
// kie-api-client.ts

const KIE_BASE_URL = "https://api.kie.ai/api/v1";

export async function createKieTask(params: {
  model: string;
  input: Record<string, any>;
  callBackUrl?: string;
}): Promise<string> {
  const response = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.KIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      input: params.input,
      callBackUrl: params.callBackUrl,
    }),
  });

  const data = await response.json();
  if (data.code !== 200) throw new Error(`Kie.ai error: ${data.msg}`);
  return data.data.taskId;
}

export async function getKieTaskStatus(taskId: string): Promise<any> {
  const response = await fetch(
    `${KIE_BASE_URL}/jobs/getTaskDetails?taskId=${taskId}`,
    {
      headers: {
        "Authorization": `Bearer ${process.env.KIE_API_KEY}`,
      },
    }
  );
  return response.json();
}

export async function pollKieTask(
  taskId: string,
  options: { maxAttempts: number; intervalMs: number }
): Promise<any> {
  for (let i = 0; i < options.maxAttempts; i++) {
    const status = await getKieTaskStatus(taskId);
    
    if (status.data?.status === "completed" || status.data?.status === "success") {
      return status.data;
    }
    
    if (status.data?.status === "failed") {
      throw new Error(`Kie.ai task failed: ${status.data?.error || "unknown"}`);
    }

    // Wait before next poll — use regular setTimeout, not wait.for
    // since this is within a single task execution
    await new Promise(resolve => setTimeout(resolve, options.intervalMs));
  }
  
  throw new Error(`Kie.ai task timed out after ${options.maxAttempts} attempts`);
}
```

### Slack Checkpoint System

The Slack checkpoint uses `wait.forToken()` from the Trigger.dev SDK. When a user reacts to a Slack message, a separate webhook endpoint completes the token.

```ts
// slack-checkpoint.ts
import { runs } from "@trigger.dev/sdk";

// Called by Slack Events API webhook when user adds a reaction
export async function handleSlackReaction(event: {
  reaction: string;
  item: { ts: string; channel: string };
  user: string;
}) {
  // Look up which project/asset this message belongs to
  const slackMessage = await db.query(
    `SELECT * FROM ad_engine_slack_messages WHERE slack_message_ts = $1`,
    [event.item.ts]
  );
  
  if (!slackMessage) return;

  if (event.reaction === "white_check_mark") { // ✅
    // Get the asset that was approved
    const asset = await db.query(
      `UPDATE ad_engine_assets SET is_approved = true, approved_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [slackMessage.asset_id]
    );

    // Check if all assets for this checkpoint are approved
    const checkpointType = slackMessage.checkpoint_type;
    
    if (checkpointType === "anchor_review") {
      // Complete the wait token with the approved image URL
      await runs.completeWaitForToken({
        token: `anchor-approval-${slackMessage.project_id}`,
        data: { approvedImageUrl: asset.asset_url },
      });
    }
    
    if (checkpointType === "scene_review") {
      // Check if all scenes have been approved
      const allApproved = await checkAllScenesApproved(slackMessage.project_id);
      if (allApproved) {
        const approvedUrls = await getApprovedSceneUrls(slackMessage.project_id);
        await runs.completeWaitForToken({
          token: `scenes-approval-${slackMessage.project_id}`,
          data: { approvedSceneUrls: approvedUrls },
        });
      }
    }

    if (checkpointType === "video_review") {
      const allApproved = await checkAllVideosApproved(slackMessage.project_id);
      if (allApproved) {
        const approvedUrls = await getApprovedClipUrls(slackMessage.project_id);
        await runs.completeWaitForToken({
          token: `videos-approval-${slackMessage.project_id}`,
          data: { approvedClipUrls: approvedUrls },
        });
      }
    }

    if (checkpointType === "voiceover_review") {
      await runs.completeWaitForToken({
        token: `voiceover-approval-${slackMessage.project_id}`,
        data: { approvedUrl: asset.asset_url },
      });
    }
  }

  if (event.reaction === "arrows_counterclockwise") { // 🔄
    // Trigger regeneration for this specific asset
    // Re-trigger the appropriate generation task
  }
}
```

### Webhook Endpoint for Slack Events

This needs to be exposed via the Cloudflare Worker proxy or a dedicated endpoint:

```ts
// Route: POST /api/slack/events (via Cloudflare Worker or Express)
// Handles Slack Events API for reaction_added events
// Calls handleSlackReaction() which completes wait tokens
```

The existing Cloudflare Worker at `ghl-webhook-proxy.lucky-tooth-ffbc.workers.dev` can be extended with a `/slack-events` route, or a new worker can be created specifically for the ad engine.

### Key Trigger.dev v4 Patterns Used

1. **`schemaTask` with Zod validation** for the orchestrator — validates concept config before running
2. **`task` for child tasks** — each phase is a separate task for modularity and independent retries
3. **`triggerAndWait().unwrap()`** — orchestrator waits for each child task to complete before proceeding
4. **`wait.forToken()`** — pauses orchestrator at human checkpoints without consuming compute. Tokens are completed by Slack webhook when user reacts. Waits >5s are automatically checkpointed.
5. **`runs.completeWaitForToken()`** — called from the Slack webhook handler to resume the orchestrator
6. **Retry config per task** — API-calling tasks get 3 retries with exponential backoff. Orchestrator gets 2 retries.
7. **Idempotency** — each Kie.ai API call should use `idempotencyKey: \`kie-${projectId}-${phase}-${sceneNumber}-${variation}\`` to prevent duplicate generations on retry
8. **NEVER use `Promise.all` with `triggerAndWait`** — process sequentially or use `batchTriggerAndWait`

### Environment Variables Required

```
KIE_API_KEY=           # Kie.ai API key for Nano Banana Pro, Kling 3.0
ANTHROPIC_API_KEY=     # Claude API for storyboard + prompt generation
ELEVENLABS_API_KEY=    # ElevenLabs for voiceover
SLACK_BOT_TOKEN=       # Slack bot for posting messages + reading reactions
SLACK_CHANNEL_AD_ENGINE=  # Channel ID for #ad-engine
DATABASE_URL=          # PostgreSQL connection string
```

---

## KIE.AI API REFERENCE (EXACT SPECS FROM DOCS)

### Base URL & Authentication
```
Base URL: https://api.kie.ai/api/v1
Auth: Bearer token in Authorization header
All models use: POST /jobs/createTask
Status check: GET /jobs/getTaskDetails?taskId={taskId}
```

### Nano Banana Pro — Image Generation
```
Model name: "nano-banana-pro"
Endpoint: POST https://api.kie.ai/api/v1/jobs/createTask

Request body:
{
  "model": "nano-banana-pro",
  "callBackUrl": "https://your-domain.com/api/callback",  // optional
  "input": {
    "prompt": "Your detailed image prompt here",
    "image_input": [                    // optional — reference images for image-to-image
      "https://example.com/ref1.png",
      "https://example.com/ref2.png"
    ],
    "aspect_ratio": "16:9",            // "1:1", "9:16", "16:9", "21:9"
    "resolution": "4K",                // "1K", "2K", "4K"
    "output_format": "png"             // "png" or "jpg"
  }
}

Response: { "code": 200, "msg": "success", "data": { "taskId": "task_nano-banana-pro_XXXX" } }
```

**Key notes:**
- For text-to-image (anchor frame): omit `image_input` or pass empty array
- For image-to-image (subsequent frames): include anchor image URL in `image_input` array
- Append "Use the same style, lighting, and aesthetic from the reference image" to prompt when using image_input
- Use "4K" resolution for highest quality, "2K" for faster iteration
- 21:9 aspect ratio produces the most cinematic compositions

### Kling 3.0 — Video Generation
```
Model name: "kling-3.0/video"
Endpoint: POST https://api.kie.ai/api/v1/jobs/createTask

SINGLE-SHOT request body:
{
  "model": "kling-3.0/video",
  "callBackUrl": "https://your-domain.com/api/callback",
  "input": {
    "prompt": "Detailed animation prompt describing camera movement and action",
    "image_urls": [
      "https://example.com/start-frame.png",     // first frame (required for image-to-video)
      "https://example.com/end-frame.png"         // last frame (optional — locks end state)
    ],
    "sound": false,                    // true for sound effects, false for silent
    "duration": "5",                   // "3" to "15" seconds (string)
    "aspect_ratio": "16:9",           // "16:9", "9:16", "1:1" — optional if image_urls provided
    "mode": "pro",                     // "std" (720p fast) or "pro" (1080p quality)
    "multi_shots": false               // false for single-shot
  }
}

MULTI-SHOT request body:
{
  "model": "kling-3.0/video",
  "callBackUrl": "https://your-domain.com/api/callback",
  "input": {
    "multi_shots": true,
    "image_urls": [
      "https://example.com/start-frame.png"      // first frame only for multi-shot
    ],
    "duration": "10",
    "aspect_ratio": "16:9",
    "mode": "pro",
    "multi_prompt": [
      {
        "prompt": "First shot description with camera movement",
        "duration": 5
      },
      {
        "prompt": "Second shot description with different angle",
        "duration": 5
      }
    ],
    "kling_elements": [                // optional — element references
      {
        "name": "element_product",
        "description": "auto repair shop interior",
        "element_input_urls": [
          "https://example.com/shop-ref1.jpg",
          "https://example.com/shop-ref2.jpg"
        ]
      }
    ]
  }
}

Response: { "code": 200, "msg": "success", "data": { "taskId": "task_kling-3.0_XXXX" } }
```

**Key notes:**
- Model name is `"kling-3.0/video"` NOT `"kling/3.0"` or `"kling-3.0"`
- Use `"mode": "pro"` for final output, `"mode": "std"` for fast iteration
- Pro mode: 1920×1080 (16:9), 1080×1920 (9:16), 1080×1080 (1:1)
- Std mode: 1280×720 (16:9), 720×1280 (9:16), 720×720 (1:1)
- `image_urls[0]` = start frame, `image_urls[1]` = end frame (optional)
- When start frame provided, aspect_ratio auto-adapts to image dimensions
- `sound: false` for our workflow (we add voiceover + music separately in CapCut)
- Duration 3-15 seconds per generation
- Multi-shot mode supports 1-12 seconds per shot
- Element references use `@element_name` in prompt text, defined in `kling_elements` array
- Element images: 2-50 URLs per element, JPG/PNG, max 10MB each

### Get Task Details — Check Status
```
GET https://api.kie.ai/api/v1/jobs/getTaskDetails?taskId={taskId}
Header: Authorization: Bearer {KIE_API_KEY}

Response when pending:
{ "code": 200, "data": { "taskId": "...", "status": "processing" } }

Response when complete:
{ "code": 200, "data": { "taskId": "...", "status": "completed", "output": { ... } } }

Response when failed:
{ "code": 200, "data": { "taskId": "...", "status": "failed", "error": "..." } }
```

**Polling strategy:**
- Image generation: poll every 5 seconds, timeout after 2 minutes
- Video generation: poll every 10 seconds, timeout after 10 minutes
- Always handle "failed" status gracefully and retry with the task's retry config

### Kie.ai API Client (corrected)

```ts
// kie-api-client.ts

const KIE_BASE_URL = "https://api.kie.ai/api/v1";

interface KieCreateTaskParams {
  model: string;
  input: Record<string, any>;
  callBackUrl?: string;
}

export async function createKieTask(params: KieCreateTaskParams): Promise<string> {
  const response = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.KIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      input: params.input,
      callBackUrl: params.callBackUrl,
    }),
  });

  const data = await response.json();
  if (data.code !== 200) throw new Error(`Kie.ai error: ${data.msg}`);
  return data.data.taskId;
}

export async function getKieTaskStatus(taskId: string): Promise<any> {
  const response = await fetch(
    `${KIE_BASE_URL}/jobs/getTaskDetails?taskId=${taskId}`,
    {
      headers: {
        "Authorization": `Bearer ${process.env.KIE_API_KEY}`,
      },
    }
  );
  return response.json();
}

export async function pollKieTask(
  taskId: string,
  options: { maxAttempts: number; intervalMs: number }
): Promise<any> {
  for (let i = 0; i < options.maxAttempts; i++) {
    const result = await getKieTaskStatus(taskId);
    const status = result.data?.status;
    
    if (status === "completed" || status === "success") {
      return result.data;
    }
    if (status === "failed") {
      throw new Error(`Kie.ai task ${taskId} failed: ${result.data?.error || "unknown"}`);
    }

    await new Promise(resolve => setTimeout(resolve, options.intervalMs));
  }
  throw new Error(`Kie.ai task ${taskId} timed out after ${options.maxAttempts * options.intervalMs}ms`);
}

// Helper: Generate image with Nano Banana Pro
export async function generateImage(params: {
  prompt: string;
  referenceImages?: string[];
  aspectRatio?: string;
  resolution?: string;
}): Promise<string> {
  const taskId = await createKieTask({
    model: "nano-banana-pro",
    input: {
      prompt: params.prompt,
      image_input: params.referenceImages || [],
      aspect_ratio: params.aspectRatio || "16:9",
      resolution: params.resolution || "4K",
      output_format: "png",
    },
  });

  const result = await pollKieTask(taskId, {
    maxAttempts: 24,      // 2 minutes at 5s intervals
    intervalMs: 5000,
  });

  return result.output.image_url || result.output.url;
}

// Helper: Generate video with Kling 3.0
export async function generateVideo(params: {
  prompt: string;
  startFrameUrl: string;
  endFrameUrl?: string;
  duration?: string;
  aspectRatio?: string;
  mode?: string;
  sound?: boolean;
}): Promise<string> {
  const imageUrls = [params.startFrameUrl];
  if (params.endFrameUrl) imageUrls.push(params.endFrameUrl);

  const taskId = await createKieTask({
    model: "kling-3.0/video",
    input: {
      prompt: params.prompt,
      image_urls: imageUrls,
      duration: params.duration || "5",
      aspect_ratio: params.aspectRatio || "16:9",
      mode: params.mode || "pro",
      sound: params.sound ?? false,
      multi_shots: false,
    },
  });

  const result = await pollKieTask(taskId, {
    maxAttempts: 60,      // 10 minutes at 10s intervals
    intervalMs: 10000,
  });

  return result.output.video_url || result.output.url;
}
```

### Full API Documentation Links
- Nano Banana Pro: https://docs.kie.ai/market/google/pro-image-to-image
- Kling 3.0: https://docs.kie.ai/market/kling/kling-3-0
- Kling 3.0 Motion Control: https://docs.kie.ai/30079657e0
- Get Task Details: https://docs.kie.ai/market/common/get-task-detail
- File Upload API: https://docs.kie.ai/file-upload-api/quickstart
- Market Overview: https://docs.kie.ai/market/quickstart

OpenClaw should read these docs directly if any parameter names or response structures are unclear.

---

## NOTES

- This workflow is niche-agnostic. It works for any product, any industry.
- **CRITICAL MODEL NAMES:** Nano Banana Pro = `"nano-banana-pro"`, Kling 3.0 = `"kling-3.0/video"`. Using wrong model names will return 404.
- All Kie.ai calls use: POST https://api.kie.ai/api/v1/jobs/createTask
- Always poll task status, don't assume instant completion. Video generation can take 3-10 minutes.
- The human-in-the-loop between image approval and video generation is MANDATORY. Do not skip this.
- Phase 6 (Remotion assembly) is intentionally excluded from this build. Final editing happens manually in CapCut.
- For the best cinematic output, always include camera specs in prompts (e.g., "Shot on Sony A7R, 85mm f/1.8, shallow depth of field, rich bokeh").
- Use `wait.forToken()` for all human checkpoints — these do NOT consume compute time while waiting.
- All tasks use `@trigger.dev/sdk` v4 syntax. NEVER use v2 `client.defineJob()`.
- Trigger.dev MCP config: `{ "mcpServers": { "trigger": { "args": ["trigger.dev@4.4.0", "mcp"], "command": "npx" } } }`
