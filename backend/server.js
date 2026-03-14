// Express backend — generates questions via Google Gemini (free tier)
// Setup:
//   npm install express cors dotenv

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Resolve a stable path for the SQLite DB file in the backend folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data.db");

// ─── SQLite setup ──────────────────────────────────────────────────────────────

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  // questions table
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,                 -- 'MCQ' or 'FRQ'
      marks INTEGER NOT NULL DEFAULT 1,
      difficulty INTEGER,
      topic TEXT,
      rubric TEXT,
      text TEXT NOT NULL,
      options_json TEXT,                  -- MCQ options as JSON array of strings
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // assignments table
  db.run(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // assignment_questions join table
  db.run(`
    CREATE TABLE IF NOT EXISTS assignment_questions (
      assignment_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY (assignment_id, question_id),
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);

  // question_papers table
  db.run(`
    CREATE TABLE IF NOT EXISTS question_papers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      school_name TEXT,
      school_address TEXT,
      grade TEXT,
      subject TEXT,
      exam_type TEXT,
      duration TEXT,
      total_marks INTEGER,
      academic_year TEXT,
      exam_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // question_paper_questions join table
  db.run(`
    CREATE TABLE IF NOT EXISTS question_paper_questions (
      paper_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY (paper_id, question_id),
      FOREIGN KEY (paper_id) REFERENCES question_papers(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);

  // Add correct_index for MCQ correct answer (ignore if column already exists)
  db.run(`ALTER TABLE questions ADD COLUMN correct_index INTEGER`, (err) => {
    if (err && !/duplicate column/i.test(err.message)) console.error(err);
  });
  // Add subject (replaces rubric) for questions
  db.run(`ALTER TABLE questions ADD COLUMN subject TEXT`, (err) => {
    if (err && !/duplicate column/i.test(err.message)) console.error(err);
  });
  // Backfill subject from rubric for existing rows
  db.run(`UPDATE questions SET subject = rubric WHERE subject IS NULL AND rubric IS NOT NULL`, (err) => {
    if (err) console.error(err);
  });
});

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// ─── Gemini setup ──────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌  GEMINI_API_KEY environment variable is not set in .env.");
  process.exit(1);
}
// Free-tier model — gemini-1.5-flash is fast and free up to generous limits
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt({ grade, subject, topic, difficulty, type, count }) {
  return `
You are an expert exam-question generator for school teachers.

Generate exactly ${count} high-quality ${type} questions for grade ${grade} students.

Constraints:
- Subject: ${subject || "Mathematics"}
- Topic: ${topic || "General"}
- Difficulty: ${difficulty} on a 1–5 scale
- Type: ${type} (either "MCQ" or "FRQ")
- Exam style only — no trivia, no jokes.

Output format rules (STRICT):
- Return ONLY a valid JSON array. No prose, no markdown, no backticks.
- Each element must match this exact schema:
  {
    "id": "<unique string>",
    "type": "MCQ" | "FRQ",
    "marks": <number 2–6>,
    "difficulty": <number 1–5>,
    "topic": "<string>",
    "subject": "<e.g. Mathematics, Science>",
    "text": "<full question stem>",
    "options": string[] | null,
    "correctIndex": number | null
  }
- For MCQ questions:
  - "options" MUST be an array of 3–5 answer choices (strings).
  - "correctIndex" MUST be the 0-based index of the correct option in "options".
- For FRQ questions:
  - Set "options" to null.
  - Set "correctIndex" to null.
- Do not add any keys beyond the schema above.
`.trim();
}

// ─── Gemini API call ──────────────────────────────────────────────────────────

async function generateQuestionsWithGemini(params) {
  const prompt = buildPrompt(params);

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 2048,
        // Ask Gemini to respond in JSON — keeps output clean
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${text}`);
  }

  const data = await res.json();

  // Gemini response structure: data.candidates[0].content.parts[0].text
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!raw.trim()) {
    // Check for safety blocks or empty responses
    const blockReason = data?.promptFeedback?.blockReason;
    throw new Error(
      blockReason
        ? `Gemini blocked the request: ${blockReason}`
        : "Gemini returned an empty response."
    );
  }

  // Strip any accidental markdown fences (belt-and-suspenders)
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/m, "").replace(/```\s*$/m, "").trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse Gemini JSON response: ${err.message}\n\nRaw:\n${cleaned}`);
  }

  const arr = Array.isArray(parsed) ? parsed : [parsed];

  // Normalize each question into our strict schema
  return arr.map((q, idx) => {
    const id =
      typeof q.id === "string" && q.id.trim()
        ? q.id.trim()
        : `ai-${Date.now().toString(36)}-${idx.toString(36)}`;

    const type = q.type === "FRQ" ? "FRQ" : "MCQ";
    const marks = Number(q.marks);
    const difficulty = Number(q.difficulty);

    let options = null;
    let correctIndex = null;

    if (type === "MCQ") {
      if (Array.isArray(q.options)) {
        options = q.options
          .map(o => (typeof o === "string" ? o.trim() : ""))
          .filter(Boolean);
        if (!options.length) {
          options = null;
        }
      }
      const rawIdx = q.correctIndex;
      const idxNum =
        typeof rawIdx === "number"
          ? rawIdx
          : typeof rawIdx === "string"
            ? Number(rawIdx)
            : NaN;
      if (
        options &&
        Number.isInteger(idxNum) &&
        idxNum >= 0 &&
        idxNum < options.length
      ) {
        correctIndex = idxNum;
      } else {
        correctIndex = null;
      }
    }

    return {
      id,
      type,
      marks:
        Number.isFinite(marks) && marks > 0
          ? marks
          : 4,
      difficulty:
        Number.isFinite(difficulty) && difficulty >= 1 && difficulty <= 5
          ? difficulty
          : params.difficulty ?? 3,
      topic:
        typeof q.topic === "string" && q.topic.trim()
          ? q.topic.trim()
          : params.topic || "General",
      subject:
        typeof q.subject === "string" && q.subject.trim()
          ? q.subject.trim()
          : (typeof q.rubric === "string" && q.rubric.trim() ? q.rubric.trim() : "General"),
      text:
        typeof q.text === "string" && q.text.trim()
          ? q.text.trim()
          : "Question text not provided.",
      richText:
        typeof q.text === "string" && q.text.trim() ? q.text.trim() : "",
      options: type === "MCQ" ? options || [] : undefined,
      correctIndex: type === "MCQ" ? correctIndex : undefined,
    };
  });
}

