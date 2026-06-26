import axios from "./axios.customize";

const getCaptchaApi = () => axios.get("/v1/api/captcha");
const createUserApi = (payload) => axios.post("/v1/api/register", payload);
const loginApi = (payload) => axios.post("/v1/api/login", payload);
const loginWithGoogleApi = (idToken) => axios.post("/v1/api/login/google", { idToken });
const verifyTwoFactorApi = (tempToken, otp) =>
  axios.post("/v1/api/login/verify-2fa", { tempToken, otp });
const getUserApi = () => axios.get("/v1/api/user");
const getAccountApi = () => axios.get("/v1/api/account");
const logoutApi = () => axios.post("/v1/api/account/logout");
const forgotPasswordApi = (payload) => axios.post("/v1/api/forgot-password", payload);
const resetPasswordApi = (payload) => axios.post("/v1/api/reset-password", payload);
const verifyEmailOtpApi = (email, otp) => axios.post("/v1/api/verify-email", { email, otp });
const resendVerifyEmailOtpApi = (email) =>
  axios.post("/v1/api/verify-email/resend", { email });
const changePasswordApi = (currentPassword, newPassword) =>
  axios.post("/v1/api/account/change-password", { currentPassword, newPassword });
const deleteAccountApi = (password) => axios.delete("/v1/api/account", { data: { password } });
const toggleTwoFactorApi = (enabled, password) =>
  axios.post("/v1/api/account/two-factor", { enabled, password });
const getDeviceHistoryApi = () => axios.get("/v1/api/account/device-history");

const createPostApi = (payload) => axios.post("/v1/api/posts", payload);
const updatePostApi = (postId, payload) => axios.patch(`/v1/api/posts/${postId}`, payload);
const deletePostApi = (postId) => axios.delete(`/v1/api/posts/${postId}`);
const pinPostApi = (postId) => axios.post(`/v1/api/posts/${postId}/pin`);
const uploadPostMediaApi = (formData) => axios.post("/v1/api/posts/upload-media", formData);
const getFeedApi = ({ mode = "latest", page = 1, limit = 10 } = {}) =>
  axios.get("/v1/api/feed", { params: { mode, page, limit } });
const getSavedPostsApi = ({ page = 1, limit = 10 } = {}) =>
  axios.get("/v1/api/saved-posts", { params: { page, limit } });
const getPostByIdApi = (postId) => axios.get(`/v1/api/posts/${postId}`);
const hidePostApi = (postId) => axios.post(`/v1/api/posts/${postId}/hide`);
const savePostApi = (postId) => axios.post(`/v1/api/posts/${postId}/save`);
const unsavePostApi = (postId) => axios.delete(`/v1/api/posts/${postId}/save`);
const reactPostApi = (postId, type) => axios.post(`/v1/api/posts/${postId}/react`, { type });
const commentPostApi = (postId, content) =>
  axios.post(`/v1/api/posts/${postId}/comments`, { content });
const replyCommentApi = (commentId, postId, content) =>
  axios.post(`/v1/api/comments/${commentId}/replies`, { postId, content });
const deleteCommentApi = (commentId) => axios.delete(`/v1/api/comments/${commentId}`);
const hideCommentApi = (commentId) => axios.post(`/v1/api/comments/${commentId}/hide`);
const sharePostApi = (postId, content) => axios.post(`/v1/api/posts/${postId}/share`, { content });
const reportPostApi = (postId, reason) => axios.post(`/v1/api/posts/${postId}/report`, { reason });
const reportCommentApi = (commentId, reason) =>
  axios.post(`/v1/api/comments/${commentId}/report`, { reason });

const followUserApi = (userId) => axios.post(`/v1/api/users/${userId}/follow`);
const unfollowUserApi = (userId) => axios.delete(`/v1/api/users/${userId}/follow`);
const friendRequestApi = (userId) => axios.post(`/v1/api/users/${userId}/friend-request`);
const unfriendUserApi = (userId) => axios.delete(`/v1/api/users/${userId}/friend`);
const respondFriendRequestApi = (requestId, action) =>
  axios.post(`/v1/api/friend-requests/${requestId}/respond`, { action });
