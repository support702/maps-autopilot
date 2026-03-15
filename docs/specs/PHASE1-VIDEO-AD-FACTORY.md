# PHASE 1: VIDEO AD FACTORY — COMPLETE BUILD
## Maps Autopilot · 5 Concepts · 20 Video Files · World Class Output
## Send to OpenClaw — March 11, 2026

---

## MISSION

Build a complete automated video ad production pipeline that outputs 20 ready-to-upload Facebook/Instagram video ads. Each ad combines:
- Real Google Maps screen recordings captured via Puppeteer
- Kinetic text animations via Remotion
- AI voiceover via ElevenLabs
- Background music + subtle sound design
- Professional CTA end cards

**Quality standard:** These must look like a professional video editor made them. Not like AI generated them. Every frame matters.

---

## ENVIRONMENT

- Build at: `~/maps-autopilot/video-ads/`
- Node.js + TypeScript
- Dependencies: remotion, @remotion/cli, @remotion/bundler, @remotion/renderer, puppeteer, axios
- ElevenLabs API Key: `sk_fd7024e41e1487e706581560cffab5ff069216c861b28e69`
- Mac Mini display required for Puppeteer screen recording (use Xvfb if no display available)
- Render output: `~/maps-autopilot/video-ads/out/`

---

## STEP 1: PROJECT INITIALIZATION

```bash
mkdir -p ~/maps-autopilot/video-ads
cd ~/maps-autopilot/video-ads
npm init -y
npm install remotion @remotion/cli @remotion/bundler @remotion/renderer
npm install puppeteer puppeteer-screen-recorder
npm install axios
npm install -D typescript tsx @types/node
npx tsc --init
```

Create the folder structure:
```
video-ads/
├── src/
│   ├── Root.tsx
│   ├── compositions/
│   │   ├── FullAd.tsx
│   │   ├── HookOnly.tsx
│   │   └── CTAEndCard.tsx
│   ├── components/
│   │   ├── KineticText.tsx
│   │   ├── BRollLayer.tsx
│   │   ├── FlashCut.tsx
│   │   ├── TextOverlay.tsx
│   │   ├── AudioLayer.tsx
│   │   └── GrainOverlay.tsx
│   ├── config/
│   │   ├── concepts.ts
│   │   └── theme.ts
│   └── utils/
│       ├── timing.ts
│       └── interpolations.ts
├── scripts/
│   ├── capture-footage.ts
│   ├── generate-voiceover.ts
│   ├── render-all.ts
│   └── render-concept.ts
├── footage/          # Screen recordings go here
├── audio/
│   ├── voiceover/    # ElevenLabs output
│   ├── music/        # Background tracks
│   └── sfx/          # Sound effects
├── out/              # Final rendered videos
└── remotion.config.ts
```

---

## STEP 2: SCREEN RECORDING CAPTURE

### Quality Guardrails for Puppeteer
- **DO NOT** use headless mode — screen recording requires visible browser
- **Use Xvfb** if Mac Mini has no physical display: `xvfb-run --auto-servernum --server-args="-screen 0 1080x1920x24"`
- **Set realistic delays** between actions — no instant jumps. A real human pauses 500-800ms after a search loads, scrolls at variable speed, and hovers briefly
- **Randomize scroll speed** — not perfectly linear. Use easing: fast start, slow middle, fast end
- **Dismiss all Google consent banners** before recording starts
- **Set dark mode** on Google Maps if possible (matches our brand aesthetic)
- **Record at 30fps, 1080p minimum**
- **Each clip: 10-18 seconds** — enough for multiple segments

### Viewport Settings
```typescript
// Mobile viewport (primary — most FB traffic is mobile)
const MOBILE_VIEWPORT = { width: 430, height: 932, deviceScaleFactor: 3 };

// Desktop viewport (secondary — for wider B-roll shots)  
const DESKTOP_VIEWPORT = { width: 1920, height: 1080, deviceScaleFactor: 2 };
```

### Cities to Capture
```typescript
const CITIES = [
  { id: 'houston', query: 'auto repair near me', location: 'Houston, TX' },
  { id: 'dallas', query: 'auto repair near me', location: 'Dallas, TX' },
  { id: 'san-antonio', query: 'auto repair near me', location: 'San Antonio, TX' },
  { id: 'austin', query: 'auto repair near me', location: 'Austin, TX' },
  { id: 'jacksonville', query: 'auto repair near me', location: 'Jacksonville, FL' },
];
```

