import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const pool = new Pool({ host: '147.182.235.147', port: 5432, database: 'maps_autopilot', user: 'n8n_user', password: process.env.DB_PASSWORD, ssl: false });

  // Fix review_requests: target_platform and review_link should be nullable (not known at initial insert)
  await pool.query("ALTER TABLE review_requests ALTER COLUMN target_platform DROP NOT NULL");
  await pool.query("ALTER TABLE review_requests ALTER COLUMN review_link DROP NOT NULL");
  console.log('Fixed review_requests: target_platform and review_link now nullable');

  await pool.end();
}
main();
