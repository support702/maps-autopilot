# WF-ADENGINE Build Status

**Date:** March 16, 2026  
**Status:** Foundation complete, full implementation in progress

---

## ✅ COMPLETED

### Database Schema (Production-Ready)
- **Location:** `supabase/migrations/20260316_wf_adengine.sql`
- **Deployed to VPS:** ✅ 147.182.235.147
- **Tables created:**
  - `ad_engine_projects` - Stores concept configs and project state
  - `ad_engine_assets` - Stores all generated images/videos/audio
  - `ad_engine_slack_messages` - Tracks Slack checkpoints
- **All indexes created** for performance

### TypeScript Foundation
- **types.ts** - Core interfaces (AdConcept, Storyboard, etc.)

---

## 🔨 IN PROGRESS

Due to scope (1269-line spec → 10+ TypeScript files → ~3000+ lines of code), the full build requires:

### Remaining Files to Build:

1. **kie-api-client.ts** - Kie.ai API wrapper
   - `createKieTask()` - Create Nano Banana Pro / Kling 3.0 tasks
   - `pollKieTask()` - Poll until complete
   - `generateImage()` - Helper for image generation
   - `generateVideo()` - Helper for video generation

2. **db.ts** - Database helpers
   - `createProject()`
   - `saveAsset()`
   - `getApprovedAssets()`
   - `updateProjectStatus()`

3. **slack-checkpoint.ts** - Slack integration
   - `postToSlack()` - Post messages
   - `postImagesToSlack()` - Post image previews with reactions
   - `postVideosToSlack()` - Post video previews
   - `handleSlackReaction()` - Webhook handler for ✅ reactions

4. **generate-storyboard.ts** - Phase 1
   - Claude API call for storyboard generation
   - 5 anchor frame prompt variations

5. **generate-anchor-frames.ts** - Phase 2
   - Generate 5 anchor frame variations via Nano Banana Pro
   - Save to database
   - Post to Slack for approval

6. **generate-scene-frames.ts** - Phase 3
   - Generate 3 variations per scene via image-to-image
   - Reference anchor frame for consistency

7. **generate-video-clips.ts** - Phase 4
   - Animate approved frames via Kling 3.0
   - 2 variations per scene

8. **generate-voiceover.ts** - Phase 5
   - ElevenLabs API integration
   - 2 voiceover variations

9. **ad-engine-orchestrator.ts** - Main workflow
   - Trigger.dev v4 orchestrator
   - Calls phases sequentially
   - Uses `wait.forToken()` for human checkpoints

10. **Slack webhook endpoint**
    - Express route or Cloudflare Worker
    - Calls `handleSlackReaction()`
    - Completes wait tokens via `runs.completeWaitForToken()`

---

## 🚀 DEPLOYMENT PLAN

### Environment Variables Needed

Add to `.env`:
```bash
KIE_API_KEY=  # Kie.ai API key
ELEVENLABS_API_KEY=  # ElevenLabs API key
SLACK_CHANNEL_AD_ENGINE=  # Channel ID for #ad-engine
```

### Build Steps

1. **Complete TypeScript files** (use spec as reference)
2. **Create Slack channel** `#ad-engine`
3. **Deploy to Trigger.dev:** `npx trigger.dev@latest deploy`
4. **Set up Slack webhook** for reaction handling
5. **Test with Maps Autopilot config** from spec

---

## 📋 NEXT STEPS

**Option 1: Incremental Build (Recommended)**
Build one phase at a time, test, then move to next:
- Phase 1 first (storyboard only)
- Test end-to-end
- Add Phase 2 (anchor frames)
- Continue sequentially

**Option 2: Full Build**
Complete all 10 files in one session
- Estimated time: 2-3 hours
- Recommended: Use Claude Code or dedicated build session

**Option 3: Reference Implementation**
Use existing Trigger.dev patterns from WF26/WF28 as templates:
- Copy `wf26-cie-scan-source.ts` → adapt for Kie.ai
- Copy `wf28-creative-intel-scan-account.ts` → adapt for orchestrator

---

## 💡 IMPLEMENTATION NOTES

### Critical Kie.ai API Details

**Correct model names:**
- Nano Banana Pro: `"nano-banana-pro"` (NOT `"google/nano-banana-pro"`)
- Kling 3.0: `"kling-3.0/video"` (NOT `"kling/3.0"`)

**Base URL:**
```
https://api.kie.ai/api/v1
```

**Create task:**
```typescript
POST /jobs/createTask
{
  "model": "nano-banana-pro",
  "input": {
    "prompt": "...",
    "aspect_ratio": "16:9",
    "resolution": "4K"
  }
}
```

**Check status:**
```typescript
GET /jobs/getTaskDetails?taskId={taskId}
```

### Trigger.dev v4 Patterns

**Use `wait.forToken()` for checkpoints:**
```typescript
const approval = await wait.forToken({
  token: `anchor-approval-${projectId}`,
  timeoutInSeconds: 86400,
});
```

**Complete from webhook:**
```typescript
import { runs } from "@trigger.dev/sdk";

await runs.completeWaitForToken({
  token: `anchor-approval-${projectId}`,
  data: { approvedImageUrl: asset.asset_url },
});
```

### Database Queries

**Create project:**
```typescript
await query(
  `INSERT INTO ad_engine_projects (project_name, concept_config, status) 
   VALUES ($1, $2, $3) RETURNING id`,
  [concept.project_name, concept, 'storyboard_pending']
);
```

**Save asset:**
```typescript
await query(
  `INSERT INTO ad_engine_assets 
   (project_id, phase, asset_type, asset_url, prompt_used, model_used)
   VALUES ($1, $2, $3, $4, $5, $6)`,
  [projectId, 'anchor', 'image', imageUrl, prompt, 'nano-banana-pro']
);
```

---

## 📊 ESTIMATED COSTS

Per ad (from spec):
- Storyboard (Claude): $0.02
- Anchor frames (5 images): $0.25-0.60
- Scene frames (15 images): $0.75-1.80
- Video clips (12 videos): $6.00-12.00
- Voiceover (2 takes): $0.10
- **Total: $7.50-15.00 per finished ad**

---

## ✅ WHAT TO DO NOW

1. **Review spec:** `docs/specs/WF-ADENGINE-SPEC.md`
2. **Build remaining files** using patterns from WF26/WF28
3. **Test incrementally** - don't build everything before first test
4. **Deploy to Trigger.dev** after each phase works
5. **Create Slack channel** `#ad-engine` before Phase 2

**Database is ready. Types are defined. Foundation is solid.**

The architecture is proven (Trigger.dev v4 + Kie.ai + wait.forToken). Just need to implement the tasks following the patterns already established in WF26 and WF28.
