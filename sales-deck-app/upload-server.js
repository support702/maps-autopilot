import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const UPLOAD_SECRET = process.env.UPLOAD_SECRET || 'tr_dev_dszi3Lhg3vYQwOpgTd4j';
const AUDITS_DIR = path.join(__dirname, 'dist', 'audits');

// Ensure audits directory exists
if (!fs.existsSync(AUDITS_DIR)) {
  fs.mkdirSync(AUDITS_DIR, { recursive: true });
}

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', auditsDir: AUDITS_DIR });
});

// Upload endpoint
app.post('/upload-audit', (req, res) => {
  const { secret, auditId, data } = req.body;

  // Verify secret
  if (secret !== UPLOAD_SECRET) {
    return res.status(403).json({ error: 'Invalid secret' });
  }

  // Validate inputs
  if (!auditId || !data) {
    return res.status(400).json({ error: 'Missing auditId or data' });
  }

  // Write file
  const filename = `${auditId}.json`;
  const filepath = path.join(AUDITS_DIR, filename);

  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`[UPLOAD] Saved audit: ${filename}`);
    res.json({ success: true, filename, path: filepath });
  } catch (error) {
    console.error(`[ERROR] Failed to write ${filename}:`, error);
    res.status(500).json({ error: 'Failed to write file', message: error.message });
  }
});

const PORT = process.env.UPLOAD_PORT || 3009;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Upload server listening on port ${PORT}`);
  console.log(`Audits directory: ${AUDITS_DIR}`);
});
