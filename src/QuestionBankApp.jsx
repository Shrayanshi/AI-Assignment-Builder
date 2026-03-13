import { useState, useEffect } from "react";
import { EditorModal } from "./components/QuestionBank/EditorModal";
import { AssignmentRow } from "./components/QuestionBank/AssignmentRow";
import { QuestionCard } from "./components/QuestionBank/QuestionCard";
import { AiQuestionGenerator } from "./components/QuestionBank/AiQuestionGenerator";
import {
  panelStyle,
  primaryBtnStyle,
  secondaryBtnStyle,
  inputStyle,
} from "./components/QuestionBank/styles";

// ─── Data ─────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "qb-assignment-state-v2";

const SAMPLE_QUESTIONS = [
  {
    id: "q1", type: "MCQ", marks: 4, difficulty: 3,
    topic: "Quadratic Equations", rubric: "Graphs – Rubric 1",
    text: "In the quaint village of Silverwood, an unprecedented explosion in the glowworm population causes the meadow's brightness to double every hour. If the brightness at 6 PM is represented by I(0) and follows I(t) = I(0) · 2^t, what is the brightness at 9 PM?",
    richText: "In the quaint village of Silverwood, an unprecedented explosion in the glowworm population causes the meadow's brightness to double every hour. If the brightness at 6 PM is represented by I(0) and follows I(t) = I(0) · 2^t, what is the brightness at 9 PM?",
    options: ["I(0)", "4·I(0)", "8·I(0)", "16·I(0)"],
    correctIndex: 2,
  },
  {
    id: "q2", type: "MCQ", marks: 2, difficulty: 2,
    topic: "Linear Functions", rubric: "Slope & Intercept – Rubric 1",
    text: "A bakery sells loaves of bread for a fixed price plus a one-time packaging fee. Which of the following graphs best represents this relationship between number of loaves and total cost?",
    richText: "A bakery sells loaves of bread for a fixed price plus a one-time packaging fee. Which of the following graphs best represents this relationship between number of loaves and total cost?",
    options: ["A curve starting at the origin", "A line through the origin", "A horizontal line", "A line with a positive y-intercept"],
    correctIndex: 3,
  },
  {
    id: "q3", type: "FRQ", marks: 5, difficulty: 4,
    topic: "Calculus – Limits", rubric: "Conceptual Understanding – Rubric 2",
    text: "Explain, in your own words, what it means for the limit of f(x) as x approaches a to exist. Provide an example where the limit exists but f(a) is undefined.",
    richText: "Explain, in your own words, what it means for the limit of f(x) as x approaches a to exist. Provide an example where the limit exists but f(a) is undefined.",
  },
  {
    id: "q4", type: "MCQ", marks: 3, difficulty: 1,
    topic: "Statistics – Mean", rubric: "Basic Skills – Rubric 1",
    text: "A class of 5 students scores 10, 12, 18, 20 and 20 on a quiz. What is the mean score?",
    richText: "A class of 5 students scores 10, 12, 18, 20 and 20 on a quiz. What is the mean score?",
    options: ["14", "16", "18", "20"],
    correctIndex: 1,
  },
];

