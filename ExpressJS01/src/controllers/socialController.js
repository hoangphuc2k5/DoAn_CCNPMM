const socialService = require("../services/socialService");
const pushService = require("../services/pushService");
const socketService = require("../services/socketService");
const { processPostMediaFiles } = require("../services/mediaService");

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

const getSavedPosts = async (req, res) => {
  const data = await socialService.getSavedPosts(currentUserId(req), req.query);
  return res.status(200).json(data);
};

const savePost = async (req, res) => {
  const data = await socialService.savePost(currentUserId(req), req.params.postId);
  return res.status(200).json(data);
};

const unsavePost = async (req, res) => {
  const data = await socialService.unsavePost(currentUserId(req), req.params.postId);
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

const hidePost = async (req, res) => {
  const data = await socialService.hideTarget({
    userId: currentUserId(req),
    targetType: "post",
    targetId: req.params.postId,
  });
  return res.status(200).json(data);
};

const hideComment = async (req, res) => {
  const data = await socialService.hideTarget({
    userId: currentUserId(req),
    targetType: "comment",
    targetId: req.params.commentId,
  });
  return res.status(200).json(data);
};

const updatePost = async (req, res) => {
  const data = await socialService.updatePost(
    currentUserId(req),
    req.params.postId,
    req.body,
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

const unfriendUser = async (req, res) => {
  const data = await socialService.unfriend(
    currentUserId(req),
    req.params.targetUserId,
  );
  return res.status(200).json(data);
};

const blockUser = async (req, res) => {
  const userId = currentUserId(req);
  const targetUserId = req.params.targetUserId;
  const data = await socialService.blockUser(userId, targetUserId);
  
  if (data && data.EC === 0) {
    // Emit socket event to notify the blocked user
    socketService.emitBlockStatusChanged(userId, targetUserId, true);
  }
  
  return res.status(200).json(data);
};

const unblockUser = async (req, res) => {
  const userId = currentUserId(req);
  const targetUserId = req.params.targetUserId;
  const data = await socialService.unblockUser(userId, targetUserId);
  
  if (data && data.EC === 0) {
    // Emit socket event to notify the unblocked user
    socketService.emitBlockStatusChanged(userId, targetUserId, false);
  }
  
  return res.status(200).json(data);
};

const restrictUser = async (req, res) => {
  const userId = currentUserId(req);
  const targetUserId = req.params.targetUserId;
  const data = await socialService.restrictUser(userId, targetUserId);
  
  if (data && data.EC === 0) {
    // Emit socket event to notify the restricted user
    socketService.emitRestrictStatusChanged(userId, targetUserId, true);
  }
  
  return res.status(200).json(data);
};

const unrestrictUser = async (req, res) => {
  const userId = currentUserId(req);
  const targetUserId = req.params.targetUserId;
  const data = await socialService.unrestrictUser(userId, targetUserId);
  
  if (data && data.EC === 0) {
    // Emit socket event to notify the unrestricted user
    socketService.emitRestrictStatusChanged(userId, targetUserId, false);
  }
  
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

const reportComment = async (req, res) => {
  const data = await socialService.reportTarget({
    reporter: currentUserId(req),
    targetType: "comment",
    targetId: req.params.commentId,
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

const getPushPublicKey = async (req, res) => {
  const data = pushService.getPublicKey();
  return res.status(200).json(data);
};

const subscribePush = async (req, res) => {
  const data = await pushService.saveSubscription(
    currentUserId(req),
    req.body.subscription,
    req.headers["user-agent"] || "",
  );
  return res.status(200).json(data);
};

const unsubscribePush = async (req, res) => {
  const data = await pushService.removeSubscription(currentUserId(req), req.body.endpoint);
  return res.status(200).json(data);
};

const pinPost = async (req, res) => {
  const data = await socialService.pinPost(currentUserId(req), req.params.postId);
  return res.status(200).json(data);
};

const uploadPostMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ EC: 1, EM: "Không có tệp tin nào được tải lên" });
    }

    const media = await processPostMediaFiles(req.files, currentUserId(req));
    return res.status(200).json({ EC: 0, EM: "Tải tệp tin thành công", data: media });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ EC: 2, EM: error.message || "Lỗi upload media" });
  }
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
  getSavedPosts,
  getRelationships,
  getTrendingTopics,
  hideComment,
  hidePost,
  markAllNotificationsRead,
  markNotificationRead,
  getPushPublicKey,
  subscribePush,
  unsubscribePush,
  reactPost,
  replyComment,
  reportComment,
  reportPost,
  reportUser,
  respondFriendRequest,
  restrictUser,
  sendFriendRequest,
  sharePost,
  savePost,
  unblockUser,
  unfollowUser,
  unrestrictUser,
  unsavePost,
  updatePost,
  pinPost,
  uploadPostMedia,
  unfriendUser,
};
