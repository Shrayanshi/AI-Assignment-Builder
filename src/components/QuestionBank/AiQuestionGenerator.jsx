import { useState } from "react";
import { panelStyle, inputStyle } from "./styles";
import { Button } from "../ui/Button";

/**
 * AI Question Generator panel.
 * Renders a small form that calls the backend and
 * passes generated questions back up to the parent via onQuestionsGenerated.
 */
export function AiQuestionGenerator({ onQuestionsGenerated }) {
  const [grade, setGrade] = useState("10");
  const [subject, setSubject] = useState("Mathematics");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [type, setType] = useState("MCQ");
  const [count, setCount] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          grade: Number(grade),
          subject,
          topic,
          difficulty: Number(difficulty),
          type,
          count: Number(count),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      const questions = await res.json();
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Backend returned no questions.");
      }

      // Bubble questions up to parent so they can be merged into state.
      onQuestionsGenerated(questions);
    } catch (err) {
      console.error("AI generation error:", err);
      setError(err.message || "Something went wrong while generating questions.");
    } finally {
      setIsLoading(false);
    }
  }

  const Chevron = ({ open }) => (
    <span
      style={{
        display: "inline-block",
        transition: "transform 0.15s ease",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        fontSize: 11,
        color: "#4b5563",
      }}
    >
      ▼
    </span>
  );

  return (
    <section
      style={{
        ...panelStyle,
        marginBottom: 10,
        padding: 0,
        overflow: "hidden",
        borderRadius: 16,
        background: "#eef2ff",
        border: "1px solid #c7d2fe",
      }}
    >
      {/* Header bar */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        style={{
          width: "100%",
          border: "none",
          background: "linear-gradient(135deg, #eef2ff, #e0e7ff)",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: "#111827",
          }}
        >
          <span>AI Question Generator ✨</span>
        </div>
        <Chevron open={isExpanded} />
      </button>

      {/* Collapsible body */}
      {isExpanded && (
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "8px 10px 10px",
          }}
        >

          {/* Row 1 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 6,
              alignItems: "flex-end",
            }}
          >
          {/* Grade */}
          <label
            style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11 }}
          >
            <span style={{ fontWeight: 600, color: "#4b5563" }}>Grade</span>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              style={{ ...inputStyle, paddingRight: 24, fontSize: 12 }}
            >
              {Array.from({ length: 7 }).map((_, i) => {
                const g = 6 + i;
                return (
                  <option key={g} value={g}>
                    {g}
                  </option>
                );
              })}
            </select>
          </label>

          {/* Subject */}
          <label
            style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11 }}
          >
            <span style={{ fontWeight: 600, color: "#4b5563" }}>Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Mathematics"
              style={{ ...inputStyle, fontSize: 12 }}
            />
          </label>

          {/* Topic */}
          <label
            style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11 }}
          >
            <span style={{ fontWeight: 600, color: "#4b5563" }}>Topic</span>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Quadratic Equations"
              style={{ ...inputStyle, fontSize: 12 }}
            />
          </label>
          </div>

          {/* Row 2 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 6,
              alignItems: "center",
            }}
          >
          {/* Type */}
          <label
            style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11 }}
          >
            <span style={{ fontWeight: 600, color: "#4b5563" }}>Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ ...inputStyle, paddingRight: 24, fontSize: 12 }}
            >
              <option value="MCQ">MCQ</option>
              <option value="FRQ">FRQ</option>
            </select>
          </label>

          {/* Difficulty slider with labels */}
          <label
            style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11 }}
          >
            <span style={{ fontWeight: 600, color: "#4b5563" }}>
              Difficulty: {difficulty}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "#6b7280" }}>Easy</span>
              <input
                type="range"
                min={1}
                max={5}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 10, color: "#6b7280" }}>Hard</span>
            </div>
          </label>

          {/* Count */}
          <label
            style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11 }}
          >
            <span style={{ fontWeight: 600, color: "#4b5563" }}># of Questions</span>
            <input
              type="number"
              min={1}
              max={10}
              value={count}
              onChange={(e) =>
                setCount(Math.min(10, Math.max(1, Number(e.target.value) || 1)))
              }
              style={{ ...inputStyle, fontSize: 12 }}
            />
          </label>

          </div>

          {/* Row 3: full-width button */}
          <div>
            <Button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                justifyContent: "center",
                background: isLoading ? "#a5b4fc" : undefined,
                boxShadow: isLoading ? "none" : "0 6px 18px rgba(99,102,241,0.3)",
              }}
            >
              {isLoading ? (
                <>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "999px",
                      border: "2px solid rgba(255,255,255,0.6)",
                      borderTopColor: "#ffffff",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  Generating…
                </>
              ) : (
                "Generate Questions"
              )}
            </Button>
          </div>

          {error && (
            <div
              style={{
                fontSize: 11,
                color: "#b91c1c",
                background: "#fee2e2",
                borderRadius: 8,
                padding: "6px 8px",
              }}
            >
              {error}
            </div>
          )}
        </form>
      )}
    </section>
  );
}

