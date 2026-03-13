const DIFF_COLORS = {
  1: { bg: "#dcfce7", text: "#166534" },
  2: { bg: "#fef9c3", text: "#854d0e" },
  3: { bg: "#ffedd5", text: "#9a3412" },
  4: { bg: "#fee2e2", text: "#991b1b" },
  5: { bg: "#fce7f3", text: "#9d174d" },
};

export function DiffBadge({ level }) {
  const c = DIFF_COLORS[level] ?? DIFF_COLORS[3];
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 999,
        background: c.bg,
        color: c.text,
        fontFamily: "inherit",
      }}
    >
      D{level}
    </span>
  );
}

export function TypeBadge({ type }) {
  const isMCQ = type === "MCQ";
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 4,
        background: isMCQ ? "#eff6ff" : "#f5f3ff",
        color: isMCQ ? "#1d4ed8" : "#6d28d9",
        letterSpacing: "0.04em",
      }}
    >
      {type}
    </span>
  );
}

