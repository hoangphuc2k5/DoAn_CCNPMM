const {
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
} = require("../services/adminService");

const getDashboard = async (req, res) => {
  const data = await getAdminDashboardService();
  return res.status(200).json(data);
};

const listUsers = async (req, res) => {
  const data = await listUsersService(req.query);
  return res.status(200).json(data);
};

const updateUserStatus = async (req, res) => {
  const data = await updateUserStatusService(req.params.userId, req.body.status);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const banUser = async (req, res) => {
  const data = await banUserService(req.params.userId, req.body);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const unbanUser = async (req, res) => {
  const data = await unbanUserService(req.params.userId);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const listReports = async (req, res) => {
  const data = await listReportsService(req.query);
  return res.status(200).json(data);
};

const resolveReport = async (req, res) => {
  const data = await resolveReportService(req.params.reportId, req.user._id, req.body);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const listPosts = async (req, res) => {
  const data = await listPostsService(req.query);
  return res.status(200).json(data);
};

const listAuditLogs = async (req, res) => {
  const data = await listAuditLogsService(req.query);
  return res.status(200).json(data);
};

const removePost = async (req, res) => {
  const data = await removePostService(req.params.postId);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

module.exports = {
  banUser,
  getDashboard,
  listAuditLogs,
  listPosts,
  listReports,
  listUsers,
  removePost,
  resolveReport,
  unbanUser,
  updateUserStatus,
};
