import { getAsync, runAsync } from "../../backend/server.js";

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  if (method === "GET") {
    // GET /api/questions/[id]
    try {
      const row = await getAsync(`SELECT * FROM questions WHERE id = ?`, [id]);
      if (!row) return res.status(404).json({ error: "Question not found" });
      if (row.options_json) row.options = JSON.parse(row.options_json);
      if (row.correct_index != null) row.correctIndex = row.correct_index;
      if (row.subject == null && row.rubric != null) row.subject = row.rubric;
      delete row.options_json;
      delete row.correct_index;
      delete row.rubric;
      return res.status(200).json(row);
    } catch (err) {
      console.error("Error fetching question:", err);
      return res.status(500).json({ error: "Failed to fetch question" });
    }
  }

  if (method === "PUT") {
    // PUT /api/questions/[id]
    try {
      const existing = await getAsync(
        `SELECT * FROM questions WHERE id = ?`,
        [id],
      );
      if (!existing)
        return res.status(404).json({ error: "Question not found" });

      const {
        type,
        marks,
        difficulty,
        topic,
        subject,
        text,
        options,
        correctIndex,
      } = req.body || {};
      const now = new Date().toISOString();
      const optionsJson =
        options === undefined
          ? existing.options_json
          : Array.isArray(options) && options.length
            ? JSON.stringify(options)
            : null;
      const correctIdx =
        correctIndex === undefined
          ? existing.correct_index != null
            ? existing.correct_index
            : null
          : typeof correctIndex === "number" &&
              Number.isInteger(correctIndex) &&
              correctIndex >= 0
            ? correctIndex
            : null;
      const subjectVal =
        subject !== undefined
          ? subject
          : existing.subject ?? existing.rubric ?? null;

      await runAsync(
        `
        UPDATE questions
        SET type = ?, marks = ?, difficulty = ?, topic = ?, subject = ?, text = ?, options_json = ?, correct_index = ?, updated_at = ?
        WHERE id = ?
      `,
        [
          type || existing.type,
          marks != null ? Number(marks) : existing.marks,
          difficulty != null ? Number(difficulty) : existing.difficulty,
          topic !== undefined ? topic : existing.topic,
          subjectVal,
          text || existing.text,
          optionsJson,
          correctIdx,
          now,
          id,
        ],
      );

      const row = await getAsync(`SELECT * FROM questions WHERE id = ?`, [id]);
      if (row.options_json) row.options = JSON.parse(row.options_json);
      if (row.correct_index != null) row.correctIndex = row.correct_index;
      if (row.subject == null && row.rubric != null) row.subject = row.rubric;
      delete row.options_json;
      delete row.correct_index;
      delete row.rubric;
      return res.status(200).json(row);
    } catch (err) {
      console.error("Error updating question:", err);
      return res.status(500).json({ error: "Failed to update question" });
    }
  }

  if (method === "DELETE") {
    // DELETE /api/questions/[id]
    try {
      await runAsync(`DELETE FROM questions WHERE id = ?`, [id]);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error deleting question:", err);
      return res.status(500).json({ error: "Failed to delete question" });
    }
  }

  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}

