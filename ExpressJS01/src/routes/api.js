const express = require("express");
const {
  createUser,
  forgotPassword,
  getAccount,
  getProfile,
  getUser,
  handleLogin,
  updateProfile,
} = require("../controllers/userController");
const profileController = require("../controllers/profileController");
const socialController = require("../controllers/socialController");
const searchRouter = require("./search");
const auth = require("../middleware/auth");
const delay = require("../middleware/delay");
const upload = require("../middleware/upload");
const chatController = require("../controllers/chatController");
const groupController = require("../controllers/groupController");
const chatUpload = require("../middleware/chatUpload");
const postMediaUpload = require("../middleware/postMediaUpload");

const routerAPI = express.Router();

routerAPI.all("*", auth);

routerAPI.get("/", (req, res) => res.status(200).json("Hello world api"));

routerAPI.post("/register", createUser);
routerAPI.post("/login", handleLogin);
routerAPI.post("/forgot-password", forgotPassword);

routerAPI.get("/user", getUser);
routerAPI.get("/account", delay, getAccount);
routerAPI.get("/profile", delay, getProfile);
routerAPI.put("/profile", updateProfile);

// Profile routes - specific routes must be defined before generic :userId route
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

// Generic profile route - must be last
routerAPI.get("/profile/:userId", profileController.getProfile);
routerAPI.get("/profile/:userId/posts", profileController.getUserPosts);
routerAPI.get("/profile/:userId/friends", profileController.getUserFriends);
routerAPI.get("/profile/:userId/followers", profileController.getUserFollowers);
routerAPI.get("/profile/:userId/media/albums", profileController.getUserMediaAlbums);
routerAPI.get("/profile/:userId/media", profileController.getUserMedia);

routerAPI.post("/posts", postMediaUpload.array("media", 10), socialController.createPost);
routerAPI.get("/feed", socialController.getFeed);
routerAPI.get("/posts/:postId", socialController.getPostById);
routerAPI.patch("/posts/:postId", socialController.updatePost);
routerAPI.delete("/posts/:postId", socialController.deletePost);
routerAPI.post("/posts/:postId/hide", socialController.hidePost);
routerAPI.get("/trending", socialController.getTrendingTopics);
routerAPI.use("/search", searchRouter);
routerAPI.get("/relationships", socialController.getRelationships);
routerAPI.post("/posts/:postId/react", socialController.reactPost);
routerAPI.post("/posts/:postId/comments", socialController.commentPost);
routerAPI.post("/comments/:commentId/replies", socialController.replyComment);
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
routerAPI.post(
  "/friend-requests/:requestId/respond",
  socialController.respondFriendRequest,
);
routerAPI.post("/users/:targetUserId/block", socialController.blockUser);
routerAPI.delete("/users/:targetUserId/block", socialController.unblockUser);
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

// Group / Community routes
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

// Chat routes
routerAPI.get("/conversations", chatController.getConversations);
routerAPI.post("/conversations", chatController.createConversation);
routerAPI.get("/conversations/:conversationId/messages", chatController.getMessages);
routerAPI.post(
  "/conversations/:conversationId/messages",
  chatUpload.array("attachments", 10),
  chatController.sendMessage
);
routerAPI.delete("/messages/:messageId", chatController.recallMessage);
routerAPI.post("/conversations/:conversationId/seen", chatController.markSeen);

module.exports = routerAPI;
