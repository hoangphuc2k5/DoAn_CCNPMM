const socialService = require("../services/socialService");

const currentUserId = (req) => req.user._id;

const createPost = async (req, res) => {
  const data = await socialService.createPost(
    currentUserId(req),
    req.body,
    req.files || [],
  );
  return res.status(200).json(data);
};

const getFeed = async (req, res) => {
  const data = await socialService.getFeed(currentUserId(req), req.query);
  return res.status(200).json(data);
};

const getPostById = async (req, res) => {
  const data = await socialService.getPostById(currentUserId(req), req.params.postId);
  return res.status(200).json(data);
};

const reactPost = async (req, res) => {
  const data = await socialService.reactPost(
    currentUserId(req),
    req.params.postId,
    req.body.type,
  );
  return res.status(200).json(data);
};

const commentPost = async (req, res) => {
  const data = await socialService.commentPost(
    currentUserId(req),
    req.params.postId,
    req.body.content,
  );
  return res.status(200).json(data);
};

const replyComment = async (req, res) => {
  const data = await socialService.commentPost(
    currentUserId(req),
    req.body.postId,
    req.body.content,
    req.params.commentId,
  );
  return res.status(200).json(data);
};

const deleteComment = async (req, res) => {
  const data = await socialService.deleteComment(
    currentUserId(req),
    req.params.commentId,
  );
  return res.status(200).json(data);
};

const deletePost = async (req, res) => {
  const data = await socialService.deletePost(
    currentUserId(req),
    req.params.postId,
  );
  return res.status(200).json(data);
};

const sharePost = async (req, res) => {
  const data = await socialService.sharePost(
    currentUserId(req),
    req.params.postId,
    req.body.content,
  );
  return res.status(200).json(data);
};

const followUser = async (req, res) => {
  const data = await socialService.followUser(currentUserId(req), req.params.targetUserId);
  return res.status(200).json(data);
};

const unfollowUser = async (req, res) => {
  const data = await socialService.unfollowUser(currentUserId(req), req.params.targetUserId);
  return res.status(200).json(data);
};

const sendFriendRequest = async (req, res) => {
  const data = await socialService.sendFriendRequest(
    currentUserId(req),
    req.params.targetUserId,
  );
  return res.status(200).json(data);
};

const respondFriendRequest = async (req, res) => {
  const data = await socialService.respondFriendRequest(
    currentUserId(req),
    req.params.requestId,
    req.body.action,
  );
  return res.status(200).json(data);
};

const blockUser = async (req, res) => {
  const data = await socialService.blockUser(currentUserId(req), req.params.targetUserId);
  return res.status(200).json(data);
};

const unblockUser = async (req, res) => {
  const data = await socialService.unblockUser(currentUserId(req), req.params.targetUserId);
  return res.status(200).json(data);
};

const reportPost = async (req, res) => {
  const data = await socialService.reportTarget({
    reporter: currentUserId(req),
    targetType: "post",
    targetId: req.params.postId,
    reason: req.body.reason,
  });
  return res.status(200).json(data);
};

const reportUser = async (req, res) => {
  const data = await socialService.reportTarget({
    reporter: currentUserId(req),
    targetType: "user",
    targetId: req.params.targetUserId,
    reason: req.body.reason,
  });
  return res.status(200).json(data);
};

const getTrendingTopics = async (req, res) => {
  const data = await socialService.getTrendingTopics();
  return res.status(200).json(data);
};

const getRelationships = async (req, res) => {
  const data = await socialService.getRelationships(currentUserId(req));
  return res.status(200).json(data);
};

const getNotifications = async (req, res) => {
  const data = await socialService.getNotifications(
    currentUserId(req),
    Number(req.query.page || 1),
    Number(req.query.limit || 20),
  );
  return res.status(200).json(data);
};

const markNotificationRead = async (req, res) => {
  const data = await socialService.markNotificationRead(
    currentUserId(req),
    req.params.notificationId,
  );
  return res.status(200).json(data);
};

const markAllNotificationsRead = async (req, res) => {
  const data = await socialService.markAllNotificationsRead(currentUserId(req));
  return res.status(200).json(data);
};

module.exports = {
  blockUser,
  commentPost,
  createPost,
  deleteComment,
  deletePost,
  followUser,
  getFeed,
  getNotifications,
  getPostById,
  getRelationships,
  getTrendingTopics,
  markAllNotificationsRead,
  markNotificationRead,
  reactPost,
  replyComment,
  reportPost,
  reportUser,
  respondFriendRequest,
  sendFriendRequest,
  sharePost,
  unblockUser,
  unfollowUser,
};
