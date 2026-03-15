import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const pool = new Pool({ host: '147.182.235.147', port: 5432, database: 'maps_autopilot', user: 'n8n_user', password: process.env.DB_PASSWORD, ssl: false });

  const r1 = await pool.query("SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'review_requests' ORDER BY ordinal_position");
  console.log('review_requests:');
  r1.rows.forEach(r => console.log(`  ${r.column_name} nullable=${r.is_nullable} default=${r.column_default || 'none'}`));

  const r2 = await pool.query("SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'client_photos' ORDER BY ordinal_position");
  console.log('\nclient_photos:');
  r2.rows.forEach(r => console.log(`  ${r.column_name} nullable=${r.is_nullable} default=${r.column_default || 'none'}`));

  await pool.end();
}
main();
