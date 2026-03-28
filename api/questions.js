import { allAsync, runAsync, getAsync, query } from "../lib/db.js";
import { ensureSchema } from "../lib/schema.js";
import { requireAuth } from "../lib/authMiddleware.js";

ensureSchema().catch(console.error);

function normalizeRow(row) {
  if (row?.options_json) row.options = JSON.parse(row.options_json);
  if (row?.correct_index != null) row.correctIndex = row.correct_index;
  if (row?.subject == null && row?.rubric != null) row.subject = row.rubric;
  delete row?.options_json;
  delete row?.correct_index;
  delete row?.rubric;
  return row;
}

async function updateAssignmentTotalMarks(assignmentId) {
  const result = await getAsync(
    `SELECT COALESCE(SUM(q.marks), 0) AS total
     FROM assignment_questions aq
     JOIN questions q ON q.id = aq.question_id
     WHERE aq.assignment_id = $1`,
    [assignmentId]
  );
  await runAsync(`UPDATE assignments SET total_marks = $1 WHERE id = $2`, [result.total, assignmentId]);
}

async function updatePaperTotalMarks(paperId) {
  const result = await getAsync(
    `SELECT COALESCE(SUM(q.marks), 0) AS total
     FROM question_paper_questions pq
     JOIN questions q ON q.id = pq.question_id
     WHERE pq.paper_id = $1`,
    [paperId]
  );
  await runAsync(`UPDATE question_papers SET total_marks = $1 WHERE id = $2`, [result.total, paperId]);
}

