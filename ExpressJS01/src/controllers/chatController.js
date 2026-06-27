const chatService = require("../services/chatService");
const socketService = require("../services/socketService");
const Conversation = require("../models/conversation");
const Restriction = require("../models/restriction");

const currentUserId = (req) => req.user._id;

const pushUnreadSummary = async (userId, senderId = null) => {
  // If senderId is provided, check if sender is restricted by this user
  // If restricted, don't push unread summary (no notification)
  if (senderId && await Restriction.findOne({ restrictor: userId, restricted: senderId })) {
    return null;
  }
  
  const summary = await chatService.getUnreadSummary(userId);
  socketService.emitChatUnreadUpdated(userId, summary);
  return summary;
};

const getConversations = async (req, res) => {
  const data = await chatService.getConversations(currentUserId(req));
  return res.status(200).json(data);
};

const getUnreadSummary = async (req, res) => {
  const summary = await chatService.getUnreadSummary(currentUserId(req));
  return res.status(200).json({
    EC: 0,
    EM: "Lấy số tin nhắn chưa đọc thành công",
    data: summary,
  });
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

    const senderId = currentUserId(req).toString();
    let participants = data.data.conversation?.participants || [];

    if (!participants.length) {
      const conv = await Conversation.findById(conversationId).select("participants").lean();
      participants = conv?.participants || [];
    }

    // Push unread summary to other participants, but skip if they have restricted the sender
    await Promise.all(
      participants
        .map((p) => (p._id || p).toString())
        .filter((pId) => pId !== senderId)
        .map((pId) => pushUnreadSummary(pId, senderId))
    );
  }

  return res.status(200).json(data);
};

const recallMessage = async (req, res) => {
  const { messageId } = req.params;
  const data = await chatService.recallMessage(messageId, currentUserId(req));

  // Phát tín hiệu socket thời gian thực nếu thu hồi thành công
  if (data && data.EC === 0) {
    const payload = data.data?.toObject
      ? data.data.toObject({ virtuals: true })
      : data.data;
    const convId = payload.conversation?._id || payload.conversation;

    let participants = payload.conversation?.participants || [];
    if (!participants.length && convId) {
      const conv = await Conversation.findById(convId).select("participants").lean();
      participants = conv?.participants || [];
    }

    socketService.emitRecallMessage(convId, payload, participants);
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
    await pushUnreadSummary(userId);
  }

  return res.status(200).json(data);
};

module.exports = {
  getConversations,
  getUnreadSummary,
  createConversation,
  getMessages,
  sendMessage,
  recallMessage,
  markSeen,
};
