import { useState } from "react";
import { DiffBadge, TypeBadge } from "./Badges";
import { chipStyle } from "./styles";
import { Button } from "../ui/Button";

const OPT_LABELS = ["A", "B", "C", "D"];

export function QuestionCard({
  question,
  isActive,
  isChecked,
  onCheck,
  onClick,
  onEdit,
  onDelete,
}) {
  const [hovered, setHovered] = useState(false);
  const hasOptions = question.type === "MCQ"
    && Array.isArray(question.options)
    && question.options.length > 0;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 14,
        border: `1.5px solid #e2e8f0`,
        background: "#ffffff",
        padding: "11px 13px",
        marginBottom: 8,
        cursor: "pointer",
        transition: "all 0.14s ease",
        display: "flex",
        gap: 10,
        boxShadow: "0 2px 6px rgba(15,23,42,0.03)",
      }}
    >
      {/* Checkbox */}
      <div style={{ paddingTop: 2, flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={e => { e.stopPropagation(); onCheck(); }}
          onClick={e => e.stopPropagation()}
          style={{ accentColor: "#6366f1", width: 14, height: 14, cursor: "pointer" }}
        />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Question text — truncated with hover controls */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
            marginBottom: 6,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {question.richText ? (
              <RichPreview html={question.richText} />
            ) : (
              <div
                style={{
                  fontSize: 12.5,
                  color: "#0f172a",
                  lineHeight: 1.55,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {question.text}
              </div>
            )}
          </div>
          {hovered && (
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: 4,
                flexShrink: 0,
                marginLeft: 4,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {onEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  title="Edit question"
                  onClick={onEdit}
                  style={{ padding: "4px 8px", minHeight: "auto", fontSize: 12, color: "#4b5563" }}
                >
                  ✎ Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  title="Delete question"
                  onClick={onDelete}
                  style={{ padding: "4px 8px", minHeight: "auto", fontSize: 12, color: "#b91c1c" }}
                >
                  🗑 Delete
                </Button>
              )}
            </div>
          )}
        </div>

        {/* MCQ Options */}
        {hasOptions && (
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6, marginBottom: 6 }}>
            {question.options.map((opt, i) => {
              const isCorrect = question.correctIndex === i;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "3px 8px", borderRadius: 6,
                    background: isCorrect ? "#f0fdf4" : "#f8fafc",
                    border: `1px solid ${isCorrect ? "#86efac" : "#e2e8f0"}`,
                  }}
                >
                  <span style={{
                    fontSize: 9, fontWeight: 700, width: 16, height: 16,
                    borderRadius: 4, flexShrink: 0,
                    background: isCorrect ? "#dcfce7" : "#e2e8f0",
                    color: isCorrect ? "#166534" : "#64748b",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {OPT_LABELS[i]}
                  </span>
                  <span style={{
                    fontSize: 11, color: isCorrect ? "#15803d" : "#374151",
                    fontWeight: isCorrect ? 600 : 400,
                    flex: 1, minWidth: 0,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {opt}
                  </span>
                  {isCorrect && (
                    <span style={{ fontSize: 9, color: "#22c55e", fontWeight: 700, flexShrink: 0 }}>
                      ✓ Correct
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
            <TypeBadge type={question.type} />
            <span style={chipStyle}>{question.marks} pts</span>
            {question.difficulty && <DiffBadge level={question.difficulty} />}
            {question.topic && <span style={chipStyle}>{question.topic}</span>}
          </div>
          {question.subject && (
            <span style={{
              fontSize: 10, color: "#94a3b8",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130,
            }}>
              {question.subject}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Rich HTML preview with constrained image sizes ──────────────────────────

function RichPreview({ html }) {
  // Extract images from HTML and show them as a small thumbnail strip.
  // Render the text portion with a 2-line clamp.
  const imgSrcs = [];
  const imgTagRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
  let match;
  while ((match = imgTagRegex.exec(html)) !== null) {
    imgSrcs.push(match[1]);
  }

  // Strip all tags to get plain text for the clamped preview
  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  return (
    <div style={{ marginBottom: 7 }}>
      {/* Text preview — 2 line clamp */}
      <div style={{
        fontSize: 12.5, color: "#0f172a", lineHeight: 1.55,
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {plain}
      </div>

      {/* Image thumbnails */}
      {imgSrcs.length > 0 && (
        <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
          {imgSrcs.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`attachment ${i + 1}`}
              style={{
                height: 48, width: "auto", maxWidth: 90,
                objectFit: "cover",
                borderRadius: 6,
                border: "1px solid #e2e8f0",
              }}
              onClick={e => {
                e.stopPropagation();
                window.open(src, "_blank");
              }}
              title="Click to view full image"
            />
          ))}
          {imgSrcs.length > 0 && (
            <span style={{
              fontSize: 9, color: "#94a3b8", alignSelf: "flex-end", paddingBottom: 2,
            }}>
              {imgSrcs.length} image{imgSrcs.length > 1 ? "s" : ""} attached
            </span>
          )}
        </div>
      )}
    </div>
  );
}