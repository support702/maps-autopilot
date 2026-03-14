import { startWatcher } from './utils/fileWatcher';
import { processVideo } from './pipeline';

console.log('[ContentEngine] Starting Post-Production Pipeline...');
console.log(`[ContentEngine] PID: ${process.pid}`);

const watcher = startWatcher(async (filePath) => {
  try {
    await processVideo(filePath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ContentEngine] Pipeline error: ${message}`);
  }
});

function shutdown() {
  console.log('[ContentEngine] Shutting down...');
  watcher.close().then(() => {
    console.log('[ContentEngine] File watcher closed. Goodbye.');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
