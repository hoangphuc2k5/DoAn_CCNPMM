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
const chatUpload = require("../middleware/chatUpload");

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
routerAPI.get("/profile/:userId/following", profileController.getUserFollowing);
routerAPI.get("/profile/:userId/media", profileController.getUserMedia);

routerAPI.post("/posts", socialController.createPost);
routerAPI.get("/feed", socialController.getFeed);
routerAPI.get("/posts/:postId", socialController.getPostById);
routerAPI.get("/trending", socialController.getTrendingTopics);
routerAPI.use("/search", searchRouter);
routerAPI.get("/relationships", socialController.getRelationships);
routerAPI.post("/posts/:postId/react", socialController.reactPost);
routerAPI.post("/posts/:postId/comments", socialController.commentPost);
routerAPI.post("/comments/:commentId/replies", socialController.replyComment);
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
