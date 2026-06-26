const backendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

export const getMediaUrl = (src) => {
  if (!src) return "";
  if (/^(https?|blob|data):/i.test(src) || src.startsWith("//")) return src;
  if (!backendUrl) return src;

  return `${backendUrl}${src.startsWith("/") ? "" : "/"}${src}`;
};