### Capture Script: `scripts/capture-footage.ts`

For EACH city, capture these footage types:

**Type A: "The Search" (used in Concepts 1, 3)**
```
1. Navigate to google.com/maps
2. Wait 1.5s (page settle)
3. Click search bar
4. START RECORDING
5. Type query with human-like delays (60-100ms per character, random variance)
6. Press Enter
7. Wait 2.5s for results to load
8. Pause on 3-pack for 2s (let viewer absorb)
9. Slowly scroll down — use eased scroll:
   - 300ms pause
   - Scroll 200px over 800ms (ease-in-out)
   - 400ms pause  
   - Scroll 300px over 1000ms
   - 500ms pause
10. Slowly scroll back up to 3-pack over 1500ms
11. Pause 1.5s on 3-pack
12. STOP RECORDING
13. Save as: footage/search-{cityId}.mp4
```

**Type B: "The Review Comparison" (used in Concept 2)**
```
1. From search results (already loaded from Type A)
2. START RECORDING
3. Wait 500ms
4. Click on #1 result in the 3-pack
5. Wait 1.5s for profile to load
6. Scroll to show review count prominently — pause 2s
7. Click back / close panel
8. Wait 800ms
9. Click on #2 result
10. Wait 1.5s, show reviews — pause 1.5s
11. Click back
12. Wait 800ms
13. Scroll down past 3-pack to find a shop with <30 reviews
14. Click on it
15. Wait 1.5s, show review count — pause 2s
16. Click back
17. Scroll back to 3-pack — pause 1s
18. STOP RECORDING
19. Save as: footage/reviews-{cityId}.mp4
```

**Type C: "The Profile Comparison" (used in Concept 4)**
```
1. From search results
2. Find a shop in top 3 with lots of photos/reviews
3. START RECORDING  
4. Click on it
5. Wait 1.5s
6. Scroll through profile slowly — show photos section (2s), review highlights (2s), posts if visible (2s)
7. Click back
8. Wait 800ms
9. Find a shop lower in results with sparse profile
10. Click on it
11. Wait 1.5s
12. Show sparse profile — few/no photos, low reviews (3s)
13. Click back
14. STOP RECORDING
15. Save as: footage/profile-{cityId}.mp4
```

**Type D: "The Territory Map" (used in Concept 5)**
```
1. Navigate to Google Maps, search the city name
2. START RECORDING
3. Zoom level showing roughly 5-mile radius of city center
4. Wait 1s
5. Slowly zoom out over 3 seconds (showing density of pins)
6. Pause 2s
7. Slowly pan right over 2 seconds
8. Pause 1.5s
9. STOP RECORDING
10. Save as: footage/territory-{cityId}.mp4
```

### Human-Like Scroll Function
```typescript
async function humanScroll(page: any, distance: number, durationMs: number) {
  const steps = Math.floor(durationMs / 50); // 50ms per step = 20fps scroll
  const easing = (t: number) => t < 0.5 
    ? 4 * t * t * t 
    : 1 - Math.pow(-2 * t + 2, 3) / 2; // cubic ease-in-out
  
  let scrolled = 0;
  for (let i = 0; i < steps; i++) {
    const progress = easing((i + 1) / steps);
    const targetScroll = distance * progress;
    const stepScroll = targetScroll - scrolled;
    
    await page.evaluate((d: number) => {
      const el = document.querySelector('[role="main"]');
      if (el) el.scrollBy(0, d);
      else window.scrollBy(0, d);
    }, stepScroll);
    
    scrolled = targetScroll;
    
    // Add micro-randomness to timing (40-60ms instead of exact 50ms)
    await page.waitForTimeout(40 + Math.random() * 20);
  }
}

async function humanType(page: any, selector: string, text: string) {
  const element = await page.$(selector);
  await element.click();
  await page.waitForTimeout(300 + Math.random() * 200);
  
  for (const char of text) {
    await page.keyboard.type(char);
    // Variable delay: 50-120ms per character, occasional longer pause
    const delay = Math.random() < 0.1 
      ? 200 + Math.random() * 150  // 10% chance of longer pause (thinking)
      : 50 + Math.random() * 70;    // Normal typing speed
    await page.waitForTimeout(delay);
  }
}
```

