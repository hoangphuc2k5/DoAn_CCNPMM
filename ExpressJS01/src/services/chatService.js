const Conversation = require("../models/conversation");
const Message = require("../models/message");
const User = require("../models/user");
const { createNotification } = require("./notificationService");

const getConversations = async (userId) => {
  try {
    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "_id name email avatar")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "_id name avatar",
        },
      })
      .sort({ updatedAt: -1 });

    return {
      EC: 0,
      EM: "Lấy danh sách hội thoại thành công",
      data: conversations,
    };
  } catch (error) {
    console.error("Error in getConversations:", error);
    return {
      EC: 1,
      EM: "Lỗi khi lấy danh sách hội thoại",
      error: error.message,
    };
  }
};

const createConversation = async (userId, payload) => {
  try {
    const { isGroup, name, avatar, participants } = payload;

    if (!isGroup) {
      // Chat cá nhân
      const targetUserId = participants?.[0];
      if (!targetUserId) {
        return {
          EC: 1,
          EM: "Thiếu thông tin người nhận",
        };
      }

      // Tìm hội thoại 1-1 đã tồn tại
      let conversation = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [userId, targetUserId], $size: 2 },
      }).populate("participants", "_id name email avatar");

      if (conversation) {
        return {
          EC: 0,
          EM: "Cuộc hội thoại đã tồn tại",
          data: conversation,
        };
      }

      // Tạo cuộc hội thoại 1-1 mới
      conversation = await Conversation.create({
        isGroup: false,
        participants: [userId, targetUserId],
      });

      conversation = await Conversation.findById(conversation._id).populate(
        "participants",
        "_id name email avatar"
      );

      return {
        EC: 0,
        EM: "Tạo cuộc hội thoại cá nhân thành công",
        data: conversation,
      };
    } else {
      // Chat nhóm
      if (!name) {
        return {
          EC: 1,
          EM: "Tên nhóm không được để trống",
        };
      }

      const allParticipants = Array.from(
        new Set([userId, ...(participants || [])])
      );

      let conversation = await Conversation.create({
        isGroup: true,
        name,
        avatar: avatar || "",
        participants: allParticipants,
        createdBy: userId,
        admins: [userId],
      });

      conversation = await Conversation.findById(conversation._id).populate(
        "participants",
        "_id name email avatar"
      );

      return {
        EC: 0,
        EM: "Tạo nhóm chat thành công",
        data: conversation,
      };
    }
  } catch (error) {
    console.error("Error in createConversation:", error);
    return {
      EC: 1,
      EM: "Lỗi khi tạo cuộc hội thoại",
      error: error.message,
    };
  }
};

const getMessages = async (conversationId, userId, limit = 50, skip = 0) => {
  try {
    // Kiểm tra xem user có trong hội thoại không
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return {
        EC: 1,
        EM: "Hội thoại không tồn tại hoặc bạn không có quyền truy cập",
      };
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "_id name avatar")
      .populate("seenBy.user", "_id name avatar")
      .sort({ createdAt: 1 }); // Xếp theo thứ tự thời gian tăng dần để frontend hiển thị đúng

    return {
      EC: 0,
      EM: "Lấy lịch sử tin nhắn thành công",
      data: messages,
    };
  } catch (error) {
    console.error("Error in getMessages:", error);
    return {
      EC: 1,
      EM: "Lỗi khi lấy lịch sử tin nhắn",
      error: error.message,
    };
  }
};

const sendMessage = async (conversationId, senderId, payload, files = []) => {
  try {
    const { content, type, sticker } = payload;

    // Kiểm tra xem người gửi có thuộc hội thoại không
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: senderId,
    });

    if (!conversation) {
      return {
        EC: 1,
        EM: "Hội thoại không tồn tại hoặc bạn không có quyền gửi tin nhắn",
      };
    }

    let messageType = type || "text";
    let attachments = [];

    if (files && files.length > 0) {
      attachments = files.map((file) => {
        // Đổi đường dẫn file uploads thành URL phù hợp
        const url = `/uploads/chat/${file.filename}`;
        
        let fileType = "file";
        if (file.mimetype.startsWith("image/")) fileType = "image";
        else if (file.mimetype.startsWith("video/")) fileType = "video";

        // Nếu người dùng không gửi type cụ thể thì tự động nhận diện
        if (!type || type === "text") {
          messageType = fileType;
        }

        return {
          url,
          filename: file.originalname,
          mimetype: file.mimetype,
        };
      });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: senderId,
      type: messageType,
      content: content || "",
      attachments,
      sticker: sticker || "",
      seenBy: [{ user: senderId, seenAt: new Date() }],
    });

    // Cập nhật lastMessage và updatedAt của Conversation
    conversation.lastMessage = message._id;
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate({
        path: "conversation",
        populate: {
          path: "participants",
          select: "_id name email avatar",
        },
      })
      .populate("sender", "_id name avatar")
      .populate("seenBy.user", "_id name avatar");

    const recipients = conversation.participants
      .map((participant) => participant.toString())
      .filter((participantId) => participantId !== senderId.toString());

    await Promise.all(
      recipients.map((recipientId) =>
        createNotification({
          recipient: recipientId,
          actor: senderId,
          type: "new_message",
          metadata: {
            conversationId: conversationId.toString(),
            messageId: message._id.toString(),
            preview: content || (attachments.length ? "Đã gửi một tệp đính kèm" : "Đã gửi tin nhắn"),
          },
        }),
      ),
    );

    return {
      EC: 0,
      EM: "Gửi tin nhắn thành công",
      data: populatedMessage,
    };
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return {
      EC: 1,
      EM: "Lỗi khi gửi tin nhắn",
      error: error.message,
    };
  }
};

const recallMessage = async (messageId, userId) => {
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return {
        EC: 1,
        EM: "Không tìm thấy tin nhắn",
      };
    }

    if (message.sender.toString() !== userId.toString()) {
      return {
        EC: 1,
        EM: "Bạn không có quyền thu hồi tin nhắn này",
      };
    }

    message.isRecalled = true;
    message.content = "Tin nhắn đã bị thu hồi";
    message.attachments = [];
    message.sticker = "";
    await message.save();

    const populatedMessage = await Message.findById(messageId)
      .populate("sender", "_id name avatar")
      .populate("seenBy.user", "_id name avatar");

    return {
      EC: 0,
      EM: "Thu hồi tin nhắn thành công",
      data: populatedMessage,
    };
  } catch (error) {
    console.error("Error in recallMessage:", error);
    return {
      EC: 1,
      EM: "Lỗi khi thu hồi tin nhắn",
      error: error.message,
    };
  }
};

const markSeen = async (conversationId, userId) => {
  try {
    // Thêm user vào danh sách đã xem của tất cả các tin nhắn chưa xem của cuộc hội thoại này
    await Message.updateMany(
      {
        conversation: conversationId,
        "seenBy.user": { $ne: userId },
      },
      {
        $push: { seenBy: { user: userId, seenAt: new Date() } },
      }
    );

    return {
      EC: 0,
      EM: "Đánh dấu đã xem thành công",
    };
  } catch (error) {
    console.error("Error in markSeen:", error);
    return {
      EC: 1,
      EM: "Lỗi khi cập nhật trạng thái đã xem",
      error: error.message,
    };
  }
};

module.exports = {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  recallMessage,
  markSeen,
};
