const recentActions = new Map();

const antiSpam = ({
  keyPrefix = "post",
  cooldownMs = 5000,
  message = "Bạn thao tác quá nhanh, vui lòng chờ vài giây.",
} = {}) => {
  return (req, res, next) => {
    const userKey = req.user?._id || req.ip;
    const content = JSON.stringify(req.body || {});
    const key = `${keyPrefix}:${userKey}:${content}`;
    const now = Date.now();
    const lastAction = recentActions.get(key);

    if (lastAction && now - lastAction < cooldownMs) {
      return res.status(429).json({
        EC: 429,
        EM: message,
      });
    }

    recentActions.set(key, now);
    next();
  };
};

module.exports = antiSpam;
