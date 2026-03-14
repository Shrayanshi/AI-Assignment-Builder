import { allAsync, runAsync } from "../../../backend/server.js";

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  if (method === "POST") {
    // POST /api/papers/[id]/questions
    try {
      const { questionId } = req.body || {};
      if (!questionId) {
        return res.status(400).json({ error: "questionId is required" });
      }
      const paperId = id;
      const existing = await allAsync(
        `SELECT position FROM question_paper_questions WHERE paper_id = ? ORDER BY position DESC LIMIT 1`,
        [paperId],
      );
      const nextPos = existing[0] ? existing[0].position + 1 : 0;
      await runAsync(
        `INSERT OR REPLACE INTO question_paper_questions (paper_id, question_id, position) VALUES (?, ?, ?)`,
        [paperId, questionId, nextPos],
      );
      return res.status(201).json({ ok: true });
    } catch (err) {
      console.error("Error adding paper question:", err);
      return res
        .status(500)
        .json({ error: "Failed to add question to paper" });
    }
  }

  res.setHeader("Allow", ["POST"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}

