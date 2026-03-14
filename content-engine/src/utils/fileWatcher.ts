/**
 * File Watcher
 * Monitor raw/ directory for new video files and trigger processing
 */

import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';

const RAW_DIR = path.resolve(process.cwd(), 'raw');
const SUPPORTED_FORMATS = ['.mp4', '.mov', '.avi', '.mkv'];

export type ProcessVideoFn = (filePath: string) => Promise<void>;

/**
 * Start watching raw/ directory for new videos
 */
export function startWatcher(processVideo: ProcessVideoFn): FSWatcher {
  console.log(`[Watcher] Monitoring: ${RAW_DIR}`);
  console.log(`[Watcher] Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);

  const watcher = chokidar.watch(RAW_DIR, {
    ignored: /(^|[\/\\])\../, // Ignore hidden files
    persistent: true,
    ignoreInitial: false, // Process existing files on startup
    awaitWriteFinish: {
      stabilityThreshold: 2000, // Wait 2s after last change
      pollInterval: 100,
    },
  });

  watcher
    .on('add', async (filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      
      if (!SUPPORTED_FORMATS.includes(ext)) {
        console.log(`[Watcher] Ignoring unsupported file: ${path.basename(filePath)}`);
        return;
      }

      console.log(`[Watcher] New video detected: ${path.basename(filePath)}`);

      try {
        await processVideo(filePath);
        console.log(`[Watcher] Processing complete: ${path.basename(filePath)}`);
      } catch (error) {
        console.error(`[Watcher] Processing failed:`, error);
      }
    })
    .on('error', (error) => {
      console.error('[Watcher] Error:', error);
    })
    .on('ready', () => {
      console.log('[Watcher] Ready for new files');
    });

  return watcher;
}
