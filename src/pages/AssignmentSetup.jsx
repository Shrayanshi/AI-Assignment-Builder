import { useState } from "react";
import { Button } from "../components/ui/Button";

const GRADES = [
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
  "Class 11", "Class 12",
];

const SUBJECTS = [
  "Mathematics", "Science", "Physics", "Chemistry", "Biology",
  "English", "Hindi", "History", "Geography", "Social Science",
  "Computer Science", "Economics", "Political Science", "Other",
];

const labelStyle = {
  fontSize: 12, fontWeight: 600, color: "#374151",
  marginBottom: 6, display: "block",
};
const selectStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1.5px solid #e5e7eb", fontSize: 14, color: "#111827",
  background: "#ffffff", fontFamily: "'DM Sans', system-ui, sans-serif",
  outline: "none", appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
};
const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1.5px solid #e5e7eb", fontSize: 14, color: "#111827",
  background: "#ffffff", fontFamily: "'DM Sans', system-ui, sans-serif",
  outline: "none", boxSizing: "border-box",
};

export function AssignmentSetup({ onBack, onContinue, creating = false }) {
  const [mode, setMode] = useState("manual"); // "manual" | "ai"
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [errors, setErrors] = useState({});

  // AI-specific fields
  const [topics, setTopics] = useState("");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState(3);
  const [qType, setQType] = useState("MCQ");

  function handleContinue() {
    const e = {};
    if (!grade) e.grade = "Please select a class.";
    if (!subject) e.subject = "Please select a subject.";
    if (Object.keys(e).length) { setErrors(e); return; }
    if (mode === "ai") {
      onContinue({ grade, subject, ai: { topics, count, difficulty, type: qType } });
    } else {
      onContinue({ grade, subject });
    }
  }

  const isGenerating = creating && mode === "ai";

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 460, background: "#ffffff", borderRadius: 20, padding: "36px 32px", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>

        {/* Back */}
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 13, padding: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}
        >
          ← Back
        </button>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
          New Assignment
        </h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
          Select the class and subject to get a focused question bank.
        </p>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "#f3f4f6", borderRadius: 10, padding: 4 }}>
          {[
            { key: "manual", label: "✏️  Manual" },
            { key: "ai",     label: "✨  Generate with AI" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 13, fontWeight: 600,
                background: mode === key ? "#ffffff" : "transparent",
                color: mode === key ? "#4f46e5" : "#6b7280",
                boxShadow: mode === key ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Grade */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>
            Class <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <select
            value={grade}
            onChange={e => { setGrade(e.target.value); setErrors(p => ({ ...p, grade: undefined })); }}
            style={{ ...selectStyle, borderColor: errors.grade ? "#ef4444" : "#e5e7eb" }}
          >
            <option value="">Select class…</option>
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          {errors.grade && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{errors.grade}</p>}
        </div>

        {/* Subject */}
        <div style={{ marginBottom: mode === "ai" ? 18 : 28 }}>
          <label style={labelStyle}>
            Subject <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <select
            value={subject}
            onChange={e => { setSubject(e.target.value); setErrors(p => ({ ...p, subject: undefined })); }}
            style={{ ...selectStyle, borderColor: errors.subject ? "#ef4444" : "#e5e7eb" }}
          >
            <option value="">Select subject…</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.subject && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{errors.subject}</p>}
        </div>

        {/* AI-only fields */}
        {mode === "ai" && (
          <div style={{
            background: "linear-gradient(135deg, #eef2ff, #e0e7ff)",
            borderRadius: 12, padding: "16px", marginBottom: 24,
            border: "1px solid #c7d2fe", display: "flex", flexDirection: "column", gap: 14,
          }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#4338ca" }}>
              ✨ AI will generate questions and create the assignment automatically
            </p>

            {/* Topics */}
            <div>
              <label style={{ ...labelStyle, color: "#4b5563" }}>
                Topics <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional, comma-separated)</span>
              </label>
              <input
                type="text"
                value={topics}
                onChange={e => setTopics(e.target.value)}
                placeholder="e.g. Fractions, Decimals, Percentages"
                style={inputStyle}
              />
            </div>

            {/* Count + Type */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ ...labelStyle, color: "#4b5563" }}># of Questions</label>
                <input
                  type="number" min={1} max={20} value={count}
                  onChange={e => setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, color: "#4b5563" }}>Question Type</label>
                <select value={qType} onChange={e => setQType(e.target.value)} style={selectStyle}>
                  <option value="MCQ">MCQ</option>
                  <option value="FRQ">Short Answer</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label style={{ ...labelStyle, color: "#4b5563" }}>
                Difficulty: <span style={{ color: "#4f46e5" }}>{["", "Easy", "Easy-Med", "Medium", "Med-Hard", "Hard"][difficulty]}</span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#6b7280" }}>Easy</span>
                <input
                  type="range" min={1} max={5} value={difficulty}
                  onChange={e => setDifficulty(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "#4f46e5" }}
                />
                <span style={{ fontSize: 11, color: "#6b7280" }}>Hard</span>
              </div>
            </div>
          </div>
        )}

        <Button
          style={{ width: "100%", opacity: creating ? 0.7 : 1 }}
          onClick={handleContinue}
          disabled={creating}
        >
          {creating
            ? (isGenerating ? "Generating & Creating…" : "Creating…")
            : (mode === "ai" ? "✨ Generate & Create →" : "Continue →")}
        </Button>
      </div>
    </div>
  );
}