### Post-Capture Validation
After all captures, verify:
```typescript
async function validateFootage() {
  const requiredFiles = [];
  for (const city of CITIES) {
    requiredFiles.push(
      `footage/search-${city.id}.mp4`,
      `footage/reviews-${city.id}.mp4`,
      `footage/profile-${city.id}.mp4`,
      `footage/territory-${city.id}.mp4`
    );
  }
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`MISSING: ${file}`);
      continue;
    }
    // Check file size > 100KB (not empty/corrupt)
    const stats = fs.statSync(file);
    if (stats.size < 100000) {
      console.error(`TOO SMALL (possibly corrupt): ${file} — ${stats.size} bytes`);
    }
    // Check duration > 5 seconds using ffprobe
    const duration = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${file}`).toString().trim();
    if (parseFloat(duration) < 5) {
      console.error(`TOO SHORT: ${file} — ${duration}s`);
    }
    console.log(`✅ ${file} — ${(stats.size / 1024 / 1024).toFixed(1)}MB — ${parseFloat(duration).toFixed(1)}s`);
  }
}
```

---

## STEP 3: ELEVENLABS VOICEOVER GENERATION

### Voice Selection
Use voice ID: `pNInz6obpgDQGcFmaJgB` (Adam — confident, clear, American male)

If Adam doesn't fit, try these alternatives in order:
1. `ErXwobaYiN019PkySvjV` (Antoni — younger, energetic)
2. `VR6AewLTigWG4xSOukaG` (Arnold — deep, authoritative)
3. `yoZ06aMxZJJ28mfd3POQ` (Sam — conversational, warm)

### Voice Settings (critical for natural sound)
```typescript
const voiceSettings = {
  stability: 0.55,           // Slightly dynamic — NOT robotic monotone
  similarity_boost: 0.78,    // High but not max — allows natural variation
  style: 0.35,               // Some expressiveness — not flat, not theatrical
  use_speaker_boost: true    // Clearer output
};
```

### Voiceover Scripts

**CRITICAL QUALITY RULE:** Each script has PACING MARKERS. These are represented by punctuation and line breaks. The AI voice MUST pause at these points. Test the output — if it sounds rushed or runs sentences together, add explicit SSML pauses.

```typescript
const voiceoverScripts: Record<string, string> = {

  'concept-1': 
`I searched "auto repair near me" in your city.
Your shop wasn't in the top 3. These guys were.

These three shops? They're getting all the calls.

And if your shop is down here... nobody's calling you.

We fix that. In 90 days.
Guaranteed, for qualifying shops.
One shop per 5 miles.

Book your free maps audit. Link below.`,

  'concept-2':
`The shop down the street has 187 reviews.
You have 23.
Guess who's getting the calls.

This guy. 187 reviews. 4.8 stars.
And this guy? 23 reviews. Buried.

Same quality work. Different Google presence.
That's the gap.

We close it in 90 days. One shop per 5 miles.
Link below.`,

  'concept-3':
`What are 15 to 50 extra calls a month worth to your shop?

At 400 bucks a job... do the math.

15 calls. Times 400.
That's 6,000 a month. And that's the low end.

Right now, that money is going to whoever shows up first on Google Maps.

We get you there. 90 days. Guaranteed for qualifying shops.
Link below.`,

  'concept-4':
`Google Maps is already sending 15 to 50 calls a month to shops in your city.

Question is... are they calling you? Or the other guy?

This shop. Fully optimized. Photos, reviews, posts every week.

This shop. Dead. No photos. 12 reviews. Hasn't posted in two years.

Google picks the first guy. Every time.

Same trade. Different presence. We fix it in 90 days.
One shop per 5 miles. Link below.`,

  'concept-5':
`We only work with one auto repair shop per 5 miles.

If your competitor locks in first... you can't.

One shop in this radius. That's it.
Once someone takes your territory, it's gone.

We get you into the top 3 on Google Maps. In 90 days.
Guaranteed for qualifying shops.

Book your free audit. Find out if your area is still open.
Link below.`

};
```

### Generation Script: `scripts/generate-voiceover.ts`

```typescript
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_KEY = 'sk_fd7024e41e1487e706581560cffab5ff069216c861b28e69';
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam
const OUTPUT_DIR = 'audio/voiceover';

