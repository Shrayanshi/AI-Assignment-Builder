import { generateQuestionsWithGemini } from "../backend/server.js";
import { pool } from "../lib/db.js";

function normalizeRow(row) {
  if (row?.options_json) row.options = JSON.parse(row.options_json);
  if (row?.correct_index != null) row.correctIndex = row.correct_index;
  delete row?.options_json;
  delete row?.correct_index;
  return row;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { grade, subject, topic, difficulty, type, count } = req.body ?? {};

    const params = {
      grade: Math.max(1, Math.min(12, Number(grade) || 10)),
      subject: subject || "Mathematics",
      topic: topic || "General",
      difficulty: Math.max(1, Math.min(5, Number(difficulty) || 3)),
      type: type === "FRQ" ? "FRQ" : "MCQ",
      count: Math.max(1, Math.min(10, Number(count) || 3)),
    };

    const generated = await generateQuestionsWithGemini(params);
    if (!Array.isArray(generated) || generated.length === 0) {
      return res.status(200).json([]);
    }

    const now = new Date().toISOString();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const saved = [];
      for (const q of generated) {
        const qType = q?.type === "FRQ" ? "FRQ" : "MCQ";
        const text = (q?.text ?? "").toString();
        if (!text.trim()) continue;

        const marks = Number(q?.marks);
        const difficultyNum = q?.difficulty != null ? Number(q.difficulty) : null;
        const optionsJson =
          qType === "MCQ" && Array.isArray(q?.options) && q.options.length
            ? JSON.stringify(q.options)
            : null;
        const correctIndex =
          qType === "MCQ" && Number.isInteger(Number(q?.correctIndex))
            ? Number(q.correctIndex)
            : null;

        const { rows } = await client.query(
          `INSERT INTO questions
             (type, marks, difficulty, topic, subject, text, options_json, correct_index, created_at, updated_at)
           VALUES
             ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           RETURNING *`,
          [
            qType,
            Number.isFinite(marks) ? marks : 4,
            Number.isFinite(difficultyNum) ? difficultyNum : null,
            q?.topic ? String(q.topic) : null,
            q?.subject ? String(q.subject) : params.subject,
            text,
            optionsJson,
            correctIndex,
            now,
            now,
          ]
        );
        saved.push(normalizeRow(rows[0]));
      }

      await client.query("COMMIT");
      return res.status(200).json(saved);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error in /api/generate-questions:", err);
    return res
      .status(500)
      .json({ error: "Failed to generate questions", details: err.message });
  }
}

