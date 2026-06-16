import axios from "./axios.customize";

const createUserApi = (name, email, password) =>
  axios.post("/v1/api/register", { name, email, password });

const loginApi = (email, password) => axios.post("/v1/api/login", { email, password });

const getUserApi = () => axios.get("/v1/api/user");

const getAccountApi = () => axios.get("/v1/api/account");

const forgotPasswordApi = (email) => axios.post("/v1/api/forgot-password", { email });

const createPostApi = (payload) => axios.post("/v1/api/posts", payload);

const getFeedApi = ({ mode = "latest", page = 1, limit = 10 }) =>
  axios.get("/v1/api/feed", { params: { mode, page, limit } });

const getPostByIdApi = (postId) => axios.get(`/v1/api/posts/${postId}`);

const reactPostApi = (postId, type) => axios.post(`/v1/api/posts/${postId}/react`, { type });

const commentPostApi = (postId, content) =>
  axios.post(`/v1/api/posts/${postId}/comments`, { content });

const replyCommentApi = (commentId, postId, content) =>
  axios.post(`/v1/api/comments/${commentId}/replies`, { postId, content });

const sharePostApi = (postId, content) => axios.post(`/v1/api/posts/${postId}/share`, { content });

const reportPostApi = (postId, reason) => axios.post(`/v1/api/posts/${postId}/report`, { reason });

const followUserApi = (userId) => axios.post(`/v1/api/users/${userId}/follow`);

const unfollowUserApi = (userId) => axios.delete(`/v1/api/users/${userId}/follow`);

const friendRequestApi = (userId) => axios.post(`/v1/api/users/${userId}/friend-request`);

const respondFriendRequestApi = (requestId, action) =>
  axios.post(`/v1/api/friend-requests/${requestId}/respond`, { action });

const getRelationshipsApi = () => axios.get("/v1/api/relationships");

const blockUserApi = (userId) => axios.post(`/v1/api/users/${userId}/block`);

const unblockUserApi = (userId) => axios.delete(`/v1/api/users/${userId}/block`);

const reportUserApi = (userId, reason) => axios.post(`/v1/api/users/${userId}/report`, { reason });

const getNotificationsApi = () => axios.get("/v1/api/notifications");

const markNotificationReadApi = (notificationId) =>
  axios.patch(`/v1/api/notifications/${notificationId}/read`);

const markAllNotificationsReadApi = () => axios.patch("/v1/api/notifications/read-all");

const getTrendingApi = () => axios.get("/v1/api/trending");

const searchApi = (q) => axios.get("/v1/api/search", { params: { q } });

const getConversationsApi = () => axios.get("/v1/api/conversations");

const createConversationApi = (payload) => axios.post("/v1/api/conversations", payload);

const getMessagesApi = (conversationId, params) =>
  axios.get(`/v1/api/conversations/${conversationId}/messages`, { params });

const sendMessageApi = (conversationId, payload) =>
  axios.post(`/v1/api/conversations/${conversationId}/messages`, payload);

const recallMessageApi = (messageId) => axios.delete(`/v1/api/messages/${messageId}`);

const markSeenApi = (conversationId) => axios.post(`/v1/api/conversations/${conversationId}/seen`);

export {
  blockUserApi,
  commentPostApi,
  createPostApi,
  createUserApi,
  followUserApi,
  forgotPasswordApi,
  friendRequestApi,
  getAccountApi,
  getFeedApi,
  getNotificationsApi,
  getPostByIdApi,
  getRelationshipsApi,
  getTrendingApi,
  getUserApi,
  loginApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  reactPostApi,
  replyCommentApi,
  reportPostApi,
  reportUserApi,
  respondFriendRequestApi,
  searchApi,
  sharePostApi,
  unblockUserApi,
  unfollowUserApi,
  getConversationsApi,
  createConversationApi,
  getMessagesApi,
  sendMessageApi,
  recallMessageApi,
  markSeenApi,
};
