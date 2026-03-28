/**
 * lib/schema.js
 * All DDL migrations in one place, run ONCE per process via a singleton promise.
 * Import and call ensureSchema() at the top of any API handler — subsequent
 * calls resolve instantly without hitting the DB.
 */
import { query } from "./db.js";

let _promise = null;

export function ensureSchema() {
  if (!_promise) {
    _promise = _migrate().catch((err) => {
      _promise = null; // allow retry after transient failure
      throw err;
    });
  }
  return _promise;
}

async function _migrate() {
  // ── Users ──────────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          TEXT,
      email         TEXT UNIQUE,
      password_hash TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name          TEXT`).catch(() => {});
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email         TEXT`).catch(() => {});
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`).catch(() => {});
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ DEFAULT NOW()`).catch(() => {});
  // legacy "password" column may exist with NOT NULL – relax it
  await query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL`).catch(() => {});

  // ── Questions ──────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS questions (
      id            SERIAL PRIMARY KEY,
      type          TEXT,
      marks         INTEGER DEFAULT 1,
      difficulty    INTEGER,
      topic         TEXT,
      subject       TEXT,
      grade         TEXT,
      text          TEXT,
      options_json  TEXT,
      correct_index INTEGER,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS grade TEXT`).catch(() => {});

  // ── Assignments ────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS assignments (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      subject     TEXT,
      grade       TEXT,
      teacher_id  INTEGER REFERENCES users(id),
      total_marks INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS teacher_id  INTEGER REFERENCES users(id)`).catch(() => {});
  await query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS grade       TEXT`).catch(() => {});
  await query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS total_marks INTEGER DEFAULT 0`).catch(() => {});

  // ── Assignment ↔ Questions junction ────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS assignment_questions (
      assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      question_id   INTEGER NOT NULL,
      position      INTEGER DEFAULT 0,
      PRIMARY KEY (assignment_id, question_id)
    )
  `);

  // ── Question Papers ────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS question_papers (
      id             SERIAL PRIMARY KEY,
      title          TEXT NOT NULL,
      school_name    TEXT,
      school_address TEXT,
      grade          TEXT,
      subject        TEXT,
      exam_type      TEXT,
      duration       TEXT,
      total_marks    INTEGER DEFAULT 0,
      academic_year  TEXT,
      exam_date      TEXT,
      teacher_id     INTEGER REFERENCES users(id),
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS teacher_id  INTEGER REFERENCES users(id)`).catch(() => {});
  await query(`ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS total_marks INTEGER DEFAULT 0`).catch(() => {});

  // ── Paper ↔ Questions junction ──────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS question_paper_questions (
      paper_id    INTEGER NOT NULL REFERENCES question_papers(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL,
      position    INTEGER DEFAULT 0,
      PRIMARY KEY (paper_id, question_id)
    )
  `);

  // ── Indexes (all IF NOT EXISTS – safe to run repeatedly) ──────────────────
  await query(`CREATE INDEX IF NOT EXISTS idx_assignments_teacher  ON assignments(teacher_id)`).catch(() => {});
  await query(`CREATE INDEX IF NOT EXISTS idx_papers_teacher       ON question_papers(teacher_id)`).catch(() => {});
  await query(`CREATE INDEX IF NOT EXISTS idx_aq_assignment        ON assignment_questions(assignment_id)`).catch(() => {});
  await query(`CREATE INDEX IF NOT EXISTS idx_aq_question          ON assignment_questions(question_id)`).catch(() => {});
  await query(`CREATE INDEX IF NOT EXISTS idx_pq_paper             ON question_paper_questions(paper_id)`).catch(() => {});
  await query(`CREATE INDEX IF NOT EXISTS idx_pq_question          ON question_paper_questions(question_id)`).catch(() => {});
  await query(`CREATE INDEX IF NOT EXISTS idx_questions_grade_subj ON questions(grade, subject)`).catch(() => {});
}