async function generateVoiceover(conceptId: string, script: string) {
  console.log(`Generating voiceover for ${conceptId}...`);
  
  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      text: script,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.78,
        style: 0.35,
        use_speaker_boost: true
      }
    },
    {
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      responseType: 'arraybuffer',
      timeout: 30000
    }
  );
  
  const outputPath = path.join(OUTPUT_DIR, `${conceptId}.mp3`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(response.data));
  
  // Verify file is valid
  const stats = fs.statSync(outputPath);
  if (stats.size < 10000) {
    throw new Error(`Voiceover file too small: ${outputPath} — ${stats.size} bytes. API may have failed.`);
  }
  
  console.log(`✅ ${outputPath} — ${(stats.size / 1024).toFixed(0)}KB`);
  return outputPath;
}

// Post-processing: normalize audio levels with ffmpeg
async function normalizeAudio(inputPath: string) {
  const outputPath = inputPath.replace('.mp3', '-normalized.mp3');
  const { execSync } = require('child_process');
  
  // Two-pass loudness normalization to -16 LUFS (standard for social media)
  execSync(`ffmpeg -y -i ${inputPath} -af "loudnorm=I=-16:TP=-1.5:LRA=11" ${outputPath}`);
  
  // Replace original with normalized
  fs.renameSync(outputPath, inputPath);
  console.log(`🔊 Normalized: ${inputPath}`);
}

async function generateAll() {
  for (const [conceptId, script] of Object.entries(voiceoverScripts)) {
    try {
      const outputPath = await generateVoiceover(conceptId, script);
      await normalizeAudio(outputPath);
    } catch (error) {
      console.error(`❌ Failed for ${conceptId}:`, error.message);
      // Try alternate voice
      console.log(`Retrying with alternate voice...`);
      // Switch VOICE_ID and retry
    }
  }
}

generateAll();
```

### Voiceover Quality Check
After generation, manually listen to each file. If any sound robotic or rushed:
1. Add "..." pauses in the script where natural breaks should occur
2. Reduce `style` to 0.2 if it sounds too theatrical
3. Increase `stability` to 0.7 if there are weird inflections
4. Try an alternate voice ID
5. Re-generate only the bad ones

---

## STEP 4: BACKGROUND MUSIC + SFX

### Background Music
Download a royalty-free track. Requirements:
- **Mood:** Confident, subtle, driving but not aggressive. Think "documentary intro" not "hype video"
- **Tempo:** 90-110 BPM
- **Style:** Minimal electronic, subtle bass, clean drums, no lyrics
- **Duration:** At least 30 seconds (will loop/trim as needed)

**Source options (in order of preference):**
1. Pixabay Music (pixabay.com/music) — free, no attribution
2. Uppbeat (uppbeat.io) — free with attribution
3. YouTube Audio Library — free

Save as: `audio/music/background.mp3`

**If you can't download from these sources:** Generate a simple ambient track using Tone.js or use a creative commons track from archive.org. The track MUST be royalty-free — Facebook will mute or flag copyrighted music.

### Sound Effects
Create or download these minimal SFX:

1. **Whoosh** — subtle transition sound for flash cuts
   - Save as: `audio/sfx/whoosh.mp3`
   - Duration: 0.3-0.5 seconds
   - Character: clean, digital, not cartoonish

2. **Impact** — low subtle thump for screen shake moments
   - Save as: `audio/sfx/impact.mp3`
   - Duration: 0.2-0.4 seconds
   - Character: deep, felt more than heard

3. **Ding** — clean notification sound for CTA appear
   - Save as: `audio/sfx/ding.mp3`
   - Duration: 0.5-0.8 seconds
   - Character: clear, pleasant, not iPhone default

**If SFX can't be sourced:** Generate them using Tone.js:
```typescript
// Generate a simple whoosh
const synth = new Tone.NoiseSynth({ noise: { type: 'white' }});
// Apply bandpass filter sweep from 200Hz to 4000Hz over 0.3s

// Generate a simple impact
const membrane = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 4 });
// Single hit at C1, 0.2s duration

