const requireRole = (...allowedRoles) => (req, res, next) => {
  const userRole = String(req.user?.role || "").toLowerCase();
  const normalizedRoles = allowedRoles.map((role) => String(role).toLowerCase());

  if (!req.user?._id) {
    return res.status(401).json({
      EC: 401,
      EM: "Bạn cần đăng nhập để thực hiện thao tác này.",
    });
  }

  if (!normalizedRoles.includes(userRole)) {
    return res.status(403).json({
      EC: 403,
      EM: "Bạn không có quyền truy cập khu vực quản trị.",
    });
  }

  return next();
};

module.exports = requireRole;
