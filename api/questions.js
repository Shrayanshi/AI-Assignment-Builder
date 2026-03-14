import { allAsync, runAsync, getAsync } from "../backend/server.js";

function normalizeRow(row) {
  if (row?.options_json) row.options = JSON.parse(row.options_json);
  if (row?.correct_index != null) row.correctIndex = row.correct_index;
  if (row?.subject == null && row?.rubric != null) row.subject = row.rubric;
  delete row?.options_json;
  delete row?.correct_index;
  delete row?.rubric;
  return row;
}

// Helper to recalculate and update total_marks for an assignment
async function updateAssignmentTotalMarks(assignmentId) {
  const result = await getAsync(
    `SELECT COALESCE(SUM(q.marks), 0) as total
     FROM assignment_questions aq
     JOIN questions q ON q.id = aq.question_id
     WHERE aq.assignment_id = ?`,
    [assignmentId]
  );
  await runAsync(
    `UPDATE assignments SET total_marks = ? WHERE id = ?`,
    [result.total, assignmentId]
  );
}

// Helper to recalculate and update total_marks for a paper
async function updatePaperTotalMarks(paperId) {
  const result = await getAsync(
    `SELECT COALESCE(SUM(q.marks), 0) as total
     FROM question_paper_questions pq
     JOIN questions q ON q.id = pq.question_id
     WHERE pq.paper_id = ?`,
    [paperId]
  );
  await runAsync(
    `UPDATE question_papers SET total_marks = ? WHERE id = ?`,
    [result.total, paperId]
  );
}

