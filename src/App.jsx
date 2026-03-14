import { useState, useEffect } from "react";
import { HomePage } from "./pages/Home";
import { CreateTypePage } from "./pages/CreateType";
import { QuestionPaperSetup } from "./pages/QuestionPaperSetup";
import QuestionBankApp from "./pages/QuestionBankApp";
import { ToastStack } from "./components/ui/Toast";
import { fetchJson, invalidateCache } from "./lib/apiClient";

const DEFAULT_VIEW = "home";

function parseHash() {
  const hash = window.location.hash.slice(1) || "/";
  const path = hash.startsWith("/") ? hash : `/${hash}`;
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "assignment" && parts[1]) {
    return { view: "assignmentBuilder", assignmentId: parts[1] };
  }
  if (parts[0] === "paper" && parts[1]) {
    return { view: "paperBuilder", paperId: parts[1] };
  }
  if (parts[0] === "create") return { view: "type" };
  if (parts[0] === "paper-setup") return { view: "paperSetup" };
  return { view: "home" };
}

function getHashForView(view, openAssignmentId, openPaperId) {
  if (view === "assignmentBuilder" && openAssignmentId) {
    return `#/assignment/${openAssignmentId}`;
  }
  if (view === "paperBuilder" && openPaperId) {
    return `#/paper/${openPaperId}`;
  }
  if (view === "type") return "#/create";
  if (view === "paperSetup") return "#/paper-setup";
  return "#/";
}

