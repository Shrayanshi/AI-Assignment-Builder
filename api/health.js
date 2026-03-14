import { GEMINI_MODEL } from "../backend/server.js";

export default async function handler(_req, res) {
  return res.status(200).json({ ok: true, model: GEMINI_MODEL });
}