const getRelationshipsApi = () => axios.get("/v1/api/relationships");
const blockUserApi = (userId) => axios.post(`/v1/api/users/${userId}/block`);
const unblockUserApi = (userId) => axios.delete(`/v1/api/users/${userId}/block`);
const reportUserApi = (userId, reason) => axios.post(`/v1/api/users/${userId}/report`, { reason });

const getNotificationsApi = (params = {}) => axios.get("/v1/api/notifications", { params });
const markNotificationReadApi = (notificationId) =>
  axios.patch(`/v1/api/notifications/${notificationId}/read`);
const markAllNotificationsReadApi = () => axios.patch("/v1/api/notifications/read-all");
const getPushPublicKeyApi = () => axios.get("/v1/api/notifications/push-public-key");
const subscribePushApi = (subscription) =>
  axios.post("/v1/api/notifications/push-subscriptions", { subscription });
const unsubscribePushApi = (endpoint) =>
  axios.delete("/v1/api/notifications/push-subscriptions", { data: { endpoint } });

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

const getGroupsApi = (params) => axios.get("/v1/api/groups", { params });
const createGroupApi = (payload) => axios.post("/v1/api/groups", payload);
const getGroupApi = (groupId) => axios.get(`/v1/api/groups/${groupId}`);
const updateGroupApi = (groupId, payload) => axios.patch(`/v1/api/groups/${groupId}`, payload);
const uploadGroupAvatarApi = (groupId, payload) => axios.put(`/v1/api/groups/${groupId}/avatar`, payload);
const uploadGroupCoverApi = (groupId, payload) => axios.put(`/v1/api/groups/${groupId}/cover`, payload);
const joinGroupApi = (groupId) => axios.post(`/v1/api/groups/${groupId}/join`);
const leaveGroupApi = (groupId) => axios.delete(`/v1/api/groups/${groupId}/leave`);
const getGroupJoinRequestsApi = (groupId) => axios.get(`/v1/api/groups/${groupId}/join-requests`);
const respondGroupJoinRequestApi = (groupId, requestId, action) =>
  axios.patch(`/v1/api/groups/${groupId}/join-requests/${requestId}`, { action });
const removeGroupMemberApi = (groupId, memberId) =>
  axios.delete(`/v1/api/groups/${groupId}/members/${memberId}`);
const updateGroupMemberRoleApi = (groupId, memberId, role) =>
  axios.patch(`/v1/api/groups/${groupId}/members/${memberId}/role`, { role });
const getGroupPostsApi = (groupId, params) => axios.get(`/v1/api/groups/${groupId}/posts`, { params });
const getGroupMediaApi = (groupId, params) => axios.get(`/v1/api/groups/${groupId}/media`, { params });
const getGroupPendingPostsApi = (groupId) => axios.get(`/v1/api/groups/${groupId}/posts/pending`);
const reviewGroupPostApi = (groupId, postId, action) =>
  axios.patch(`/v1/api/groups/${groupId}/posts/${postId}/review`, { action });
const createGroupPostApi = (groupId, payload) => axios.post(`/v1/api/groups/${groupId}/posts`, payload);
const getGroupReportsApi = (groupId) => axios.get(`/v1/api/groups/${groupId}/reports`);
const resolveGroupReportApi = (groupId, reportId, action) =>
  axios.patch(`/v1/api/groups/${groupId}/reports/${reportId}`, { action });
const getGroupEventsApi = (groupId) => axios.get(`/v1/api/groups/${groupId}/events`);
const createGroupEventApi = (groupId, payload) => axios.post(`/v1/api/groups/${groupId}/events`, payload);
const attendGroupEventApi = (groupId, eventId) =>
  axios.post(`/v1/api/groups/${groupId}/events/${eventId}/attend`);
