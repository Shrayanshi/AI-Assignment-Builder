import { useState, useRef, useEffect, useCallback } from "react";
import { inputStyle } from "./styles";
import { Button } from "../ui/Button";

// ─── Rich Text Toolbar ────────────────────────────────────────────────────────

function RichToolbar({ onCommand, onImageInsert, onLinkInsert }) {
  const tools = [
    { label: "B", title: "Bold", cmd: () => onCommand("bold"), style: { fontWeight: 800 } },
    { label: "I", title: "Italic", cmd: () => onCommand("italic"), style: { fontStyle: "italic" } },
    { label: "U", title: "Underline", cmd: () => onCommand("underline"), style: { textDecoration: "underline" } },
    { label: "H₁", title: "Heading", cmd: () => onCommand("formatBlock", "h3"), style: {} },
    { label: "•—", title: "Bullet list", cmd: () => onCommand("insertUnorderedList"), style: {} },
    { label: "1—", title: "Numbered list", cmd: () => onCommand("insertOrderedList"), style: {} },
  ];

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
      padding: "5px 8px", borderRadius: "8px 8px 0 0",
      background: "#f8fafc", border: "1.5px solid #e2e8f0", borderBottom: "none",
    }}>
      {tools.map(t => (
        <button
          key={t.label}
          title={t.title}
          onMouseDown={e => { e.preventDefault(); t.cmd(); }}
          style={{
            border: "none", background: "none", borderRadius: 6, padding: "3px 8px",
            fontSize: 12, cursor: "pointer", color: "#374151",
            fontFamily: "'DM Sans', sans-serif",
            ...t.style,
            transition: "background 0.1s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#e0e7ff"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
        >
          {t.label}
        </button>
      ))}

      <div style={{ width: 1, height: 18, background: "#e2e8f0", margin: "0 4px" }} />

      {/* Link button */}
      <button
        title="Insert link"
        onMouseDown={e => { e.preventDefault(); onLinkInsert(); }}
        style={{
          border: "none", background: "none", borderRadius: 6, padding: "3px 8px",
          fontSize: 12, cursor: "pointer", color: "#374151",
          fontFamily: "'DM Sans', sans-serif",
          transition: "background 0.1s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "#e0e7ff"}
        onMouseLeave={e => e.currentTarget.style.background = "none"}
      >
        🔗
      </button>

      {/* Image button */}
      <button
        title="Insert image"
        onMouseDown={e => { e.preventDefault(); onImageInsert(); }}
        style={{
          border: "none", background: "none", borderRadius: 6, padding: "3px 8px",
          fontSize: 12, cursor: "pointer", color: "#374151",
          fontFamily: "'DM Sans', sans-serif",
          transition: "background 0.1s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "#e0e7ff"}
        onMouseLeave={e => e.currentTarget.style.background = "none"}
      >
        🖼
      </button>
    </div>
  );
}

// ─── Rich Text Editor (contentEditable) ──────────────────────────────────────

function RichEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const isInternalUpdate = useRef(false);
  const fileInputRef = useRef(null);

  // Sync incoming value into DOM only when it genuinely changes from outside
  useEffect(() => {
    if (!editorRef.current) return;
    if (isInternalUpdate.current) { isInternalUpdate.current = false; return; }
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const execCmd = useCallback((cmd, arg) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg ?? null);
  }, []);

  const handleInput = useCallback(() => {
    isInternalUpdate.current = true;
    onChange(editorRef.current?.innerHTML ?? "");
  }, [onChange]);

  const handleLinkInsert = useCallback(() => {
    const url = window.prompt("Enter URL:", "https://");
    if (!url) return;
    const sel = window.getSelection();
    const text = sel?.toString() || url;
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, `<a href="${url}" target="_blank" style="color:#4f46e5">${text}</a>`);
    onChange(editorRef.current?.innerHTML ?? "");
  }, [onChange]);

  const handleImageInsert = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      editorRef.current?.focus();
      document.execCommand("insertHTML", false,
        `<img src="${ev.target.result}" alt="question image" style="max-width:100%;border-radius:8px;margin:6px 0;display:block;" />`
      );
      onChange(editorRef.current?.innerHTML ?? "");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [onChange]);

  return (
    <div>
      <RichToolbar
        onCommand={execCmd}
        onImageInsert={handleImageInsert}
        onLinkInsert={handleLinkInsert}
      />
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        style={{
          minHeight: 96, padding: "8px 10px",
          border: "1.5px solid #e2e8f0", borderTop: "none",
          borderRadius: "0 0 8px 8px",
          fontSize: 12.5, lineHeight: 1.6, outline: "none",
          fontFamily: "'DM Sans', sans-serif", color: "#0f172a",
          background: "#fff",
        }}
        onFocus={e => e.currentTarget.style.borderColor = "#6366f1"}
        onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
      />
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
    </div>
  );
}

// ─── MCQ Options Builder ──────────────────────────────────────────────────────

const OPTION_LABELS = ["A", "B", "C", "D"];

function MCQOptionsBuilder({ options = [], correctIndex, onChange, onCorrectChange }) {
  function addOption() {
    if (options.length >= 4) return;
    onChange([...options, ""]);
  }
  function removeOption(i) {
    const next = options.filter((_, idx) => idx !== i);
    onChange(next);
    if (correctIndex === i) onCorrectChange(null);
    else if (correctIndex > i) onCorrectChange(correctIndex - 1);
  }

  function updateOption(i, val) {
    const next = [...options];
    next[i] = val;
    onChange(next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Answer Options</span>
        {options.length < 4 && (
          <button
            type="button"
            onClick={addOption}
            style={{
              fontSize: 10, padding: "2px 10px", borderRadius: 999,
              border: "1.5px solid #c7d2fe", background: "#eef2ff",
              color: "#4f46e5", cursor: "pointer", fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            + Add Option
          </button>
        )}
      </div>

      {options.length === 0 && (
        <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>
          No options yet — click "Add Option" to begin.
        </div>
      )}

      {options.map((opt, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {/* Correct answer radio */}
          <label
            title="Mark as correct answer"
            style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", flexShrink: 0 }}
          >
            <input
              type="radio"
              name="correctOption"
              checked={correctIndex === i}
              onChange={() => onCorrectChange(i)}
              style={{ accentColor: "#22c55e", width: 14, height: 14 }}
            />
          </label>

          {/* Option label badge */}
          <span style={{
            width: 22, height: 22, borderRadius: 6,
            background: correctIndex === i ? "#dcfce7" : "#f1f5f9",
            color: correctIndex === i ? "#166534" : "#64748b",
            fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "all 0.15s",
          }}>
            {OPTION_LABELS[i]}
          </span>

          {/* Option text */}
          <input
            type="text"
            value={opt}
            onChange={e => updateOption(i, e.target.value)}
            placeholder={`Option ${OPTION_LABELS[i]}`}
            style={{
              ...inputStyle,
              flex: 1,
              border: correctIndex === i ? "1.5px solid #86efac" : "1.5px solid #e2e8f0",
              background: correctIndex === i ? "#f0fdf4" : "#fff",
            }}
          />

          {/* Remove button */}
          <button
            type="button"
            onClick={() => removeOption(i)}
            title="Remove option"
            style={{
              border: "none", background: "none", cursor: "pointer",
              color: "#94a3b8", fontSize: 16, padding: "0 2px", lineHeight: 1,
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
            onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
          >
            ×
          </button>
        </div>
      ))}

      {options.length > 0 && correctIndex == null && (
        <div style={{ fontSize: 10, color: "#f59e0b", display: "flex", alignItems: "center", gap: 4 }}>
          ⚠ Select the correct answer by clicking the radio button.
        </div>
      )}
    </div>
  );
}

// ─── Editor Modal ─────────────────────────────────────────────────────────────

export function EditorModal({ mode, draft, onChangeDraft, onSave, onCancel }) {
  const isCreate = mode === "create";
  const isMCQ = draft.type === "MCQ";
  const fields = [
    {
      label: "Type", field: "type",
      el: (
        <select value={draft.type} onChange={e => onChangeDraft("type", e.target.value)} style={inputStyle}>
          <option>MCQ</option>
          <option>FRQ</option>
        </select>
      ),
    },
    {
      label: "Marks", field: "marks",
      el: (
        <input type="number" min={1} value={draft.marks}
          onChange={e => onChangeDraft("marks", Number(e.target.value) || 1)} style={inputStyle} />
      ),
    },
    {
      label: "Difficulty (1–5)", field: "difficulty",
      el: (
        <input type="number" min={1} max={5} value={draft.difficulty ?? ""} placeholder="1–5"
          onChange={e => onChangeDraft("difficulty", e.target.value ? Number(e.target.value) : null)} style={inputStyle} />
      ),
    },
    {
      label: "Topic", field: "topic",
      el: (
        <input type="text" value={draft.topic ?? ""} placeholder="e.g. Algebra"
          onChange={e => onChangeDraft("topic", e.target.value)} style={inputStyle} />
      ),
    },
  ];

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, backdropFilter: "blur(4px)",
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#ffffff", borderRadius: 20, padding: "28px 28px 24px",
          width: "100%", maxWidth: 600,
          maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 32px 80px rgba(0,0,0,0.2)",
          display: "flex", flexDirection: "column", gap: 16,
        }}
      >
        {/* Title */}
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Sora', sans-serif" }}>
          {isCreate ? "✦ New Question" : "✎ Edit Question"}
        </div>

        {/* Metadata grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
          {fields.map(({ label, field, el }) => (
            <label key={field} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>{label}</span>
              {el}
            </label>
          ))}
          <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1/-1" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Subject</span>
            <input type="text" value={draft.subject ?? ""} placeholder="e.g. Mathematics, Science"
              onChange={e => onChangeDraft("subject", e.target.value)} style={inputStyle} />
          </label>
        </div>

        {/* Rich question text */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>
            Question Text <span style={{ color: "#ef4444" }}>*</span>
          </span>
          <RichEditor
            value={draft.richText ?? draft.text ?? ""}
            onChange={val => {
              // strip HTML for plain text fallback, keep richText for rendering
              const plain = val.replace(/<[^>]+>/g, "").trim();
              onChangeDraft("richText", val);
              onChangeDraft("text", plain || val);
            }}
          />
        </div>

        {/* MCQ Options (only when MCQ type) */}
        {isMCQ && (
          <MCQOptionsBuilder
            options={draft.options ?? []}
            correctIndex={draft.correctIndex ?? null}
            onChange={opts => onChangeDraft("options", opts)}
            onCorrectChange={idx => onChangeDraft("correctIndex", idx)}
          />
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave}>
            {isCreate ? "Create Question" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}