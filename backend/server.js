// Gemini utilities for Vercel serverless functions
// Database helpers have been moved to lib/db.js (PostgreSQL / Neon)

import dotenv from "dotenv";

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

export { generateQuestionsWithGemini, GEMINI_MODEL };
