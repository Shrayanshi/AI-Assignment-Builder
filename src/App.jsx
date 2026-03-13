import { useState, useEffect } from "react";
import { HomePage } from "./components/Home.new";
import { CreateTypePage } from "./components/QuestionBank/CreateType";
import { QuestionPaperSetup } from "./components/QuestionBank/QuestionPaperSetup";
import QuestionBankApp from "./QuestionBankApp";
import { ToastStack } from "./components/ui/Toast";

function App() {
  const [view, setView] = useState("home"); // 'home' | 'type' | 'paperSetup' | 'paperBuilder' | 'assignmentBuilder'
  const [paperTemplate, setPaperTemplate] = useState(null);
  const [openAssignmentId, setOpenAssignmentId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [builderOrigin, setBuilderOrigin] = useState("home");
  const [toasts, setToasts] = useState([]);

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
      const [aRes, pRes] = await Promise.all([
        fetch("http://localhost:3001/assignments"),
        fetch("http://localhost:3001/papers"),
      ]);
      if (!aRes.ok || !pRes.ok) {
        setDocuments([]);
        return;
      }
      const [assignments, papers] = await Promise.all([aRes.json(), pRes.json()]);

      // Build assignment docs from backend
      const assignmentDocs = await Promise.all(
        assignments.map(async (a) => {
          try {
            const full = await fetch(
              `http://localhost:3001/assignments/${a.id}`,
            ).then((r) => r.json());
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
            const full = await fetch(
              `http://localhost:3001/papers/${p.id}`,
            ).then((r) => r.json());
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
    if (view === "home") {
      reloadDocuments();
    }
  }, [view]);

  const handleEditDocument = (id) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;

    if (doc.kind === "paper") {
      setBuilderOrigin("home");
      // For now, just open the assignment-style builder with paperTemplate header
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
      setOpenAssignmentId(null);
      setView("paperBuilder");
    } else {
      setBuilderOrigin("home");
      setPaperTemplate(null);
      setOpenAssignmentId(doc.assignmentId);
      setView("assignmentBuilder");
    }
  };

  const handleDeleteDocument = async (id) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;
    try {
      if (doc.kind === "paper") {
        await fetch(`http://localhost:3001/papers/${doc.paperId}`, {
          method: "DELETE",
        });
        pushToast("Question paper deleted", "info");
      } else if (doc.kind === "assignment") {
        await fetch(
          `http://localhost:3001/assignments/${doc.assignmentId}`,
          { method: "DELETE" },
        );
        pushToast("Assignment deleted", "info");
      }
    } catch (err) {
      console.error("Failed to delete document from backend", err);
    }
    reloadDocuments();
  };

  // View routing
  if (view === "paperSetup") {
    return (
      <>
        <QuestionPaperSetup
          initialTemplate={paperTemplate}
          onBack={() => setView("type")}
          onContinue={(template) => {
            setPaperTemplate(template);
            setBuilderOrigin("paperSetup");
            setView("paperBuilder");
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
          onBack={() => setView(builderOrigin)}
          openAssignmentId={openAssignmentId}
          onGoHome={() => setView("home")}
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
            setView("paperSetup");
          }}
          onCreateAssignment={() => {
            const name = window.prompt("Assignment name:", "New Assignment");
            if (!name) return;
            (async () => {
              try {
                const res = await fetch("http://localhost:3001/assignments", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name }),
                });
                if (!res.ok) throw new Error("Failed to create assignment");
                const a = await res.json();
                setPaperTemplate(null);
                setOpenAssignmentId(String(a.id));
                setBuilderOrigin("type");
                setView("assignmentBuilder");
              } catch (err) {
                console.error(err);
                alert("Failed to create assignment on server.");
              }
            })();
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
        onCreateNew={() => setView("type")}
        onEditDocument={handleEditDocument}
        onDeleteDocument={handleDeleteDocument}
        loading={loadingDocs}
      />
      <ToastStack toasts={toasts} />
    </>
  );
}

export default App;
