import ffmpeg from 'fluent-ffmpeg';
import { AUDIO_SETTINGS } from '../config/brand';

function runFfmpeg(command: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    command
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .run();
  });
}

export async function extractAudio(
  videoPath: string,
  outputPath: string
): Promise<void> {
  const command = ffmpeg(videoPath)
    .noVideo()
    .audioCodec('pcm_s16le')
    .audioFrequency(16000)
    .audioChannels(1)
    .output(outputPath);

  await runFfmpeg(command);
}

export async function normalizeAudio(
  inputPath: string,
  outputPath: string
): Promise<void> {
  const { highpassFreq, compressionRatio, compressionThreshold, targetLUFS } =
    AUDIO_SETTINGS;

  const audioFilters = [
    `highpass=f=${highpassFreq}`,
    `acompressor=ratio=${compressionRatio}:threshold=${compressionThreshold}dB:attack=5:release=50`,
    `loudnorm=I=${targetLUFS}:TP=-1.5:LRA=11`,
  ].join(',');

  const command = ffmpeg(inputPath)
    .audioFilters(audioFilters)
    .output(outputPath);

  await runFfmpeg(command);
}

export async function mixBackgroundMusic(
  videoPath: string,
  musicPath: string,
  outputPath: string
): Promise<void> {
  const { musicVolume } = AUDIO_SETTINGS;

  const command = ffmpeg()
    .input(videoPath)
    .input(musicPath)
    .complexFilter([
      `[1:a]volume=${musicVolume}[music]`,
      `[0:a][music]sidechaincompress=threshold=0.02:ratio=6:attack=10:release=200[mixed]`,
    ])
    .outputOptions(['-map', '0:v', '-map', '[mixed]', '-c:v', 'copy', '-shortest'])
    .output(outputPath);

  await runFfmpeg(command);
}
