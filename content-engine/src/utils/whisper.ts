/**
 * Whisper API Integration
 * Transcribes audio with word-level timestamps
 */

import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

/**
 * Transcribe audio file with word-level timestamps using Whisper API
 */
export async function transcribeAudio(audioPath: string): Promise<WordTimestamp[]> {
  console.log(`[Whisper] Transcribing: ${audioPath}`);
  
  try {
    // Call Whisper API with timestamp_granularities
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });
    
    // Extract word-level timestamps
    const words: WordTimestamp[] = (transcription as any).words || [];
    
    console.log(`[Whisper] Transcribed ${words.length} words`);
    
    return words;
  } catch (error) {
    console.error('[Whisper] Transcription failed:', error);
    throw error;
  }
}
