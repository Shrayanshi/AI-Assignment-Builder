import { allAsync, runAsync, getAsync } from "../lib/db.js";
import { ensureSchema } from "../lib/schema.js";
import { requireAuth } from "../lib/authMiddleware.js";

ensureSchema().catch(console.error);

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
  const teacherId = await requireAuth(req, res);
  if (teacherId === null) return;

  await ensureSchema();

  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("id");

  // GET /api/assignments  or  /api/assignments?id=123
  if (req.method === "GET") {
    if (id) {
      try {
        const assignment = await getAsync(
          `SELECT * FROM assignments WHERE id = $1 AND teacher_id = $2`,
          [id, teacherId]
        );
        if (!assignment) return res.status(404).json({ error: "Assignment not found" });

        const questions = await allAsync(
          `SELECT q.*, aq.position
           FROM assignment_questions aq
           JOIN questions q ON q.id = aq.question_id
           WHERE aq.assignment_id = $1
           ORDER BY aq.position ASC`,
          [id]
        );
        return res.status(200).json({ ...assignment, questions: questions.map(normalizeQuestion) });
      } catch (err) {
        console.error("Error fetching assignment:", err);
        return res.status(500).json({ error: "Failed to fetch assignment" });
      }
    }

    // List with counts (scoped to this teacher)
    try {
      const rows = await allAsync(
        `SELECT
            a.id, a.name, a.subject, a.grade, a.created_at, a.updated_at,
            COUNT(DISTINCT aq.question_id)      AS question_count,
            COALESCE(SUM(q.marks), 0)           AS total_marks
         FROM assignments a
         LEFT JOIN assignment_questions aq ON aq.assignment_id = a.id
         LEFT JOIN questions q             ON q.id = aq.question_id
         WHERE a.teacher_id = $1
         GROUP BY a.id
         ORDER BY a.id DESC`,
        [teacherId]
      );
      return res.status(200).json(rows);
    } catch (err) {
      console.error("Error fetching assignments:", err);
      return res.status(500).json({ error: "Failed to fetch assignments" });
    }
  }

  // POST /api/assignments
  if (req.method === "POST") {
    try {
      const { name, subject, grade } = req.body || {};
      if (!name) return res.status(400).json({ error: "name is required" });

      const now = new Date().toISOString();
      const { rows } = await runAsync(
        `INSERT INTO assignments (name, subject, grade, teacher_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, subject || null, grade || null, teacherId, now, now]
      );
      return res.status(201).json(rows[0]);
    } catch (err) {
      console.error("Error creating assignment:", err);
      return res.status(500).json({ error: "Failed to create assignment" });
    }
  }

  // PUT /api/assignments?id=123
  if (req.method === "PUT" && id) {
    try {
      const existing = await getAsync(
        `SELECT * FROM assignments WHERE id = $1 AND teacher_id = $2`,
        [id, teacherId]
      );
      if (!existing) return res.status(404).json({ error: "Assignment not found" });

      const { name, subject, grade } = req.body || {};
      const now = new Date().toISOString();
      const { rows } = await runAsync(
        `UPDATE assignments
         SET name=$1, subject=$2, grade=$3, updated_at=$4
         WHERE id=$5
         RETURNING *`,
        [name || existing.name,
         subject !== undefined ? subject : existing.subject,
         grade   !== undefined ? grade   : existing.grade,
         now, id]
      );
      return res.status(200).json(rows[0]);
    } catch (err) {
      console.error("Error updating assignment:", err);
      return res.status(500).json({ error: "Failed to update assignment" });
    }
  }

  // DELETE /api/assignments?id=123
  if (req.method === "DELETE" && id) {
    try {
      const existing = await getAsync(
        `SELECT id FROM assignments WHERE id = $1 AND teacher_id = $2`,
        [id, teacherId]
      );
      if (!existing) return res.status(404).json({ error: "Assignment not found" });
      await runAsync(`DELETE FROM assignments WHERE id = $1`, [id]);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error deleting assignment:", err);
      return res.status(500).json({ error: "Failed to delete assignment" });
    }
  }

  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}
