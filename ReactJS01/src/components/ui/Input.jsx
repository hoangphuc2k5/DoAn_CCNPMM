import React from "react";

const Input = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  className = "",
}) => {
  return (
    <label className={`block text-sm text-ink ${className}`}>
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm shadow-sm outline-none transition focus:border-reef focus:ring-2 focus:ring-reef/20 ${
          error ? "border-ember" : "border-black/10"
        }`}
      />
      {error ? (
        <span className="mt-2 block text-xs text-ember">{error}</span>
      ) : null}
    </label>
  );
};

export default Input;
