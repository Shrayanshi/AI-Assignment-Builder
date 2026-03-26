import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret-change-in-production";

/**
 * Extracts and verifies the JWT from the Authorization header.
 * Returns the teacherId (userId) on success, or sends a 401 and returns null.
 */
export async function requireAuth(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.userId;
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
}
