import { useState, useEffect } from "react";
import { EditorModal } from "./components/QuestionBank/EditorModal";
import { AssignmentRow } from "./components/QuestionBank/AssignmentRow";
import { QuestionCard } from "./components/QuestionBank/QuestionCard";
import { AiQuestionGenerator } from "./components/QuestionBank/AiQuestionGenerator";
import { ToastStack } from "./components/ui/Toast";
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

export default function App({ paperTemplate, onBack, openAssignmentId, onCreateDocument, onGoHome }) {
  const initial = loadInitialState();
  const [questions, setQuestions] = useState(initial.questions);
  const [assignments, setAssignments] = useState(initial.assignments);
  const [activeAssignmentId, setActiveAssignmentId] = useState(
    openAssignmentId || initial.activeAssignmentId
  );
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
  const [toasts, setToasts] = useState([]);

  function pushToast(message, variant = "info") {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2500);
  }

  // Load from backend once on mount, then fall back to local storage if unavailable.
  useEffect(() => {
    async function loadFromBackend() {
      try {
        const [qRes, aRes] = await Promise.all([
          fetch("http://localhost:3001/questions"),
          fetch("http://localhost:3001/assignments"),
        ]);
        if (!qRes.ok || !aRes.ok) return;

        const [qs, as] = await Promise.all([qRes.json(), aRes.json()]);

        // Normalize question IDs to strings and keep options
        const normalizedQs = qs.map((q) => ({
          ...q,
          id: String(q.id),
          richText: q.text,
        }));

        const enrichedAssignments = await Promise.all(
          as.map(async (a) => {
            try {
              const full = await fetch(
                `http://localhost:3001/assignments/${a.id}`,
              ).then((r) => r.json());
              const qIds = (full.questions || []).map((q) => String(q.id));
              return { id: String(a.id), name: a.name, questionIds: qIds };
            } catch {
              return { id: String(a.id), name: a.name, questionIds: [] };
            }
          }),
        );

        setQuestions(normalizedQs);
        setAssignments(enrichedAssignments);

        const first = enrichedAssignments[0];
        const nextAssignmentId =
          openAssignmentId || first?.id || initial.activeAssignmentId;

        setActiveAssignmentId(nextAssignmentId);

        const firstQuestionId =
          enrichedAssignments.find((a) => a.id === nextAssignmentId)?.questionIds[0] ??
          normalizedQs[0]?.id ??
          null;
        setActiveQuestionId(firstQuestionId);
      } catch (err) {
        console.error("Failed to load from backend, using local state", err);
      }
    }

    loadFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ questions, assignments, activeAssignmentId, search }));
    } catch { }
  }, [questions, assignments, activeAssignmentId, search]);

  useEffect(() => {
    if (openAssignmentId) {
      setActiveAssignmentId(openAssignmentId);
    }
  }, [openAssignmentId]);

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

  async function toggleQuestion(qid) {
    if (!activeAssignment) return;
    const assignmentId = activeAssignment.id;
    const already = selectedIds.has(qid);

    // Optimistic local update
    if (already) {
      updateAssignmentIds(activeAssignment.questionIds.filter(id => id !== qid));
      pushToast("Question removed from assignment", "info");
    } else {
      updateAssignmentIds([...activeAssignment.questionIds, qid]);
      pushToast("Question added to assignment", "success");
    }

    // Sync to backend
    try {
      if (already) {
        await fetch(
          `http://localhost:3001/assignments/${assignmentId}/questions/${qid}`,
          { method: "DELETE" },
        );
      } else {
        await fetch(
          `http://localhost:3001/assignments/${assignmentId}/questions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionId: qid }),
          },
        );
      }
    } catch (err) {
      console.error("Failed to sync assignment questions", err);
    }
  }

  async function createAssignment() {
    const name = window.prompt("New assignment name:");
    if (!name) return;
    try {
      const res = await fetch("http://localhost:3001/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create assignment");
      const a = await res.json();
      const id = String(a.id);
      setAssignments(prev => [...prev, { id, name: a.name, questionIds: [] }]);
      setActiveAssignmentId(id);
      setActiveQuestionId(null);
      pushToast("Assignment created", "success");
    } catch (err) {
      console.error(err);
      alert("Failed to create assignment on server.");
    }
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

  async function saveEditor() {
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

    // CREATE
    if (editorMode === "create" || !editorDraft.id) {
      try {
        const res = await fetch("http://localhost:3001/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: finalDraft.type,
            marks: finalDraft.marks,
            difficulty: finalDraft.difficulty,
            topic: finalDraft.topic,
            rubric: finalDraft.rubric,
            text: finalDraft.text,
            options: finalDraft.options,
          }),
        });
        if (!res.ok) throw new Error("Failed to create question");
        const saved = await res.json();
        const id = String(saved.id);
        const newQ = { ...saved, id, richText: finalDraft.richText || finalDraft.text };
        setQuestions(prev => [...prev, newQ]);

        if (activeAssignment) {
          updateAssignmentIds([...activeAssignment.questionIds, id]);
          try {
            await fetch(
              `http://localhost:3001/assignments/${activeAssignment.id}/questions`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questionId: id }),
              },
            );
          } catch (err) {
            console.error("Failed to link question to assignment", err);
          }
        }
        setActiveQuestionId(id);
      } catch (err) {
        console.error(err);
        alert("Failed to save question on server.");
        return;
      }
    } else {
      // EDIT
      try {
        const res = await fetch(
          `http://localhost:3001/questions/${editorDraft.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: finalDraft.type,
              marks: finalDraft.marks,
              difficulty: finalDraft.difficulty,
              topic: finalDraft.topic,
              rubric: finalDraft.rubric,
              text: finalDraft.text,
              options: finalDraft.options,
            }),
          },
        );
        if (!res.ok) throw new Error("Failed to update question");
        const saved = await res.json();
        const id = String(saved.id);
        setQuestions(prev =>
          prev.map(q =>
            q.id === id
              ? { ...saved, id, richText: finalDraft.richText || finalDraft.text }
              : q,
          ),
        );
        setActiveQuestionId(id);
      } catch (err) {
        console.error(err);
        alert("Failed to update question on server.");
        return;
      }
    }

    pushToast(
      editorMode === "create" || !editorDraft.id
        ? "Question created"
        : "Question updated",
      "success",
    );

    setEditorMode(null);
    setEditorDraft(null);
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

  async function deleteQuestion(id) {
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

    try {
      await fetch(`http://localhost:3001/questions/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete question on server", err);
    }

    pushToast("Question deleted", "info");
  }

  function exportDoc() {
    if (!activeAssignment) { alert("No active assignment."); return; }
    const title = activeAssignment.name;
    let html = `<html><head><meta charset='utf-8'></head><body>`;

    if (paperTemplate) {
      html += `<div style="text-align:center;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-bottom:8px;">`;
      html += `<p style="font-weight:bold;font-size:14px;margin:0;">${paperTemplate.schoolName || "School Name"}</p>`;
      html += `<p style="font-size:12px;color:#4b5563;margin:4px 0 0;">${paperTemplate.schoolAddress || "School Address"}</p>`;
      html += `</div>`;
      html += `<div style="text-align:center;margin-bottom:8px;">`;
      html += `<p style="font-weight:600;margin:0;">${paperTemplate.examType || "Exam Type"}</p>`;
      html += `<p style="font-size:12px;color:#4b5563;margin:2px 0 0;">Academic Year: ${paperTemplate.academicYear || "YYYY-YYYY"}</p>`;
      html += `</div>`;
      html += `<div style="display:flex;flex-wrap:wrap;font-size:12px;margin-bottom:8px;">`;
      html += `<span style="margin-right:12px;"><strong>Class:</strong> ${paperTemplate.grade || "Grade X"}</span>`;
      html += `<span style="margin-right:12px;"><strong>Subject:</strong> ${paperTemplate.subject || "Subject"}</span>`;
      html += `<span style="margin-right:12px;"><strong>Duration:</strong> ${paperTemplate.duration || "-- hours"}</span>`;
      html += `<span style="margin-right:12px;"><strong>Max Marks:</strong> ${paperTemplate.totalMarks || "--"}</span>`;
      if (paperTemplate.date) {
        html += `<span style="margin-right:12px;"><strong>Date:</strong> ${new Date(paperTemplate.date).toLocaleDateString()}</span>`;
      }
      html += `</div><hr style="margin:12px 0;" />`;
    } else {
      html += `<h1>${title}</h1>`;
    }

    html += `<ol>`;
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
    let html = `<html><head><meta charset='utf-8'><title>${title}</title><style>body{font-family:system-ui;margin:32px}h1{font-size:20px}li{margin-bottom:14px}img{max-width:100%}ul{margin:6px 0}</style></head><body>`;

    if (paperTemplate) {
      html += `<div style="text-align:center;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-bottom:8px;">`;
      html += `<p style="font-weight:bold;font-size:16px;margin:0;">${paperTemplate.schoolName || "School Name"}</p>`;
      html += `<p style="font-size:13px;color:#4b5563;margin:4px 0 0;">${paperTemplate.schoolAddress || "School Address"}</p>`;
      html += `</div>`;
      html += `<div style="text-align:center;margin-bottom:8px;">`;
      html += `<p style="font-weight:600;margin:0;">${paperTemplate.examType || "Exam Type"}</p>`;
      html += `<p style="font-size:13px;color:#4b5563;margin:2px 0 0;">Academic Year: ${paperTemplate.academicYear || "YYYY-YYYY"}</p>`;
      html += `</div>`;
      html += `<div style="display:flex;flex-wrap:wrap;font-size:12px;margin-bottom:8px;">`;
      html += `<span style="margin-right:12px;"><strong>Class:</strong> ${paperTemplate.grade || "Grade X"}</span>`;
      html += `<span style="margin-right:12px;"><strong>Subject:</strong> ${paperTemplate.subject || "Subject"}</span>`;
      html += `<span style="margin-right:12px;"><strong>Duration:</strong> ${paperTemplate.duration || "-- hours"}</span>`;
      html += `<span style="margin-right:12px;"><strong>Max Marks:</strong> ${paperTemplate.totalMarks || "--"}</span>`;
      if (paperTemplate.date) {
        html += `<span style="margin-right:12px;"><strong>Date:</strong> ${new Date(paperTemplate.date).toLocaleDateString()}</span>`;
      }
      html += `</div><hr style="margin:12px 0;" />`;
    } else {
      html += `<h1>${title}</h1>`;
    }

    html += `<ol>`;
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

    // Sync new order to backend
    fetch(`http://localhost:3001/assignments/${activeAssignment.id}/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    }).catch(err => {
      console.error("Failed to reorder on server", err);
    });

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

      <ToastStack toasts={toasts} />

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
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  style={{ ...secondaryBtnStyle, padding: "4px 10px", fontSize: 11 }}
                >
                  ← Back
                </button>
              )}
              <div>
                <h1 style={{ margin: 0, fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
                  Question Bank <span style={{ color: "#6366f1" }}>&</span> Assignment Builder
                </h1>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                  Curate assignments by reusing questions from a global bank. Drag to reorder and auto-save to your browser.
                </p>
              </div>
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

          {/* Optional question paper header template */}
          {paperTemplate && (
            <div
              style={{
                marginTop: 4,
                marginBottom: 8,
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                padding: 12,
                background: "#f9fafb",
                fontSize: 11,
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  borderBottom: "1px solid #e5e7eb",
                  paddingBottom: 8,
                  marginBottom: 8,
                }}
              >
                <p style={{ fontWeight: 700, fontSize: 12, margin: 0 }}>
                  {paperTemplate.schoolName || "School Name"}
                </p>
                <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                  {paperTemplate.schoolAddress || "School Address"}
                </p>
              </div>
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <p style={{ fontWeight: 600, margin: 0 }}>
                  {paperTemplate.examType || "Exam Type"}
                </p>
                <p style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>
                  Academic Year: {paperTemplate.academicYear || "YYYY-YYYY"}
                </p>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 4,
                  marginBottom: 4,
                }}
              >
                <div>
                  <span style={{ color: "#6b7280" }}>Class: </span>
                  {paperTemplate.grade || "Grade X"}
                </div>
                <div>
                  <span style={{ color: "#6b7280" }}>Subject: </span>
                  {paperTemplate.subject || "Subject"}
                </div>
                <div>
                  <span style={{ color: "#6b7280" }}>Duration: </span>
                  {paperTemplate.duration || "-- hours"}
                </div>
                <div>
                  <span style={{ color: "#6b7280" }}>Max Marks: </span>
                  {paperTemplate.totalMarks || "--"}
                </div>
                {paperTemplate.date && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <span style={{ color: "#6b7280" }}>Date: </span>
                    {new Date(paperTemplate.date).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div
                style={{
                  borderTop: "1px dashed #e5e7eb",
                  paddingTop: 6,
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: 11, color: "#9ca3af" }}>
                  Questions will appear below this header
                </span>
              </div>
            </div>
          )}

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
                      {activeAssignment?.name || "Untitled Assignment"}
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 12,
              borderTop: "1.5px dashed #e2e8f0",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
              <span style={{ color: "#6366f1", fontWeight: 700 }}>
                {assignmentQuestions.length}
              </span>{" "}
              question{assignmentQuestions.length !== 1 ? "s" : ""}&nbsp;·&nbsp;
              <span style={{ color: "#6366f1", fontWeight: 700 }}>
                {totalMarks}
              </span>{" "}
              total marks
            </div>
            <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
              {onGoHome && (
                <button
                  type="button"
                  onClick={onGoHome}
                  style={{ ...secondaryBtnStyle, padding: "5px 12px" }}
                >
                  Go to Home
                </button>
              )}
              <button
                onClick={exportPdf}
                style={{ ...primaryBtnStyle, padding: "5px 12px" }}
              >
                ⬇ Download PDF
              </button>
              <button
                onClick={exportDoc}
                style={{ ...secondaryBtnStyle, padding: "5px 12px" }}
              >
                ⬇ Download .doc
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}