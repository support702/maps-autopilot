/**
 * FFmpeg Audio/Video Processing
 */

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

/**
 * Extract audio from video file
 */
export async function extractAudio(videoPath: string, audioPath: string): Promise<void> {
  console.log(`[FFmpeg] Extracting audio from ${path.basename(videoPath)}`);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(audioPath)
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .on('end', () => {
        console.log(`[FFmpeg] Audio extracted`);
        resolve();
      })
      .on('error', (err) => {
        console.error('[FFmpeg] Extraction error:', err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Normalize audio loudness to -14 LUFS
 */
export async function normalizeAudio(inputPath: string, outputPath: string): Promise<void> {
  console.log(`[FFmpeg] Normalizing audio`);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters([
        'highpass=f=80',
        'acompressor=threshold=-20dB:ratio=2:attack=5:release=50',
        'loudnorm=I=-14:TP=-1.5:LRA=11'
      ])
      .audioCodec('pcm_s16le')
      .output(outputPath)
      .on('end', () => {
        console.log(`[FFmpeg] Audio normalized`);
        resolve();
      })
      .on('error', (err) => {
        console.error('[FFmpeg] Normalization error:', err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Mix background music with video, applying sidechain ducking
 */
export async function mixBackgroundMusic(
  videoPath: string,
  musicPath: string,
  outputPath: string
): Promise<void> {
  console.log(`[FFmpeg] Mixing background music: ${path.basename(musicPath)}`);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(musicPath)
      .complexFilter([
        '[1:a]volume=0.1[music]',
        '[0:a]asplit[voice][sc]',
        '[music][sc]sidechaincompress=threshold=0.02:ratio=4:attack=200:release=1000[ducked]',
        '[voice][ducked]amix=inputs=2:duration=first[out]'
      ])
      .outputOptions([
        '-map', '0:v',
        '-map', '[out]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k'
      ])
      .output(outputPath)
      .on('end', () => {
        console.log(`[FFmpeg] Background music mixed`);
        resolve();
      })
      .on('error', (err) => {
        console.error('[FFmpeg] Music mixing error:', err.message);
        reject(err);
      })
      .run();
  });
}
