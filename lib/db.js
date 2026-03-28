import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL is not set. PostgreSQL connection will fail.");
}

// Strip `channel_binding=require` — the pure-JS pg driver doesn't support this
// libpq-only parameter and Neon adds it by default. Keeping it causes every
// connection attempt to fail with "unrecognized startup parameter".
function cleanUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return url;
  }
}

export const pool = new Pool({
  connectionString: cleanUrl(process.env.DATABASE_URL),
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

// Surface pool errors so they don't silently crash the process
pool.on("error", (err) => {
  console.error("Unexpected pg pool error:", err.message);
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
