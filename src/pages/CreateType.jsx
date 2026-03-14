import { useState } from "react";
import { CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

const CARDS = [
  {
    key: "paper",
    icon: "📄",
    iconBg: "#dbeafe",
    iconColor: "#1d4ed8",
    borderHover: "#3b82f6",
    shadowHover: "0 8px 20px rgba(37,99,235,0.25)",
    title: "Question Paper",
    description:
      "Create a formal question paper with school header, exam details, and structured questions for exams.",
    features: [
      "School name & address header",
      "Exam type (Mid Term, Annual, etc.)",
      "Grade, subject, total marks",
      "Professional PDF export",
    ],
  },
  {
    key: "assignment",
    icon: "📝",
    iconBg: "#dcfce7",
    iconColor: "#16a34a",
    borderHover: "#22c55e",
    shadowHover: "0 8px 20px rgba(34,197,94,0.25)",
    title: "Assignment",
    description:
      "Create a simple assignment without formal headers. Perfect for homework and practice sets.",
    features: [
      "Quick and simple setup",
      "Custom assignment title",
      "No formal header required",
      "Export to PDF/DOC",
    ],
  },
];

export function CreateTypePage({ onBack, onCreateQuestionPaper, onCreateAssignment }) {
  const [hoverCard, setHoverCard] = useState(null);

  const handlers = {
    paper: onCreateQuestionPaper,
    assignment: onCreateAssignment,
  };

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Create New</h1>
              <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                Choose what you want to create.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px 40px" }}>
        <div className="create-type-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {CARDS.map((card) => {
            const isHovered = hoverCard === card.key;
            return (
              <div
                key={card.key}
                onClick={() => handlers[card.key]?.()}
                onMouseEnter={() => setHoverCard(card.key)}
                onMouseLeave={() => setHoverCard(null)}
                style={{
                  padding: 24,
                  borderRadius: 12,
                  background: "#ffffff",
                  cursor: "pointer",
                  border: `1.5px solid ${isHovered ? card.borderHover : "#e5e7eb"}`,
                  boxShadow: isHovered ? card.shadowHover : "0 2px 8px rgba(15,23,42,0.04)",
                  transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                  transition: "border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "999px",
                    background: card.iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                    fontSize: 28,
                    color: card.iconColor,
                  }}
                >
                  {card.icon}
                </div>
                <CardHeader>
                  <CardTitle>{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <ul style={{ marginTop: 16, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                  {card.features.map((f) => (
                    <li key={f} style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5 }}>✓ {f}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
