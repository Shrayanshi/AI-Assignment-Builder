export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
  style,
  disabled,
  ...rest
}) {
  const base = {
    borderRadius: 10,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "background 0.15s ease, box-shadow 0.15s ease, transform 0.08s ease",
    minHeight: 40,
  };

  const variants = {
    primary: {
      background: "linear-gradient(135deg, #4f46e5, #6366f1)",
      color: "#ffffff",
      boxShadow: "0 6px 16px rgba(79,70,229,0.25)",
    },
    secondary: {
      background: "#ffffff",
      color: "#374151",
      border: "1px solid #e5e7eb",
    },
    ghost: {
      background: "transparent",
      color: "#374151",
    },
  };

  const variantStyle = variants[variant] || variants.primary;

  return (
    <button
      type={type}
      onClick={onClick}
      className={className}
      disabled={disabled}
      style={{
        ...base,
        ...variantStyle,
        ...(disabled && { opacity: 0.7, cursor: "not-allowed" }),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

