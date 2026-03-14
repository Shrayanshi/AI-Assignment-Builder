import { allAsync, runAsync } from "../../../backend/server.js";

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  if (method === "POST") {
    // POST /api/assignments/[id]/questions
    try {
      const { questionId } = req.body || {};
      if (!questionId) {
        return res.status(400).json({ error: "questionId is required" });
      }
      const assignmentId = id;
      const existing = await allAsync(
        `SELECT position FROM assignment_questions WHERE assignment_id = ? ORDER BY position DESC LIMIT 1`,
        [assignmentId],
      );
      const nextPos = existing[0] ? existing[0].position + 1 : 0;
      await runAsync(
        `INSERT OR REPLACE INTO assignment_questions (assignment_id, question_id, position) VALUES (?, ?, ?)`,
        [assignmentId, questionId, nextPos],
      );
      return res.status(201).json({ ok: true });
    } catch (err) {
      console.error("Error adding assignment question:", err);
      return res
        .status(500)
        .json({ error: "Failed to add question to assignment" });
    }
  }

  res.setHeader("Allow", ["POST"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}

