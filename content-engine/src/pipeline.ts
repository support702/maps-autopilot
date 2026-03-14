import path from 'path';
import fs from 'fs';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { transcribeAudio, WordTimestamp } from './utils/whisper';
import { extractAudio, normalizeAudio, mixBackgroundMusic } from './utils/ffmpeg';
import { notifySlack } from './utils/slack';
import { FPS, END_CARD_DURATION_FRAMES, DEFAULT_CTA_TEXT } from './config/brand';

const MUSIC_DIR = path.resolve(__dirname, '../music');
const OUTPUT_DIR = path.resolve(__dirname, '../output');

interface RenderFormat {
  id: string;
  suffix: string;
  width: number;
  height: number;
}

const FORMATS: RenderFormat[] = [
  { id: 'VideoWithCaptions-vertical', suffix: 'vertical', width: 1080, height: 1920 },
  { id: 'VideoWithCaptions-square', suffix: 'square', width: 1080, height: 1080 },
  { id: 'VideoWithCaptions-landscape', suffix: 'landscape', width: 1920, height: 1080 },
];

function getDateFolder(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getTitleFromPath(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

function findMusicTrack(): string | null {
  if (!fs.existsSync(MUSIC_DIR)) return null;
  const tracks = fs.readdirSync(MUSIC_DIR).filter((f) =>
    ['.mp3', '.wav', '.aac', '.m4a'].includes(path.extname(f).toLowerCase())
  );
  if (tracks.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * tracks.length);
  return path.join(MUSIC_DIR, tracks[randomIndex]);
}

function wordTimestampsToFrames(
  words: WordTimestamp[],
  fps: number
): Array<{ word: string; start: number; end: number }> {
  return words.map((w) => ({
    word: w.word,
    start: Math.round(w.start * fps),
    end: Math.round(w.end * fps),
  }));
}

export async function processVideo(inputPath: string): Promise<void> {
  const title = getTitleFromPath(inputPath);
  const dateFolder = getDateFolder();
  const outputDir = path.join(OUTPUT_DIR, dateFolder, title);

  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`[Pipeline] Processing: ${title}`);

  // Step 1: Extract audio
  const tempAudioPath = path.join(outputDir, '_temp_audio.wav');
  console.log('[Pipeline] Extracting audio...');
  await extractAudio(inputPath, tempAudioPath);

  // Step 2: Transcribe with Whisper
  console.log('[Pipeline] Transcribing with Whisper...');
  const wordTimestamps = await transcribeAudio(tempAudioPath);
  const captionFrames = wordTimestampsToFrames(wordTimestamps, FPS);
  console.log(`[Pipeline] Got ${wordTimestamps.length} word timestamps`);

  // Step 3: Normalize audio
  const normalizedAudioPath = path.join(outputDir, '_temp_normalized.wav');
  console.log('[Pipeline] Normalizing audio...');
  await normalizeAudio(tempAudioPath, normalizedAudioPath);

  // Step 4: Mix background music if available
  let processedVideoPath = inputPath;
  const musicTrack = findMusicTrack();
  if (musicTrack) {
    console.log(`[Pipeline] Mixing background music: ${path.basename(musicTrack)}`);
    processedVideoPath = path.join(outputDir, '_temp_with_music.mp4');
    await mixBackgroundMusic(inputPath, musicTrack, processedVideoPath);
  }

  // Step 5: Calculate duration
  const lastWord = wordTimestamps[wordTimestamps.length - 1];
  const videoDurationSec = lastWord ? lastWord.end + 1 : 10;
  const videoDurationFrames = Math.ceil(videoDurationSec * FPS);
  const totalDurationFrames = videoDurationFrames + END_CARD_DURATION_FRAMES;

  // Step 6: Bundle Remotion project
  console.log('[Pipeline] Bundling Remotion project...');
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, './Root.tsx'),
  });

  // Step 7: Render 3 formats
  for (const format of FORMATS) {
    const outputFile = path.join(outputDir, `${title}_${format.suffix}.mp4`);
    console.log(`[Pipeline] Rendering ${format.suffix} (${format.width}x${format.height})...`);

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: format.id,
      inputProps: {
        src: processedVideoPath,
        captions: captionFrames,
        durationInFrames: totalDurationFrames,
        fps: FPS,
        width: format.width,
        height: format.height,
        ctaText: DEFAULT_CTA_TEXT,
      },
    });

    await renderMedia({
      composition: {
        ...composition,
        durationInFrames: totalDurationFrames,
        width: format.width,
        height: format.height,
      },
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputFile,
      inputProps: {
        src: processedVideoPath,
        captions: captionFrames,
        durationInFrames: totalDurationFrames,
        fps: FPS,
        width: format.width,
        height: format.height,
        ctaText: DEFAULT_CTA_TEXT,
      },
    });

    console.log(`[Pipeline] Exported: ${outputFile}`);
  }

  // Cleanup temp files
  for (const tmp of [tempAudioPath, normalizedAudioPath]) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
  const tempMusicVideo = path.join(outputDir, '_temp_with_music.mp4');
  if (fs.existsSync(tempMusicVideo)) fs.unlinkSync(tempMusicVideo);

  // Step 8: Notify Slack
  const message = `Content Engine: "${title}" processed successfully.\nExported 3 formats to output/${dateFolder}/${title}/`;
  await notifySlack(message);
  console.log(`[Pipeline] Complete: ${title}`);
}
