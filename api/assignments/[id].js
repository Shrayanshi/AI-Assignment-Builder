import { getAsync, runAsync, allAsync } from "../../backend/server.js";

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  if (method === "GET") {
    // GET /api/assignments/[id]
    try {
      const assignment = await getAsync(
        `SELECT * FROM assignments WHERE id = ?`,
        [id],
      );
      if (!assignment)
        return res.status(404).json({ error: "Assignment not found" });
      const questions = await allAsync(
        `
        SELECT q.*, aq.position
        FROM assignment_questions aq
        JOIN questions q ON q.id = aq.question_id
        WHERE aq.assignment_id = ?
        ORDER BY aq.position ASC
      `,
        [id],
      );
      const normalized = questions.map((r) => {
        if (r.options_json) r.options = JSON.parse(r.options_json);
        if (r.correct_index != null) r.correctIndex = r.correct_index;
        if (r.subject == null && r.rubric != null) r.subject = r.rubric;
        delete r.options_json;
        delete r.correct_index;
        delete r.rubric;
        return r;
      });
      return res.status(200).json({ ...assignment, questions: normalized });
    } catch (err) {
      console.error("Error fetching assignment:", err);
      return res.status(500).json({ error: "Failed to fetch assignment" });
    }
  }

  if (method === "PUT") {
    // PUT /api/assignments/[id]
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

  if (method === "DELETE") {
    // DELETE /api/assignments/[id]
    try {
      await runAsync(`DELETE FROM assignments WHERE id = ?`, [id]);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error deleting assignment:", err);
      return res.status(500).json({ error: "Failed to delete assignment" });
    }
  }

  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}

