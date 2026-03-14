import { useState, useEffect, useMemo, useRef } from "react";
import { EditorModal } from "../components/QuestionBank/EditorModal";
import { AssignmentRow } from "../components/QuestionBank/AssignmentRow";
import { QuestionCard } from "../components/QuestionBank/QuestionCard";
import { AiQuestionGenerator } from "../components/QuestionBank/AiQuestionGenerator";
import { fetchJson, invalidateCache } from "../lib/apiClient";
import { ToastStack } from "../components/ui/Toast";
import { Button } from "../components/ui/Button";
import { panelStyle, inputStyle } from "../components/QuestionBank/styles";

// ─── Data ─────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "qb-assignment-state-v2";

const SAMPLE_QUESTIONS = [
  {
    id: "q1", type: "MCQ", marks: 4, difficulty: 3,
    topic: "Quadratic Equations", subject: "Mathematics",
    text: "In the quaint village of Silverwood, an unprecedented explosion in the glowworm population causes the meadow's brightness to double every hour. If the brightness at 6 PM is represented by I(0) and follows I(t) = I(0) · 2^t, what is the brightness at 9 PM?",
    richText: "In the quaint village of Silverwood, an unprecedented explosion in the glowworm population causes the meadow's brightness to double every hour. If the brightness at 6 PM is represented by I(0) and follows I(t) = I(0) · 2^t, what is the brightness at 9 PM?",
    options: ["I(0)", "4·I(0)", "8·I(0)", "16·I(0)"], correctIndex: 2,
  },
  {
    id: "q2", type: "MCQ", marks: 2, difficulty: 2,
    topic: "Linear Functions", subject: "Mathematics",
    text: "A bakery sells loaves of bread for a fixed price plus a one-time packaging fee. Which of the following graphs best represents this relationship between number of loaves and total cost?",
    richText: "A bakery sells loaves of bread for a fixed price plus a one-time packaging fee. Which of the following graphs best represents this relationship between number of loaves and total cost?",
    options: ["A curve starting at the origin", "A line through the origin", "A horizontal line", "A line with a positive y-intercept"], correctIndex: 3,
  },
  {
    id: "q3", type: "FRQ", marks: 5, difficulty: 4,
    topic: "Calculus – Limits", subject: "Mathematics",
    text: "Explain, in your own words, what it means for the limit of f(x) as x approaches a to exist. Provide an example where the limit exists but f(a) is undefined.",
    richText: "Explain, in your own words, what it means for the limit of f(x) as x approaches a to exist. Provide an example where the limit exists but f(a) is undefined.",
  },
  {
    id: "q4", type: "MCQ", marks: 3, difficulty: 1,
    topic: "Statistics – Mean", subject: "Mathematics",
    text: "A class of 5 students scores 10, 12, 18, 20 and 20 on a quiz. What is the mean score?",
    richText: "A class of 5 students scores 10, 12, 18, 20 and 20 on a quiz. What is the mean score?",
    options: ["14", "16", "18", "20"], correctIndex: 1,
  },
];