// ─── AI generation route ──────────────────────────────────────────────────────

// POST /generate-questions
app.post("/generate-questions", async (req, res) => {
  try {
    const { grade, subject, topic, difficulty, type, count } = req.body ?? {};

    const params = {
      grade:      Math.max(1,  Math.min(12, Number(grade)      || 10)),
      subject:    subject   || "Mathematics",
      topic:      topic     || "General",
      difficulty: Math.max(1,  Math.min(5,  Number(difficulty) || 3)),
      type:       type === "FRQ" ? "FRQ" : "MCQ",
      count:      Math.max(1,  Math.min(10, Number(count)      || 3)),
    };

    const questions = await generateQuestionsWithGemini(params);
    res.json(questions);
  } catch (err) {
    console.error("Error in /generate-questions:", err);
    res.status(500).json({ error: "Failed to generate questions", details: err.message });
  }
});

// ─── Questions CRUD ───────────────────────────────────────────────────────────

// POST /questions
app.post("/questions", async (req, res) => {
  try {
    const { type, marks, difficulty, topic, subject, text, options, correctIndex } = req.body || {};
    if (!type || !text) {
      return res.status(400).json({ error: "type and text are required" });
    }
    const now = new Date().toISOString();
    const optionsJson =
      Array.isArray(options) && options.length
        ? JSON.stringify(options)
        : null;
    const correctIdx =
      typeof correctIndex === "number" && Number.isInteger(correctIndex) && correctIndex >= 0
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

    const row = await getAsync(`SELECT * FROM questions WHERE id = ?`, [result.lastID]);
    if (row?.options_json) row.options = JSON.parse(row.options_json);
    if (row?.correct_index != null) row.correctIndex = row.correct_index;
    if (row?.subject == null && row?.rubric != null) row.subject = row.rubric;
    delete row?.options_json;
    delete row?.correct_index;
    delete row?.rubric;
    res.status(201).json(row);
  } catch (err) {
    console.error("Error creating question:", err);
    res.status(500).json({ error: "Failed to create question" });
  }
});