// Generate a simple ding  
const bell = new Tone.MetalSynth({ harmonicity: 12, resonance: 800, modulationIndex: 20 });
// Single hit, 0.5s decay
```

### Audio Mix Levels
```typescript
const AUDIO_MIX = {
  voiceover: 1.0,        // Full volume — voice is king
  music: {
    duringVoice: 0.06,   // Very quiet under voice
    duringText: 0.15,    // Slightly louder during text-only frames
    duringCTA: 0.20,     // Subtle swell during end card
    fadeInFrames: 30,     // 1 second fade in
    fadeOutFrames: 45     // 1.5 second fade out
  },
  sfx: {
    whoosh: 0.12,         // Barely there — felt not heard
    impact: 0.10,
    ding: 0.15
  }
};
```

---

## STEP 5: REMOTION THEME + COMPONENTS

### Theme: `src/config/theme.ts`

```typescript
export const theme = {
  colors: {
    background: '#0A0A0C',
    backgroundAlt: '#111114',
    primary: '#F5820A',       // Maps Autopilot amber orange
    text: '#FFFFFF',
    textMuted: '#888888',
    textDim: '#555555',
    pain: '#FF4444',          // Red — for problem/pain frames
    solution: '#00E676',      // Green — for solution/guarantee frames
    scarcity: '#FFD600',      // Yellow — for urgency/scarcity
    flash: '#FFFFFF',         // Flash cut color
  },
  fonts: {
    heading: 'Oswald',        // Bold, condensed, impact
    body: 'Source Sans 3',    // Clean, readable
  },
  // Register these fonts in Remotion config
  sizes: {
    // 1080x1080 (square feed)
    square: {
      mainText: 68,
      highlightText: 88,
      subText: 32,
      overlayText: 28,
      ctaHeadline: 44,
      ctaSubtext: 22,
      ctaButton: 28,
    },
    // 1080x1920 (vertical stories/reels)
    vertical: {
      mainText: 76,
      highlightText: 96,
      subText: 38,
      overlayText: 32,
      ctaHeadline: 52,
      ctaSubtext: 26,
      ctaButton: 32,
    }
  },
  timing: {
    fps: 30,
    textFadeIn: 8,            // frames
    textSlideUp: 10,          // frames
    textSlideIn: 10,          // frames  
    flashDuration: 4,         // frames (~0.13s)
    ctaFadeIn: 12,            // frames
  },
  effects: {
    grain: true,              // Subtle film grain overlay
    grainOpacity: 0.03,
    vignette: true,           // Subtle edge darkening
    vignetteStrength: 0.15,
    scanline: false,          // Disabled — too techy for this audience
  }
};
```

### Component: `KineticText.tsx`
Main animated text component. Handles:
- Word-by-word or line-by-line entrance (configurable)
- Slide up, slide in from left, scale in, typewriter animations
- Color per-word (highlight specific words in accent color)
- Screen shake effect (CSS transform jitter for 10-15 frames)
- Pulse effect (scale 1.0 → 1.05 → 1.0 loop)
- Auto-sizing based on aspect ratio

**Animation quality rules:**
- Use `spring()` from Remotion for natural motion, not linear interpolation
- Text should feel like it has weight — slight overshoot on slide animations
- Stagger word entrance by 3-4 frames per word
- Highlight color should fade in 2 frames AFTER the word appears (draws eye)

### Component: `BRollLayer.tsx`
Screen recording video layer. Handles:
- Playing footage at specified start/end points
- Opacity control (0-100%)
- Slow zoom effect (Ken Burns) using `scale()` transform with `interpolate()`
- Crop/position adjustment for different aspect ratios
- Smooth fade in/out at segment boundaries

**Quality rules:**
- B-roll MUST have a subtle dark overlay (10-20% black) so text remains readable on top
- Zoom must be VERY subtle — 1.0 to 1.08 max over the segment duration
- No jarring starts — fade in over 6-8 frames minimum

### Component: `FlashCut.tsx`
Transition between segments. Handles:
- Full-screen color flash (2-4 frames)
- Color configurable (white, orange, red)
- Optional whoosh SFX trigger
- Creates energy and pattern interrupt between segments

**Quality rules:**
- Flash should be exactly 3 frames: 1 frame 80% opacity, 1 frame 100%, 1 frame 60% fade
- Never more than 4 frames — longer feels like a glitch, not a cut
- Add 1 frame of black between flash and next segment

### Component: `TextOverlay.tsx`
Text that sits on top of B-roll footage. Handles:
- Semi-transparent dark bar behind text (rgba(0,0,0,0.65))
- Positioned at top or bottom of frame
- Fade in animation
- Rounded corners on background bar (8px)
- Padding: 12px vertical, 20px horizontal

### Component: `CTAEndCard.tsx`
Final slide of every ad. Handles:
- Full dark background
- Headline in amber orange, Oswald bold
- Subheadline in white, Source Sans 3
- Fake button element (amber orange background, dark text, rounded)
- Subtle glow animation on button
- Optional "Maps Autopilot" small text at bottom
- Fade up entrance animation

**Quality rules:**
- CTA must feel like a real app screen, not a PowerPoint slide
- Button should look tappable — rounded corners, subtle shadow, slight scale animation
- Don't overcrowd — generous spacing between headline, subtext, and button
- End card duration: 3-4 seconds (long enough to read, short enough to not bore)

### Component: `GrainOverlay.tsx`
Subtle film grain texture. Handles:
- Full-screen noise pattern at very low opacity (3%)
- Creates organic, non-digital feel
- Uses SVG filter for performance

### Component: `AudioLayer.tsx`
Audio mixing component. Handles:
- Voice track at full volume
- Music track with dynamic volume (quieter during voice, louder during text-only)
- SFX triggers at specific frames (whoosh on flash cuts, impact on shakes, ding on CTA)
- Fade in/out on music

---

## STEP 6: CONCEPT COMPOSITIONS

### 5 Concept Definitions: `src/config/concepts.ts`

Each concept defines a frame-by-frame timeline. The Remotion composition reads this config and renders accordingly. See the full concept configs in the VIDEO-AD-BUILDER-FULL-SPEC.md file already created.

**Key change from previous spec:** Use the FIRST city (Houston) as default B-roll for all 5 concepts. Then create city-swapped variations for 3 more cities (Dallas, San Antonio, Jacksonville) = 20 total unique videos.

### Concept × City Matrix

| Concept | Houston | Dallas | San Antonio | Jacksonville |
|---------|---------|--------|-------------|--------------|
| 1 - The Live Search | ✅ | ✅ | ✅ | ✅ |
| 2 - The Review Gap | ✅ | ✅ | ✅ | ✅ |
| 3 - The Whiteboard Math | ✅ | ✅ | ✅ | ✅ |
| 4 - The Phone Flip | ✅ | ✅ | ✅ | ✅ |
| 5 - The Territory Lock | ✅ | ✅ | ✅ | ✅ |

Each cell = 1 video rendered in 1080x1080. That's 20 unique videos.

Additionally render the top 5 (one per concept, Houston only) in 1080x1920 for stories/reels = 5 more.

Additionally render hook-only cuts for all 5 concepts (Houston, both ratios) = 10 more.

**Total output: 35 video files.**

---

## STEP 7: RENDER PIPELINE

### Render Script: `scripts/render-all.ts`

```typescript
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { concepts } from '../src/config/concepts';

