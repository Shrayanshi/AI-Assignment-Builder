export function AssignmentRow({
  question,
  index,
  isActive,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDrop,
  onClick,
}) {
  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDrop={onDrop}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        borderRadius: 12,
        border: `1px solid ${
          isDragOver ? "#818cf8" : isActive ? "#6366f1" : "transparent"
        }`,
        background: isDragOver
          ? "#eef2ff"
          : isActive
            ? "#f5f3ff"
            : "#ffffff",
        marginBottom: 5,
        cursor: "grab",
        listStyle: "none",
        transition: "all 0.12s ease",
        opacity: isDragging ? 0.4 : 1,
        transform: isDragOver ? "scale(1.01)" : "scale(1)",
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: "#94a3b8",
          width: 20,
          flexShrink: 0,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {index + 1}.
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            color: "#1e293b",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {question.text}
        </div>
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: 999,
          background: "#f1f5f9",
          color: "#475569",
          flexShrink: 0,
        }}
      >
        {question.type} · {question.marks}pt
      </span>
    </li>
  );
}

