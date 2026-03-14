/**
 * Content Engine API Server
 * Endpoints for brief status management and analytics
 */

import http from 'http';
import { Pool } from 'pg';
import url from 'url';

const PORT = 3012;

const pool = new Pool({
  host: process.env.DB_HOST || '147.182.235.147',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'maps_autopilot',
  user: process.env.DB_USER || 'n8n_user',
  password: process.env.DB_PASSWORD,
});

interface BriefStatusUpdate {
  status: 'pending' | 'selected' | 'filmed' | 'published';
}

interface CIEStats {
  briefs_week: number;
  film_rate: number;
  sources: Array<{ source: string; count: number }>;
}

/**
 * Update brief status
 */
async function updateBriefStatus(id: string, status: string): Promise<void> {
  const validStatuses = ['pending', 'selected', 'filmed', 'published'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  await pool.query(
    `UPDATE content_briefs SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, id]
  );

  console.log(`[API] Updated brief ${id} to status: ${status}`);
}

/**
 * Get CIE statistics
 */
async function getCIEStats(): Promise<CIEStats> {
  // Briefs created in last 7 days
  const briefsResult = await pool.query(
    `SELECT COUNT(*) as count FROM content_briefs WHERE created_at > NOW() - INTERVAL '7 days'`
  );
  const briefs_week = parseInt(briefsResult.rows[0]?.count || '0');

  // Film rate: (filmed + published) / total
  const filmRateResult = await pool.query(
    `SELECT 
      COUNT(*) FILTER (WHERE status IN ('filmed', 'published')) as filmed,
      COUNT(*) as total
    FROM content_briefs
    WHERE created_at > NOW() - INTERVAL '30 days'`
  );
  const filmed = parseInt(filmRateResult.rows[0]?.filmed || '0');
  const total = parseInt(filmRateResult.rows[0]?.total || '1');
  const film_rate = total > 0 ? filmed / total : 0;

  // Top sources by item count
  const sourcesResult = await pool.query(
    `SELECT source_name as source, COUNT(*) as count
    FROM content_intelligence
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY source_name
    ORDER BY count DESC
    LIMIT 10`
  );
  const sources = sourcesResult.rows.map(row => ({
    source: row.source,
    count: parseInt(row.count),
  }));

  return { briefs_week, film_rate, sources };
}

/**
 * HTTP request handler
 */
async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '';

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // Health check
    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'content-engine', port: PORT }));
      return;
    }

    // GET /api/cie-stats
    if (req.method === 'GET' && pathname === '/api/cie-stats') {
      const stats = await getCIEStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
      return;
    }

    // POST /api/brief/:id/status
    const briefStatusMatch = pathname.match(/^\/api\/brief\/([^/]+)\/status$/);
    if (req.method === 'POST' && briefStatusMatch) {
      const briefId = briefStatusMatch[1];
      
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const data: BriefStatusUpdate = JSON.parse(body);
          await updateBriefStatus(briefId, data.status);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: message }));
        }
      });
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (error) {
    console.error('[API] Request error:', error);
    const message = error instanceof Error ? error.message : String(error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
  }
}

/**
 * Start API server
 */
export function startAPIServer(): http.Server {
  const server = http.createServer(handleRequest);

  server.listen(PORT, () => {
    console.log(`[API] Content Engine API listening on port ${PORT}`);
    console.log(`[API] Endpoints:`);
    console.log(`[API]   GET  /health`);
    console.log(`[API]   GET  /api/cie-stats`);
    console.log(`[API]   POST /api/brief/:id/status`);
  });

  return server;
}
