import { runAsync } from "../../../../../backend/server.js";

export default async function handler(req, res) {
  const {
    query: { id, questionId },
    method,
  } = req;

  if (method === "DELETE") {
    // DELETE /api/papers/[id]/questions/[questionId]
    try {
      await runAsync(
        `DELETE FROM question_paper_questions WHERE paper_id = ? AND question_id = ?`,
        [id, questionId],
      );
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error removing paper question:", err);
      return res
        .status(500)
        .json({ error: "Failed to remove question from paper" });
    }
  }

  res.setHeader("Allow", ["DELETE"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}

