import { runAsync } from "../../../backend/server.js";

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  if (method === "PUT") {
    // PUT /api/assignments/[id]/reorder
    try {
      const { order } = req.body || {};
      if (!Array.isArray(order)) {
        return res.status(400).json({
          error: "order must be an array of questionIds",
        });
      }
      const assignmentId = id;
      await runAsync(`BEGIN TRANSACTION`);
      for (let i = 0; i < order.length; i++) {
        await runAsync(
          `UPDATE assignment_questions SET position = ? WHERE assignment_id = ? AND question_id = ?`,
          [i, assignmentId, order[i]],
        );
      }
      await runAsync(`COMMIT`);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error reordering assignment questions:", err);
      await runAsync(`ROLLBACK`).catch(() => {});
      return res
        .status(500)
        .json({ error: "Failed to reorder assignment questions" });
    }
  }

  res.setHeader("Allow", ["PUT"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}

