const mongoose = require("mongoose");
const Conversation = require("../models/conversation");
const Message = require("../models/message");
const Block = require("../models/block");
const Restriction = require("../models/restriction");

const getUnreadSummary = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const conversations = await Conversation.find({ participants: userId })
    .select("_id")
    .lean();
  const convIds = conversations.map((c) => c._id);

  if (!convIds.length) {
    return { total: 0, byConversation: {} };
  }

  const unreadAgg = await Message.aggregate([
    {
      $match: {
        conversation: { $in: convIds },
        sender: { $ne: userObjectId },
        isRecalled: false,
        seenBy: { $not: { $elemMatch: { user: userObjectId } } },
      },
    },
    {
      $group: {
        _id: "$conversation",
        count: { $sum: 1 },
      },
    },
  ]);

  const byConversation = {};
  let total = 0;
  unreadAgg.forEach((row) => {
    const id = row._id.toString();
    byConversation[id] = row.count;
    total += row.count;
  });

  return { total, byConversation };
};

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

    const { byConversation, total } = await getUnreadSummary(userId);
    
    // For each conversation, add user status info (isBlocked, isRestricted)
    const userIdStr = userId.toString();
    const data = await Promise.all(conversations.map(async (conv) => {
      const obj = conv.toObject();
      obj.unreadCount = byConversation[conv._id.toString()] || 0;
      
      // Add status info for each participant
      obj.participantsWithStatus = await Promise.all(
        conv.participants.map(async (participant) => {
          const pId = (participant._id || participant).toString();
          const isCurrentUser = pId === userIdStr;
          
          if (isCurrentUser) {
            return {
              ...participant,
              isBlocked: false,
              isRestricted: false,
            };
          }
          
          // Check if current user blocked this participant
          const blockedByMe = await Block.findOne({
            blocker: userId,
            blocked: participant._id,
          });
          
          // Check if this participant blocked current user
          const blockedMe = await Block.findOne({
            blocker: participant._id,
            blocked: userId,
          });
          
          // Check if current user restricted this participant
          const restrictedByMe = await Restriction.findOne({
            restrictor: userId,
            restricted: participant._id,
          });
          
          // Check if this participant restricted current user
          const restrictedMe = await Restriction.findOne({
            restrictor: participant._id,
            restricted: userId,
          });
          
          return {
            ...participant,
            isBlockedByMe: Boolean(blockedByMe),
            isBlockedMe: Boolean(blockedMe),
            isRestrictedByMe: Boolean(restrictedByMe),
            isRestrictedMe: Boolean(restrictedMe),
          };
        })
      );
      
      return obj;
    }));

    return {
      EC: 0,
      EM: "Lấy danh sách hội thoại thành công",
      data,
      totalUnread: total,
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

      // Kiểm tra xem người dùng hiện tại có bị chặn bởi người nhận không
      const blockCheck = await Block.findOne({
        blocker: targetUserId,
        blocked: userId,
      });

      if (blockCheck) {
        return {
          EC: 1,
          EM: "Bạn không thể tạo cuộc trò chuyện với người dùng này vì bạn đã bị chặn",
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

    // Allow user to view old messages even if they are blocked or blocking
    // Just fetch all messages from the conversation
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

    // Kiểm tra xem người gửi có bị chặn bởi bất kỳ người tham gia nào không
    // Nếu có, không cho phép gửi tin nhắn
    const senderIdStr = senderId.toString();
    const otherParticipants = conversation.participants
      .map(p => (p._id || p).toString())
      .filter(pId => pId !== senderIdStr);

    if (otherParticipants.length > 0) {
      const blockCheck = await Block.findOne({
        blocker: { $in: otherParticipants },
        blocked: senderId,
      });

      if (blockCheck) {
        return {
          EC: 1,
          EM: "Bạn không thể gửi tin nhắn vì đã bị chặn",
        };
      }
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
      .populate({
        path: "conversation",
        populate: { path: "participants", select: "_id" },
      })
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
        seenBy: { $not: { $elemMatch: { user: userId } } },
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
  getUnreadSummary,
  createConversation,
  getMessages,
  sendMessage,
  recallMessage,
  markSeen,
};
