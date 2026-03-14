/**
 * src/utils/whisper.ts
 *
 * OpenAI Whisper API integration for word-level transcription.
 * Extracts audio from video via ffmpeg, then sends to Whisper for
 * word-level timestamps. Used by pipeline.ts to generate captions.
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { extractAudio } from './ffmpeg';

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is required for Whisper transcription'
    );
  }
  return new OpenAI({ apiKey });
}

/**
 * Transcribe audio using OpenAI Whisper API with word-level timestamps.
 *
 * If the input is a video file (.mp4, .mov, .webm), audio is extracted
 * to a temporary WAV file first.
 *
 * @param audioPath - Path to audio or video file
 * @returns Array of word timestamps with start/end in seconds
 */
export async function transcribeAudio(
  audioPath: string
): Promise<WordTimestamp[]> {
  const ext = path.extname(audioPath).toLowerCase();
  const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];

  let fileToTranscribe = audioPath;
  let tempFile: string | null = null;

  // Extract audio from video if needed
  if (videoExtensions.includes(ext)) {
    tempFile = path.join(
      path.dirname(audioPath),
      `_whisper_temp_${Date.now()}.wav`
    );
    await extractAudio(audioPath, tempFile);
    fileToTranscribe = tempFile;
  }

  try {
    const client = getOpenAIClient();
    const audioStream = fs.createReadStream(fileToTranscribe);

    const response = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file: audioStream,
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });

    const words: WordTimestamp[] = (response.words ?? []).map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    }));

    return words;
  } finally {
    // Clean up temporary file
    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}
