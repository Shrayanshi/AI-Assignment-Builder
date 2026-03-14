import { generateQuestionsWithGemini } from "../backend/server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { grade, subject, topic, difficulty, type, count } = req.body ?? {};

    const params = {
      grade: Math.max(1, Math.min(12, Number(grade) || 10)),
      subject: subject || "Mathematics",
      topic: topic || "General",
      difficulty: Math.max(1, Math.min(5, Number(difficulty) || 3)),
      type: type === "FRQ" ? "FRQ" : "MCQ",
      count: Math.max(1, Math.min(10, Number(count) || 3)),
    };

    const questions = await generateQuestionsWithGemini(params);
    return res.status(200).json(questions);
  } catch (err) {
    console.error("Error in /api/generate-questions:", err);
    return res
      .status(500)
      .json({ error: "Failed to generate questions", details: err.message });
  }
}

