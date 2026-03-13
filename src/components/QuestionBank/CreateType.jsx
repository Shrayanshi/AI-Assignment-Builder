import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { primaryBtnStyle } from "./styles";

export function CreateTypePage({
  onBack,
  onCreateQuestionPaper,
  onCreateAssignment,
}) {
  const handleBack = () => {
    if (onBack) onBack();
  };

  const handleQuestionPaper = () => {
    if (onCreateQuestionPaper) onCreateQuestionPaper();
  };

  const handleAssignment = () => {
    if (onCreateAssignment) onCreateAssignment();
  };

  const [hoverCard, setHoverCard] = useState(null); // 'paper' | 'assignment' | null

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Header */}
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
              <Button variant="ghost" onClick={handleBack} style={{ padding: "4px 8px", fontSize: 12 }}>
                ← Back
              </Button>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Create New</h1>
              <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                Choose what you want to create.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "32px 24px 40px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {/* Question Paper */}
          <Card
            onClick={handleQuestionPaper}
            onMouseEnter={() => setHoverCard("paper")}
            onMouseLeave={() => setHoverCard(null)}
            style={{
              padding: 24,
              borderColor: hoverCard === "paper" ? "#3b82f6" : "#e5e7eb",
              boxShadow:
                hoverCard === "paper"
                  ? "0 8px 20px rgba(37,99,235,0.25)"
                  : "0 2px 8px rgba(15,23,42,0.04)",
              transform: hoverCard === "paper" ? "translateY(-1px)" : "none",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "999px",
                  background: "#dbeafe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                  fontSize: 28,
                  color: "#1d4ed8",
                }}
              >
                📄
              </div>

              <CardHeader>
                <CardTitle>Question Paper</CardTitle>
                <CardDescription>
                  Create a formal question paper with school header, exam details, and structured questions for exams.
                </CardDescription>
              </CardHeader>

              <div
                style={{
                  marginTop: 16,
                  fontSize: 11,
                  color: "#6b7280",
                  textAlign: "left",
                  lineHeight: 1.5,
                }}
              >
                <p>✓ School name & address header</p>
                <p>✓ Exam type (Mid Term, Annual, etc.)</p>
                <p>✓ Grade, subject, total marks</p>
                <p>✓ Professional PDF export</p>
              </div>
            </div>
          </Card>

          {/* Assignment */}
          <Card
            onClick={handleAssignment}
            onMouseEnter={() => setHoverCard("assignment")}
            onMouseLeave={() => setHoverCard(null)}
            style={{
              padding: 24,
              borderColor: hoverCard === "assignment" ? "#22c55e" : "#e5e7eb",
              boxShadow:
                hoverCard === "assignment"
                  ? "0 8px 20px rgba(34,197,94,0.25)"
                  : "0 2px 8px rgba(15,23,42,0.04)",
              transform: hoverCard === "assignment" ? "translateY(-1px)" : "none",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "999px",
                  background: "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                  fontSize: 28,
                  color: "#16a34a",
                }}
              >
                📝
              </div>

              <CardHeader>
                <CardTitle>Assignment</CardTitle>
                <CardDescription>
                  Create a simple assignment without formal headers. Perfect for homework and practice sets.
                </CardDescription>
              </CardHeader>

              <div
                style={{
                  marginTop: 16,
                  fontSize: 11,
                  color: "#6b7280",
                  textAlign: "left",
                  lineHeight: 1.5,
                }}
              >
                <p>✓ Quick and simple setup</p>
                <p>✓ Custom assignment title</p>
                <p>✓ No formal header required</p>
                <p>✓ Export to PDF/DOC</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