// GET /questions
app.get("/questions", async (_req, res) => {
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
    res.json(data);
  } catch (err) {
    console.error("Error fetching questions:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

// GET /questions/:id
app.get("/questions/:id", async (req, res) => {
  try {
    const row = await getAsync(`SELECT * FROM questions WHERE id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ error: "Question not found" });
    if (row.options_json) row.options = JSON.parse(row.options_json);
    if (row.correct_index != null) row.correctIndex = row.correct_index;
    if (row.subject == null && row.rubric != null) row.subject = row.rubric;
    delete row.options_json;
    delete row.correct_index;
    delete row.rubric;
    res.json(row);
  } catch (err) {
    console.error("Error fetching question:", err);
    res.status(500).json({ error: "Failed to fetch question" });
  }
});

// PUT /questions/:id
app.put("/questions/:id", async (req, res) => {
  try {
    const existing = await getAsync(`SELECT * FROM questions WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: "Question not found" });

    const { type, marks, difficulty, topic, subject, text, options, correctIndex } = req.body || {};
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
        : typeof correctIndex === "number" && Number.isInteger(correctIndex) && correctIndex >= 0
          ? correctIndex
          : null;
    const subjectVal = subject !== undefined ? subject : (existing.subject ?? existing.rubric ?? null);

    await runAsync(
      `
      UPDATE questions
      SET type = ?, marks = ?, difficulty = ?, topic = ?, subject = ?, text = ?, options_json = ?, correct_index = ?, updated_at = ?
      WHERE id = ?
    `,
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
        req.params.id,
      ],
    );

    const row = await getAsync(`SELECT * FROM questions WHERE id = ?`, [req.params.id]);
    if (row.options_json) row.options = JSON.parse(row.options_json);
    if (row.correct_index != null) row.correctIndex = row.correct_index;
    if (row.subject == null && row.rubric != null) row.subject = row.rubric;
    delete row.options_json;
    delete row.correct_index;
    delete row.rubric;
    res.json(row);
  } catch (err) {
    console.error("Error updating question:", err);
    res.status(500).json({ error: "Failed to update question" });
  }
});

// DELETE /questions/:id
app.delete("/questions/:id", async (req, res) => {
  try {
    await runAsync(`DELETE FROM questions WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting question:", err);
    res.status(500).json({ error: "Failed to delete question" });
  }
});

// ─── Assignments CRUD ─────────────────────────────────────────────────────────

// POST /assignments
app.post("/assignments", async (req, res) => {
  try {
    const { name, subject } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });
    const now = new Date().toISOString();
    const result = await runAsync(
      `INSERT INTO assignments (name, subject, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [name, subject || null, now, now],
    );
    const row = await getAsync(`SELECT * FROM assignments WHERE id = ?`, [result.lastID]);
    res.status(201).json(row);
  } catch (err) {
    console.error("Error creating assignment:", err);
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

// GET /assignments
app.get("/assignments", async (_req, res) => {
  try {
    const rows = await allAsync(`SELECT * FROM assignments ORDER BY id DESC`);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching assignments:", err);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

// GET /assignments/:id
app.get("/assignments/:id", async (req, res) => {
  try {
    const assignment = await getAsync(`SELECT * FROM assignments WHERE id = ?`, [req.params.id]);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    const questions = await allAsync(
      `
      SELECT q.*, aq.position
      FROM assignment_questions aq
      JOIN questions q ON q.id = aq.question_id
      WHERE aq.assignment_id = ?
      ORDER BY aq.position ASC
    `,
      [req.params.id],
    );
    const normalized = questions.map((r) => {
      if (r.options_json) r.options = JSON.parse(r.options_json);
      if (r.correct_index != null) r.correctIndex = r.correct_index;
      if (r.subject == null && r.rubric != null) r.subject = r.rubric;
      delete r.options_json;
      delete r.correct_index;
      delete r.rubric;
      return r;
    });
    res.json({ ...assignment, questions: normalized });
  } catch (err) {
    console.error("Error fetching assignment:", err);
    res.status(500).json({ error: "Failed to fetch assignment" });
  }
});

// PUT /assignments/:id
app.put("/assignments/:id", async (req, res) => {
  try {
    const existing = await getAsync(`SELECT * FROM assignments WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: "Assignment not found" });
    const { name, subject } = req.body || {};
    const now = new Date().toISOString();
    await runAsync(
      `UPDATE assignments SET name = ?, subject = ?, updated_at = ? WHERE id = ?`,
      [name || existing.name, subject || existing.subject, now, req.params.id],
    );
    const updated = await getAsync(`SELECT * FROM assignments WHERE id = ?`, [req.params.id]);
    res.json(updated);
  } catch (err) {
    console.error("Error updating assignment:", err);
    res.status(500).json({ error: "Failed to update assignment" });
  }
});

// DELETE /assignments/:id
app.delete("/assignments/:id", async (req, res) => {
  try {
    await runAsync(`DELETE FROM assignments WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting assignment:", err);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});

// POST /assignments/:id/questions
app.post("/assignments/:id/questions", async (req, res) => {
  try {
    const { questionId } = req.body || {};
    if (!questionId) return res.status(400).json({ error: "questionId is required" });
    const assignmentId = req.params.id;
    const existing = await allAsync(
      `SELECT position FROM assignment_questions WHERE assignment_id = ? ORDER BY position DESC LIMIT 1`,
      [assignmentId],
    );
    const nextPos = existing[0] ? existing[0].position + 1 : 0;
    await runAsync(
      `INSERT OR REPLACE INTO assignment_questions (assignment_id, question_id, position) VALUES (?, ?, ?)`,
      [assignmentId, questionId, nextPos],
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("Error adding assignment question:", err);
    res.status(500).json({ error: "Failed to add question to assignment" });
  }
});

// DELETE /assignments/:id/questions/:questionId
app.delete("/assignments/:id/questions/:questionId", async (req, res) => {
  try {
    await runAsync(
      `DELETE FROM assignment_questions WHERE assignment_id = ? AND question_id = ?`,
      [req.params.id, req.params.questionId],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Error removing assignment question:", err);
    res.status(500).json({ error: "Failed to remove question from assignment" });
  }
});

// PUT /assignments/:id/reorder
app.put("/assignments/:id/reorder", async (req, res) => {
  try {
    const { order } = req.body || {};
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: "order must be an array of questionIds" });
    }
    const assignmentId = req.params.id;
    await runAsync(`BEGIN TRANSACTION`);
    for (let i = 0; i < order.length; i++) {
      await runAsync(
        `UPDATE assignment_questions SET position = ? WHERE assignment_id = ? AND question_id = ?`,
        [i, assignmentId, order[i]],
      );
    }
    await runAsync(`COMMIT`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error reordering assignment questions:", err);
    await runAsync(`ROLLBACK`).catch(() => {});
    res.status(500).json({ error: "Failed to reorder assignment questions" });
  }
});

// ─── Question Papers CRUD ─────────────────────────────────────────────────────

// POST /papers
app.post("/papers", async (req, res) => {
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
    if (!title) return res.status(400).json({ error: "title is required" });
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
    const row = await getAsync(`SELECT * FROM question_papers WHERE id = ?`, [result.lastID]);
    res.status(201).json(row);
  } catch (err) {
    console.error("Error creating paper:", err);
    res.status(500).json({ error: "Failed to create paper" });
  }
});

// GET /papers
app.get("/papers", async (_req, res) => {
  try {
    const rows = await allAsync(`SELECT * FROM question_papers ORDER BY id DESC`);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching papers:", err);
    res.status(500).json({ error: "Failed to fetch papers" });
  }
});

// GET /papers/:id
app.get("/papers/:id", async (req, res) => {
  try {
    const paper = await getAsync(`SELECT * FROM question_papers WHERE id = ?`, [req.params.id]);
    if (!paper) return res.status(404).json({ error: "Paper not found" });
    const questions = await allAsync(
      `
      SELECT q.*, pq.position
      FROM question_paper_questions pq
      JOIN questions q ON q.id = pq.question_id
      WHERE pq.paper_id = ?
      ORDER BY pq.position ASC
    `,
      [req.params.id],
    );
    const normalized = questions.map((r) => {
      if (r.options_json) r.options = JSON.parse(r.options_json);
      if (r.correct_index != null) r.correctIndex = r.correct_index;
      if (r.subject == null && r.rubric != null) r.subject = r.rubric;
      delete r.options_json;
      delete r.correct_index;
      delete r.rubric;
      return r;
    });
    res.json({ ...paper, questions: normalized });
  } catch (err) {
    console.error("Error fetching paper:", err);
    res.status(500).json({ error: "Failed to fetch paper" });
  }
});

// PUT /papers/:id
app.put("/papers/:id", async (req, res) => {
  try {
    const existing = await getAsync(`SELECT * FROM question_papers WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: "Paper not found" });

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
      `
      UPDATE question_papers
      SET title = ?, school_name = ?, school_address = ?, grade = ?, subject = ?, exam_type = ?,
          duration = ?, total_marks = ?, academic_year = ?, exam_date = ?, updated_at = ?
      WHERE id = ?
    `,
      [
        title || existing.title,
        schoolName || existing.school_name,
        schoolAddress || existing.school_address,
        grade || existing.grade,
        subject || existing.subject,
        examType || existing.exam_type,
        duration || existing.duration,
        totalMarks != null ? Number(totalMarks) : existing.total_marks,
        academicYear || existing.academic_year,
        examDate || existing.exam_date,
        now,
        req.params.id,
      ],
    );
    const updated = await getAsync(`SELECT * FROM question_papers WHERE id = ?`, [req.params.id]);
    res.json(updated);
  } catch (err) {
    console.error("Error updating paper:", err);
    res.status(500).json({ error: "Failed to update paper" });
  }
});

// DELETE /papers/:id
app.delete("/papers/:id", async (req, res) => {
  try {
    await runAsync(`DELETE FROM question_papers WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting paper:", err);
    res.status(500).json({ error: "Failed to delete paper" });
  }
});

// POST /papers/:id/questions
app.post("/papers/:id/questions", async (req, res) => {
  try {
    const { questionId } = req.body || {};
    if (!questionId) return res.status(400).json({ error: "questionId is required" });
    const paperId = req.params.id;
    const existing = await allAsync(
      `SELECT position FROM question_paper_questions WHERE paper_id = ? ORDER BY position DESC LIMIT 1`,
      [paperId],
    );
    const nextPos = existing[0] ? existing[0].position + 1 : 0;
    await runAsync(
      `INSERT OR REPLACE INTO question_paper_questions (paper_id, question_id, position) VALUES (?, ?, ?)`,
      [paperId, questionId, nextPos],
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("Error adding paper question:", err);
    res.status(500).json({ error: "Failed to add question to paper" });
  }
});

// DELETE /papers/:id/questions/:questionId
app.delete("/papers/:id/questions/:questionId", async (req, res) => {
  try {
    await runAsync(
      `DELETE FROM question_paper_questions WHERE paper_id = ? AND question_id = ?`,
      [req.params.id, req.params.questionId],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Error removing paper question:", err);
    res.status(500).json({ error: "Failed to remove question from paper" });
  }
});

// PUT /papers/:id/reorder
app.put("/papers/:id/reorder", async (req, res) => {
  try {
    const { order } = req.body || {};
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: "order must be an array of questionIds" });
    }
    const paperId = req.params.id;
    await runAsync(`BEGIN TRANSACTION`);
    for (let i = 0; i < order.length; i++) {
      await runAsync(
        `UPDATE question_paper_questions SET position = ? WHERE paper_id = ? AND question_id = ?`,
        [i, paperId, order[i]],
      );
    }
    await runAsync(`COMMIT`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error reordering paper questions:", err);
    await runAsync(`ROLLBACK`).catch(() => {});
    res.status(500).json({ error: "Failed to reorder paper questions" });
  }
});

// GET /health — quick check that the server is alive
app.get("/health", (_req, res) => res.json({ ok: true, model: GEMINI_MODEL }));

app.listen(PORT, () => {
  console.log(`✅  AI Question Generator running at http://localhost:${PORT}`);
  console.log(`    Model : ${GEMINI_MODEL}`);
});