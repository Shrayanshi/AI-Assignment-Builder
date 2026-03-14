import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL is not set. PostgreSQL connection will fail on Vercel.");
}

// Single shared connection pool for all serverless invocations.
// Neon always requires SSL, even in local development.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // Keep connections alive to avoid repeated SSL handshakes (speeds up serverless)
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

export async function query(text, params = []) {
  const res = await pool.query(text, params);
  return res;
}

export async function runAsync(text, params = []) {
  // Kept for backwards-compatibility with existing code
  return query(text, params);
}

export async function getAsync(text, params = []) {
  const { rows } = await query(text, params);
  return rows[0] || null;
}

export async function allAsync(text, params = []) {
  const { rows } = await query(text, params);
  return rows;
}

