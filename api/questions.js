import { allAsync, runAsync, getAsync } from "../backend/server.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // GET /api/questions
    try {
      const rows = await allAsync(`SELECT * FROM questions ORDER BY id DESC`);
      const data = rows.map((r) => {
        if (r.options_json) r.options = JSON.parse(r.options_json);
        if (r.correct_index != null) r.correctIndex = r.correct_index;
        if (r.subject == null && r.rubric != null) r.subject = r.rubric;
        delete r.options_json;
        delete r.correct_index;
        delete r.rubric;
        return r;
      });
      return res.status(200).json(data);
    } catch (err) {
      console.error("Error fetching questions:", err);
      return res.status(500).json({ error: "Failed to fetch questions" });
    }
  }

  if (req.method === "POST") {
    // POST /api/questions
    try {
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
      if (!type || !text) {
        return res.status(400).json({ error: "type and text are required" });
      }
      const now = new Date().toISOString();
      const optionsJson =
        Array.isArray(options) && options.length
          ? JSON.stringify(options)
          : null;
      const correctIdx =
        typeof correctIndex === "number" &&
        Number.isInteger(correctIndex) &&
        correctIndex >= 0
          ? correctIndex
          : null;

      const result = await runAsync(
        `
        INSERT INTO questions (type, marks, difficulty, topic, subject, text, options_json, correct_index, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          type,
          Number(marks) || 1,
          difficulty != null ? Number(difficulty) : null,
          topic || null,
          subject || null,
          text,
          optionsJson,
          correctIdx,
          now,
          now,
        ],
      );

      const row = await getAsync(`SELECT * FROM questions WHERE id = ?`, [
        result.lastID,
      ]);
      if (row?.options_json) row.options = JSON.parse(row.options_json);
      if (row?.correct_index != null) row.correctIndex = row.correct_index;
      if (row?.subject == null && row?.rubric != null)
        row.subject = row.rubric;
      delete row?.options_json;
      delete row?.correct_index;
      delete row?.rubric;
      return res.status(201).json(row);
    } catch (err) {
      console.error("Error creating question:", err);
      return res.status(500).json({ error: "Failed to create question" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}

