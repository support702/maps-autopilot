/**
 * Content Engine Main Entry Point
 * Starts file watcher and API server
 */

import { startWatcher } from './utils/fileWatcher.js';
import { startAPIServer } from './api.js';
import { processVideo } from './pipeline.js';

console.log('[ContentEngine] Starting Post-Production Pipeline...');
console.log(`[ContentEngine] PID: ${process.pid}`);

// Start API server
const apiServer = startAPIServer();

// Start file watcher
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
  
  // Close API server
  apiServer.close(() => {
    console.log('[ContentEngine] API server stopped');
  });

  // Close file watcher
  watcher.close().then(() => {
    console.log('[ContentEngine] File watcher closed. Goodbye.');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('[ContentEngine] Ready');
