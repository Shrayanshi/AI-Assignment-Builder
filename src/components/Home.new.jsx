import { useState } from "react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

const empty = [];

export function HomePage({
  documents = empty,
  onCreateNew,
  onEditDocument,
  onDeleteDocument,
  loading = false,
}) {
  const [tab, setTab] = useState("papers"); // 'papers' | 'assignments'

  const papers = documents.filter((d) => d.kind === "paper");
  const assignments = documents.filter((d) => d.kind === "assignment");

  const confirmDelete = (doc) => {
    if (!onDeleteDocument) return;
    const label = doc.kind === "paper" ? "question paper" : "assignment";
    if (window.confirm(`Delete this ${label}? This cannot be undone.`)) {
      onDeleteDocument(doc.id);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Header */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb" }}>
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
              Question Papers & Assignments
            </h1>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
              Create and manage your question papers and assignments.
            </p>
          </div>
          {onCreateNew && (
            <Button onClick={onCreateNew} style={{ paddingInline: 16, fontSize: 13 }}>
              + Create New
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "20px 24px 32px",
        }}
      >
        {/* Simple tabs */}
        <div
          style={{
            display: "inline-flex",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            padding: 3,
            marginBottom: 16,
            background: "#f3f4f6",
          }}
        >
          <button
            type="button"
            onClick={() => setTab("papers")}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "6px 14px",
              fontSize: 12,
              cursor: "pointer",
              background: tab === "papers" ? "#ffffff" : "transparent",
              color: tab === "papers" ? "#111827" : "#6b7280",
              fontWeight: tab === "papers" ? 600 : 500,
            }}
          >
            Question Papers ({papers.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("assignments")}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "6px 14px",
              fontSize: 12,
              cursor: "pointer",
              background: tab === "assignments" ? "#ffffff" : "transparent",
              color: tab === "assignments" ? "#111827" : "#6b7280",
              fontWeight: tab === "assignments" ? 600 : 500,
            }}
          >
            Assignments ({assignments.length})
          </button>
        </div>

        {/* Question Papers */}
        {tab === "papers" && (
          <>
            {loading ? (
              <Card style={{ padding: 24, textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "#6b7280" }}>Loading papers…</p>
              </Card>
            ) : papers.length === 0 ? (
              <Card style={{ padding: 32, textAlign: "center" }}>
                <h3 style={{ fontSize: 16, fontWeight: 500, color: "#4b5563", marginBottom: 8 }}>
                  No Question Papers Yet
                </h3>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                  Create your first question paper to get started.
                </p>
                {onCreateNew && (
                  <Button onClick={onCreateNew} style={{ paddingInline: 16, fontSize: 13 }}>
                    Create Question Paper
                  </Button>
                )}
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {papers.map((paper) => (
                  <Card
                    key={paper.id}
                    style={{
                      padding: 16,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
                          {paper.subject} — {paper.examType}
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{paper.schoolName}</div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          fontSize: 11,
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            border: "1px solid #e5e7eb",
                            background: "#eff6ff",
                            color: "#1d4ed8",
                          }}
                        >
                          {paper.grade}
                        </span>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            border: "1px solid #e5e7eb",
                            background: "#f3f4f6",
                          }}
                        >
                          {paper.questionCount} Questions
                        </span>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            border: "1px solid #e5e7eb",
                            background: "#f3f4f6",
                          }}
                        >
                          {paper.totalMarks} Marks
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        Created: {new Date(paper.createdAt).toLocaleDateString()} · Last
                        modified: {new Date(paper.lastModified).toLocaleDateString()}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        alignItems: "flex-end",
                      }}
                    >
                      {onEditDocument && (
                        <Button
                          variant="secondary"
                          onClick={() => onEditDocument(paper.id)}
                          style={{ padding: "4px 10px", fontSize: 11 }}
                        >
                          Edit
                        </Button>
                      )}
                      {onDeleteDocument && (
                        <Button
                          variant="ghost"
                          onClick={() => confirmDelete(paper)}
                          style={{ padding: "4px 10px", fontSize: 11, color: "#b91c1c" }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Assignments */}
        {tab === "assignments" && (
          <>
            {loading ? (
              <Card style={{ padding: 24, textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "#6b7280" }}>Loading assignments…</p>
              </Card>
            ) : assignments.length === 0 ? (
              <Card style={{ padding: 32, textAlign: "center" }}>
                <h3 style={{ fontSize: 16, fontWeight: 500, color: "#4b5563", marginBottom: 8 }}>
                  No Assignments Yet
                </h3>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                  Create your first assignment to get started.
                </p>
                {onCreateNew && (
                  <Button onClick={onCreateNew} style={{ paddingInline: 16, fontSize: 13 }}>
                    Create Assignment
                  </Button>
                )}
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {assignments.map((assignment) => (
                  <Card
                    key={assignment.id}
                    style={{
                      padding: 16,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
                          {assignment.title}
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          {assignment.subject}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          fontSize: 11,
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            border: "1px solid #e5e7eb",
                            background: "#f3f4f6",
                          }}
                        >
                          {assignment.questionCount} Questions
                        </span>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            border: "1px solid #e5e7eb",
                            background: "#f3f4f6",
                          }}
                        >
                          {assignment.totalMarks} Marks
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        Created: {new Date(assignment.createdAt).toLocaleDateString()} · Last
                        modified: {new Date(assignment.lastModified).toLocaleDateString()}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        alignItems: "flex-end",
                      }}
                    >
                      {onEditDocument && (
                        <Button
                          variant="secondary"
                          onClick={() => onEditDocument(assignment.id)}
                          style={{ padding: "4px 10px", fontSize: 11 }}
                        >
                          Edit
                        </Button>
                      )}
                      {onDeleteDocument && (
                        <Button
                          variant="ghost"
                          onClick={() => confirmDelete(assignment)}
                          style={{ padding: "4px 10px", fontSize: 11, color: "#b91c1c" }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

