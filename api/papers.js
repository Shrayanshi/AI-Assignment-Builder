import { allAsync, runAsync, getAsync } from "../backend/server.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // GET /api/papers
    try {
      const rows = await allAsync(
        `SELECT * FROM question_papers ORDER BY id DESC`,
      );
      return res.status(200).json(rows);
    } catch (err) {
      console.error("Error fetching papers:", err);
      return res.status(500).json({ error: "Failed to fetch papers" });
    }
  }

  if (req.method === "POST") {
    // POST /api/papers
    try {
      const {
        title,
        schoolName,
        schoolAddress,
        grade,
        subject,
        examType,
        duration,
        totalMarks,
        academicYear,
        examDate,
      } = req.body || {};
      if (!title) {
        return res.status(400).json({ error: "title is required" });
      }
      const now = new Date().toISOString();
      const result = await runAsync(
        `
        INSERT INTO question_papers
        (title, school_name, school_address, grade, subject, exam_type, duration, total_marks, academic_year, exam_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          title,
          schoolName || null,
          schoolAddress || null,
          grade || null,
          subject || null,
          examType || null,
          duration || null,
          totalMarks != null ? Number(totalMarks) : null,
          academicYear || null,
          examDate || null,
          now,
          now,
        ],
      );
      const row = await getAsync(
        `SELECT * FROM question_papers WHERE id = ?`,
        [result.lastID],
      );
      return res.status(201).json(row);
    } catch (err) {
      console.error("Error creating paper:", err);
      return res.status(500).json({ error: "Failed to create paper" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}

