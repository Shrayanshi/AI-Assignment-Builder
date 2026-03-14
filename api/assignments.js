import { allAsync, runAsync, getAsync } from "../backend/server.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // GET /api/assignments
    try {
      const rows = await allAsync(
        `SELECT * FROM assignments ORDER BY id DESC`,
      );
      return res.status(200).json(rows);
    } catch (err) {
      console.error("Error fetching assignments:", err);
      return res.status(500).json({ error: "Failed to fetch assignments" });
    }
  }

  if (req.method === "POST") {
    // POST /api/assignments
    try {
      const { name, subject } = req.body || {};
      if (!name) {
        return res.status(400).json({ error: "name is required" });
      }
      const now = new Date().toISOString();
      const result = await runAsync(
        `INSERT INTO assignments (name, subject, created_at, updated_at) VALUES (?, ?, ?, ?)`,
        [name, subject || null, now, now],
      );
      const row = await getAsync(`SELECT * FROM assignments WHERE id = ?`, [
        result.lastID,
      ]);
      return res.status(201).json(row);
    } catch (err) {
      console.error("Error creating assignment:", err);
      return res.status(500).json({ error: "Failed to create assignment" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}

