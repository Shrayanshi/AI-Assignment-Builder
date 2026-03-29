import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";

const inputStyle = {
  marginTop: 4, width: "100%", padding: "8px 10px",
  borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13,
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};

export function QuestionPaperSetup({ onBack, onContinue, initialTemplate, creating = false }) {
  const [formData, setFormData] = useState(
    initialTemplate || {
      schoolName: "",
      schoolAddress: "",
      grade: "",
      subject: "",
      examType: "",
      duration: "",
      totalMarks: "",
      academicYear: "",
      date: "",
    }
  );
  const [rightTab, setRightTab] = useState("preview"); // "preview" | "ai"

  // AI-specific fields
  const [aiTopics, setAiTopics]       = useState("");
  const [aiCount, setAiCount]         = useState(10);
  const [aiDifficulty, setAiDifficulty] = useState(3);
  const [aiType, setAiType]           = useState("MCQ");

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isAiMode = rightTab === "ai";

  const handleContinue = () => {
    if (onContinue) {
      if (isAiMode) {
        onContinue({ ...formData, ai: { topics: aiTopics, count: aiCount, difficulty: aiDifficulty, type: aiType } });
      } else {
        onContinue(formData);
      }
    }
  };

  const isFormValid =
    formData.schoolName && formData.grade && formData.subject && formData.examType;

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb" }}>
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {onBack && (
            <div>
              <Button variant="ghost" onClick={onBack} style={{ padding: "8px 12px", minHeight: "auto" }}>
                ← Back
              </Button>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "#dbeafe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              📄
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Question Paper Setup</h1>
              <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                Enter question paper details and school information.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "24px 24px 40px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 2.2fr) minmax(0, 1.2fr)",
          gap: 16,
        }}
        className="qp-setup-grid"
      >
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Paper Details</CardTitle>
              <CardDescription>This information will appear in the question paper header.</CardDescription>
            </CardHeader>

            <div style={{ paddingTop: 4, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>School Information</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label htmlFor="schoolName" style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>School Name *</label>
                    <input
                      id="schoolName"
                      value={formData.schoolName}
                      onChange={(e) => handleChange("schoolName", e.target.value)}
                      placeholder="e.g., Delhi Public School"
                      style={{ marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label htmlFor="schoolAddress" style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>School Address</label>
                    <textarea
                      id="schoolAddress"
                      value={formData.schoolAddress}
                      onChange={(e) => handleChange("schoolAddress", e.target.value)}
                      placeholder="e.g., Sector 45, Gurgaon, Haryana - 122003"
                      rows={2}
                      style={{ marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical" }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Exam Information</h3>
                <div className="qp-exam-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                  <div>
                    <label htmlFor="grade" style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>Grade/Class *</label>
                    <select
                      id="grade"
                      value={formData.grade}
                      onChange={(e) => handleChange("grade", e.target.value)}
                      style={{ marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
                    >
                      <option value="">Select grade</option>
                      {["6", "7", "8", "9", "10", "11", "12"].map((g) => (
                        <option key={g} value={`Grade ${g}`}>Grade {g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="subject" style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>Subject *</label>
                    <select
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => handleChange("subject", e.target.value)}
                      style={{ marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
                    >
                      <option value="">Select subject</option>
                      {["Mathematics", "Science", "Physics", "Chemistry", "Biology", "English", "History", "Geography", "Computer Science"].map((subj) => (
                        <option key={subj} value={subj}>{subj}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="examType" style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>Exam Type *</label>
                    <select
                      id="examType"
                      value={formData.examType}
                      onChange={(e) => handleChange("examType", e.target.value)}
                      style={{ marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
                    >
                      <option value="">Select exam type</option>
                      <option value="Mid Term">Mid Term Examination</option>
                      <option value="Half Yearly">Half Yearly Examination</option>
                      <option value="Annual">Annual Examination</option>
                      <option value="Pre-Board">Pre-Board Examination</option>
                      <option value="Unit Test">Unit Test</option>
                      <option value="Weekly Test">Weekly Test</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="academicYear" style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>Academic Year</label>
                    <input
                      id="academicYear"
                      value={formData.academicYear}
                      onChange={(e) => handleChange("academicYear", e.target.value)}
                      placeholder="e.g., 2025-2026"
                      style={{ marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label htmlFor="duration" style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>Duration</label>
                    <input
                      id="duration"
                      value={formData.duration}
                      onChange={(e) => handleChange("duration", e.target.value)}
                      placeholder="e.g., 3 hours"
                      style={{ marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label htmlFor="totalMarks" style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>Total Marks</label>
                    <input
                      id="totalMarks"
                      type="number"
                      value={formData.totalMarks}
                      onChange={(e) => handleChange("totalMarks", e.target.value)}
                      placeholder="e.g., 100"
                      style={{ marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label htmlFor="date" style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>Exam Date</label>
                    <input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleChange("date", e.target.value)}
                      style={{ marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, gap: 8 }}>
            {onBack && (
              <Button variant="secondary" onClick={onBack}>
                Cancel
              </Button>
            )}
            <div style={{ flex: 1, textAlign: "right" }}>
              <Button onClick={handleContinue} disabled={!isFormValid || creating} style={{ opacity: creating ? 0.7 : 1 }}>
                {creating
                  ? (isAiMode ? "Generating & Creating…" : "Creating…")
                  : (isAiMode ? "✨ Generate & Create →" : "Continue to Add Questions →")}
              </Button>
            </div>
          </div>
        </div>

        <div className="qp-setup-preview">
          <Card style={{ position: "sticky", top: 24 }}>
            {/* Tab toggle */}
            <div style={{ display: "flex", gap: 4, marginBottom: 12, background: "#f3f4f6", borderRadius: 8, padding: 3 }}>
              {[
                { key: "preview", label: "📄 Preview" },
                { key: "ai",     label: "✨ Generate with AI" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setRightTab(key)}
                  style={{
                    flex: 1, padding: "6px 4px", borderRadius: 6, border: "none", cursor: "pointer",
                    fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 12, fontWeight: 600,
                    background: rightTab === key ? "#ffffff" : "transparent",
                    color: rightTab === key ? "#4f46e5" : "#6b7280",
                    boxShadow: rightTab === key ? "0 1px 4px rgba(0,0,0,0.09)" : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {rightTab === "preview" ? (
              <>
                <CardHeader style={{ padding: 0, marginBottom: 8 }}>
                  <CardTitle style={{ fontSize: 13 }}>Preview</CardTitle>
                  <CardDescription style={{ fontSize: 11 }}>How it will appear on the question paper</CardDescription>
                </CardHeader>
                <div style={{ borderRadius: 8, border: "1px solid #e5e7eb", padding: 12, background: "#ffffff", fontSize: 11, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ textAlign: "center", borderBottom: "1px solid #e5e7eb", paddingBottom: 8 }}>
                    <p style={{ fontWeight: 700, fontSize: 12, margin: 0 }}>{formData.schoolName || "School Name"}</p>
                    <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{formData.schoolAddress || "School Address"}</p>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontWeight: 600, margin: 0 }}>{formData.examType || "Exam Type"}</p>
                    <p style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>Academic Year: {formData.academicYear || "YYYY-YYYY"}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 4 }}>
                    <div><span style={{ color: "#6b7280" }}>Class: </span>{formData.grade || "Grade X"}</div>
                    <div><span style={{ color: "#6b7280" }}>Subject: </span>{formData.subject || "Subject"}</div>
                    <div><span style={{ color: "#6b7280" }}>Duration: </span>{formData.duration || "-- hours"}</div>
                    <div><span style={{ color: "#6b7280" }}>Max Marks: </span>{formData.totalMarks || "--"}</div>
                    {formData.date && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <span style={{ color: "#6b7280" }}>Date: </span>{new Date(formData.date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div style={{ borderTop: "1px dashed #e5e7eb", paddingTop: 8, textAlign: "center" }}>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Questions will appear below this header</p>
                  </div>
                </div>
              </>
            ) : (
              /* AI Generate panel */
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ margin: 0, fontSize: 12, color: "#4338ca", fontWeight: 600 }}>
                  ✨ AI will generate questions matching this paper's grade &amp; subject
                </p>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>
                    Topics <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional, comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={aiTopics}
                    onChange={e => setAiTopics(e.target.value)}
                    placeholder="e.g. Photosynthesis, Cell Division"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}># of Questions</label>
                    <input
                      type="number" min={1} max={30} value={aiCount}
                      onChange={e => setAiCount(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>Type</label>
                    <select value={aiType} onChange={e => setAiType(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                      <option value="MCQ">MCQ</option>
                      <option value="FRQ">Short Answer</option>
                      <option value="Mixed">Mixed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>
                    Difficulty: <span style={{ color: "#4f46e5" }}>{["", "Easy", "Easy-Med", "Medium", "Med-Hard", "Hard"][aiDifficulty]}</span>
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>Easy</span>
                    <input
                      type="range" min={1} max={5} value={aiDifficulty}
                      onChange={e => setAiDifficulty(Number(e.target.value))}
                      style={{ flex: 1, accentColor: "#4f46e5" }}
                    />
                    <span style={{ fontSize: 11, color: "#6b7280" }}>Hard</span>
                  </div>
                </div>

                <div style={{ background: "#fef3c7", borderRadius: 8, padding: "8px 10px", fontSize: 11, color: "#92400e" }}>
                  💡 Fill in School Name, Grade, Subject &amp; Exam Type on the left before generating.
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
