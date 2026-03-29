import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

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

const fieldLabel = {
  fontSize: 12, fontWeight: 500, color: "#374151", display: "block", marginBottom: 4,
};
const selectStyle = {
  marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 8,
  border: "1px solid #e5e7eb", fontSize: 13, color: "#111827",
  background: "#ffffff", fontFamily: "inherit", outline: "none",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
};
const inputStyle = {
  marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 8,
  border: "1px solid #e5e7eb", fontSize: 13, color: "#111827",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};

export function AssignmentSetup({ onBack, onContinue, creating = false }) {
  const [mode, setMode]       = useState("manual"); // "manual" | "ai"
  const [grade, setGrade]     = useState("");
  const [subject, setSubject] = useState("");
  const [errors, setErrors]   = useState({});

  // AI-specific fields
  const [topics, setTopics]       = useState("");
  const [count, setCount]         = useState(5);
  const [difficulty, setDifficulty] = useState(3);
  const [qType, setQType]         = useState("MCQ");

  function handleContinue() {
    const e = {};
    if (!grade)   e.grade   = "Please select a class.";
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
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>

      {/* ── Header bar (same style as QuestionPaperSetup) ── */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{
          maxWidth: 960, margin: "0 auto", padding: "16px 24px",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          {onBack && (
            <div>
              <Button variant="ghost" onClick={onBack} style={{ padding: "8px 12px", minHeight: "auto" }}>
                ← Back
              </Button>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "#ede9fe",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            }}>
              📝
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>New Assignment</h1>
              <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                Choose a class and subject, then build manually or let AI generate questions for you.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{
        maxWidth: 960, margin: "0 auto", padding: "24px 24px 40px",
        display: "grid",
        gridTemplateColumns: "minmax(0, 2.2fr) minmax(0, 1.2fr)",
        gap: 16,
      }}
        className="qp-setup-grid"
      >
        {/* LEFT – form */}
        <div>
          <Card>
            {/* Mode toggle */}
            <div style={{
              display: "flex", gap: 4, marginBottom: 20,
              background: "#f3f4f6", borderRadius: 8, padding: 3,
            }}>
              {[
                { key: "manual", label: "✏️  Manual" },
                { key: "ai",     label: "✨  Generate with AI" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer",
                    fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                    background: mode === key ? "#ffffff" : "transparent",
                    color: mode === key ? "#4f46e5" : "#6b7280",
                    boxShadow: mode === key ? "0 1px 4px rgba(0,0,0,0.09)" : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Class + Subject row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={fieldLabel}>
                  Class / Grade <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={grade}
                  onChange={e => { setGrade(e.target.value); setErrors(p => ({ ...p, grade: undefined })); }}
                  style={{ ...selectStyle, borderColor: errors.grade ? "#ef4444" : "#e5e7eb" }}
                >
                  <option value="">Select class…</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                {errors.grade && <p style={{ fontSize: 11, color: "#ef4444", margin: "4px 0 0" }}>{errors.grade}</p>}
              </div>

              <div>
                <label style={fieldLabel}>
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
                {errors.subject && <p style={{ fontSize: 11, color: "#ef4444", margin: "4px 0 0" }}>{errors.subject}</p>}
              </div>
            </div>

            {/* AI-only fields */}
            {mode === "ai" && (
              <div style={{
                background: "linear-gradient(135deg, #eef2ff, #e0e7ff)",
                borderRadius: 12, padding: 16, marginTop: 4,
                border: "1px solid #c7d2fe", display: "flex", flexDirection: "column", gap: 14,
              }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#4338ca" }}>
                  ✨ AI will generate questions and create the assignment automatically
                </p>

                <div>
                  <label style={{ ...fieldLabel, color: "#4b5563" }}>
                    Topics{" "}
                    <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional, comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={topics}
                    onChange={e => setTopics(e.target.value)}
                    placeholder="e.g. Fractions, Decimals, Percentages"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ ...fieldLabel, color: "#4b5563" }}># of Questions</label>
                    <input
                      type="number" min={1} max={20} value={count}
                      onChange={e => setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ ...fieldLabel, color: "#4b5563" }}>Question Type</label>
                    <select value={qType} onChange={e => setQType(e.target.value)} style={selectStyle}>
                      <option value="MCQ">MCQ</option>
                      <option value="FRQ">Short Answer</option>
                      <option value="Mixed">Mixed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ ...fieldLabel, color: "#4b5563" }}>
                    Difficulty:{" "}
                    <span style={{ color: "#4f46e5", fontWeight: 600 }}>
                      {["", "Easy", "Easy-Med", "Medium", "Med-Hard", "Hard"][difficulty]}
                    </span>
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
          </Card>

          {/* Action buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, gap: 8 }}>
            {onBack && (
              <Button variant="secondary" onClick={onBack}>
                Cancel
              </Button>
            )}
            <div style={{ flex: 1, textAlign: "right" }}>
              <Button onClick={handleContinue} disabled={creating} style={{ opacity: creating ? 0.7 : 1 }}>
                {creating
                  ? (isGenerating ? "Generating & Creating…" : "Creating…")
                  : (mode === "ai" ? "✨ Generate & Create →" : "Continue →")}
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT – info panel */}
        <div className="qp-setup-preview">
          <Card style={{ position: "sticky", top: 24 }}>
            {mode === "manual" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>
                  📚 Manual Mode
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                  You'll be taken to the Question Bank where you can:
                </p>
                <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12, color: "#6b7280", lineHeight: 1.8 }}>
                  <li>Browse questions filtered to your class &amp; subject</li>
                  <li>Tick questions to add them to this assignment</li>
                  <li>Create new questions manually</li>
                  <li>Use the in-builder AI generator to add more questions</li>
                </ul>
                <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "8px 10px", fontSize: 11, color: "#166534" }}>
                  💡 Only questions matching the selected class &amp; subject will appear in the bank.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>
                  ✨ AI Generate Mode
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                  AI will create a ready-to-use assignment in one click:
                </p>
                <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12, color: "#6b7280", lineHeight: 1.8 }}>
                  <li>Questions are saved to your Question Bank</li>
                  <li>Assignment is created &amp; questions attached instantly</li>
                  <li>You can edit, add or remove questions afterwards</li>
                </ul>
                <div style={{ background: "#fef3c7", borderRadius: 8, padding: "8px 10px", fontSize: 11, color: "#92400e" }}>
                  💡 Select Class &amp; Subject first — AI uses them to generate relevant questions.
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