const CITIES = ['houston', 'dallas', 'san-antonio', 'jacksonville'];

async function renderAll() {
  console.log('Bundling Remotion project...');
  const bundled = await bundle(path.resolve('./src/Root.tsx'));
  
  // Full ads — all concepts × all cities (1080x1080)
  for (const concept of concepts) {
    for (const city of CITIES) {
      const outputFile = `out/${concept.id}-${city}-full-1080x1080.mp4`;
      console.log(`Rendering ${outputFile}...`);
      
      const composition = await selectComposition({
        serveUrl: bundled,
        id: 'FullAd',
        inputProps: { conceptId: concept.id, cityId: city, width: 1080, height: 1080 }
      });
      
      await renderMedia({
        composition,
        serveUrl: bundled,
        codec: 'h264',
        outputLocation: outputFile,
        inputProps: { conceptId: concept.id, cityId: city, width: 1080, height: 1080 },
        crf: 18,
        pixelFormat: 'yuv420p',
      });
      
      console.log(`✅ ${outputFile}`);
    }
  }
  
  // Stories format — one per concept, Houston only (1080x1920)
  for (const concept of concepts) {
    const outputFile = `out/${concept.id}-houston-full-1080x1920.mp4`;
    console.log(`Rendering ${outputFile}...`);
    
    const composition = await selectComposition({
      serveUrl: bundled,
      id: 'FullAd',
      inputProps: { conceptId: concept.id, cityId: 'houston', width: 1080, height: 1920 }
    });
    
    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: 'h264',
      outputLocation: outputFile,
      inputProps: { conceptId: concept.id, cityId: 'houston', width: 1080, height: 1920 },
      crf: 18,
      pixelFormat: 'yuv420p',
    });
    
    console.log(`✅ ${outputFile}`);
  }
  
  // Hook-only cuts — one per concept, Houston, both ratios
  for (const concept of concepts) {
    for (const ratio of [{ w: 1080, h: 1080 }, { w: 1080, h: 1920 }]) {
      const outputFile = `out/${concept.id}-houston-hook-${ratio.w}x${ratio.h}.mp4`;
      console.log(`Rendering ${outputFile}...`);
      
      const composition = await selectComposition({
        serveUrl: bundled,
        id: 'HookOnly',
        inputProps: { conceptId: concept.id, cityId: 'houston', width: ratio.w, height: ratio.h }
      });
      
      await renderMedia({
        composition,
        serveUrl: bundled,
        codec: 'h264',
        outputLocation: outputFile,
        inputProps: { conceptId: concept.id, cityId: 'houston', width: ratio.w, height: ratio.h },
        crf: 18,
        pixelFormat: 'yuv420p',
      });
      
      console.log(`✅ ${outputFile}`);
    }
  }
  
  console.log('\n🎬 ALL RENDERS COMPLETE');
  console.log(`Total files: ${fs.readdirSync('out').filter(f => f.endsWith('.mp4')).length}`);
}

