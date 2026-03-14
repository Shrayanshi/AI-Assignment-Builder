import { useState, useMemo } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

const empty = [];

function FilterIcon({ active }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#2563eb" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

export function HomePage({
  documents = empty,
  onCreateNew,
  onEditDocument,
  onDeleteDocument,
  loading = false,
}) {
  const [tab, setTab] = useState("papers");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPaperSubject, setFilterPaperSubject] = useState("");
  const [filterPaperGrade, setFilterPaperGrade] = useState("");
  const [filterPaperExamType, setFilterPaperExamType] = useState("");
  const [filterPaperMarks, setFilterPaperMarks] = useState("");
  const [filterPaperQuestionCount, setFilterPaperQuestionCount] = useState("");
  const [filterAssignSubject, setFilterAssignSubject] = useState("");
  const [filterAssignMarks, setFilterAssignMarks] = useState("");
  const [filterAssignQuestionCount, setFilterAssignQuestionCount] = useState("");

  const papers = documents.filter((d) => d.kind === "paper");
  const assignments = documents.filter((d) => d.kind === "assignment");

  const paperFields = useMemo(() => {
    const subjects = [...new Set(papers.map((p) => p.subject).filter(Boolean))].sort();
    const grades = [...new Set(papers.map((p) => p.grade).filter(Boolean))].sort();
    const examTypes = [...new Set(papers.map((p) => p.examType).filter(Boolean))].sort();
    const marks = [...new Set(papers.map((p) => p.totalMarks).filter((m) => m != null && m !== ""))].sort((a, b) => Number(a) - Number(b));
    const questionCounts = [...new Set(papers.map((p) => p.questionCount).filter((n) => n != null))].sort((a, b) => Number(a) - Number(b));
    return { subjects, grades, examTypes, marks, questionCounts };
  }, [papers]);

  const assignFields = useMemo(() => {
    const subjects = [...new Set(assignments.map((a) => a.subject).filter(Boolean))].sort();
    const marks = [...new Set(assignments.map((a) => a.totalMarks).filter((m) => m != null && m !== ""))].sort((a, b) => Number(a) - Number(b));
    const questionCounts = [...new Set(assignments.map((a) => a.questionCount).filter((n) => n != null))].sort((a, b) => Number(a) - Number(b));
    return { subjects, marks, questionCounts };
  }, [assignments]);

  const filteredPapers = useMemo(() => {
    const hasFilter = filterPaperSubject || filterPaperGrade || filterPaperExamType || filterPaperMarks || filterPaperQuestionCount;
    if (!hasFilter) return papers;
    return papers.filter((p) => {
      if (filterPaperSubject && p.subject !== filterPaperSubject) return false;
      if (filterPaperGrade && p.grade !== filterPaperGrade) return false;
      if (filterPaperExamType && p.examType !== filterPaperExamType) return false;
      if (filterPaperMarks && String(p.totalMarks) !== filterPaperMarks) return false;
      if (filterPaperQuestionCount && String(p.questionCount) !== filterPaperQuestionCount) return false;
      return true;
    });
  }, [papers, filterPaperSubject, filterPaperGrade, filterPaperExamType, filterPaperMarks, filterPaperQuestionCount]);

  const filteredAssignments = useMemo(() => {
    const hasFilter = filterAssignSubject || filterAssignMarks || filterAssignQuestionCount;
    if (!hasFilter) return assignments;
    return assignments.filter((a) => {
      if (filterAssignSubject && a.subject !== filterAssignSubject) return false;
      if (filterAssignMarks && String(a.totalMarks) !== filterAssignMarks) return false;
      if (filterAssignQuestionCount && String(a.questionCount) !== filterAssignQuestionCount) return false;
      return true;
    });
  }, [assignments, filterAssignSubject, filterAssignMarks, filterAssignQuestionCount]);

  const hasActiveFilter =
    tab === "papers"
      ? !!(filterPaperSubject || filterPaperGrade || filterPaperExamType || filterPaperMarks || filterPaperQuestionCount)
      : !!(filterAssignSubject || filterAssignMarks || filterAssignQuestionCount);

  const confirmDelete = (doc) => {
    if (!onDeleteDocument) return;
    const label = doc.kind === "paper" ? "question paper" : "assignment";
    if (window.confirm(`Delete this ${label}? This cannot be undone.`)) {
      onDeleteDocument(doc.id);
    }
  };

  const tabStyle = (active) => ({
    border: "none",
    borderRadius: 999,
    padding: "8px 16px",
    fontSize: 13,
    cursor: "pointer",
    background: active ? "#ffffff" : "transparent",
    color: active ? "#111827" : "#6b7280",
    fontWeight: active ? 600 : 500,
    fontFamily: "'DM Sans', system-ui, sans-serif",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb" }}>
        <div
          className="home-header"
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
            <Button onClick={onCreateNew}>
              + Create New
            </Button>
          )}
        </div>
      </div>

      <div className="home-content" style={{ maxWidth: 1120, margin: "0 auto", padding: "20px 24px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div
            style={{
              display: "inline-flex",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              padding: 3,
              background: "#f3f4f6",
            }}
          >
            <Button
              variant="ghost"
              onClick={() => setTab("papers")}
              style={{
                ...tabStyle(tab === "papers"),
                minHeight: "auto",
                padding: "8px 16px",
                background: tab === "papers" ? "#ffffff" : "transparent",
                border: "none",
              }}
            >
              Question Papers ({papers.length})
            </Button>
            <Button
              variant="ghost"
              onClick={() => setTab("assignments")}
              style={{
                ...tabStyle(tab === "assignments"),
                minHeight: "auto",
                padding: "8px 16px",
                background: tab === "assignments" ? "#ffffff" : "transparent",
                border: "none",
              }}
            >
              Assignments ({assignments.length})
            </Button>
          </div>
          <Button
            variant="secondary"
            onClick={() => setFilterOpen((o) => !o)}
            title="Filter by available fields"
            style={{
              padding: "8px 14px",
              background: hasActiveFilter ? "#eff6ff" : undefined,
              color: hasActiveFilter ? "#2563eb" : undefined,
              borderColor: hasActiveFilter ? "#93c5fd" : undefined,
            }}
          >
            <FilterIcon active={hasActiveFilter} />
            Filter
          </Button>
          {filterOpen && (
            <Card style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
              {tab === "papers" && (
                <>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280" }}>Subject</span>
                    <select
                      value={filterPaperSubject}
                      onChange={(e) => setFilterPaperSubject(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, minWidth: 100 }}
                    >
                      <option value="">All</option>
                      {paperFields.subjects.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280" }}>Grade</span>
                    <select
                      value={filterPaperGrade}
                      onChange={(e) => setFilterPaperGrade(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, minWidth: 80 }}
                    >
                      <option value="">All</option>
                      {paperFields.grades.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280" }}>Exam type</span>
                    <select
                      value={filterPaperExamType}
                      onChange={(e) => setFilterPaperExamType(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, minWidth: 100 }}
                    >
                      <option value="">All</option>
                      {paperFields.examTypes.map((et) => (
                        <option key={et} value={et}>{et}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280" }}>Marks</span>
                    <select
                      value={filterPaperMarks}
                      onChange={(e) => setFilterPaperMarks(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, minWidth: 80 }}
                    >
                      <option value="">All</option>
                      {paperFields.marks.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280" }}>No. of questions</span>
                    <select
                      value={filterPaperQuestionCount}
                      onChange={(e) => setFilterPaperQuestionCount(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, minWidth: 80 }}
                    >
                      <option value="">All</option>
                      {paperFields.questionCounts.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {tab === "assignments" && (
                <>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280" }}>Subject</span>
                    <select
                      value={filterAssignSubject}
                      onChange={(e) => setFilterAssignSubject(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, minWidth: 100 }}
                    >
                      <option value="">All</option>
                      {assignFields.subjects.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280" }}>Marks</span>
                    <select
                      value={filterAssignMarks}
                      onChange={(e) => setFilterAssignMarks(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, minWidth: 80 }}
                    >
                      <option value="">All</option>
                      {assignFields.marks.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280" }}>No. of questions</span>
                    <select
                      value={filterAssignQuestionCount}
                      onChange={(e) => setFilterAssignQuestionCount(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, minWidth: 80 }}
                    >
                      <option value="">All</option>
                      {assignFields.questionCounts.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </Card>
          )}
        </div>

        {tab === "papers" && (
          <>
            {loading ? (
              <Card style={{ padding: 24, textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "#6b7280" }}>Loading papers…</p>
              </Card>
            ) : filteredPapers.length === 0 ? (
              <Card style={{ padding: 32, textAlign: "center" }}>
                <h3 style={{ fontSize: 16, fontWeight: 500, color: "#4b5563", marginBottom: 8 }}>
                  {papers.length === 0 ? "No Question Papers Yet" : "No papers match the filter"}
                </h3>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                  Create your first question paper to get started.
                </p>
                {onCreateNew && <Button onClick={onCreateNew}>Create Question Paper</Button>}
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredPapers.map((paper) => (
                  <Card key={paper.id} style={{ padding: 16, display: "flex", justifyContent: "space-between", gap: 12 }} className="home-card">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
                          {paper.subject} — {paper.examType}
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{paper.schoolName}</div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 11, marginBottom: 6 }}>
                        <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#eff6ff", color: "#1d4ed8" }}>
                          {paper.grade}
                        </span>
                        <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#f3f4f6" }}>
                          {paper.questionCount} Questions
                        </span>
                        <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#f3f4f6" }}>
                          {paper.totalMarks} Marks
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        Created: {new Date(paper.createdAt).toLocaleDateString()} · Last modified: {new Date(paper.lastModified).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="home-card-actions" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                      {onEditDocument && (
                        <Button variant="secondary" onClick={() => onEditDocument(paper.id)} style={{ padding: "8px 14px" }}>
                          Edit
                        </Button>
                      )}
                      {onDeleteDocument && (
                        <Button variant="ghost" onClick={() => confirmDelete(paper)} style={{ padding: "6px 12px", color: "#b91c1c" }}>
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

        {tab === "assignments" && (
          <>
            {loading ? (
              <Card style={{ padding: 24, textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "#6b7280" }}>Loading assignments…</p>
              </Card>
            ) : filteredAssignments.length === 0 ? (
              <Card style={{ padding: 32, textAlign: "center" }}>
                <h3 style={{ fontSize: 16, fontWeight: 500, color: "#4b5563", marginBottom: 8 }}>
                  {assignments.length === 0 ? "No Assignments Yet" : "No assignments match the filter"}
                </h3>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                  Create your first assignment to get started.
                </p>
                {onCreateNew && <Button onClick={onCreateNew}>Create Assignment</Button>}
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredAssignments.map((assignment) => (
                  <Card key={assignment.id} style={{ padding: 16, display: "flex", justifyContent: "space-between", gap: 12 }} className="home-card">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{assignment.title}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{assignment.subject}</div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 11, marginBottom: 6 }}>
                        <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#f3f4f6" }}>
                          {assignment.questionCount} Questions
                        </span>
                        <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#f3f4f6" }}>
                          {assignment.totalMarks} Marks
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        Created: {new Date(assignment.createdAt).toLocaleDateString()} · Last modified: {new Date(assignment.lastModified).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="home-card-actions" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                      {onEditDocument && (
                        <Button variant="secondary" onClick={() => onEditDocument(assignment.id)} style={{ padding: "8px 14px" }}>
                          Edit
                        </Button>
                      )}
                      {onDeleteDocument && (
                        <Button variant="ghost" onClick={() => confirmDelete(assignment)} style={{ padding: "8px 14px", color: "#b91c1c" }}>
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
