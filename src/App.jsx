import { useState, useEffect } from "react";
import { HomePage } from "./pages/Home";
import { CreateTypePage } from "./pages/CreateType";
import { QuestionPaperSetup } from "./pages/QuestionPaperSetup";
import { AssignmentSetup } from "./pages/AssignmentSetup";
import QuestionBankApp from "./pages/QuestionBankApp";
import { LoginPage } from "./pages/Login";
import { SignupPage } from "./pages/Signup";
import { ToastStack } from "./components/ui/Toast";
import { fetchJson, invalidateCache } from "./lib/apiClient";
import { AuthProvider, useAuth } from "./lib/AuthContext";

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

function authFetch(url, options = {}) {
  const token = localStorage.getItem("auth_token");
  return fetch(url, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

function AppContent() {
  const { user, logout, loading } = useAuth();
  const [authView, setAuthView] = useState("login"); // "login" | "signup"

  const [view, setView] = useState(DEFAULT_VIEW);
  const [paperTemplate, setPaperTemplate] = useState(null);
  const [openAssignmentId, setOpenAssignmentId] = useState(null);
  const [openPaperId, setOpenPaperId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [builderOrigin, setBuilderOrigin] = useState("home");
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [creatingPaper, setCreatingPaper] = useState(false);
  const [openGrade, setOpenGrade] = useState(null);
  const [openSubject, setOpenSubject] = useState(null);
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

      const assignmentDocs = assignments.map((a) => ({
        id: `assignment-${a.id}`,
        kind: "assignment",
        assignmentId: String(a.id),
        title: a.name,
        subject: a.subject || "",
        grade: a.grade || "",
        questionCount: a.question_count || 0,
        totalMarks: a.total_marks || 0,
        createdAt: a.created_at,
        lastModified: a.updated_at,
      }));

      const paperDocs = papers.map((p) => ({
        id: `paper-${p.id}`,
        kind: "paper",
        paperId: String(p.id),
        title: p.title,
        subject: p.subject || "",
        grade: p.grade || "",
        examType: p.exam_type || "",
        schoolName: p.school_name || "",
        questionCount: p.question_count || 0,
        totalMarks: p.total_marks || 0,
        createdAt: p.created_at,
        lastModified: p.updated_at,
      }));

      setDocuments([...paperDocs, ...assignmentDocs]);
    } catch (err) {
      console.error("Failed to load documents from backend", err);
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (user && view === "home") reloadDocuments();
  // user?.id is stable even when the user object reference changes (e.g. StrictMode re-verify)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, view]);

  useEffect(() => {
    if (view !== "paperBuilder" || !openPaperId) return;
    fetchJson(`/api/papers?id=${openPaperId}`, { cache: false })
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
  }, [view, openPaperId]);

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
      setOpenGrade(doc.grade || null);
      setOpenSubject(doc.subject || null);
      setView("assignmentBuilder");
    }
  };

  const handleDeleteDocument = async (id) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;
    // Optimistically remove from local state immediately — no reload needed
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    try {
      if (doc.kind === "paper") {
        await authFetch(`/api/papers?id=${doc.paperId}`, { method: "DELETE" });
        invalidateCache("/api/papers");
        pushToast("Question paper deleted", "info");
      } else if (doc.kind === "assignment") {
        await authFetch(`/api/assignments?id=${doc.assignmentId}`, { method: "DELETE" });
        invalidateCache("/api/assignments");
        pushToast("Assignment deleted", "info");
      }
    } catch (err) {
      console.error("Failed to delete document from backend", err);
      // Restore the document in state if the server call failed
      setDocuments((prev) => [...prev, doc].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      pushToast("Failed to delete. Please try again.", "error");
    }
  };

  // Show a loading spinner while verifying token
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <p style={{ color: "#6b7280", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Loading...</p>
      </div>
    );
  }

  // Not authenticated — show login or signup
  if (!user) {
    if (authView === "signup") {
      return <SignupPage onSwitchToLogin={() => setAuthView("login")} />;
    }
    return <LoginPage onSwitchToSignup={() => setAuthView("signup")} />;
  }

  if (view === "paperSetup") {
    return (
      <>
        <QuestionPaperSetup
          initialTemplate={paperTemplate}
          creating={creatingPaper}
          onBack={() => setView("type")}
          onContinue={async (template) => {
            setBuilderOrigin("paperSetup");
            setCreatingPaper(true);
            try {
              const res = await authFetch("/api/papers", {
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
            } finally {
              setCreatingPaper(false);
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
          openGrade={paperTemplate?.grade || null}
          openSubject={paperTemplate?.subject || null}
          onPaperTemplateChange={(template) => setPaperTemplate(template)}
          onPaperTemplateSave={(template) => {
            if (!openPaperId || !template) return;
            authFetch(`/api/papers?id=${openPaperId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: template.subject || "Question Paper",
                schoolName: template.schoolName ?? null,
                schoolAddress: template.schoolAddress ?? null,
                grade: template.grade ?? null,
                subject: template.subject ?? null,
                examType: template.examType ?? null,
                duration: template.duration ?? null,
                totalMarks: template.totalMarks ? Number(template.totalMarks) : null,
                academicYear: template.academicYear ?? null,
                examDate: template.date ?? null,
              }),
            }).catch((err) => console.error("Failed to save paper template", err));
          }}
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
          openGrade={openGrade}
          openSubject={openSubject}
          onGoHome={() => setView("home")}
        />
        <ToastStack toasts={toasts} />
      </>
    );
  }

  if (view === "assignmentSetup") {
    return (
      <>
        <AssignmentSetup
          creating={creatingAssignment}
          onBack={() => setView("type")}
          onContinue={async ({ grade, subject }) => {
            setCreatingAssignment(true);
            try {
              const res = await authFetch("/api/assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Untitled Assignment", grade, subject }),
              });
              if (!res.ok) throw new Error("Failed to create assignment");
              const a = await res.json();
              setPaperTemplate(null);
              setOpenPaperId(null);
              setOpenAssignmentId(String(a.id));
              setOpenGrade(grade || null);
              setOpenSubject(subject || null);
              setBuilderOrigin("assignmentSetup");
              setView("assignmentBuilder");
            } catch (err) {
              console.error(err);
              pushToast("Failed to create assignment on server.", "error");
            } finally {
              setCreatingAssignment(false);
            }
          }}
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
          onCreateAssignment={() => {
            setBuilderOrigin("type");
            setView("assignmentSetup");
          }}
        />
        <ToastStack toasts={toasts} />
      </>
    );
  }

  // Default: home page
  return (
    <>
      <HomePage
        user={user}
        onLogout={logout}
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
