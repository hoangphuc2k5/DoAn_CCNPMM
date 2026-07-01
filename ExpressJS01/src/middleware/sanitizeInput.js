const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, child]) => {
      if (key.startsWith("$") || key.includes(".")) {
        return acc;
      }
      acc[key] = sanitizeValue(child);
      return acc;
    }, {});
  }

  if (typeof value === "string") {
    return value
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/[<>]/g, "")
      .trim();
  }

  return value;
};

const sanitizeInput = (req, _res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};

module.exports = sanitizeInput;
