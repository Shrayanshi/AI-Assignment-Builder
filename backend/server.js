// Express backend — generates questions via Google Gemini (free tier)
// Setup:
//   npm install express cors dotenv

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
    "rubric": "<short phrase — what the question assesses>",
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
      rubric:
        typeof q.rubric === "string" && q.rubric.trim()
          ? q.rubric.trim()
          : "Conceptual Understanding",
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

// ─── Routes ───────────────────────────────────────────────────────────────────

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

// GET /health — quick check that the server is alive
app.get("/health", (_req, res) => res.json({ ok: true, model: GEMINI_MODEL }));

app.listen(PORT, () => {
  console.log(`✅  AI Question Generator running at http://localhost:${PORT}`);
  console.log(`    Model : ${GEMINI_MODEL}`);
});