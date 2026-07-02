const express = require("express");
const {
  changePassword,
  createUser,
  deleteAccount,
  forgotPassword,
  getCaptcha,
  getAccount,
  getDeviceHistory,
  getProfile,
  getUser,
  handleLogin,
  logout,
  resendVerificationOtp,
  resetPassword,
  updateProfile,
  verifyEmailOtp,
} = require("../controllers/userController");
const adminController = require("../controllers/adminController");
const profileController = require("../controllers/profileController");
const socialController = require("../controllers/socialController");
const searchRouter = require("./search");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const delay = require("../middleware/delay");
const upload = require("../middleware/upload");
const antiSpam = require("../middleware/antiSpam");
const chatController = require("../controllers/chatController");
const callController = require("../controllers/callController");
const groupController = require("../controllers/groupController");
const chatUpload = require("../middleware/chatUpload");
const postMediaUpload = require("../middleware/postMediaUpload");
const rateLimit = require("../middleware/rateLimit");

const routerAPI = express.Router();

const uploadPostMediaFiles = (req, res, next) => {
  postMediaUpload.array("media", 10)(req, res, (error) => {
    if (!error) return next();

    return res.status(200).json({
      EC: 1,
      EM: error.message || "Không thể tải media lên.",
    });
  });
};

routerAPI.all("*", auth);

routerAPI.get("/", (req, res) => res.status(200).json("Hello world api"));

routerAPI.get("/captcha", getCaptcha);
routerAPI.post("/register", rateLimit({ keyPrefix: "register", max: 5 }), createUser);
routerAPI.post("/login", rateLimit({ keyPrefix: "login", max: 10 }), handleLogin);
routerAPI.post("/forgot-password", rateLimit({ keyPrefix: "forgot-password", max: 5 }), forgotPassword);
routerAPI.post("/reset-password", rateLimit({ keyPrefix: "reset-password", max: 5 }), resetPassword);
routerAPI.post("/verify-email", rateLimit({ keyPrefix: "verify-email", max: 8 }), verifyEmailOtp);
routerAPI.post("/verify-email/resend", rateLimit({ keyPrefix: "resend-verify-email", max: 5 }), resendVerificationOtp);

routerAPI.get("/user", getUser);
routerAPI.get("/account", delay, getAccount);
routerAPI.get("/profile", delay, getProfile);
routerAPI.put("/profile", updateProfile);
routerAPI.post("/account/logout", logout);
routerAPI.post("/account/change-password", rateLimit({ keyPrefix: "change-password", max: 8 }), changePassword);
routerAPI.delete("/account", deleteAccount);
routerAPI.get("/account/device-history", getDeviceHistory);
// two-factor endpoints removed

routerAPI.put("/profile/me", profileController.updateProfile);
routerAPI.put(
  "/profile/me/avatar",
  upload.single("avatar"),
  profileController.uploadAvatar,
);
routerAPI.put(
  "/profile/me/cover",
  upload.single("cover"),
  profileController.uploadCover,
);
routerAPI.get("/profile/:userId", profileController.getProfile);
routerAPI.get("/profile/:userId/posts", profileController.getUserPosts);
routerAPI.get("/profile/:userId/friends", profileController.getUserFriends);
routerAPI.get("/profile/:userId/followers", profileController.getUserFollowers);
routerAPI.get("/profile/:userId/following", profileController.getUserFollowing);
routerAPI.get("/profile/:userId/media", profileController.getUserMedia);
routerAPI.get("/profile/:userId/media/albums", profileController.getUserMediaAlbums);
routerAPI.post(
  "/posts",
  antiSpam({ keyPrefix: "post-create", cooldownMs: 4000 }),
  postMediaUpload.array("media", 10),
  socialController.createPost,
);
routerAPI.get("/feed", socialController.getFeed);
routerAPI.get("/saved-posts", socialController.getSavedPosts);
routerAPI.post("/posts/upload-media", uploadPostMediaFiles, socialController.uploadPostMedia);
routerAPI.post("/posts/:postId/save", socialController.savePost);
routerAPI.delete("/posts/:postId/save", socialController.unsavePost);
routerAPI.get("/posts/:postId", socialController.getPostById);
routerAPI.patch("/posts/:postId", socialController.updatePost);
routerAPI.delete("/posts/:postId", socialController.deletePost);
routerAPI.post("/posts/:postId/hide", socialController.hidePost);
routerAPI.get("/trending", socialController.getTrendingTopics);
routerAPI.use("/search", searchRouter);
routerAPI.get("/relationships", socialController.getRelationships);
routerAPI.post("/posts/:postId/react", socialController.reactPost);
routerAPI.post(
  "/posts/:postId/comments",
  antiSpam({ keyPrefix: "comment-create", cooldownMs: 3000 }),
  socialController.commentPost,
);
routerAPI.post(
  "/comments/:commentId/replies",
  antiSpam({ keyPrefix: "reply-create", cooldownMs: 3000 }),
  socialController.replyComment,
);
routerAPI.delete("/comments/:commentId", socialController.deleteComment);
routerAPI.post("/comments/:commentId/hide", socialController.hideComment);
routerAPI.post("/comments/:commentId/report", socialController.reportComment);
routerAPI.post("/posts/:postId/share", socialController.sharePost);
routerAPI.post("/posts/:postId/report", socialController.reportPost);

