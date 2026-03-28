import { getAsync, runAsync } from "../lib/db.js";
import { ensureSchema } from "../lib/schema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret-change-in-production";

// Kick off schema setup the moment this module is imported so it's ready
// by the time the first real request arrives.
ensureSchema().catch(console.error);

export default async function handler(req, res) {
  try {
    await ensureSchema(); // resolves instantly on all calls after the first
  } catch (err) {
    console.error("Schema migration error:", err);
    return res.status(500).json({ error: "Database setup failed" });
  }

  // GET /api/auth - return current user from JWT
  if (req.method === "GET") {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const token = authHeader.slice(7);
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await getAsync(
        "SELECT id, name, email FROM users WHERE id = $1",
        [payload.userId]
      );
      if (!user) return res.status(401).json({ error: "User not found" });
      return res.status(200).json(user);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  // POST /api/auth - signup or login
  if (req.method === "POST") {
    const { action, name, email, password } = req.body || {};

    if (action === "signup") {
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      try {
        const existing = await getAsync(
          "SELECT id FROM users WHERE email = $1",
          [email.toLowerCase()]
        );
        if (existing) {
          return res.status(409).json({ error: "An account with this email already exists" });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const { rows } = await runAsync(
          "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
          [name.trim(), email.toLowerCase(), passwordHash]
        );
        const user = rows[0];
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
        return res.status(201).json({ user, token });
      } catch (err) {
        console.error("Signup error:", err);
        return res.status(500).json({ error: "Failed to create account" });
      }
    }

    if (action === "login") {
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      try {
        const user = await getAsync(
          "SELECT * FROM users WHERE email = $1",
          [email.toLowerCase()]
        );
        if (!user) {
          return res.status(401).json({ error: "Invalid email or password" });
        }
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
          return res.status(401).json({ error: "Invalid email or password" });
        }
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
        return res.status(200).json({
          user: { id: user.id, name: user.name, email: user.email },
          token,
        });
      } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Failed to sign in" });
      }
    }

    return res.status(400).json({ error: 'Invalid action. Use "signup" or "login".' });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}
