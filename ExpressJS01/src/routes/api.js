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
const socialController = require("../controllers/socialController");
const auth = require("../middleware/auth");
const delay = require("../middleware/delay");

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

routerAPI.post("/posts", socialController.createPost);
routerAPI.get("/feed", socialController.getFeed);
routerAPI.get("/posts/:postId", socialController.getPostById);
routerAPI.get("/trending", socialController.getTrendingTopics);
routerAPI.get("/search", socialController.search);
routerAPI.get("/relationships", socialController.getRelationships);
routerAPI.post("/posts/:postId/react", socialController.reactPost);
routerAPI.post("/posts/:postId/comments", socialController.commentPost);
routerAPI.post("/comments/:commentId/replies", socialController.replyComment);
routerAPI.post("/posts/:postId/share", socialController.sharePost);
routerAPI.post("/posts/:postId/report", socialController.reportPost);

routerAPI.post("/users/:targetUserId/follow", socialController.followUser);
routerAPI.delete("/users/:targetUserId/follow", socialController.unfollowUser);
routerAPI.post("/users/:targetUserId/friend-request", socialController.sendFriendRequest);
routerAPI.post("/friend-requests/:requestId/respond", socialController.respondFriendRequest);
routerAPI.post("/users/:targetUserId/block", socialController.blockUser);
routerAPI.delete("/users/:targetUserId/block", socialController.unblockUser);
routerAPI.post("/users/:targetUserId/report", socialController.reportUser);

routerAPI.get("/notifications", socialController.getNotifications);
routerAPI.patch("/notifications/:notificationId/read", socialController.markNotificationRead);
routerAPI.patch("/notifications/read-all", socialController.markAllNotificationsRead);

module.exports = routerAPI;