routerAPI.post("/users/:targetUserId/follow", socialController.followUser);
routerAPI.delete("/users/:targetUserId/follow", socialController.unfollowUser);
routerAPI.post(
  "/users/:targetUserId/friend-request",
  socialController.sendFriendRequest,
);
routerAPI.delete(
  "/users/:targetUserId/friend",
  socialController.unfriendUser,
);
routerAPI.post(
  "/friend-requests/:requestId/respond",
  socialController.respondFriendRequest,
);
routerAPI.post("/users/:targetUserId/block", socialController.blockUser);
routerAPI.delete("/users/:targetUserId/block", socialController.unblockUser);
routerAPI.post("/users/:targetUserId/restrict", socialController.restrictUser);
routerAPI.delete("/users/:targetUserId/restrict", socialController.unrestrictUser);
routerAPI.post("/users/:targetUserId/report", socialController.reportUser);

routerAPI.get("/notifications", socialController.getNotifications);
routerAPI.patch(
  "/notifications/:notificationId/read",
  socialController.markNotificationRead,
);
routerAPI.patch(
  "/notifications/read-all",
  socialController.markAllNotificationsRead,
);
routerAPI.get("/notifications/push-public-key", socialController.getPushPublicKey);
routerAPI.post("/notifications/push-subscriptions", socialController.subscribePush);
routerAPI.delete("/notifications/push-subscriptions", socialController.unsubscribePush);

routerAPI.get("/groups", groupController.listGroups);
routerAPI.post("/groups", groupController.createGroup);
routerAPI.get("/groups/:groupId", groupController.getGroupById);
routerAPI.patch("/groups/:groupId", groupController.updateGroup);
routerAPI.put(
  "/groups/:groupId/avatar",
  upload.single("avatar"),
  groupController.uploadAvatar,
);
routerAPI.put(
  "/groups/:groupId/cover",
  upload.single("cover"),
  groupController.uploadCover,
);
routerAPI.post("/groups/:groupId/join", groupController.joinGroup);
routerAPI.delete("/groups/:groupId/leave", groupController.leaveGroup);
routerAPI.get("/groups/:groupId/join-requests", groupController.listJoinRequests);
routerAPI.patch(
  "/groups/:groupId/join-requests/:requestId",
  groupController.respondJoinRequest,
);
routerAPI.delete("/groups/:groupId/members/:memberId", groupController.removeMember);
routerAPI.patch(
  "/groups/:groupId/members/:memberId/role",
  groupController.updateMemberRole,
);
routerAPI.get("/groups/:groupId/posts", groupController.getGroupPosts);
routerAPI.get("/groups/:groupId/media", groupController.getGroupMedia);
routerAPI.get("/groups/:groupId/posts/pending", groupController.listPendingPosts);
routerAPI.patch("/groups/:groupId/posts/:postId/review", groupController.reviewPendingPost);
routerAPI.post(
  "/groups/:groupId/posts",
  postMediaUpload.array("media", 10),
  groupController.createGroupPost,
);
routerAPI.get("/groups/:groupId/reports", groupController.listGroupReports);
routerAPI.patch("/groups/:groupId/reports/:reportId", groupController.resolveGroupReport);
routerAPI.get("/groups/:groupId/events", groupController.listEvents);
routerAPI.post("/groups/:groupId/events", groupController.createEvent);
routerAPI.post("/groups/:groupId/events/:eventId/attend", groupController.attendEvent);
routerAPI.delete("/groups/:groupId/events/:eventId/attend", groupController.leaveEvent);

routerAPI.get("/conversations/unread-summary", chatController.getUnreadSummary);
routerAPI.get("/conversations", chatController.getConversations);
routerAPI.post("/conversations", chatController.createConversation);
routerAPI.get("/conversations/:conversationId/messages", chatController.getMessages);
routerAPI.get("/conversations/:conversationId/calls", callController.getCallHistory);
routerAPI.post("/conversations/:conversationId/calls", callController.startCall);
routerAPI.post(
  "/conversations/:conversationId/messages",
  chatUpload.array("attachments", 10),
  chatController.sendMessage
);
routerAPI.post("/calls/:callId/accept", callController.acceptCall);
routerAPI.post("/calls/:callId/decline", callController.declineCall);
routerAPI.post("/calls/:callId/hangup", callController.endCall);
routerAPI.delete("/messages/:messageId", chatController.recallMessage);
routerAPI.post("/conversations/:conversationId/seen", chatController.markSeen);

routerAPI.get(
  "/admin/dashboard",
  requireRole("admin", "super_admin"),
  adminController.getDashboard,
);
routerAPI.get(
  "/admin/users",
  requireRole("admin", "super_admin"),
  adminController.listUsers,
);
routerAPI.patch(
  "/admin/users/:userId/status",
  requireRole("admin", "super_admin"),
  adminController.updateUserStatus,
);
routerAPI.post(
  "/admin/users/:userId/ban",
  requireRole("admin", "super_admin"),
  adminController.banUser,
);
routerAPI.post(
  "/admin/users/:userId/unban",
  requireRole("admin", "super_admin"),
  adminController.unbanUser,
);
routerAPI.get(
  "/admin/posts",
  requireRole("admin", "super_admin"),
  adminController.listPosts,
);
routerAPI.post(
  "/admin/posts/:postId/remove",
  requireRole("admin", "super_admin"),
  adminController.removePost,
);
routerAPI.get(
  "/admin/reports",
  requireRole("admin", "super_admin"),
  adminController.listReports,
);
routerAPI.get(
  "/admin/logs",
  requireRole("admin", "super_admin"),
  adminController.listAuditLogs,
);
routerAPI.post(
  "/admin/reports/:reportId/resolve",
  requireRole("admin", "super_admin"),
  adminController.resolveReport,
);

module.exports = routerAPI;