function App() {
  const [view, setView] = useState(DEFAULT_VIEW);
  const [paperTemplate, setPaperTemplate] = useState(null);
  const [openAssignmentId, setOpenAssignmentId] = useState(null);
  const [openPaperId, setOpenPaperId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [builderOrigin, setBuilderOrigin] = useState("home");
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const fromHash = parseHash();
    if (fromHash.view !== "home" || fromHash.assignmentId || fromHash.paperId) {
      setView(fromHash.view);
      if (fromHash.assignmentId) setOpenAssignmentId(fromHash.assignmentId);
      if (fromHash.paperId) setOpenPaperId(fromHash.paperId);
    }
  }, []);

  useEffect(() => {
    const hash = getHashForView(view, openAssignmentId, openPaperId);
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }, [view, openAssignmentId, openPaperId]);

  useEffect(() => {
    const onHashChange = () => {
      const fromHash = parseHash();
      setView(fromHash.view);
      setOpenAssignmentId(fromHash.assignmentId || null);
      setOpenPaperId(fromHash.paperId || null);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const pushToast = (message, variant = "info") => {
    const id =
      Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  };

  const reloadDocuments = async () => {
    try {
      setLoadingDocs(true);
      const [assignments, papers] = await Promise.all([
        fetchJson("/api/assignments", { cache: false }),
        fetchJson("/api/papers", { cache: false }),
      ]);

      // Build assignment docs from backend
      const assignmentDocs = await Promise.all(
        assignments.map(async (a) => {
          try {
            const full = await fetchJson(`/api/assignments/${a.id}`, {
              cache: false,
            });
            const questions = full.questions || [];
            const totalMarks = questions.reduce(
              (s, q) => s + (q.marks || 0),
              0,
            );
            return {
              id: `assignment-${a.id}`,
              kind: "assignment",
              assignmentId: String(a.id),
              title: a.name,
              subject: a.subject || "",
              questionCount: questions.length,
              totalMarks,
              createdAt: a.created_at,
              lastModified: a.updated_at,
            };
          } catch {
            return {
              id: `assignment-${a.id}`,
              kind: "assignment",
              assignmentId: String(a.id),
              title: a.name,
              subject: a.subject || "",
              questionCount: 0,
              totalMarks: 0,
              createdAt: a.created_at,
              lastModified: a.updated_at,
            };
          }
        }),
      );

      // Build paper docs from backend (basic header + counts)
      const paperDocs = await Promise.all(
        papers.map(async (p) => {
          try {
            const full = await fetchJson(`/api/papers/${p.id}`, {
              cache: false,
            });
            const questions = full.questions || [];
            const totalMarks = questions.reduce(
              (s, q) => s + (q.marks || 0),
              0,
            );
            return {
              id: `paper-${p.id}`,
              kind: "paper",
              paperId: String(p.id),
              title: p.title,
              subject: p.subject || "",
              grade: p.grade || "",
              examType: p.exam_type || "",
              schoolName: p.school_name || "",
              questionCount: questions.length,
              totalMarks,
              createdAt: p.created_at,
              lastModified: p.updated_at,
            };
          } catch {
            return {
              id: `paper-${p.id}`,
              kind: "paper",
              paperId: String(p.id),
              title: p.title,
              subject: p.subject || "",
              grade: p.grade || "",
              examType: p.exam_type || "",
              schoolName: p.school_name || "",
              questionCount: 0,
              totalMarks: 0,
              createdAt: p.created_at,
              lastModified: p.updated_at,
            };
          }
        }),
      );

      setDocuments([...paperDocs, ...assignmentDocs]);
    } catch (err) {
      console.error("Failed to load documents from backend", err);
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (view === "home") reloadDocuments();
  }, [view]);

  useEffect(() => {
    if (view !== "paperBuilder" || !openPaperId || paperTemplate) return;
    fetch(`/api/papers/${openPaperId}`)
      .then((r) => r.json())
      .then((paper) => {
        setPaperTemplate({
          schoolName: paper.school_name || "",
          schoolAddress: paper.school_address || "",
          grade: paper.grade || "",
          subject: paper.subject || "",
          examType: paper.exam_type || "",
          duration: paper.duration || "",
          totalMarks: paper.total_marks ?? "",
          academicYear: paper.academic_year || "",
          date: paper.exam_date || "",
        });
      })
      .catch(() => {});
  }, [view, openPaperId, paperTemplate]);

  const handleEditDocument = (id) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;
    setBuilderOrigin("home");

    if (doc.kind === "paper") {
      setPaperTemplate({
        schoolName: doc.schoolName,
        schoolAddress: "",
        grade: doc.grade,
        subject: doc.subject,
        examType: doc.examType,
        duration: "",
        totalMarks: doc.totalMarks,
        academicYear: "",
        date: "",
      });
      setOpenPaperId(doc.paperId);
      setOpenAssignmentId(null);
      setView("paperBuilder");
    } else {
      setPaperTemplate(null);
      setOpenPaperId(null);
      setOpenAssignmentId(doc.assignmentId);
      setView("assignmentBuilder");
    }
  };

  const handleDeleteDocument = async (id) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;
    try {
      if (doc.kind === "paper") {
        await fetch(`/api/papers/${doc.paperId}`, {
          method: "DELETE",
        });
        pushToast("Question paper deleted", "info");
      } else if (doc.kind === "assignment") {
        await fetch(
          `/api/assignments/${doc.assignmentId}`,
          { method: "DELETE" },
        );
        pushToast("Assignment deleted", "info");
      }
    } catch (err) {
      console.error("Failed to delete document from backend", err);
    }
    invalidateCache("/api/assignments");
    invalidateCache("/api/papers");
    reloadDocuments();
  };

  if (view === "paperSetup") {
    return (
      <>
        <QuestionPaperSetup
          initialTemplate={paperTemplate}
          onBack={() => setView("type")}
          onContinue={async (template) => {
            setBuilderOrigin("paperSetup");
            try {
              const res = await fetch("/api/papers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: template.subject || "Question Paper",
                  schoolName: template.schoolName || null,
                  schoolAddress: template.schoolAddress || null,
                  grade: template.grade || null,
                  subject: template.subject || null,
                  examType: template.examType || null,
                  duration: template.duration || null,
                  totalMarks: template.totalMarks ? Number(template.totalMarks) : null,
                  academicYear: template.academicYear || null,
                  examDate: template.date || null,
                }),
              });
              if (!res.ok) throw new Error("Failed to create paper");
              const paper = await res.json();
              setPaperTemplate(template);
              setOpenPaperId(String(paper.id));
              setOpenAssignmentId(null);
              setView("paperBuilder");
            } catch (err) {
              console.error(err);
              alert("Failed to create question paper on server.");
            }
          }}
        />
        <ToastStack toasts={toasts} />
      </>
    );
  }

  if (view === "paperBuilder") {
    return (
      <>
        <QuestionBankApp
          paperTemplate={paperTemplate}
          onBack={() => {
            setOpenPaperId(null);
            setView(builderOrigin);
          }}
          openAssignmentId={openPaperId ? null : openAssignmentId}
          openPaperId={openPaperId}
          onGoHome={() => {
            setOpenPaperId(null);
            setView("home");
          }}
        />
        <ToastStack toasts={toasts} />
      </>
    );
  }

  if (view === "assignmentBuilder") {
    return (
      <>
        <QuestionBankApp
          onBack={() => setView(builderOrigin)}
          openAssignmentId={openAssignmentId}
          openPaperId={null}
          onGoHome={() => setView("home")}
        />
        <ToastStack toasts={toasts} />
      </>
    );
  }

  if (view === "type") {
    return (
      <>
        <CreateTypePage
          onBack={() => setView("home")}
          onCreateQuestionPaper={() => {
            setBuilderOrigin("type");
            setPaperTemplate(null);
            setOpenPaperId(null);
            setView("paperSetup");
          }}
          onCreateAssignment={async () => {
            const name = window.prompt("Assignment name:", "New Assignment");
            if (!name) return;
            try {
              const res = await fetch("/api/assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
              });
              if (!res.ok) throw new Error("Failed to create assignment");
              const a = await res.json();
              setPaperTemplate(null);
              setOpenPaperId(null);
              setOpenAssignmentId(String(a.id));
              setBuilderOrigin("type");
              setView("assignmentBuilder");
            } catch (err) {
              console.error(err);
              alert("Failed to create assignment on server.");
            }
          }}
        />
        <ToastStack toasts={toasts} />
      </>
    );
  }

  // Default: home page with backend-driven documents
  return (
    <>
      <HomePage
        documents={documents}
        onCreateNew={() => {
          setOpenPaperId(null);
          setOpenAssignmentId(null);
          setView("type");
        }}
        onEditDocument={handleEditDocument}
        onDeleteDocument={handleDeleteDocument}
        loading={loadingDocs}
      />
      <ToastStack toasts={toasts} />
    </>
  );
}

export default App;
