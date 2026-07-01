const Input = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  className = "",
  inputClassName = "",
  hideLabel = false,
}) => {
  return (
    <label className={`block w-full ${className}`}>
      <span className={hideLabel ? "sr-only" : "mb-2 block text-sm font-medium text-[#7f00fd]"}>
        {label}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`h-20 w-full rounded-[16px] border-[1.6px] bg-white px-[13.6px] text-[16px] text-[#111827] outline-none transition placeholder:text-[rgba(127,0,253,0.6)] focus:border-[#7f00fd] ${
          error ? "border-[#c2531a]" : "border-[#7f00fd]"
        } ${inputClassName}`}
      />
      {error ? (
        <span className="mt-2 block text-xs text-[#c2531a]">{error}</span>
      ) : null}
    </label>
  );
};

export default Input;
