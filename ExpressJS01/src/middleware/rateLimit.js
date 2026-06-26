const stores = new Map();

const cleanupStore = (bucket, now, windowMs) => {
  const recent = bucket.filter((time) => now - time < windowMs);
  return recent;
};

const rateLimit = ({
  windowMs = 60 * 1000,
  max = 30,
  keyPrefix = "global",
  message = "Bạn thao tác quá nhanh, vui lòng thử lại sau.",
} = {}) => {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${req.ip}:${req.path}`;
    const bucket = stores.get(key) || [];
    const recent = cleanupStore(bucket, now, windowMs);

    if (recent.length >= max) {
      return res.status(429).json({
        EC: 429,
        EM: message,
      });
    }

    recent.push(now);
    stores.set(key, recent);
    return next();
  };
};

module.exports = rateLimit;
