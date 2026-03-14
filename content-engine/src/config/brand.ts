/**
 * src/config/brand.ts
 *
 * Brand configuration constants for the Content Engine.
 * Defines visual identity, audio processing settings, and default CTA text.
 * Referenced by compositions for styling and by ffmpeg utils for audio processing.
 */

export const BRAND_COLORS = {
  primary: '#F5820A',
  background: '#0A0A0C',
  white: '#FFFFFF',
} as const;

export const BRAND_FONT = 'Montserrat Bold';

export const LOGO_PATH = 'assets/logo.png';

export const AUDIO_SETTINGS = {
  /** Target loudness in LUFS */
  targetLUFS: -14,
  /** Highpass filter frequency in Hz */
  highpassFreq: 80,
  /** Compressor ratio (e.g. 2 means 2:1) */
  compressionRatio: 2,
  /** Compressor threshold in dB */
  compressionThreshold: -20,
  /** Background music volume (0-1 scale) */
  musicVolume: 0.1,
} as const;

/** End card duration in frames (3 seconds at 30fps) */
export const END_CARD_DURATION_FRAMES = 90;

export const DEFAULT_CTA_TEXT = 'Follow for more tips!';

export const FPS = 30;
