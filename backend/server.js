// Database and Gemini utilities for Vercel serverless functions
// This file is imported by API handlers in /api folder

import dotenv from "dotenv";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

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
      total_marks INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // assignment_questions junction table
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

  // question_paper_questions junction table
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

  // Add correct_index column for MCQ answer key
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

  // Add total_marks to assignments table
  db.run(`ALTER TABLE assignments ADD COLUMN total_marks INTEGER DEFAULT 0`, (err) => {
    if (err && !/duplicate column/i.test(err.message)) console.error(err);
  });

  // Backfill total_marks for existing assignments
  db.run(`
    UPDATE assignments 
    SET total_marks = (
      SELECT COALESCE(SUM(q.marks), 0) 
      FROM assignment_questions aq 
      JOIN questions q ON q.id = aq.question_id 
      WHERE aq.assignment_id = assignments.id
    )
    WHERE total_marks IS NULL OR total_marks = 0
  `, (err) => {
    if (err) console.error("Failed to backfill assignment total_marks:", err);
  });

  // Backfill total_marks for existing papers (update the column if it exists)
  db.run(`
    UPDATE question_papers 
    SET total_marks = (
      SELECT COALESCE(SUM(q.marks), 0) 
      FROM question_paper_questions pq 
      JOIN questions q ON q.id = pq.question_id 
      WHERE pq.paper_id = question_papers.id
    )
    WHERE total_marks IS NOT NULL
  `, (err) => {
    if (err && !/no such column/i.test(err.message)) console.error("Failed to backfill paper total_marks:", err);
  });
});

// Promise wrappers for SQLite operations
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
  console.warn("⚠️  GEMINI_API_KEY environment variable is not set in .env.");
}

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

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
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const prompt = buildPrompt(params);

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  const rawText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]";

  // Remove markdown code fences if present
  const cleanText = rawText.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

  let questions;
  try {
    questions = JSON.parse(cleanText);
  } catch (parseErr) {
    console.error("Failed to parse Gemini response:", cleanText);
    throw new Error("Gemini returned invalid JSON");
  }

  if (!Array.isArray(questions)) {
    throw new Error("Gemini response was not an array");
  }

  return questions;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { db, runAsync, getAsync, allAsync, generateQuestionsWithGemini, GEMINI_MODEL };
