import { allAsync, runAsync, getAsync } from "../backend/server.js";

function normalizeQuestion(r) {
  if (r.options_json) r.options = JSON.parse(r.options_json);
  if (r.correct_index != null) r.correctIndex = r.correct_index;
  if (r.subject == null && r.rubric != null) r.subject = r.rubric;
  delete r.options_json;
  delete r.correct_index;
  delete r.rubric;
  return r;
}

export default async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("id");
  const mode = url.searchParams.get("mode"); // optional, for future use

  // GET /api/assignments or /api/assignments?id=123
  if (req.method === "GET") {
    // Single assignment with questions
    if (id) {
      try {
        const assignment = await getAsync(
          `SELECT * FROM assignments WHERE id = ?`,
          [id],
        );
        if (!assignment)
          return res.status(404).json({ error: "Assignment not found" });
        const questions = await allAsync(
          `SELECT q.*, aq.position
           FROM assignment_questions aq
           JOIN questions q ON q.id = aq.question_id
           WHERE aq.assignment_id = ?
           ORDER BY aq.position ASC`,
          [id],
        );
        const normalized = questions.map(normalizeQuestion);
        return res.status(200).json({ ...assignment, questions: normalized });
      } catch (err) {
        console.error("Error fetching assignment:", err);
        return res.status(500).json({ error: "Failed to fetch assignment" });
      }
    }

    // List assignments with question count
    try {
      const rows = await allAsync(
        `SELECT a.*, 
                COUNT(DISTINCT aq.question_id) as question_count
         FROM assignments a
         LEFT JOIN assignment_questions aq ON aq.assignment_id = a.id
         GROUP BY a.id
         ORDER BY a.id DESC`,
      );
      return res.status(200).json(rows);
    } catch (err) {
      console.error("Error fetching assignments:", err);
      return res.status(500).json({ error: "Failed to fetch assignments" });
    }
  }

  // POST /api/assignments  (create only)
  if (req.method === "POST") {
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
      const row = await getAsync(
        `SELECT * FROM assignments WHERE id = ?`,
        [result.lastID],
      );
      return res.status(201).json(row);
    } catch (err) {
      console.error("Error creating assignment:", err);
      return res.status(500).json({ error: "Failed to create assignment" });
    }
  }

  // PUT /api/assignments?id=123
  if (req.method === "PUT" && id) {
    try {
      const existing = await getAsync(
        `SELECT * FROM assignments WHERE id = ?`,
        [id],
      );
      if (!existing)
        return res.status(404).json({ error: "Assignment not found" });
      const { name, subject } = req.body || {};
      const now = new Date().toISOString();
      await runAsync(
        `UPDATE assignments SET name = ?, subject = ?, updated_at = ? WHERE id = ?`,
        [name || existing.name, subject || existing.subject, now, id],
      );
      const updated = await getAsync(
        `SELECT * FROM assignments WHERE id = ?`,
        [id],
      );
      return res.status(200).json(updated);
    } catch (err) {
      console.error("Error updating assignment:", err);
      return res.status(500).json({ error: "Failed to update assignment" });
    }
  }

  // DELETE /api/assignments?id=123
  if (req.method === "DELETE" && id) {
    try {
      await runAsync(`DELETE FROM assignments WHERE id = ?`, [id]);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error deleting assignment:", err);
      return res.status(500).json({ error: "Failed to delete assignment" });
    }
  }

  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}