const AI_QUESTIONS = [
  {
    id: "ai-1", type: "MCQ", marks: 4, difficulty: 3,
    topic: "Sets & Power Sets", subject: "Mathematics",
    text: "I have a set with 105 elements. How many elements will the power set of this set have?",
    richText: "I have a set with 105 elements. How many elements will the power set of this set have?",
    options: ["105", "2^105", "105²", "105!"], correctIndex: 1,
  },
  {
    id: "ai-2", type: "MCQ", marks: 2, difficulty: 1,
    topic: "Set Notation", subject: "Mathematics",
    text: "What notation is typically used to denote the power set of a set A?",
    richText: "What notation is typically used to denote the power set of a set A?",
    options: ["P(A)", "A*", "|A|", "A^"], correctIndex: 0,
  },
  {
    id: "ai-3", type: "FRQ", marks: 5, difficulty: 4,
    topic: "Set Theory – Complements", subject: "Mathematics",
    text: "X, Y and Z are 3 sets, and U is the universal set, such that n(U) = 800, n(X) = 200, n(Y) = 300 and n(X∩Y) = 100. Find n(X'∩Y'). Explain your reasoning.",
    richText: "X, Y and Z are 3 sets, and U is the universal set, such that n(U) = 800, n(X) = 200, n(Y) = 300 and n(X∩Y) = 100. Find n(X'∩Y'). Explain your reasoning.",
  },
  {
    id: "ai-4", type: "MCQ", marks: 3, difficulty: 2,
    topic: "Geometry – Angles", subject: "Mathematics",
    text: "The earth–moon distance is about 60 earth radii. Approximately what is the angular diameter of the earth as seen from the moon (in degrees)?",
    richText: "The earth–moon distance is about 60 earth radii. Approximately what is the angular diameter of the earth as seen from the moon (in degrees)?",
    options: ["~1°", "~2°", "~5°", "~10°"], correctIndex: 1,
  },
];

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const byId = {};
      [...SAMPLE_QUESTIONS, ...AI_QUESTIONS].forEach(q => { byId[q.id] = q; });
      const questionsFromStorage = Array.isArray(parsed.questions)
        ? parsed.questions.map(storedQ => {
          const base = byId[storedQ.id];
          if (!base) return storedQ;
          const merged = { ...base, ...storedQ };
          const storedOpts = storedQ.options;
          const baseOpts = base.options;
          if (Array.isArray(baseOpts) && baseOpts.length > 0 && (!Array.isArray(storedOpts) || storedOpts.length === 0)) {
            merged.options = baseOpts;
            merged.correctIndex = typeof base.correctIndex === "number" ? base.correctIndex : null;
          }
          if (Array.isArray(merged.options) && merged.options.length > 0) {
            const idx = merged.correctIndex;
            if (idx == null || idx < 0 || idx >= merged.options.length) {
              merged.correctIndex = typeof base?.correctIndex === "number" && base.correctIndex >= 0 && base.correctIndex < merged.options.length
                ? base.correctIndex : null;
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
  return { questions: SAMPLE_QUESTIONS, assignments: [defaultAssignment], activeAssignmentId: "a-1", search: "" };
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App({ paperTemplate, onBack, openAssignmentId, openPaperId, onCreateDocument, onGoHome }) {
  const isPaperMode = Boolean(openPaperId);
  const initial = loadInitialState();

  const [questions, setQuestions] = useState(initial.questions);
  const [assignments, setAssignments] = useState(initial.assignments);
  const [activeAssignmentId, setActiveAssignmentId] = useState(
    openPaperId || openAssignmentId || initial.activeAssignmentId
  );
  const [search, setSearch] = useState(initial.search);
  const [activeQuestionId, setActiveQuestionId] = useState(
    () => assignments.find(a => a.id === initial.activeAssignmentId)?.questionIds[0] ?? questions[0]?.id ?? null
  );
  const [editorMode, setEditorMode] = useState(null);
  const [editorDraft, setEditorDraft] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [filterBankOpen, setFilterBankOpen] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  // Tracks when we just created a local assignment so the sync effect
  // doesn't immediately overwrite activeAssignmentId back to openAssignmentId.
  const justCreatedRef = useRef(false);

  function pushToast(message, variant = "info") {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
  }

  // ── Load from backend once on mount ──────────────────────────────────────
  useEffect(() => {
    async function loadFromBackend() {
      console.log("[loadFromBackend] Starting with:", { openPaperId, openAssignmentId });
      try {
        const qs = await fetchJson("/api/questions", { cache: false });
        const normalizedQs = qs.map(q => ({ ...q, id: String(q.id), richText: q.text }));
        setQuestions(normalizedQs);

        if (openPaperId) {
          console.log("[loadFromBackend] Fetching paper:", openPaperId);
          const paper = await fetchJson(`/api/papers?id=${openPaperId}`);
          const qIds = (paper.questions || []).map(q => String(q.id));
          setAssignments([{ id: String(paper.id), name: paper.title || "Question Paper", questionIds: qIds }]);
          setActiveAssignmentId(String(paper.id));
          setActiveQuestionId(qIds[0] ?? normalizedQs[0]?.id ?? null);
          console.log("[loadFromBackend] Paper loaded, set activeAssignmentId:", String(paper.id));
          return;
        }

        // If we have openAssignmentId, fetch just that assignment with questions
        if (openAssignmentId) {
          console.log("[loadFromBackend] Fetching assignment:", openAssignmentId);
          try {
            const [allAssignments, activeAssignmentFull] = await Promise.all([
              fetchJson("/api/assignments", { cache: false }),
              fetchJson(`/api/assignments?id=${openAssignmentId}`, { cache: false }),
            ]);
            
            console.log("[loadFromBackend] Fetched assignment details:", activeAssignmentFull);
            
            // Build enriched list: full data for active, basic data for others
            const enriched = allAssignments.map(a => {
              if (String(a.id) === String(openAssignmentId)) {
                const qIds = (activeAssignmentFull.questions || []).map(q => String(q.id));
                return { id: String(a.id), name: a.name, questionIds: qIds };
              }
              return { id: String(a.id), name: a.name, questionIds: [] };
            });
            
            // CRITICAL FIX: If the active assignment isn't in the list yet (race condition),
            // add it explicitly. This happens when creating a new assignment.
            const hasActiveAssignment = enriched.some(a => String(a.id) === String(openAssignmentId));
            if (!hasActiveAssignment && activeAssignmentFull) {
              const qIds = (activeAssignmentFull.questions || []).map(q => String(q.id));
              enriched.unshift({
                id: String(activeAssignmentFull.id),
                name: activeAssignmentFull.name || "Untitled Assignment",
                questionIds: qIds
              });
              console.log("[loadFromBackend] Active assignment not in list, added it:", activeAssignmentFull);
            }
            
            console.log("[loadFromBackend] Setting assignments:", enriched);
            setAssignments(enriched);
            setActiveAssignmentId(String(openAssignmentId));
            const qIds = (activeAssignmentFull.questions || []).map(q => String(q.id));
            setActiveQuestionId(qIds[0] ?? normalizedQs[0]?.id ?? null);
            console.log("[loadFromBackend] Assignment loaded, set activeAssignmentId:", String(openAssignmentId));
          } catch (err) {
            console.error("Failed to load assignment", err);
          }
          return;
        }

        // No openAssignmentId: load all assignments without questions
        console.log("[loadFromBackend] Loading all assignments (no specific ID)");
        const as = await fetchJson("/api/assignments");
        const basicAssignments = as.map(a => ({ 
          id: String(a.id), 
          name: a.name, 
          questionIds: [] 
        }));

        setAssignments(basicAssignments);

        // Only update activeAssignmentId from backend if we didn't just create one locally
        if (!justCreatedRef.current) {
          const first = basicAssignments[0];
          const nextId = first?.id || initial.activeAssignmentId;
          setActiveAssignmentId(nextId);
          setActiveQuestionId(normalizedQs[0]?.id ?? null);
          console.log("[loadFromBackend] Set first assignment as active:", nextId);
        }
      } catch (err) {
        console.error("Failed to load from backend", err);
      }
    }
    loadFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPaperId, openAssignmentId]);

  // ── Sync activeAssignmentId when props change (but not after local creation) ──
  useEffect(() => {
    if (justCreatedRef.current) return;
    if (openPaperId) setActiveAssignmentId(openPaperId);
    else if (openAssignmentId) setActiveAssignmentId(openAssignmentId);
  }, [openPaperId, openAssignmentId]);

  // ── Load questions for active assignment if not already loaded ────────────────
  useEffect(() => {
    if (!activeAssignmentId || isPaperMode) return;
    
    const assignment = assignments.find(a => a.id === activeAssignmentId);
    if (!assignment) return;
    
    // Only fetch if questionIds is an empty array (not loaded yet)
    // Skip if it's undefined (new assignment) or has items (already loaded)
    const needsLoad = Array.isArray(assignment.questionIds) && assignment.questionIds.length === 0;
    
    if (needsLoad) {
      console.log("[loadAssignmentQuestions] Loading questions for assignment:", activeAssignmentId);
      
      fetchJson(`/api/assignments?id=${activeAssignmentId}`, { cache: false })
        .then(data => {
          const qIds = (data.questions || []).map(q => String(q.id));
          console.log("[loadAssignmentQuestions] Loaded question IDs:", qIds);
          
          // Update just this assignment's questionIds
          setAssignments(prev => prev.map(a => 
            a.id === activeAssignmentId 
              ? { ...a, questionIds: qIds }
              : a
          ));
        })
        .catch(err => {
          console.error("[loadAssignmentQuestions] Failed to load:", err);
        });
    }
    // Only re-run when activeAssignmentId changes, not when assignments change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAssignmentId, isPaperMode]);

  // ── Persist to localStorage ───────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ questions, assignments, activeAssignmentId, search }));
    } catch { }
  }, [questions, assignments, activeAssignmentId, search]);

  // ── Derived values ────────────────────────────────────────────────────────
  const activeAssignment = assignments.find(a => a.id === activeAssignmentId) ?? null;
  const assignmentQuestions = (activeAssignment?.questionIds ?? [])
    .map(id => questions.find(q => q.id === id))
    .filter(Boolean);
  const selectedIds = new Set(activeAssignment?.questionIds ?? []);
  const totalMarks = assignmentQuestions.reduce((s, q) => s + (q.marks || 0), 0);

  const bankFilterFields = useMemo(() => ({
    topics: [...new Set(questions.map(q => q.topic).filter(Boolean))].sort(),
    subjects: [...new Set(questions.map(q => q.subject).filter(Boolean))].sort(),
    difficulties: [1, 2, 3, 4, 5],
  }), [questions]);

  const filteredQuestions = useMemo(() => questions.filter(q => {
    if (search.trim() && !q.text?.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (filterType && q.type !== filterType) return false;
    if (filterDifficulty !== "" && (q.difficulty == null || Number(q.difficulty) !== Number(filterDifficulty))) return false;
    if (filterTopic && q.topic !== filterTopic) return false;
    if (filterSubject && q.subject !== filterSubject) return false;
    return true;
  }), [questions, search, filterType, filterDifficulty, filterTopic, filterSubject]);

  const hasBankFilter = !!(filterType || filterDifficulty !== "" || filterTopic || filterSubject);

  const [titleDraft, setTitleDraft] = useState(activeAssignment?.name ?? "");
  useEffect(() => { setTitleDraft(activeAssignment?.name ?? ""); }, [activeAssignmentId, activeAssignment?.name]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function updateAssignmentIds(nextIds) {
    setAssignments(prev => prev.map(a => a.id === activeAssignmentId ? { ...a, questionIds: nextIds } : a));
  }

  async function toggleQuestion(qid) {
    if (!activeAssignment) {
      console.error("toggleQuestion: no activeAssignment", { activeAssignmentId, assignments });
      pushToast("Please select an assignment first", "error");
      return;
    }
    const targetId = activeAssignment.id;
    const already = selectedIds.has(qid);
    if (already) {
      updateAssignmentIds(activeAssignment.questionIds.filter(id => id !== qid));
      pushToast(isPaperMode ? "Question removed from paper" : "Question removed from assignment", "info");
    } else {
      updateAssignmentIds([...activeAssignment.questionIds, qid]);
      pushToast(isPaperMode ? "Question added to paper" : "Question added to assignment", "success");
    }
    try {
      const base = isPaperMode ? `/api/questions?paperId=${targetId}` : `/api/questions?assignmentId=${targetId}`;
      if (already) {
        await fetch(`${base}&questionId=${qid}`, { method: "DELETE" });
      } else {
        await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: qid }) });
      }
    } catch (err) { 
      console.error("Failed to sync question toggle", err);
      pushToast("Failed to save changes to server", "error");
    }
  }

  // ── Create Assignment (default name; user can edit afterwards) ───────────────
  async function createAssignmentWithDefaultName() {
    const trimmedName = "Untitled Assignment";

    // Optimistically add to local state immediately so the user can start
    // adding questions without waiting for the server round-trip.
    const tempId = `local-${Date.now().toString(36)}`;
    const optimistic = { id: tempId, name: trimmedName, questionIds: [] };

    justCreatedRef.current = true;   // prevent sync effect from overwriting
    setAssignments(prev => [...prev, optimistic]);
    setActiveAssignmentId(tempId);
    setActiveQuestionId(null);
    setTitleDraft(trimmedName);
    setEditingTitle(false);

    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      if (!res.ok) throw new Error("Server error: " + res.status);
      const a = await res.json();
      const serverId = String(a.id);

      // Swap the temp id for the real server id, preserving any questions
      // the user may have already added during the round-trip.
      setAssignments(prev =>
        prev.map(assignment =>
          assignment.id === tempId
            ? { ...assignment, id: serverId }
            : assignment
        )
      );
      setActiveAssignmentId(serverId);
      pushToast("Assignment created", "success");
    } catch (err) {
      console.error(err);
      // Roll back: remove the optimistic entry
      setAssignments(prev => prev.filter(a => a.id !== tempId));
      setActiveAssignmentId(initial.activeAssignmentId);
      pushToast("Failed to create assignment on server", "error");
    } finally {
      // Allow the sync effect to work normally again after a brief delay
      setTimeout(() => { justCreatedRef.current = false; }, 1000);
    }
  }

  // ── Editor ────────────────────────────────────────────────────────────────
  function openEditor(mode, question) {
    setEditorDraft(question
      ? { ...question, richText: question.richText ?? question.text ?? "", options: question.options ?? [], correctIndex: question.correctIndex ?? null }
      : { id: null, type: "MCQ", marks: 4, difficulty: 3, topic: "", subject: "", text: "", richText: "", options: ["", ""], correctIndex: null }
    );
    setEditorMode(mode);
  }

  async function saveEditor() {
    const plainText = editorDraft?.text?.trim() || editorDraft?.richText?.replace(/<[^>]+>/g, "").trim();
    if (!plainText) { alert("Question text is required."); return; }

    let cleanedOptions = Array.isArray(editorDraft.options) ? editorDraft.options.map(o => o ?? "").filter(o => o.trim()) : [];
    let cleanedCorrectIndex = editorDraft.correctIndex;
    if (editorDraft.type !== "MCQ" || cleanedOptions.length === 0) { cleanedOptions = []; cleanedCorrectIndex = null; }
    else if (cleanedCorrectIndex == null || cleanedCorrectIndex < 0 || cleanedCorrectIndex >= cleanedOptions.length) { cleanedCorrectIndex = null; }

    const finalDraft = {
      ...editorDraft,
      marks: Number(editorDraft.marks) || 1,
      difficulty: editorDraft.difficulty != null ? Number(editorDraft.difficulty) : null,
      options: cleanedOptions,
      correctIndex: cleanedCorrectIndex,
    };

    const payload = { type: finalDraft.type, marks: finalDraft.marks, difficulty: finalDraft.difficulty, topic: finalDraft.topic, subject: finalDraft.subject, text: finalDraft.text, options: finalDraft.options, correctIndex: finalDraft.correctIndex };

    try {
      if (editorMode === "create" || !editorDraft.id) {
        const res = await fetch("/api/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("Failed to create question");
        const saved = await res.json();
        const id = String(saved.id);
        const newQ = { ...saved, id, richText: finalDraft.richText || finalDraft.text };
        setQuestions(prev => [...prev, newQ]);
        if (activeAssignment) {
          updateAssignmentIds([...activeAssignment.questionIds, id]);
          const base = isPaperMode ? `/api/questions?paperId=${activeAssignment.id}` : `/api/questions?assignmentId=${activeAssignment.id}`;
          await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: id }) }).catch(console.error);
          // Invalidate cache for assignments/papers since total_marks changed
          invalidateCache("/api/assignments");
          invalidateCache("/api/papers");
        }
        setActiveQuestionId(id);
        pushToast("Question created", "success");
      } else {
        const res = await fetch(`/api/questions?id=${editorDraft.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("Failed to update question");
        const saved = await res.json();
        const id = String(saved.id);
        setQuestions(prev => prev.map(q => q.id === id ? { ...saved, id, richText: finalDraft.richText || finalDraft.text } : q));
        setActiveQuestionId(id);
        // Invalidate cache since marks might have changed
        invalidateCache("/api/assignments");
        invalidateCache("/api/papers");
        pushToast("Question updated", "success");
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
      return;
    }

    setEditorMode(null);
    setEditorDraft(null);
  }

  // ── AI Suggest ────────────────────────────────────────────────────────────
  function handleAiQuestionsGenerated(newQuestions) {
    setQuestions(prev => {
      const existingIds = new Set(prev.map(q => q.id));
      const now = Date.now().toString(36);
      const safeNew = newQuestions.map((q, idx) => {
        const baseId = typeof q.id === "string" && q.id.trim() ? q.id.trim() : `ai-${now}-${idx.toString(36)}`;
        const finalId = existingIds.has(baseId) ? `ai-${now}-${Math.random().toString(36).slice(2, 6)}` : baseId;
        const isMCQ = q.type === "MCQ";
        let options = [];
        let correctIndex = null;
        if (isMCQ && Array.isArray(q.options)) {
          options = q.options.map(o => (typeof o === "string" ? o.trim() : "")).filter(Boolean);
          const idxNum = typeof q.correctIndex === "number" ? q.correctIndex : Number(q.correctIndex);
          if (options.length && Number.isInteger(idxNum) && idxNum >= 0 && idxNum < options.length) correctIndex = idxNum;
        }
        return { id: finalId, type: isMCQ ? "MCQ" : "FRQ", marks: Number(q.marks) || 4, difficulty: q.difficulty != null ? Number(q.difficulty) || 3 : 3, topic: q.topic || "", subject: q.subject || "", text: q.text || "", richText: q.text || "", options: isMCQ ? options : undefined, correctIndex: isMCQ ? correctIndex : undefined };
      });
      return [...prev, ...safeNew];
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function deleteQuestion(id) {
    if (!window.confirm("Delete this question from the bank and all assignments?")) return;
    setQuestions(prev => prev.filter(q => q.id !== id));
    setAssignments(prev => prev.map(a => ({ ...a, questionIds: a.questionIds.filter(qid => qid !== id) })));
    if (activeQuestionId === id) setActiveQuestionId(null);
    try { 
      await fetch(`/api/questions?id=${id}`, { method: "DELETE" });
      // Invalidate cache so next load gets fresh data
      invalidateCache("/api/questions");
      invalidateCache("/api/assignments");
      invalidateCache("/api/papers");
    } catch (err) { 
      console.error(err); 
    }
    pushToast("Question deleted", "info");
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function buildExportHeader(paperTemplate, title) {
    if (!paperTemplate) return `<h1>${title}</h1>`;
    let h = `<div style="text-align:center;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-bottom:8px;">`;
    h += `<p style="font-weight:bold;font-size:14px;margin:0;">${paperTemplate.schoolName || "School Name"}</p>`;
    h += `<p style="font-size:12px;color:#4b5563;margin:4px 0 0;">${paperTemplate.schoolAddress || ""}</p></div>`;
    h += `<div style="text-align:center;margin-bottom:8px;"><p style="font-weight:600;margin:0;">${paperTemplate.examType || ""}</p>`;
    h += `<p style="font-size:12px;color:#4b5563;margin:2px 0 0;">Academic Year: ${paperTemplate.academicYear || ""}</p></div>`;
    h += `<div style="display:flex;flex-wrap:wrap;font-size:12px;margin-bottom:8px;">`;
    h += `<span style="margin-right:12px;"><strong>Class:</strong> ${paperTemplate.grade || ""}</span>`;
    h += `<span style="margin-right:12px;"><strong>Subject:</strong> ${paperTemplate.subject || ""}</span>`;
    h += `<span style="margin-right:12px;"><strong>Duration:</strong> ${paperTemplate.duration || ""}</span>`;
    h += `<span style="margin-right:12px;"><strong>Max Marks:</strong> ${paperTemplate.totalMarks || ""}</span>`;
    if (paperTemplate.date) h += `<span><strong>Date:</strong> ${new Date(paperTemplate.date).toLocaleDateString()}</span>`;
    h += `</div><hr style="margin:12px 0;" />`;
    return h;
  }

  function buildQuestionListHtml(withAnswer = false) {
    let html = "<ol>";
    assignmentQuestions.forEach(q => {
      html += `<li>${q.richText ?? q.text}`;
      if (q.type === "MCQ" && q.options?.length) {
        html += `<ul>${q.options.map((o, i) => `<li>${["A", "B", "C", "D"][i]}. ${o}${withAnswer && q.correctIndex === i ? " ✓" : ""}</li>`).join("")}</ul>`;
      }
      html += `<p><em>${q.type} · ${q.marks} pts${q.difficulty != null ? ` · Difficulty ${q.difficulty}` : ""}</em></p></li>`;
    });
    return html + "</ol>";
  }

  function exportDoc() {
    if (!activeAssignment) { alert("No active assignment."); return; }
    const title = activeAssignment.name;
    const html = `<html><head><meta charset='utf-8'></head><body>${buildExportHeader(paperTemplate, title)}${buildQuestionListHtml(true)}</body></html>`;
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
    const html = `<html><head><meta charset='utf-8'><title>${title}</title><style>body{font-family:system-ui;margin:32px}h1{font-size:20px}li{margin-bottom:14px}img{max-width:100%}ul{margin:6px 0}</style></head><body>${buildExportHeader(paperTemplate, title)}${buildQuestionListHtml(false)}</body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open(); win.document.write(html); win.document.close();
    win.focus(); win.print();
  }

  // ── Drag ─────────────────────────────────────────────────────────────────
  function handleDragStart(index) { setDraggingIndex(index); }
  function handleDragEnd() { setDraggingIndex(null); setDragOverIndex(null); }
  function handleDragOver(e) { e.preventDefault(); }
  function handleDragEnter(e, index) { e.preventDefault(); if (draggingIndex !== null && draggingIndex !== index) setDragOverIndex(index); }
  function handleDrop(e, dropIndex) {
    e.preventDefault();
    if (!activeAssignment || draggingIndex === null || draggingIndex === dropIndex) { setDraggingIndex(null); setDragOverIndex(null); return; }
    const order = [...activeAssignment.questionIds];
    const [moved] = order.splice(draggingIndex, 1);
    if (!moved) return;
    order.splice(dropIndex, 0, moved);
    updateAssignmentIds(order);
    const url = isPaperMode ? `/api/questions?paperId=${activeAssignment.id}&reorder=1` : `/api/questions?assignmentId=${activeAssignment.id}&reorder=1`;
    fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }) }).catch(console.error);
    setDraggingIndex(null); setDragOverIndex(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; font-family: 'DM Sans', sans-serif; background: #f1f5f9; color: #111827; height: 100vh; overflow: hidden; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
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

      <div style={{ height: "100vh", display: "flex", alignItems: "stretch", justifyContent: "center", padding: "24px 16px", overflow: "hidden" }}>
        <div style={{ width: "100%", maxWidth: 1160, background: "#ffffff", borderRadius: 28, boxShadow: "0 24px 60px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.04)", padding: "24px 28px 20px", display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {onBack && <Button variant="secondary" onClick={onBack} style={{ padding: "8px 14px", minHeight: "auto" }}>← Back</Button>}
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
                  Question Bank <span style={{ color: "#6366f1" }}>&</span> Assignment Builder
                </h1>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                  Curate assignments by reusing questions from a global bank. Drag to reorder and auto-save to your browser.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 999, background: "linear-gradient(135deg, #eef2ff, #f5f3ff)", border: "1px solid #c7d2fe", flexShrink: 0 }}>
              <span style={{ fontSize: 14 }}>✦</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#4f46e5" }}>By Shrayanshi</span>
            </div>
          </div>

          {/* Paper template preview */}
          {paperTemplate && (
            <div style={{ marginTop: 4, marginBottom: 8, borderRadius: 14, border: "1px solid #e5e7eb", padding: 12, background: "#f9fafb", fontSize: 11 }}>
              <div style={{ textAlign: "center", borderBottom: "1px solid #e5e7eb", paddingBottom: 8, marginBottom: 8 }}>
                <p style={{ fontWeight: 700, fontSize: 12, margin: 0 }}>{paperTemplate.schoolName || "School Name"}</p>
                <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{paperTemplate.schoolAddress || ""}</p>
              </div>
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <p style={{ fontWeight: 600, margin: 0 }}>{paperTemplate.examType || "Exam Type"}</p>
                <p style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>Academic Year: {paperTemplate.academicYear || "YYYY-YYYY"}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 4, marginBottom: 4 }}>
                <div><span style={{ color: "#6b7280" }}>Class: </span>{paperTemplate.grade || ""}</div>
                <div><span style={{ color: "#6b7280" }}>Subject: </span>{paperTemplate.subject || ""}</div>
                <div><span style={{ color: "#6b7280" }}>Duration: </span>{paperTemplate.duration || ""}</div>
                <div><span style={{ color: "#6b7280" }}>Max Marks: </span>{paperTemplate.totalMarks || ""}</div>
                {paperTemplate.date && <div style={{ gridColumn: "1 / -1" }}><span style={{ color: "#6b7280" }}>Date: </span>{new Date(paperTemplate.date).toLocaleDateString()}</div>}
              </div>
              <div style={{ borderTop: "1px dashed #e5e7eb", paddingTop: 6, textAlign: "center" }}>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>Questions will appear below this header</span>
              </div>
            </div>
          )}

          {/* Two-column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1.1fr) minmax(380px, 2fr)", gap: 18, flex: 1, minHeight: 0, overflow: "hidden" }}>

            {/* LEFT – Assignment Panel */}
            <section style={{ ...panelStyle, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 12, flexShrink: 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingTitle ? (
                    <input
                      value={titleDraft} autoFocus
                      onChange={e => setTitleDraft(e.target.value)}
                      onBlur={() => {
                        const name = titleDraft.trim();
                        if (name) {
                          setAssignments(prev => prev.map(a => a.id === activeAssignmentId ? { ...a, name } : a));
                          if (activeAssignmentId) {
                            if (isPaperMode) {
                              fetch(`/api/papers?id=${activeAssignmentId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: name }) }).catch(console.error);
                            } else {
                              fetch(`/api/assignments?id=${activeAssignmentId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }).catch(console.error);
                            }
                          }
                        }
                        setEditingTitle(false);
                      }}
                      onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
                      style={{ ...inputStyle, fontSize: 13, fontWeight: 600 }}
                    />
                  ) : (
                    <div onClick={() => setEditingTitle(true)} style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>
                      {activeAssignment?.name || (isPaperMode ? "Question Paper" : "Untitled Assignment")}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Drag questions to reorder.</div>
                </div>
                {!isPaperMode && (
                  <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "nowrap" }}>
                    <select value={activeAssignmentId ?? ""} onChange={e => setActiveAssignmentId(e.target.value)} style={{ ...inputStyle, fontSize: 12, padding: "8px 24px 8px 8px", maxWidth: 130 }}>
                      {assignments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <Button onClick={createAssignmentWithDefaultName} style={{ padding: "8px 14px", minHeight: "auto" }}>New</Button>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingRight: 2 }}>
                {assignmentQuestions.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 24, lineHeight: 1.7 }}>
                    No questions yet.<br />Select from the bank or use AI Suggest →
                  </div>
                ) : (
                  <ul style={{ padding: 0, margin: 0 }}>
                    {assignmentQuestions.map((q, i) => (
                      <AssignmentRow key={q.id} question={q} index={i}
                        isActive={activeQuestionId === q.id}
                        isDragging={draggingIndex === i}
                        isDragOver={dragOverIndex === i && draggingIndex !== i}
                        onDragStart={() => handleDragStart(i)}
                        onDragEnd={handleDragEnd} onDragOver={handleDragOver}
                        onDragEnter={e => handleDragEnter(e, i)}
                        onDrop={e => handleDrop(e, i)}
                        onClick={() => setActiveQuestionId(q.id)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* RIGHT – Question Bank Panel */}
            <section style={{ ...panelStyle, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
              <AiQuestionGenerator onQuestionsGenerated={handleAiQuestionsGenerated} />

              <div style={{ flexShrink: 0, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Question Bank</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Search, create, edit or AI-suggest questions.</div>
                  </div>
                  <Button onClick={() => openEditor("create", null)} style={{ padding: "8px 14px", minHeight: "auto" }}>+ New Question</Button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="text" placeholder="Search questions…" value={search} onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, border: "1.5px solid #e2e8f0", borderRadius: 999, padding: "7px 14px", fontSize: 12, outline: "none", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s", color: "#0f172a", background: "#fff" }}
                    onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 1px rgba(99,102,241,0.4)"; }}
                    onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                  />
                  <Button variant="secondary" type="button" onClick={() => setFilterBankOpen(o => !o)} title="Filter"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, minHeight: 40, padding: 0, background: hasBankFilter ? "#eef2ff" : "#fff", color: hasBankFilter ? "#4f46e5" : "#64748b", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                  </Button>
                </div>

                {filterBankOpen && (
                  <div style={{ marginTop: 8, padding: 10, borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
                    {[
                      { label: "Type", value: filterType, set: setFilterType, opts: [{ v: "", l: "All" }, { v: "MCQ", l: "MCQ" }, { v: "FRQ", l: "FRQ" }] },
                      { label: "Difficulty", value: filterDifficulty, set: setFilterDifficulty, opts: [{ v: "", l: "All" }, ...bankFilterFields.difficulties.map(d => ({ v: d, l: d }))] },
                      { label: "Topic", value: filterTopic, set: setFilterTopic, opts: [{ v: "", l: "All" }, ...bankFilterFields.topics.map(t => ({ v: t, l: t }))] },
                      { label: "Subject", value: filterSubject, set: setFilterSubject, opts: [{ v: "", l: "All" }, ...bankFilterFields.subjects.map(s => ({ v: s, l: s }))] },
                    ].map(f => (
                      <label key={f.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b" }}>{f.label}</span>
                        <select value={f.value} onChange={e => f.set(e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 11, minWidth: f.label === "Type" ? 80 : 110 }}>
                          {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingRight: 3 }}>
                {filteredQuestions.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 16 }}>
                    {questions.length === 0 ? "No questions yet." : "No questions match your search or filter."}
                  </div>
                ) : filteredQuestions.map(q => (
                  <QuestionCard key={q.id} question={q}
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

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1.5px dashed #e2e8f0", flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
              <span style={{ color: "#6366f1", fontWeight: 700 }}>{assignmentQuestions.length}</span> question{assignmentQuestions.length !== 1 ? "s" : ""}&nbsp;·&nbsp;
              <span style={{ color: "#6366f1", fontWeight: 700 }}>{totalMarks}</span> total marks
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {onGoHome && <Button variant="secondary" onClick={onGoHome} style={{ padding: "8px 14px", minHeight: "auto" }}>Go to Home</Button>}
              <Button onClick={exportPdf} style={{ padding: "8px 14px", minHeight: "auto" }}>⬇ Download PDF</Button>
              <Button variant="secondary" onClick={exportDoc} style={{ padding: "8px 14px", minHeight: "auto" }}>⬇ Download .doc</Button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}