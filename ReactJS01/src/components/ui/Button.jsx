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
    "inline-flex items-center justify-center gap-2 px-5 text-sm font-semibold transition focus:outline-none";
  const styles =
    variant === "ghost"
      ? "h-12 rounded-[14px] border border-[#7f00fd] bg-white text-[#7f00fd] hover:bg-[#f5f3ff]"
      : "h-[74px] rounded-[4px] bg-[#7f00fd] text-[16px] font-bold leading-6 text-white hover:bg-[#6b00d7] disabled:bg-[#e5e7eb] disabled:text-[#99a1af]";

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
