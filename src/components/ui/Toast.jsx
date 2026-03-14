export function ToastStack({ toasts }) {
  if (!toasts || toasts.length === 0) return null;

  const getStyles = (variant) => {
    switch (variant) {
      case "success":
        return {
          bg: "#ecfdf5",
          border: "#a7f3d0",
          color: "#065f46",
          icon: "✓",
        };
      case "error":
        return {
          bg: "#fef2f2",
          border: "#fecaca",
          color: "#991b1b",
          icon: "⚠",
        };
      default:
        return {
          bg: "#f3f4f6",
          border: "#e5e7eb",
          color: "#111827",
          icon: "ℹ",
        };
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: 999,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const s = getStyles(t.variant);
        return (
          <div
            key={t.id}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: s.color,
              background: s.bg,
              border: `1px solid ${s.border}`,
              boxShadow:
                "0 6px 16px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.06)",
              backdropFilter: "blur(6px)",
              animation: "toast-slide 0.25s ease",
              pointerEvents: "auto",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
              }}
            >
              {s.icon}
            </span>
            <span>{t.message}</span>
          </div>
        );
      })}

      <style>
        {`
          @keyframes toast-slide {
            from {
              transform: translateX(20px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
}