import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import fs from 'fs';

const RAW_DIR = path.resolve(__dirname, '../../raw');
const STABILIZE_INTERVAL_MS = 2000;
const STABILIZE_CHECK_COUNT = 3;

async function waitForFileStable(filePath: string): Promise<boolean> {
  let lastSize = -1;
  let stableCount = 0;

  while (stableCount < STABILIZE_CHECK_COUNT) {
    await new Promise((r) => setTimeout(r, STABILIZE_INTERVAL_MS));
    try {
      const stat = fs.statSync(filePath);
      if (stat.size === lastSize && stat.size > 0) {
        stableCount++;
      } else {
        lastSize = stat.size;
        stableCount = 0;
      }
    } catch {
      return false;
    }
  }

  return true;
}

export function startWatcher(
  onNewFile: (filePath: string) => void
): FSWatcher {
  if (!fs.existsSync(RAW_DIR)) {
    fs.mkdirSync(RAW_DIR, { recursive: true });
  }

  console.log(`[FileWatcher] Watching ${RAW_DIR} for new .mp4 files...`);

  const watcher = chokidar.watch(path.join(RAW_DIR, '*.mp4'), {
    ignoreInitial: true,
    awaitWriteFinish: false,
  });

  watcher.on('add', async (filePath: string) => {
    console.log(`[FileWatcher] New file detected: ${path.basename(filePath)}`);
    const stable = await waitForFileStable(filePath);
    if (stable) {
      console.log(`[FileWatcher] File stable, starting pipeline: ${path.basename(filePath)}`);
      onNewFile(filePath);
    } else {
      console.warn(`[FileWatcher] File disappeared or empty: ${path.basename(filePath)}`);
    }
  });

  watcher.on('error', (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FileWatcher] Error:', message);
  });

  return watcher;
}
