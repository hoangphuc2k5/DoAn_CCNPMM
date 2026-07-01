const groupService = require("../services/groupService");

const currentUserId = (req) => req.user._id;

const listGroups = async (req, res) => {
  const data = await groupService.listGroups(currentUserId(req), req.query);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const createGroup = async (req, res) => {
  const data = await groupService.createGroup(currentUserId(req), req.body);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const updateGroup = async (req, res) => {
  const data = await groupService.updateGroup(
    currentUserId(req),
    req.params.groupId,
    req.body,
  );
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ EC: 1, EM: "Vui long chon file anh" });
  }

  const filePath = `/uploads/avatars/${req.file.filename}`;
  const data = await groupService.updateGroupImage(
    currentUserId(req),
    req.params.groupId,
    "avatar",
    filePath,
  );
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const uploadCover = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ EC: 1, EM: "Vui long chon file anh" });
  }

  const filePath = `/uploads/covers/${req.file.filename}`;
  const data = await groupService.updateGroupImage(
    currentUserId(req),
    req.params.groupId,
    "coverPhoto",
    filePath,
  );
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const getGroupById = async (req, res) => {
  const data = await groupService.getGroupById(currentUserId(req), req.params.groupId);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const joinGroup = async (req, res) => {
  const data = await groupService.joinGroup(currentUserId(req), req.params.groupId);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const leaveGroup = async (req, res) => {
  const data = await groupService.leaveGroup(currentUserId(req), req.params.groupId);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const updateMemberRole = async (req, res) => {
  const data = await groupService.updateMemberRole(
    currentUserId(req),
    req.params.groupId,
    req.params.memberId,
    req.body.role,
  );
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const listJoinRequests = async (req, res) => {
  const data = await groupService.listJoinRequests(currentUserId(req), req.params.groupId);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const respondJoinRequest = async (req, res) => {
  const data = await groupService.respondJoinRequest(
    currentUserId(req),
    req.params.groupId,
    req.params.requestId,
    req.body.action,
  );
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const removeMember = async (req, res) => {
  const data = await groupService.removeMember(
    currentUserId(req),
    req.params.groupId,
    req.params.memberId,
  );
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const getGroupPosts = async (req, res) => {
  const data = await groupService.getGroupPosts(
    currentUserId(req),
    req.params.groupId,
    req.query,
  );
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const getGroupMedia = async (req, res) => {
  const data = await groupService.getGroupMedia(
    currentUserId(req),
    req.params.groupId,
    req.query,
  );
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const createGroupPost = async (req, res) => {
  const data = await groupService.createGroupPost(
    currentUserId(req),
    req.params.groupId,
    req.body,
    req.files || [],
  );
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const listPendingPosts = async (req, res) => {
  const data = await groupService.listPendingPosts(currentUserId(req), req.params.groupId);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const reviewPendingPost = async (req, res) => {
  const data = await groupService.reviewPendingPost(
    currentUserId(req),
    req.params.groupId,
    req.params.postId,
    req.body.action,
  );
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const listGroupReports = async (req, res) => {
  const data = await groupService.listGroupReports(currentUserId(req), req.params.groupId);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const resolveGroupReport = async (req, res) => {
  const data = await groupService.resolveGroupReport(
    currentUserId(req),
    req.params.groupId,
    req.params.reportId,
    req.body.action,
  );
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const listEvents = async (req, res) => {
  const data = await groupService.listEvents(currentUserId(req), req.params.groupId);
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const createEvent = async (req, res) => {
  const data = await groupService.createEvent(
    currentUserId(req),
    req.params.groupId,
    req.body,
  );
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const attendEvent = async (req, res) => {
  const data = await groupService.attendEvent(
    currentUserId(req),
    req.params.groupId,
    req.params.eventId,
  );
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

const leaveEvent = async (req, res) => {
  const data = await groupService.leaveEvent(
    currentUserId(req),
    req.params.groupId,
    req.params.eventId,
  );
  return res.status(data.EC === 0 ? 200 : 400).json(data);
};

module.exports = {
  attendEvent,
  createEvent,
  createGroup,
  createGroupPost,
  getGroupById,
  getGroupMedia,
  getGroupPosts,
  joinGroup,
  leaveGroup,
  leaveEvent,
  listJoinRequests,
  listEvents,
  listGroupReports,
  listPendingPosts,
  listGroups,
  removeMember,
  resolveGroupReport,
  reviewPendingPost,
  respondJoinRequest,
  updateGroup,
  uploadAvatar,
  uploadCover,
  updateMemberRole,
};