renderAll().catch(console.error);
```

---

## STEP 8: POST-RENDER QUALITY VALIDATION

After all renders complete, run this validation:

```typescript
async function validateOutputs() {
  const files = fs.readdirSync('out').filter(f => f.endsWith('.mp4'));
  
  console.log(`\nValidating ${files.length} output files...\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const file of files) {
    const filePath = `out/${file}`;
    const stats = fs.statSync(filePath);
    
    // Check file size (should be 2-50MB for a 20-30s video)
    if (stats.size < 500000) {
      console.error(`❌ ${file} — TOO SMALL (${(stats.size/1024).toFixed(0)}KB) — likely corrupt or empty`);
      failed++;
      continue;
    }
    if (stats.size > 100 * 1024 * 1024) {
      console.error(`❌ ${file} — TOO LARGE (${(stats.size/1024/1024).toFixed(0)}MB) — Facebook limit is 100MB`);
      failed++;
      continue;
    }
    
    // Check duration with ffprobe
    const duration = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`
    ).toString().trim();
    
    const durationSec = parseFloat(duration);
    const isHook = file.includes('-hook-');
    
    if (isHook && (durationSec < 3 || durationSec > 10)) {
      console.error(`❌ ${file} — Hook duration ${durationSec.toFixed(1)}s (expected 3-10s)`);
      failed++;
      continue;
    }
    if (!isHook && (durationSec < 15 || durationSec > 35)) {
      console.error(`❌ ${file} — Full ad duration ${durationSec.toFixed(1)}s (expected 15-35s)`);
      failed++;
      continue;
    }
    
    // Check resolution with ffprobe
    const resolution = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${filePath}"`
    ).toString().trim();
    
    const [width, height] = resolution.split(',').map(Number);
    const expectedRatio = file.includes('1080x1920') ? '1080x1920' : '1080x1080';
    
    if (`${width}x${height}` !== expectedRatio) {
      console.error(`❌ ${file} — Resolution ${width}x${height} (expected ${expectedRatio})`);
      failed++;
      continue;
    }
    
    // Check has audio stream
    const audioStreams = execSync(
      `ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "${filePath}"`
    ).toString().trim();
    
    if (!audioStreams.includes('audio')) {
      console.error(`⚠️ ${file} — NO AUDIO STREAM (voiceover may have failed)`);
      // Warning not failure — video still usable with captions
    }
    
    console.log(`✅ ${file} — ${(stats.size/1024/1024).toFixed(1)}MB — ${durationSec.toFixed(1)}s — ${width}x${height}`);
    passed++;
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${files.length} total`);
  console.log(`${'='.repeat(50)}`);
}
```

---

## OPENCLAW BUILD COMMAND

**Send this to OpenClaw via Telegram:**

