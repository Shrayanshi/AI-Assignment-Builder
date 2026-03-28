import { allAsync, runAsync, getAsync } from "../lib/db.js";
import { ensureSchema } from "../lib/schema.js";
import { requireAuth } from "../lib/authMiddleware.js";

ensureSchema().catch(console.error);

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
  const teacherId = await requireAuth(req, res);
  if (teacherId === null) return;

  await ensureSchema();

  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("id");

  // GET /api/papers  or  /api/papers?id=123
  if (req.method === "GET") {
    if (id) {
      try {
        const paper = await getAsync(
          `SELECT * FROM question_papers WHERE id = $1 AND teacher_id = $2`,
          [id, teacherId]
        );
        if (!paper) return res.status(404).json({ error: "Paper not found" });

        const questions = await allAsync(
          `SELECT q.*, pq.position
           FROM question_paper_questions pq
           JOIN questions q ON q.id = pq.question_id
           WHERE pq.paper_id = $1
           ORDER BY pq.position ASC`,
          [id]
        );
        return res.status(200).json({ ...paper, questions: questions.map(normalizeQuestion) });
      } catch (err) {
        console.error("Error fetching paper:", err);
        return res.status(500).json({ error: "Failed to fetch paper" });
      }
    }

    try {
      const rows = await allAsync(
        `SELECT
            qp.id, qp.title, qp.school_name, qp.school_address, qp.grade, qp.subject,
            qp.exam_type, qp.duration, qp.academic_year, qp.exam_date,
            qp.created_at, qp.updated_at,
            COUNT(DISTINCT pq.question_id)  AS question_count,
            COALESCE(SUM(q.marks), 0)       AS total_marks
         FROM question_papers qp
         LEFT JOIN question_paper_questions pq ON pq.paper_id = qp.id
         LEFT JOIN questions q                 ON q.id = pq.question_id
         WHERE qp.teacher_id = $1
         GROUP BY qp.id
         ORDER BY qp.id DESC`,
        [teacherId]
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
      const { title, schoolName, schoolAddress, grade, subject, examType, duration, totalMarks, academicYear, examDate } = req.body || {};
      if (!title) return res.status(400).json({ error: "title is required" });

      const now = new Date().toISOString();
      const { rows } = await runAsync(
        `INSERT INTO question_papers
           (title, school_name, school_address, grade, subject, exam_type, duration, total_marks,
            academic_year, exam_date, teacher_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [title, schoolName || null, schoolAddress || null, grade || null, subject || null,
         examType || null, duration || null, totalMarks != null ? Number(totalMarks) : null,
         academicYear || null, examDate || null, teacherId, now, now]
      );
      return res.status(201).json(rows[0]);
    } catch (err) {
      console.error("Error creating paper:", err);
      return res.status(500).json({ error: "Failed to create paper" });
    }
  }

  // PUT /api/papers?id=123
  if (req.method === "PUT" && id) {
    try {
      const existing = await getAsync(
        `SELECT * FROM question_papers WHERE id = $1 AND teacher_id = $2`,
        [id, teacherId]
      );
      if (!existing) return res.status(404).json({ error: "Paper not found" });

      const { title, schoolName, schoolAddress, grade, subject, examType, duration, totalMarks, academicYear, examDate } = req.body || {};
      const now = new Date().toISOString();
      const { rows } = await runAsync(
        `UPDATE question_papers
         SET title=$1, school_name=$2, school_address=$3, grade=$4, subject=$5,
             exam_type=$6, duration=$7, total_marks=$8, academic_year=$9, exam_date=$10, updated_at=$11
         WHERE id=$12
         RETURNING *`,
        [title || existing.title,
         schoolName    ?? existing.school_name,
         schoolAddress ?? existing.school_address,
         grade         ?? existing.grade,
         subject       ?? existing.subject,
         examType      ?? existing.exam_type,
         duration      ?? existing.duration,
         totalMarks != null ? Number(totalMarks) : existing.total_marks,
         academicYear  ?? existing.academic_year,
         examDate      ?? existing.exam_date,
         now, id]
      );
      return res.status(200).json(rows[0]);
    } catch (err) {
      console.error("Error updating paper:", err);
      return res.status(500).json({ error: "Failed to update paper" });
    }
  }

  // DELETE /api/papers?id=123
  if (req.method === "DELETE" && id) {
    try {
      const existing = await getAsync(
        `SELECT id FROM question_papers WHERE id = $1 AND teacher_id = $2`,
        [id, teacherId]
      );
      if (!existing) return res.status(404).json({ error: "Paper not found" });
      await runAsync(`DELETE FROM question_papers WHERE id = $1`, [id]);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error deleting paper:", err);
      return res.status(500).json({ error: "Failed to delete paper" });
    }
  }

  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}
