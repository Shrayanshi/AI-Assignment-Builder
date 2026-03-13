export function Card({ children, className = "", style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
        padding: 16,
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.15s ease, border-color 0.15s ease, transform 0.1s ease",
        ...style,
      }}
      className={className}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", style }) {
  return (
    <div
      style={{
        marginBottom: 4,
        ...style,
      }}
      className={className}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "", style }) {
  return (
    <h2
      style={{
        fontSize: 18,
        fontWeight: 600,
        margin: 0,
        color: "#111827",
        ...style,
      }}
      className={className}
    >
      {children}
    </h2>
  );
}

export function CardDescription({ children, className = "", style }) {
  return (
    <p
      style={{
        fontSize: 13,
        color: "#6b7280",
        margin: "4px 0 0",
        ...style,
      }}
      className={className}
    >
      {children}
    </p>
  );
}

