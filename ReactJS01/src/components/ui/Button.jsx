import React from "react";

const Button = ({
  type = "button",
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  children,
  ...rest
}) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  const styles =
    variant === "ghost"
      ? "border border-black/10 bg-transparent text-ink hover:border-reef hover:text-reef focus:ring-reef/30"
      : "bg-reef text-white shadow-glow hover:-translate-y-0.5 hover:bg-ink focus:ring-reef/40";

  return (
    <button
      type={type}
      className={`${base} ${styles} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? "Đang xử lý..." : children}
    </button>
  );
};

export default Button;
