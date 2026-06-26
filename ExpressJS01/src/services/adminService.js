const User = require("../models/user");
const Post = require("../models/post");
const Comment = require("../models/comment");
const Report = require("../models/report");
const AuditLog = require("../models/auditLog");

const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeRole = (role) => String(role || "user").toLowerCase();

const getAdminDashboardService = async () => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    totalPosts,
    totalComments,
    totalReports,
    openReports,
    newUsers7d,
    newPosts7d,
    recentReports,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: "active" }),
    User.countDocuments({ status: { $in: ["suspended", "banned"] } }),
    Post.countDocuments(),
    Comment.countDocuments({ deletedAt: null }),
    Report.countDocuments(),
    Report.countDocuments({ status: { $in: ["open", "reviewing"] } }),
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    Post.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    Report.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("reporter", "name email")
      .lean(),
  ]);

  return {
    EC: 0,
    data: {
      metrics: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        totalPosts,
        totalComments,
        totalReports,
        openReports,
        newUsers7d,
        newPosts7d,
      },
      recentReports,
    },
  };
};

const listUsersService = async (query = {}) => {
  const page = toPositiveNumber(query.page, 1);
  const limit = Math.min(toPositiveNumber(query.limit, 10), 50);
  const keyword = String(query.q || "").trim();
  const status = String(query.status || "").trim();
  const role = String(query.role || "").trim();

  const filters = {};
  if (keyword) {
    filters.$or = [
      { name: new RegExp(keyword, "i") },
      { email: new RegExp(keyword, "i") },
    ];
  }
  if (status) {
    filters.status = status;
  }
  if (role) {
    filters.role = new RegExp(`^${role}$`, "i");
  }

  const [items, total] = await Promise.all([
    User.find(filters)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filters),
  ]);

  return {
    EC: 0,
    data: items.map((item) => ({
      ...item,
      role: normalizeRole(item.role),
      status: item.status || "active",
    })),
    pagination: buildPagination(page, limit, total),
  };
};

const updateUserStatusService = async (userId, status) => {
  const nextStatus = String(status || "").toLowerCase();
  if (!["active", "suspended", "banned"].includes(nextStatus)) {
    return { EC: 1, EM: "Trạng thái người dùng không hợp lệ." };
  }

  const payload = {
    status: nextStatus,
    ...(nextStatus === "active"
      ? { banReason: "", bannedUntil: null }
      : {}),
  };

  const user = await User.findByIdAndUpdate(userId, payload, { new: true }).select("-password");
  if (!user) {
    return { EC: 1, EM: "Không tìm thấy người dùng." };
  }

  return {
    EC: 0,
    EM: "Đã cập nhật trạng thái người dùng.",
    data: user,
  };
};

const banUserService = async (userId, body = {}) => {
  const reason = String(body.reason || "").trim();
  const durationDays = Number(body.durationDays || 0);
  const bannedUntil =
    durationDays > 0 ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : null;

  const user = await User.findByIdAndUpdate(
    userId,
    {
      status: "banned",
      banReason: reason,
      bannedUntil,
    },
    { new: true },
  ).select("-password");

  if (!user) {
    return { EC: 1, EM: "Không tìm thấy người dùng." };
  }

  return {
    EC: 0,
    EM: "Đã ban người dùng.",
    data: user,
  };
};

const unbanUserService = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      status: "active",
      banReason: "",
      bannedUntil: null,
    },
    { new: true },
  ).select("-password");

  if (!user) {
    return { EC: 1, EM: "Không tìm thấy người dùng." };
  }

  return {
    EC: 0,
    EM: "Đã gỡ ban người dùng.",
    data: user,
  };
};

const listReportsService = async (query = {}) => {
  const page = toPositiveNumber(query.page, 1);
  const limit = Math.min(toPositiveNumber(query.limit, 10), 50);
  const status = String(query.status || "").trim();
  const targetType = String(query.targetType || "").trim();

  const filters = {};
  if (status) filters.status = status;
  if (targetType) filters.targetType = targetType;

  const [items, total] = await Promise.all([
    Report.find(filters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("reporter", "name email avatar")
      .populate("resolvedBy", "name email")
      .lean(),
    Report.countDocuments(filters),
  ]);

  return {
    EC: 0,
    data: items,
    pagination: buildPagination(page, limit, total),
  };
};

const resolveReportService = async (reportId, adminId, body = {}) => {
  const action = String(body.action || "resolved").toLowerCase();
  const nextStatus = action === "rejected" ? "rejected" : "resolved";

  const report = await Report.findByIdAndUpdate(
    reportId,
    {
      status: nextStatus,
      resolvedBy: adminId,
      resolvedAt: new Date(),
    },
    { new: true },
  )
    .populate("reporter", "name email")
    .populate("resolvedBy", "name email");

  if (!report) {
    return { EC: 1, EM: "Không tìm thấy report." };
  }

  return {
    EC: 0,
    EM: "Đã cập nhật trạng thái report.",
    data: report,
  };
};

const listPostsService = async (query = {}) => {
  const page = toPositiveNumber(query.page, 1);
  const limit = Math.min(toPositiveNumber(query.limit, 10), 50);
  const keyword = String(query.q || "").trim();

  const filters = keyword
    ? {
        $or: [
          { content: new RegExp(keyword, "i") },
          { hashtags: new RegExp(keyword, "i") },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    Post.find(filters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("author", "name email avatar")
      .lean(),
    Post.countDocuments(filters),
  ]);

  return {
    EC: 0,
    data: items,
    pagination: buildPagination(page, limit, total),
  };
};

const removePostService = async (postId) => {
  const post = await Post.findByIdAndDelete(postId);
  if (!post) {
    return { EC: 1, EM: "Không tìm thấy bài viết." };
  }

  await Comment.deleteMany({ post: postId });

  return {
    EC: 0,
    EM: "Đã gỡ bài viết khỏi hệ thống.",
  };
};

const listAuditLogsService = async (query = {}) => {
  const page = toPositiveNumber(query.page, 1);
  const limit = Math.min(toPositiveNumber(query.limit, 20), 50);
  const logs = await AuditLog.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("actor", "name email")
    .lean();
  const total = await AuditLog.countDocuments();

  return {
    EC: 0,
    data: logs,
    pagination: buildPagination(page, limit, total),
  };
};

module.exports = {
  banUserService,
  getAdminDashboardService,
  listAuditLogsService,
  listPostsService,
  listReportsService,
  listUsersService,
  removePostService,
  resolveReportService,
  unbanUserService,
  updateUserStatusService,
};
