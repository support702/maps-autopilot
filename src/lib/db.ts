import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "147.182.235.147",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "maps_autopilot",
  user: process.env.DB_USER || "n8n_user",
  password: process.env.DB_PASSWORD,
  ssl: false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const query = (text: string, params?: unknown[]) => pool.query(text, params);
export const getClient = () => pool.connect();
