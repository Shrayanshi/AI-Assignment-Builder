import { allAsync, runAsync, getAsync } from "../backend/server.js";

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
  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("id");

  // GET /api/papers or /api/papers?id=123
  if (req.method === "GET") {
    if (id) {
      try {
        const paper = await getAsync(
          `SELECT * FROM question_papers WHERE id = ?`,
          [id],
        );
        if (!paper) return res.status(404).json({ error: "Paper not found" });
        const questions = await allAsync(
          `SELECT q.*, pq.position
           FROM question_paper_questions pq
           JOIN questions q ON q.id = pq.question_id
           WHERE pq.paper_id = ?
           ORDER BY pq.position ASC`,
          [id],
        );
        const normalized = questions.map(normalizeQuestion);
        return res.status(200).json({ ...paper, questions: normalized });
      } catch (err) {
        console.error("Error fetching paper:", err);
        return res.status(500).json({ error: "Failed to fetch paper" });
      }
    }

    try {
      const rows = await allAsync(
        `SELECT qp.*, 
                COUNT(DISTINCT pq.question_id) as question_count
         FROM question_papers qp
         LEFT JOIN question_paper_questions pq ON pq.paper_id = qp.id
         GROUP BY qp.id
         ORDER BY qp.id DESC`,
      );
      return res.status(200).json(rows);
    } catch (err) {
      console.error("Error fetching papers:", err);
      return res.status(500).json({ error: "Failed to fetch papers" });
    }
  }

  // POST /api/papers
  if (req.method === "POST") {
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
        `INSERT INTO question_papers
         (title, school_name, school_address, grade, subject, exam_type, duration, total_marks, academic_year, exam_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  // PUT /api/papers?id=123
  if (req.method === "PUT" && id) {
    try {
      const existing = await getAsync(
        `SELECT * FROM question_papers WHERE id = ?`,
        [id],
      );
      if (!existing)
        return res.status(404).json({ error: "Paper not found" });

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
      const now = new Date().toISOString();
      await runAsync(
        `UPDATE question_papers
         SET title = ?, school_name = ?, school_address = ?, grade = ?, subject = ?, exam_type = ?,
             duration = ?, total_marks = ?, academic_year = ?, exam_date = ?, updated_at = ?
         WHERE id = ?`,
        [
          title || existing.title,
          schoolName ?? existing.school_name,
          schoolAddress ?? existing.school_address,
          grade ?? existing.grade,
          subject ?? existing.subject,
          examType ?? existing.exam_type,
          duration ?? existing.duration,
          totalMarks != null ? Number(totalMarks) : existing.total_marks,
          academicYear ?? existing.academic_year,
          examDate ?? existing.exam_date,
          now,
          id,
        ],
      );
      const updated = await getAsync(
        `SELECT * FROM question_papers WHERE id = ?`,
        [id],
      );
      return res.status(200).json(updated);
    } catch (err) {
      console.error("Error updating paper:", err);
      return res.status(500).json({ error: "Failed to update paper" });
    }
  }

  // DELETE /api/papers?id=123
  if (req.method === "DELETE" && id) {
    try {
      await runAsync(`DELETE FROM question_papers WHERE id = ?`, [id]);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error deleting paper:", err);
      return res.status(500).json({ error: "Failed to delete paper" });
    }
  }

  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}