const leaveGroupEventApi = (groupId, eventId) =>
  axios.delete(`/v1/api/groups/${groupId}/events/${eventId}/attend`);

const getAdminDashboardApi = () => axios.get("/v1/api/admin/dashboard");
const getAdminUsersApi = (params = {}) => axios.get("/v1/api/admin/users", { params });
const updateAdminUserStatusApi = (userId, status) =>
  axios.patch(`/v1/api/admin/users/${userId}/status`, { status });
const banAdminUserApi = (userId, payload = {}) =>
  axios.post(`/v1/api/admin/users/${userId}/ban`, payload);
const unbanAdminUserApi = (userId) => axios.post(`/v1/api/admin/users/${userId}/unban`);
const getAdminPostsApi = (params = {}) => axios.get("/v1/api/admin/posts", { params });
const removeAdminPostApi = (postId) => axios.post(`/v1/api/admin/posts/${postId}/remove`);
const getAdminReportsApi = (params = {}) => axios.get("/v1/api/admin/reports", { params });
const getAdminLogsApi = (params = {}) => axios.get("/v1/api/admin/logs", { params });
const resolveAdminReportApi = (reportId, action = "resolved") =>
  axios.post(`/v1/api/admin/reports/${reportId}/resolve`, { action });

export {
  attendGroupEventApi,
  banAdminUserApi,
  blockUserApi,
  changePasswordApi,
  commentPostApi,
  createConversationApi,
  createGroupApi,
  createGroupEventApi,
  createGroupPostApi,
  createPostApi,
  createUserApi,
  deleteAccountApi,
  deleteCommentApi,
  deletePostApi,
  followUserApi,
  forgotPasswordApi,
  friendRequestApi,
  getAccountApi,
  getAdminDashboardApi,
  getAdminPostsApi,
  getAdminReportsApi,
  getAdminUsersApi,
  getAdminLogsApi,
  getCaptchaApi,
  getConversationsApi,
  getDeviceHistoryApi,
  getFeedApi,
  getGroupApi,
  getGroupEventsApi,
  getGroupJoinRequestsApi,
  getGroupMediaApi,
  getGroupPendingPostsApi,
  getGroupPostsApi,
  getGroupReportsApi,
  getGroupsApi,
  getMessagesApi,
  getNotificationsApi,
  getPostByIdApi,
  getPushPublicKeyApi,
  getRelationshipsApi,
  getSavedPostsApi,
  getTrendingApi,
  getUserApi,
  hideCommentApi,
  hidePostApi,
  joinGroupApi,
  leaveGroupApi,
  leaveGroupEventApi,
  loginApi,
  loginWithGoogleApi,
  logoutApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  markSeenApi,
  pinPostApi,
  reactPostApi,
  recallMessageApi,
  removeAdminPostApi,
  removeGroupMemberApi,
  replyCommentApi,
  resendVerifyEmailOtpApi,
  reportCommentApi,
  reportPostApi,
  reportUserApi,
  resetPasswordApi,
  resolveAdminReportApi,
  resolveGroupReportApi,
  respondFriendRequestApi,
  respondGroupJoinRequestApi,
  reviewGroupPostApi,
  searchApi,
  sendMessageApi,
  savePostApi,
  sharePostApi,
  subscribePushApi,
  toggleTwoFactorApi,
  unblockUserApi,
  unfollowUserApi,
  unfriendUserApi,
  unbanAdminUserApi,
  unsavePostApi,
  unsubscribePushApi,
  updateAdminUserStatusApi,
  updateGroupApi,
  updateGroupMemberRoleApi,
  updatePostApi,
  uploadGroupAvatarApi,
  uploadGroupCoverApi,
  uploadPostMediaApi,
  verifyEmailOtpApi,
  verifyTwoFactorApi,
};