const AI_QUESTIONS = [
  {
    id: "ai-1", type: "MCQ", marks: 4, difficulty: 3,
    topic: "Sets & Power Sets", rubric: "Combinatorics – Rubric",
    text: "I have a set with 105 elements. How many elements will the power set of this set have?",
    richText: "I have a set with 105 elements. How many elements will the power set of this set have?",
    options: ["105", "2^105", "105²", "105!"],
    correctIndex: 1,
  },
  {
    id: "ai-2", type: "MCQ", marks: 2, difficulty: 1,
    topic: "Set Notation", rubric: "Foundations – Rubric",
    text: "What notation is typically used to denote the power set of a set A?",
    richText: "What notation is typically used to denote the power set of a set A?",
    options: ["P(A)", "A*", "|A|", "A^"],
    correctIndex: 0,
  },
  {
    id: "ai-3", type: "FRQ", marks: 5, difficulty: 4,
    topic: "Set Theory – Complements", rubric: "Problem Solving – Rubric",
    text: "X, Y and Z are 3 sets, and U is the universal set, such that n(U) = 800, n(X) = 200, n(Y) = 300 and n(X∩Y) = 100. Find n(X'∩Y'). Explain your reasoning.",
    richText: "X, Y and Z are 3 sets, and U is the universal set, such that n(U) = 800, n(X) = 200, n(Y) = 300 and n(X∩Y) = 100. Find n(X'∩Y'). Explain your reasoning.",
  },
  {
    id: "ai-4", type: "MCQ", marks: 3, difficulty: 2,
    topic: "Geometry – Angles", rubric: "Visualization – Rubric",
    text: "The earth–moon distance is about 60 earth radii. Approximately what is the angular diameter of the earth as seen from the moon (in degrees)?",
    richText: "The earth–moon distance is about 60 earth radii. Approximately what is the angular diameter of the earth as seen from the moon (in degrees)?",
    options: ["~1°", "~2°", "~5°", "~10°"],
    correctIndex: 1,
  },
];

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);

      // Build lookup of built-in sample/AI questions
      const byId = {};
      [...SAMPLE_QUESTIONS, ...AI_QUESTIONS].forEach(baseQ => {
        byId[baseQ.id] = baseQ;
      });

      const questionsFromStorage = Array.isArray(parsed.questions)
        ? parsed.questions.map(storedQ => {
          const base = byId[storedQ.id];
          if (!base) return storedQ;

          // Start with base, then overlay stored values
          const merged = { ...base, ...storedQ };

          // If this is a built‑in MCQ and stored options are missing or empty,
          // fall back to the default options/correctIndex from the base definition.
          const storedOpts = storedQ.options;
          const baseOpts = base.options;
          if (
            Array.isArray(baseOpts) &&
            baseOpts.length > 0 &&
            (!Array.isArray(storedOpts) || storedOpts.length === 0)
          ) {
            merged.options = baseOpts;
            merged.correctIndex =
              typeof base.correctIndex === "number" ? base.correctIndex : null;
          }

          // Ensure correctIndex is in range if options exist
          if (Array.isArray(merged.options) && merged.options.length > 0) {
            const idx = merged.correctIndex;
            if (idx == null || idx < 0 || idx >= merged.options.length) {
              merged.correctIndex =
                typeof base?.correctIndex === "number" &&
                  base.correctIndex >= 0 &&
                  base.correctIndex < merged.options.length
                  ? base.correctIndex
                  : null;
            }
          }

          return merged;
        })
        : SAMPLE_QUESTIONS;

      return {
        questions: questionsFromStorage,
        assignments: parsed.assignments ?? [],
        activeAssignmentId: parsed.activeAssignmentId ?? parsed.assignments?.[0]?.id ?? null,
        search: parsed.search ?? "",
      };
    }
  } catch { }
  const defaultAssignment = { id: "a-1", name: "Algebra Practice", questionIds: ["q1", "q2"] };
  return {
    questions: SAMPLE_QUESTIONS,
    assignments: [defaultAssignment],
    activeAssignmentId: "a-1",
    search: "",
  };
}

