require("dotenv").config();
const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  const publicPaths = ["/", "/register", "/login", "/forgot-password"];
  if (publicPaths.includes(req.path)) {
    return next();
  }

  const token = req?.headers?.authorization?.split(" ")?.[1];
  if (!token) {
    return res.status(401).json({
      message: "Bạn chưa truyền Access Token ở header hoặc token bị hết hạn",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      _id: decoded._id,
      email: decoded.email,
      name: decoded.name,
      createdBy: "HCMUTE",
    };
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Token bị hết hạn hoặc không hợp lệ",
    });
  }
};

module.exports = auth;
