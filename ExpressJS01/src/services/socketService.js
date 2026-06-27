const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let ioInstance = null;
const onlineUsers = new Map(); // userId (string) -> Set of socketId (string)

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // Allow all origins for development
      methods: ["GET", "POST"],
    },
  });

  ioInstance = io;

  // Socket.io JWT Authentication Middleware
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      socket.handshake.headers?.authorization?.split(" ")?.[1];

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = {
        _id: decoded._id,
        email: decoded.email,
        name: decoded.name,
      };
      next();
    } catch (err) {
      console.error("Socket authentication failed:", err.message);
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User connected to socket: ${socket.user.name} (${userId})`);

    // Join user's private room for direct notifications
    socket.join(userId);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Broadcast updated online users list
    io.emit("get_online_users", Array.from(onlineUsers.keys()));

    // Join conversation room
    socket.on("join_room", (conversationId) => {
      if (conversationId) {
        socket.join(conversationId.toString());
        console.log(`User ${socket.user.name} joined room ${conversationId}`);
      }
    });

    // Leave conversation room
    socket.on("leave_room", (conversationId) => {
      if (conversationId) {
        socket.leave(conversationId.toString());
        console.log(`User ${socket.user.name} left room ${conversationId}`);
      }
    });

    // Typing indicators
    socket.on("typing", ({ conversationId, userId, userName }) => {
      if (conversationId) {
        socket.to(conversationId.toString()).emit("typing", {
          conversationId,
          userId,
          userName,
        });
      }
    });

    socket.on("stop_typing", ({ conversationId, userId }) => {
      if (conversationId) {
        socket.to(conversationId.toString()).emit("stop_typing", {
          conversationId,
          userId,
        });
      }
    });

    // Mark message as seen from client
    socket.on("message_seen", async ({ conversationId, userId, seenAt }) => {
      if (conversationId && userId) {
        emitSeenMessage(conversationId, userId, seenAt || new Date());
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected from socket: ${socket.user.name}`);
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
        }
      }
      // Broadcast updated online users list
      io.emit("get_online_users", Array.from(onlineUsers.keys()));
    });
  });

  return io;
};

const getIO = () => ioInstance;

const toSocketPayload = (value) => {
  if (!value) return value;
  if (typeof value.toObject === "function") {
    return value.toObject({ virtuals: true });
  }
  if (typeof value.toJSON === "function") {
    return value.toJSON();
  }
  return value;
};

const emitNewMessage = (conversationId, message) => {
  if (!ioInstance) return;

  const payload = toSocketPayload(message);
  const convIdStr = conversationId.toString();

  // Gửi tới phòng hội thoại (người đang mở chat)
  ioInstance.to(convIdStr).emit("receive_message", payload);

  // Gửi tới phòng riêng từng participant để đảm bảo realtime kể cả khi chưa join_room
  const participants = payload.conversation?.participants || [];
  participants.forEach((participant) => {
    const pId = (participant._id || participant).toString();

    ioInstance.to(pId).emit("conversation_updated", {
      conversationId: convIdStr,
      lastMessage: payload,
    });

    ioInstance.to(pId).emit("receive_message", payload);
  });
};

const emitRecallMessage = (conversationId, message, participants = []) => {
  if (!ioInstance) return;

  const payload = toSocketPayload(message);
  const convIdStr = conversationId.toString();

  ioInstance.to(convIdStr).emit("message_recalled", payload);

  const participantList = participants.length
    ? participants
    : payload.conversation?.participants || [];

  participantList.forEach((participant) => {
    const pId = (participant._id || participant).toString();
    ioInstance.to(pId).emit("message_recalled", payload);
  });
};

const emitSeenMessage = (conversationId, userId, seenAt) => {
  if (!ioInstance) return;
  ioInstance.to(conversationId.toString()).emit("message_seen", {
    conversationId: conversationId.toString(),
    userId: userId.toString(),
    seenAt,
  });
};

const emitNotification = (userId, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(userId.toString()).emit("notification:new", payload);
};

const emitChatUnreadUpdated = (userId, summary) => {
  if (!ioInstance || !userId || !summary) return;
  ioInstance.to(userId.toString()).emit("chat_unread_updated", summary);
};

const emitBlockStatusChanged = (userId, targetUserId, isBlocked) => {
  if (!ioInstance || !userId || !targetUserId) return;
  // Gửi cho người bị chặn/bỏ chặn để họ biết trạng thái thay đổi
  ioInstance.to(targetUserId.toString()).emit("block_status_changed", {
    blockerId: userId.toString(),
    targetId: targetUserId.toString(),
    isBlocked,
  });
};

const emitRestrictStatusChanged = (userId, targetUserId, isRestricted) => {
  if (!ioInstance || !userId || !targetUserId) return;
  // Gửi cho người bị hạn chế/bỏ hạn chế để họ biết trạng thái thay đổi
  ioInstance.to(targetUserId.toString()).emit("restrict_status_changed", {
    restrictorId: userId.toString(),
    targetId: targetUserId.toString(),
    isRestricted,
  });
};

module.exports = {
  initSocket,
  getIO,
  emitNewMessage,
  emitRecallMessage,
  emitSeenMessage,
  emitNotification,
  emitChatUnreadUpdated,
  emitBlockStatusChanged,
  emitRestrictStatusChanged,
};