export default function App() {
  const initial = loadInitialState();
  const [questions, setQuestions] = useState(initial.questions);
  const [assignments, setAssignments] = useState(initial.assignments);
  const [activeAssignmentId, setActiveAssignmentId] = useState(initial.activeAssignmentId);
  const [search, setSearch] = useState(initial.search);
  const [activeQuestionId, setActiveQuestionId] = useState(
    () => assignments.find(a => a.id === initial.activeAssignmentId)?.questionIds[0] ?? questions[0]?.id ?? null
  );
  const [editorMode, setEditorMode] = useState(null);
  const [editorDraft, setEditorDraft] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ questions, assignments, activeAssignmentId, search }));
    } catch { }
  }, [questions, assignments, activeAssignmentId, search]);

  const activeAssignment = assignments.find(a => a.id === activeAssignmentId) ?? null;
  const assignmentQuestions = (activeAssignment?.questionIds ?? [])
    .map(id => questions.find(q => q.id === id))
    .filter(Boolean);
  const selectedIds = new Set(activeAssignment?.questionIds ?? []);
  const filteredQuestions = questions.filter(q =>
    !search.trim() || q.text.toLowerCase().includes(search.trim().toLowerCase())
  );
  const totalMarks = assignmentQuestions.reduce((s, q) => s + (q.marks || 0), 0);
  const [titleDraft, setTitleDraft] = useState(activeAssignment?.name ?? "");

  useEffect(() => {
    setTitleDraft(activeAssignment?.name ?? "");
  }, [activeAssignmentId]);

  function updateAssignmentIds(nextIds) {
    setAssignments(prev => prev.map(a => a.id === activeAssignmentId ? { ...a, questionIds: nextIds } : a));
  }

  function toggleQuestion(qid) {
    if (!activeAssignment) return;
    if (selectedIds.has(qid)) {
      updateAssignmentIds(activeAssignment.questionIds.filter(id => id !== qid));
    } else {
      updateAssignmentIds([...activeAssignment.questionIds, qid]);
    }
  }

  function createAssignment() {
    const name = window.prompt("New assignment name:");
    if (!name) return;
    const id = `a-${Date.now().toString(36)}`;
    setAssignments(prev => [...prev, { id, name, questionIds: [] }]);
    setActiveAssignmentId(id);
    setActiveQuestionId(null);
  }

  function openEditor(mode, question) {
    setEditorDraft(question
      ? {
        ...question,
        richText: question.richText ?? question.text ?? "",
        options: question.options ?? [],
        correctIndex: question.correctIndex ?? null,
      }
      : {
        id: null, type: "MCQ", marks: 4, difficulty: 3,
        topic: "", rubric: "", text: "", richText: "",
        options: ["", "", "", ""], correctIndex: null,
      }
    );
    setEditorMode(mode);
  }

  function saveEditor() {
    const plainText = editorDraft?.text?.trim() || editorDraft?.richText?.replace(/<[^>]+>/g, "").trim();
    if (!plainText) { alert("Question text is required."); return; }

    let cleanedOptions = Array.isArray(editorDraft.options) ? editorDraft.options.map(o => o ?? "").filter(o => o.trim()) : [];
    let cleanedCorrectIndex = editorDraft.correctIndex;
    if (editorDraft.type !== "MCQ" || cleanedOptions.length === 0) {
      cleanedOptions = [];
      cleanedCorrectIndex = null;
    } else if (cleanedCorrectIndex == null || cleanedCorrectIndex < 0 || cleanedCorrectIndex >= cleanedOptions.length) {
      cleanedCorrectIndex = null;
    }

    const finalDraft = {
      ...editorDraft,
      marks: Number(editorDraft.marks) || 1,
      difficulty: editorDraft.difficulty != null ? Number(editorDraft.difficulty) : null,
      options: cleanedOptions,
      correctIndex: cleanedCorrectIndex,
    };

    if (editorMode === "create" || !editorDraft.id) {
      const id = `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      setQuestions(prev => [...prev, { ...finalDraft, id }]);
      if (activeAssignment) updateAssignmentIds([...activeAssignment.questionIds, id]);
      setActiveQuestionId(id);
    } else {
      setQuestions(prev => prev.map(q => q.id === editorDraft.id ? { ...q, ...finalDraft } : q));
      setActiveQuestionId(editorDraft.id);
    }
    setEditorMode(null); setEditorDraft(null);
  }

  function aiSuggest() {
    const existingIds = new Set(questions.map(q => q.id));
    const additions = AI_QUESTIONS.filter(q => !existingIds.has(q.id));
    if (!additions.length) { alert("All AI-suggested questions are already in your bank."); return; }
    setAiLoading(true);
    setTimeout(() => {
      setQuestions(prev => [...prev, ...additions]);
      if (activeAssignment) updateAssignmentIds([...activeAssignment.questionIds, ...additions.map(q => q.id)]);
      setActiveQuestionId(additions[0].id);
      setAiLoading(false);
    }, 700);
  }

  // Handle questions coming back from the AI backend and merge them into the bank.
  function handleAiQuestionsGenerated(newQuestions) {
    setQuestions(prev => {
      const existingIds = new Set(prev.map(q => q.id));
      const now = Date.now().toString(36);
      const safeNew = newQuestions.map((q, idx) => {
        const baseId =
          typeof q.id === "string" && q.id.trim()
            ? q.id.trim()
            : `ai-${now}-${idx.toString(36)}`;
        const finalId = existingIds.has(baseId)
          ? `ai-${now}-${Math.random().toString(36).slice(2, 6)}`
          : baseId;

        const isMCQ = q.type === "MCQ";
        let options = [];
        let correctIndex = null;
        if (isMCQ && Array.isArray(q.options)) {
          options = q.options
            .map(o => (typeof o === "string" ? o.trim() : ""))
            .filter(Boolean);
          const rawIdx = q.correctIndex;
          const idxNum =
            typeof rawIdx === "number"
              ? rawIdx
              : typeof rawIdx === "string"
                ? Number(rawIdx)
                : NaN;
          if (
            options.length &&
            Number.isInteger(idxNum) &&
            idxNum >= 0 &&
            idxNum < options.length
          ) {
            correctIndex = idxNum;
          }
        }

        return {
          id: finalId,
          type: isMCQ ? "MCQ" : "FRQ",
          marks: Number(q.marks) || 4,
          difficulty:
            q.difficulty != null ? Number(q.difficulty) || 3 : 3,
          topic: q.topic || "",
          rubric: q.rubric || "",
          text: q.text || "",
          richText: q.text || "",
          options: isMCQ ? options : undefined,
          correctIndex: isMCQ ? correctIndex : undefined,
        };
      });
      return [...prev, ...safeNew];
    });
  }

  function deleteQuestion(id) {
    if (!window.confirm("Delete this question from the bank and all assignments?")) {
      return;
    }
    setQuestions(prev => prev.filter(q => q.id !== id));
    setAssignments(prev =>
      prev.map(a => ({
        ...a,
        questionIds: a.questionIds.filter(qid => qid !== id),
      }))
    );
    if (activeQuestionId === id) {
      setActiveQuestionId(null);
    }
  }

  function exportDoc() {
    if (!activeAssignment) { alert("No active assignment."); return; }
    const title = activeAssignment.name;
    let html = `<html><head><meta charset='utf-8'></head><body><h1>${title}</h1><ol>`;
    assignmentQuestions.forEach(q => {
      html += `<li>${q.richText ?? q.text}`;
      if (q.type === "MCQ" && q.options?.length) {
        html += `<ul>${q.options.map((o, i) => `<li>${["A", "B", "C", "D"][i]}. ${o}${q.correctIndex === i ? " ✓" : ""}</li>`).join("")}</ul>`;
      }
      html += `<p><em>${q.type} · ${q.marks} pts${q.difficulty != null ? ` · Difficulty ${q.difficulty}` : ""}</em></p></li>`;
    });
    html += "</ol></body></html>";
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${title.replace(/\s+/g, "_").toLowerCase()}.doc`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    if (!activeAssignment) { alert("No active assignment."); return; }
    const title = activeAssignment.name;
    let html = `<html><head><meta charset='utf-8'><title>${title}</title><style>body{font-family:system-ui;margin:32px}h1{font-size:20px}li{margin-bottom:14px}img{max-width:100%}ul{margin:6px 0}</style></head><body><h1>${title}</h1><ol>`;
    assignmentQuestions.forEach(q => {
      html += `<li>${q.richText ?? q.text}`;
      if (q.type === "MCQ" && q.options?.length) {
        html += `<ul>${q.options.map((o, i) => `<li>${["A", "B", "C", "D"][i]}. ${o}</li>`).join("")}</ul>`;
      }
      html += `<p><em>${q.type} · ${q.marks} pts${q.difficulty != null ? ` · Difficulty ${q.difficulty}` : ""}</em></p></li>`;
    });
    html += "</ol></body></html>";
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open(); win.document.write(html); win.document.close();
    win.focus(); win.print();
  }

  function handleDragStart(index) { setDraggingIndex(index); }
  function handleDragEnd() { setDraggingIndex(null); setDragOverIndex(null); }
  function handleDragOver(e) { e.preventDefault(); }
  function handleDragEnter(e, index) {
    e.preventDefault();
    if (draggingIndex !== null && draggingIndex !== index) setDragOverIndex(index);
  }
  function handleDrop(e, dropIndex) {
    e.preventDefault();
    if (!activeAssignment || draggingIndex === null || draggingIndex === dropIndex) { setDraggingIndex(null); setDragOverIndex(null); return; }
    const order = [...activeAssignment.questionIds];
    const [moved] = order.splice(draggingIndex, 1);
    if (!moved) return;
    order.splice(dropIndex, 0, moved);
    updateAssignmentIds(order);
    setDraggingIndex(null); setDragOverIndex(null);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; font-family: 'DM Sans', sans-serif; background: #f1f5f9; color: #111827; height: 100vh; overflow: hidden; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
        * { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
        select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b7280'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 8px center; padding-right: 24px !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {editorMode && editorDraft && (
        <EditorModal
          mode={editorMode}
          draft={editorDraft}
          onChangeDraft={(field, val) => setEditorDraft(prev => ({ ...prev, [field]: val }))}
          onSave={saveEditor}
          onCancel={() => { setEditorMode(null); setEditorDraft(null); }}
        />
      )}

      {/* Outer shell — viewport height, no page scroll */}
      <div style={{
        height: "100vh", display: "flex", alignItems: "stretch",
        justifyContent: "center", padding: "24px 16px", overflow: "hidden",
      }}>
        <div style={{
          width: "100%", maxWidth: 1160, background: "#ffffff",
          borderRadius: 28, boxShadow: "0 24px 60px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.04)",
          padding: "24px 28px 20px",
          display: "flex", flexDirection: "column", gap: 16,
          overflow: "hidden",
        }}>

          {/* ── Header ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexShrink: 0 }}>
            <div>
              <h1 style={{ margin: 0, fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
                Question Bank <span style={{ color: "#6366f1" }}>&</span> Assignment Builder
              </h1>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                Curate assignments by reusing questions from a global bank. Drag to reorder and auto-save to your browser.
              </p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "5px 14px",
              borderRadius: 999, background: "linear-gradient(135deg, #eef2ff, #f5f3ff)",
              border: "1px solid #c7d2fe", flexShrink: 0,
            }}>
              <span style={{ fontSize: 14 }}>✦</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#4f46e5", fontFamily: "'Sora', sans-serif" }}>By Shrayanshi</span>
            </div>
          </div>

          {/* ── Two-column layout — fills remaining height ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px, 1.1fr) minmax(380px, 2fr)",
            gap: 18,
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}>

            {/* LEFT – Assignment Panel */}
            <section style={{ ...panelStyle, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
              {/* Fixed header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 12, flexShrink: 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingTitle ? (
                    <input
                      value={titleDraft}
                      autoFocus
                      onChange={e => setTitleDraft(e.target.value)}
                      onBlur={() => {
                        if (titleDraft.trim()) setAssignments(prev => prev.map(a => a.id === activeAssignmentId ? { ...a, name: titleDraft } : a));
                        setEditingTitle(false);
                      }}
                      onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
                      style={{ ...inputStyle, fontSize: 13, fontWeight: 600, fontFamily: "'Sora', sans-serif" }}
                    />
                  ) : (
                    <div onClick={() => setEditingTitle(true)} style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: "'Sora', sans-serif", cursor: "pointer" }}>
                      {activeAssignment?.name}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Drag questions to reorder.</div>
                </div>
                <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "nowrap" }}>
                  <select
                    value={activeAssignmentId ?? ""}
                    onChange={e => setActiveAssignmentId(e.target.value)}
                    style={{ ...inputStyle, fontSize: 11, padding: "4px 24px 4px 8px", maxWidth: 130 }}
                  >
                    {assignments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <button onClick={createAssignment} style={{ ...primaryBtnStyle, padding: "4px 10px" }}>New</button>
                </div>
              </div>

              {/* Scrollable list */}
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingRight: 2 }}>
                {assignmentQuestions.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 24, lineHeight: 1.7 }}>
                    No questions yet.<br />Select from the bank or use AI Suggest →
                  </div>
                ) : (
                  <ul style={{ padding: 0, margin: 0 }}>
                    {assignmentQuestions.map((q, i) => (
                      <AssignmentRow
                        key={q.id} question={q} index={i}
                        isActive={activeQuestionId === q.id}
                        isDragging={draggingIndex === i}
                        isDragOver={dragOverIndex === i && draggingIndex !== i}
                        onDragStart={() => handleDragStart(i)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDragEnter={e => handleDragEnter(e, i)}
                        onDrop={e => handleDrop(e, i)}
                        onClick={() => setActiveQuestionId(q.id)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* RIGHT – AI Generator + Question Bank Panel */}
            <section style={{ ...panelStyle, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>

              {/* AI Question Generator sits above the bank controls */}
              <AiQuestionGenerator onQuestionsGenerated={handleAiQuestionsGenerated} />

              {/* Fixed controls: title, buttons, search */}
              <div style={{ flexShrink: 0, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: "'Sora', sans-serif" }}>Question Bank</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Search, create, edit or AI-suggest questions.</div>
                  </div>
                  <button onClick={() => openEditor("create", null)} style={{ ...primaryBtnStyle, padding: "5px 12px" }}>
                    + New Question
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Search questions…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 999,
                    padding: "7px 14px", fontSize: 12, outline: "none",
                    fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s",
                    color: "#0f172a", background: "#fff",
                  }}
                  onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 1px rgba(99,102,241,0.4)"; }}
                  onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                />
              </div>

              {/* ── Only the card list scrolls ── */}
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingRight: 3 }}>
                {filteredQuestions.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 16 }}>
                    No questions match your search.
                  </div>
                ) : filteredQuestions.map(q => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    isActive={activeQuestionId === q.id}
                    isChecked={selectedIds.has(q.id)}
                    onCheck={() => toggleQuestion(q.id)}
                    onClick={() => setActiveQuestionId(q.id)}
                    onEdit={() => openEditor("edit", q)}
                    onDelete={() => deleteQuestion(q.id)}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* ── Footer ── */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingTop: 12, borderTop: "1.5px dashed #e2e8f0", flexShrink: 0,
          }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
              <span style={{ color: "#6366f1", fontWeight: 700 }}>{assignmentQuestions.length}</span> question{assignmentQuestions.length !== 1 ? "s" : ""}&nbsp;·&nbsp;
              <span style={{ color: "#6366f1", fontWeight: 700 }}>{totalMarks}</span> total marks
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <button onClick={exportPdf} style={{ ...primaryBtnStyle, padding: "5px 12px" }}>⬇ Download PDF</button>
              <button onClick={exportDoc} style={{ ...secondaryBtnStyle, padding: "5px 12px" }}>⬇ Download .doc</button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}