export function ToastStack({ toasts }) {
  if (!toasts || toasts.length === 0) return null;

  const getStyles = (variant) => {
    switch (variant) {
      case "success":
        return {
          bg: "#dcfce7",
          border: "#bbf7d0",
          color: "#14532d",
          icon: "✓",
        };
      case "error":
        return {
          bg: "#fee2e2",
          border: "#fecaca",
          color: "#7f1d1d",
          icon: "⚠",
        };
      default:
        return {
          bg: "#e5e7eb",
          border: "#d1d5db",
          color: "#111827",
          icon: "ℹ",
        };
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 999,
      }}
    >
      {toasts.map((t) => {
        const s = getStyles(t.variant);
        return (
          <div
            key={t.id}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: s.color,
              background: s.bg,
              border: `1px solid ${s.border}`,
              boxShadow: "0 4px 10px rgba(15,23,42,0.15)",
            }}
          >
            <span style={{ fontSize: 12 }}>{s.icon}</span>
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

