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

const labelStyle = { fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" };
const selectStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1.5px solid #e5e7eb", fontSize: 14, color: "#111827",
  background: "#ffffff", fontFamily: "'DM Sans', system-ui, sans-serif",
  outline: "none", appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
};

export function AssignmentSetup({ onBack, onContinue, creating = false }) {
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [errors, setErrors] = useState({});

  function handleContinue() {
    const e = {};
    if (!grade) e.grade = "Please select a class.";
    if (!subject) e.subject = "Please select a subject.";
    if (Object.keys(e).length) { setErrors(e); return; }
    onContinue({ grade, subject });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#ffffff", borderRadius: 20, padding: "36px 32px", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>

        {/* Back */}
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 13, padding: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}
        >
          ← Back
        </button>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>
          New Assignment
        </h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 28px" }}>
          Select the class and subject to get a focused question bank.
        </p>

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
        <div style={{ marginBottom: 28 }}>
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

        <Button style={{ width: "100%", opacity: creating ? 0.7 : 1 }} onClick={handleContinue} disabled={creating}>
          {creating ? "Creating…" : "Continue →"}
        </Button>
      </div>
    </div>
  );
}