export default async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("id");
  const assignmentId = url.searchParams.get("assignmentId");
  const paperId = url.searchParams.get("paperId");
  const questionId = url.searchParams.get("questionId");
  const reorder = url.searchParams.get("reorder");

  // GET /api/questions (list) or by assignmentId/paperId/id
  if (req.method === "GET") {
    // Single question
    if (id) {
      try {
        const row = await getAsync(
          `SELECT * FROM questions WHERE id = ?`,
          [id],
        );
        if (!row)
          return res.status(404).json({ error: "Question not found" });
        return res.status(200).json(normalizeRow(row));
      } catch (err) {
        console.error("Error fetching question:", err);
        return res.status(500).json({ error: "Failed to fetch question" });
      }
    }

    // Questions for a specific assignment
    if (assignmentId) {
      try {
        const rows = await allAsync(
          `SELECT q.*, aq.position
           FROM assignment_questions aq
           JOIN questions q ON q.id = aq.question_id
           WHERE aq.assignment_id = ?
           ORDER BY aq.position ASC`,
          [assignmentId],
        );
        return res.status(200).json(rows.map(normalizeRow));
      } catch (err) {
        console.error("Error fetching assignment questions:", err);
        return res
          .status(500)
          .json({ error: "Failed to fetch assignment questions" });
      }
    }

    // Questions for a specific paper
    if (paperId) {
      try {
        const rows = await allAsync(
          `SELECT q.*, pq.position
           FROM question_paper_questions pq
           JOIN questions q ON q.id = pq.question_id
           WHERE pq.paper_id = ?
           ORDER BY pq.position ASC`,
          [paperId],
        );
        return res.status(200).json(rows.map(normalizeRow));
      } catch (err) {
        console.error("Error fetching paper questions:", err);
        return res.status(500).json({ error: "Failed to fetch questions" });
      }
    }

    // All questions
    try {
      const rows = await allAsync(
        `SELECT * FROM questions ORDER BY id DESC`,
      );
      const data = rows.map(normalizeRow);
      return res.status(200).json(data);
    } catch (err) {
      console.error("Error fetching questions:", err);
      return res.status(500).json({ error: "Failed to fetch questions" });
    }
  }

  // POST /api/questions (create) or attach to assignment/paper
  if (req.method === "POST") {
    // Attach to assignment or paper
    if (assignmentId || paperId) {
      try {
        const { questionId: bodyQId } = req.body || {};
        const qid = bodyQId;
        if (!qid) {
          return res.status(400).json({ error: "questionId is required" });
        }

        if (assignmentId) {
          const existing = await allAsync(
            `SELECT position FROM assignment_questions WHERE assignment_id = ? ORDER BY position DESC LIMIT 1`,
            [assignmentId],
          );
          const nextPos = existing[0] ? existing[0].position + 1 : 0;
          await runAsync(
            `INSERT OR REPLACE INTO assignment_questions (assignment_id, question_id, position) VALUES (?, ?, ?)`,
            [assignmentId, qid, nextPos],
          );
          // Update total_marks
          await updateAssignmentTotalMarks(assignmentId);
        } else if (paperId) {
          const existing = await allAsync(
            `SELECT position FROM question_paper_questions WHERE paper_id = ? ORDER BY position DESC LIMIT 1`,
            [paperId],
          );
          const nextPos = existing[0] ? existing[0].position + 1 : 0;
          await runAsync(
            `INSERT OR REPLACE INTO question_paper_questions (paper_id, question_id, position) VALUES (?, ?, ?)`,
            [paperId, qid, nextPos],
          );
          // Update total_marks
          await updatePaperTotalMarks(paperId);
        }

        return res.status(201).json({ ok: true });
      } catch (err) {
        console.error("Error attaching question:", err);
        return res
          .status(500)
          .json({ error: "Failed to attach question to assignment/paper" });
      }
    }

    // Create new question
    try {
      const { type, marks, difficulty, topic, subject, text, options, correctIndex } =
        req.body || {};
      if (!type || !text) {
        return res
          .status(400)
          .json({ error: "type and text are required" });
      }
      const now = new Date().toISOString();
      const optionsJson =
        type === "MCQ" && Array.isArray(options) && options.length
          ? JSON.stringify(options)
          : null;
      const correctIdx =
        type === "MCQ" &&
        typeof correctIndex === "number" &&
        Number.isInteger(correctIndex) &&
        correctIndex >= 0
          ? correctIndex
          : null;

      const result = await runAsync(
        `INSERT INTO questions (type, marks, difficulty, topic, subject, text, options_json, correct_index, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          type,
          marks != null ? Number(marks) : 1,
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
      return res.status(201).json(normalizeRow(row));
    } catch (err) {
      console.error("Error creating question:", err);
      return res.status(500).json({ error: "Failed to create question" });
    }
  }

  // PUT /api/questions?id=123 (update question) or reorder
  if (req.method === "PUT" && id && !reorder) {
    try {
      const existing = await getAsync(
        `SELECT * FROM questions WHERE id = ?`,
        [id],
      );
      if (!existing)
        return res.status(404).json({ error: "Question not found" });
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
      const now = new Date().toISOString();
      const optionsJson =
        options === undefined
          ? existing.options_json
          : Array.isArray(options) && options.length
            ? JSON.stringify(options)
            : null;
      const correctIdx =
        correctIndex === undefined
          ? (existing.correct_index != null ? existing.correct_index : null)
          : typeof correctIndex === "number" &&
              Number.isInteger(correctIndex) &&
              correctIndex >= 0
            ? correctIndex
            : null;
      const subjectVal =
        subject !== undefined
          ? subject
          : existing.subject ?? existing.rubric ?? null;

      await runAsync(
        `UPDATE questions
         SET type = ?, marks = ?, difficulty = ?, topic = ?, subject = ?, text = ?, options_json = ?, correct_index = ?, updated_at = ?
         WHERE id = ?`,
        [
          type || existing.type,
          marks != null ? Number(marks) : existing.marks,
          difficulty != null ? Number(difficulty) : existing.difficulty,
          topic !== undefined ? topic : existing.topic,
          subjectVal,
          text || existing.text,
          optionsJson,
          correctIdx,
          now,
          id,
        ],
      );
      
      // If marks changed, update total_marks for all assignments/papers containing this question
      if (marks != null && Number(marks) !== existing.marks) {
        // Update assignments
        const affectedAssignments = await allAsync(
          `SELECT DISTINCT assignment_id FROM assignment_questions WHERE question_id = ?`,
          [id]
        );
        for (const { assignment_id } of affectedAssignments) {
          await updateAssignmentTotalMarks(assignment_id);
        }
        
        // Update papers
        const affectedPapers = await allAsync(
          `SELECT DISTINCT paper_id FROM question_paper_questions WHERE question_id = ?`,
          [id]
        );
        for (const { paper_id } of affectedPapers) {
          await updatePaperTotalMarks(paper_id);
        }
      }
      
      const row = await getAsync(`SELECT * FROM questions WHERE id = ?`, [id]);
      return res.status(200).json(normalizeRow(row));
    } catch (err) {
      console.error("Error updating question:", err);
      return res.status(500).json({ error: "Failed to update question" });
    }
  }

  // PUT /api/questions?assignmentId=..&reorder=1 or ?paperId=..&reorder=1
  if (req.method === "PUT" && reorder && (assignmentId || paperId)) {
    try {
      const { order } = req.body || {};
      if (!Array.isArray(order) || !order.length) {
        return res
          .status(400)
          .json({ error: "order array is required for reordering" });
      }
      const table = assignmentId
        ? "assignment_questions"
        : "question_paper_questions";
      const col = assignmentId ? "assignment_id" : "paper_id";
      const ownerId = assignmentId || paperId;

      await runAsync(`BEGIN TRANSACTION`);
      for (let i = 0; i < order.length; i++) {
        await runAsync(
          `UPDATE ${table} SET position = ? WHERE ${col} = ? AND question_id = ?`,
          [i, ownerId, order[i]],
        );
      }
      await runAsync(`COMMIT`);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error reordering questions:", err);
      await runAsync(`ROLLBACK`).catch(() => {});
      return res.status(500).json({ error: "Failed to reorder questions" });
    }
  }

  // DELETE /api/questions?id=123  OR /api/questions?assignmentId=..&questionId=.. OR /api/questions?paperId=..&questionId=..
  if (req.method === "DELETE") {
    // remove link from assignment/paper
    if (assignmentId && questionId) {
      try {
        await runAsync(
          `DELETE FROM assignment_questions WHERE assignment_id = ? AND question_id = ?`,
          [assignmentId, questionId],
        );
        // Update total_marks
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
          `DELETE FROM question_paper_questions WHERE paper_id = ? AND question_id = ?`,
          [paperId, questionId],
        );
        // Update total_marks
        await updatePaperTotalMarks(paperId);
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error("Error removing paper question:", err);
        return res.status(500).json({ error: "Failed to remove question from paper" });
      }
    }

    // Delete question entirely
    if (id) {
      try {
        // Get all assignments and papers that contain this question
        const affectedAssignments = await allAsync(
          `SELECT DISTINCT assignment_id FROM assignment_questions WHERE question_id = ?`,
          [id]
        );
        const affectedPapers = await allAsync(
          `SELECT DISTINCT paper_id FROM question_paper_questions WHERE question_id = ?`,
          [id]
        );
        
        // Delete from junction tables (CASCADE should handle this, but let's be explicit)
        await runAsync(
          `DELETE FROM assignment_questions WHERE question_id = ?`,
          [id]
        );
        await runAsync(
          `DELETE FROM question_paper_questions WHERE question_id = ?`,
          [id]
        );
        
        // Delete the question itself
        await runAsync(`DELETE FROM questions WHERE id = ?`, [id]);
        
        // Update total_marks for all affected assignments and papers
        for (const { assignment_id } of affectedAssignments) {
          await updateAssignmentTotalMarks(assignment_id);
        }
        for (const { paper_id } of affectedPapers) {
          await updatePaperTotalMarks(paper_id);
        }
        
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