```
Use Claude Code. Read ~/maps-autopilot/docs/specs/PHASE1-VIDEO-AD-FACTORY.md and follow it exactly.

Build a complete video ad production pipeline at ~/maps-autopilot/video-ads/.

Execute in this order:
1. Initialize project, install all dependencies
2. Build Puppeteer screen capture scripts, run captures for 4 cities (Houston, Dallas, San Antonio, Jacksonville) — 4 footage types per city = 16 clips
3. Generate ElevenLabs voiceover for all 5 concepts using the API key in the spec — normalize audio with ffmpeg after generation
4. Download or generate background music and SFX (must be royalty-free)
5. Build all Remotion components (KineticText, BRollLayer, FlashCut, TextOverlay, CTAEndCard, GrainOverlay, AudioLayer)
6. Build the 5 concept compositions with full timeline configs
7. Build render scripts
8. Render all 35 output videos (20 full ads + 5 stories + 10 hooks)
9. Run post-render validation — all files must pass

If Puppeteer screen capture fails (Google blocks it), create realistic mockup footage instead:
- Build an HTML page that looks exactly like Google Maps search results with realistic shop names, review counts, and star ratings
- Screen record THAT page with Puppeteer (you control the content, no Google blocking)
- This is the fallback — try real Google Maps first

Quality standard: Every output must look like a professional video editor made it. Test each component individually before assembling.

git add -A && git commit -m "feat: video ad factory — 35 ready-to-upload video ads" && git push
Run with --dangerously-skip-permissions.
```

---

## FALLBACK: GOOGLE MAPS MOCKUP

If Google blocks Puppeteer from accessing Maps (likely with bot detection), build a realistic mockup instead:

### Mockup Page: `src/mockup/maps-results.html`

Build an HTML page that visually replicates Google Maps search results:
- Google Maps color scheme and layout
- Search bar at top with "auto repair near me" typed
- 3-pack results with real shop names from the Outscraper data
- Each result: name, star rating, review count, address, "Open now"
- Scrollable list below the 3-pack with more shops
- Shops lower in the list have fewer reviews (realistic)

**Data source:** Use real shop names from `~/maps-autopilot/FINAL_MASTER_ALL_BUSINESSES.csv` — filter by city, sort by reviews desc, pick top 3 for 3-pack and 5-10 more for the list below.

This mockup is MORE controllable than real Google Maps:
- You pick exactly which shops to show
- You control the review counts and ratings
- No consent banners, no loading delays, no bot detection
- Perfectly consistent across all captures
- Can emphasize the review gap more dramatically

Record this mockup page with Puppeteer the same way — type in search, show results, scroll, click profiles. The viewer won't know the difference on a phone screen in a Facebook feed.

---

## FINAL OUTPUT MANIFEST

```
out/
├── concept-1-houston-full-1080x1080.mp4
├── concept-1-dallas-full-1080x1080.mp4
├── concept-1-san-antonio-full-1080x1080.mp4
├── concept-1-jacksonville-full-1080x1080.mp4
├── concept-1-houston-full-1080x1920.mp4
├── concept-1-houston-hook-1080x1080.mp4
├── concept-1-houston-hook-1080x1920.mp4
├── concept-2-houston-full-1080x1080.mp4
├── concept-2-dallas-full-1080x1080.mp4
├── concept-2-san-antonio-full-1080x1080.mp4
├── concept-2-jacksonville-full-1080x1080.mp4
├── concept-2-houston-full-1080x1920.mp4
├── concept-2-houston-hook-1080x1080.mp4
├── concept-2-houston-hook-1080x1920.mp4
├── concept-3-houston-full-1080x1080.mp4
├── concept-3-dallas-full-1080x1080.mp4
├── concept-3-san-antonio-full-1080x1080.mp4
├── concept-3-jacksonville-full-1080x1080.mp4
├── concept-3-houston-full-1080x1920.mp4
├── concept-3-houston-hook-1080x1080.mp4
├── concept-3-houston-hook-1080x1920.mp4
├── concept-4-houston-full-1080x1080.mp4
├── concept-4-dallas-full-1080x1080.mp4
├── concept-4-san-antonio-full-1080x1080.mp4
├── concept-4-jacksonville-full-1080x1080.mp4
├── concept-4-houston-full-1080x1920.mp4
├── concept-4-houston-hook-1080x1080.mp4
├── concept-4-houston-hook-1080x1920.mp4
├── concept-5-houston-full-1080x1080.mp4
├── concept-5-dallas-full-1080x1080.mp4
├── concept-5-san-antonio-full-1080x1080.mp4
├── concept-5-jacksonville-full-1080x1080.mp4
├── concept-5-houston-full-1080x1920.mp4
├── concept-5-houston-hook-1080x1080.mp4
└── concept-5-houston-hook-1080x1920.mp4

Total: 35 video files
```
