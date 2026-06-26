const chatService = require("../services/chatService");
const socketService = require("../services/socketService");

const currentUserId = (req) => req.user._id;

const getConversations = async (req, res) => {
  const data = await chatService.getConversations(currentUserId(req));
  return res.status(200).json(data);
};

const createConversation = async (req, res) => {
  const data = await chatService.createConversation(currentUserId(req), req.body);
  return res.status(200).json(data);
};

const getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const { limit, skip } = req.query;
  const data = await chatService.getMessages(
    conversationId,
    currentUserId(req),
    limit ? parseInt(limit) : 50,
    skip ? parseInt(skip) : 0
  );
  return res.status(200).json(data);
};

const sendMessage = async (req, res) => {
  const { conversationId } = req.params;
  const data = await chatService.sendMessage(
    conversationId,
    currentUserId(req),
    req.body,
    req.files || (req.file ? [req.file] : [])
  );

  // Phát tín hiệu socket thời gian thực nếu gửi tin nhắn thành công
  if (data && data.EC === 0) {
    socketService.emitNewMessage(conversationId, data.data);
  }

  return res.status(200).json(data);
};

const recallMessage = async (req, res) => {
  const { messageId } = req.params;
  const data = await chatService.recallMessage(messageId, currentUserId(req));

  // Phát tín hiệu socket thời gian thực nếu thu hồi thành công
  if (data && data.EC === 0) {
    socketService.emitRecallMessage(data.data.conversation, data.data);
  }

  return res.status(200).json(data);
};

const markSeen = async (req, res) => {
  const { conversationId } = req.params;
  const userId = currentUserId(req);
  const data = await chatService.markSeen(conversationId, userId);

  // Phát tín hiệu socket thời gian thực nếu đánh dấu thành công
  if (data && data.EC === 0) {
    socketService.emitSeenMessage(conversationId, userId, new Date());
  }

  return res.status(200).json(data);
};

module.exports = {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  recallMessage,
  markSeen,
};