export default async function handler(req, res) {
  const teacherId = await requireAuth(req, res);
  if (teacherId === null) return;

  await ensureSchema();

  const url = new URL(req.url, "http://localhost");
  const id           = url.searchParams.get("id");
  const assignmentId = url.searchParams.get("assignmentId");
  const paperId      = url.searchParams.get("paperId");
  const questionId   = url.searchParams.get("questionId");
  const reorder      = url.searchParams.get("reorder");
  const filterSubject = url.searchParams.get("subject");
  const filterGrade   = url.searchParams.get("grade");

  // ── GET ────────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    if (id) {
      try {
        const row = await getAsync(`SELECT * FROM questions WHERE id = $1`, [id]);
        if (!row) return res.status(404).json({ error: "Question not found" });
        return res.status(200).json(normalizeRow(row));
      } catch (err) {
        console.error("Error fetching question:", err);
        return res.status(500).json({ error: "Failed to fetch question" });
      }
    }

    if (assignmentId) {
      try {
        const rows = await allAsync(
          `SELECT q.*, aq.position
           FROM assignment_questions aq
           JOIN questions q ON q.id = aq.question_id
           WHERE aq.assignment_id = $1
           ORDER BY aq.position ASC`,
          [assignmentId]
        );
        return res.status(200).json(rows.map(normalizeRow));
      } catch (err) {
        console.error("Error fetching assignment questions:", err);
        return res.status(500).json({ error: "Failed to fetch assignment questions" });
      }
    }

    if (paperId) {
      try {
        const rows = await allAsync(
          `SELECT q.*, pq.position
           FROM question_paper_questions pq
           JOIN questions q ON q.id = pq.question_id
           WHERE pq.paper_id = $1
           ORDER BY pq.position ASC`,
          [paperId]
        );
        return res.status(200).json(rows.map(normalizeRow));
      } catch (err) {
        console.error("Error fetching paper questions:", err);
        return res.status(500).json({ error: "Failed to fetch questions" });
      }
    }

    // All questions (optionally filtered by subject/grade)
    try {
      const conditions = [];
      const params = [];
      if (filterSubject) { conditions.push(`subject = $${params.length + 1}`); params.push(filterSubject); }
      if (filterGrade)   { conditions.push(`grade = $${params.length + 1}`);   params.push(filterGrade); }
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      const rows = await allAsync(`SELECT * FROM questions ${where} ORDER BY id DESC`, params);
      return res.status(200).json(rows.map(normalizeRow));
    } catch (err) {
      console.error("Error fetching questions:", err);
      return res.status(500).json({ error: "Failed to fetch questions" });
    }
  }

  // ── POST ───────────────────────────────────────────────────────────────────
  if (req.method === "POST") {
    // Attach existing question to assignment/paper
    if (assignmentId || paperId) {
      try {
        const { questionId: bodyQId } = req.body || {};
        if (!bodyQId) return res.status(400).json({ error: "questionId is required" });

        const exists = await getAsync(`SELECT id FROM questions WHERE id = $1`, [bodyQId]);
        if (!exists) return res.status(400).json({ error: "Question does not exist. Save it first." });

        if (assignmentId) {
          const last = await getAsync(
            `SELECT COALESCE(MAX(position), -1) AS pos FROM assignment_questions WHERE assignment_id = $1`,
            [assignmentId]
          );
          await runAsync(
            `INSERT INTO assignment_questions (assignment_id, question_id, position)
             VALUES ($1, $2, $3)
             ON CONFLICT (assignment_id, question_id) DO UPDATE SET position = EXCLUDED.position`,
            [assignmentId, bodyQId, last.pos + 1]
          );
          await updateAssignmentTotalMarks(assignmentId);
        } else {
          const last = await getAsync(
            `SELECT COALESCE(MAX(position), -1) AS pos FROM question_paper_questions WHERE paper_id = $1`,
            [paperId]
          );
          await runAsync(
            `INSERT INTO question_paper_questions (paper_id, question_id, position)
             VALUES ($1, $2, $3)
             ON CONFLICT (paper_id, question_id) DO UPDATE SET position = EXCLUDED.position`,
            [paperId, bodyQId, last.pos + 1]
          );
          await updatePaperTotalMarks(paperId);
        }
        return res.status(201).json({ ok: true });
      } catch (err) {
        console.error("Error attaching question:", err);
        return res.status(500).json({ error: "Failed to attach question to assignment/paper" });
      }
    }

    // Create new question
    try {
      const { type, marks, difficulty, topic, subject, grade, text, options, correctIndex } = req.body || {};
      if (!type || !text) return res.status(400).json({ error: "type and text are required" });

      const now = new Date().toISOString();
      const optionsJson = type === "MCQ" && Array.isArray(options) && options.length ? JSON.stringify(options) : null;
      const correctIdx  = type === "MCQ" && typeof correctIndex === "number" && Number.isInteger(correctIndex) && correctIndex >= 0 ? correctIndex : null;

      const result = await runAsync(
        `INSERT INTO questions
           (type, marks, difficulty, topic, subject, grade, text, options_json, correct_index, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [type, marks != null ? Number(marks) : 1, difficulty != null ? Number(difficulty) : null,
         topic || null, subject || null, grade || null, text, optionsJson, correctIdx, now, now]
      );
      return res.status(201).json(normalizeRow(result.rows[0]));
    } catch (err) {
      console.error("Error creating question:", err);
      return res.status(500).json({ error: "Failed to create question" });
    }
  }

  // ── PUT (update question) ──────────────────────────────────────────────────
  if (req.method === "PUT" && id && !reorder) {
    try {
      const existing = await getAsync(`SELECT * FROM questions WHERE id = $1`, [id]);
      if (!existing) return res.status(404).json({ error: "Question not found" });

      const { type, marks, difficulty, topic, subject, grade, text, options, correctIndex } = req.body || {};
      const now = new Date().toISOString();
      const optionsJson = options === undefined
        ? existing.options_json
        : Array.isArray(options) && options.length ? JSON.stringify(options) : null;
      const correctIdx = correctIndex === undefined
        ? (existing.correct_index != null ? existing.correct_index : null)
        : typeof correctIndex === "number" && Number.isInteger(correctIndex) && correctIndex >= 0 ? correctIndex : null;

      await runAsync(
        `UPDATE questions
         SET type=$1, marks=$2, difficulty=$3, topic=$4, subject=$5, grade=$6, text=$7,
             options_json=$8, correct_index=$9, updated_at=$10
         WHERE id=$11`,
        [type || existing.type, marks != null ? Number(marks) : existing.marks,
         difficulty != null ? Number(difficulty) : existing.difficulty,
         topic !== undefined ? topic : existing.topic,
         subject !== undefined ? subject : existing.subject ?? existing.rubric ?? null,
         grade   !== undefined ? grade   : existing.grade ?? null,
         text || existing.text, optionsJson, correctIdx, now, id]
      );

      // Propagate mark changes to totals in parallel
      if (marks != null && Number(marks) !== existing.marks) {
        const [asgns, papers] = await Promise.all([
          allAsync(`SELECT DISTINCT assignment_id FROM assignment_questions      WHERE question_id = $1`, [id]),
          allAsync(`SELECT DISTINCT paper_id        FROM question_paper_questions WHERE question_id = $1`, [id]),
        ]);
        await Promise.all([
          ...asgns.map(r  => updateAssignmentTotalMarks(r.assignment_id)),
          ...papers.map(r => updatePaperTotalMarks(r.paper_id)),
        ]);
      }

      const row = await getAsync(`SELECT * FROM questions WHERE id = $1`, [id]);
      return res.status(200).json(normalizeRow(row));
    } catch (err) {
      console.error("Error updating question:", err);
      return res.status(500).json({ error: "Failed to update question" });
    }
  }

  // ── PUT (reorder) – single UNNEST batch instead of N sequential updates ────
  if (req.method === "PUT" && reorder && (assignmentId || paperId)) {
    try {
      const { order } = req.body || {};
      if (!Array.isArray(order) || !order.length) {
        return res.status(400).json({ error: "order array is required for reordering" });
      }

      const table = assignmentId ? "assignment_questions"    : "question_paper_questions";
      const col   = assignmentId ? "assignment_id"           : "paper_id";
      const owner = assignmentId || paperId;
      const positions = order.map((_, i) => i);
      const qids      = order.map(q => Number(q));

      await query(
        `UPDATE ${table} AS t
         SET position = v.pos
         FROM UNNEST($1::int[], $2::int[]) AS v(pos, qid)
         WHERE t.${col} = $3 AND t.question_id = v.qid`,
        [positions, qids, owner]
      );

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error reordering questions:", err);
      return res.status(500).json({ error: "Failed to reorder questions" });
    }
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    if (assignmentId && questionId) {
      try {
        await runAsync(
          `DELETE FROM assignment_questions WHERE assignment_id = $1 AND question_id = $2`,
          [assignmentId, questionId]
        );
        await updateAssignmentTotalMarks(assignmentId);
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error("Error removing assignment question:", err);
        return res.status(500).json({ error: "Failed to remove question from assignment" });
      }
    }

    if (paperId && questionId) {
      try {
        await runAsync(
          `DELETE FROM question_paper_questions WHERE paper_id = $1 AND question_id = $2`,
          [paperId, questionId]
        );
        await updatePaperTotalMarks(paperId);
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error("Error removing paper question:", err);
        return res.status(500).json({ error: "Failed to remove question from paper" });
      }
    }

    if (id) {
      try {
        const [asgns, papers] = await Promise.all([
          allAsync(`SELECT DISTINCT assignment_id FROM assignment_questions      WHERE question_id = $1`, [id]),
          allAsync(`SELECT DISTINCT paper_id        FROM question_paper_questions WHERE question_id = $1`, [id]),
        ]);

        await Promise.all([
          runAsync(`DELETE FROM assignment_questions      WHERE question_id = $1`, [id]),
          runAsync(`DELETE FROM question_paper_questions  WHERE question_id = $1`, [id]),
        ]);
        await runAsync(`DELETE FROM questions WHERE id = $1`, [id]);

        await Promise.all([
          ...asgns.map(r  => updateAssignmentTotalMarks(r.assignment_id)),
          ...papers.map(r => updatePaperTotalMarks(r.paper_id)),
        ]);

        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error("Error deleting question:", err);
        return res.status(500).json({ error: "Failed to delete question" });
      }
    }

    return res.status(400).json({ error: "id or assignmentId/paperId + questionId required" });
  }

  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}
