require("dotenv").config();
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const auth = async (req, res, next) => {
  const publicPaths = [
    "/",
    "/register",
    "/login",
    "/login/google",
    "/login/verify-2fa",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/verify-email/resend",
    "/captcha",
  ];
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
    const user = await User.findOne({ _id: decoded._id, deletedAt: null }).select(
      "_id email name avatar role status",
    );

    if (!user) {
      return res.status(401).json({
        message: "Tài khoản không tồn tại hoặc đã bị xóa",
      });
    }

    const normalizedRole = String(user.role || "user").toLowerCase();
    const normalizedStatus = String(user.status || "active").toLowerCase();

    if (["banned", "suspended"].includes(normalizedStatus)) {
      return res.status(403).json({
        EC: 403,
        EM: "Tài khoản hiện đang bị khóa.",
      });
    }

    req.user = {
      _id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: normalizedRole,
      status: normalizedStatus,
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
