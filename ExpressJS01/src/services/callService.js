const Conversation = require("../models/conversation");
const Call = require("../models/call");
const Block = require("../models/block");
const socketService = require("./socketService");

const missedTimers = new Map();
const MISSED_RING_TIMEOUT_MS = 30000;

const populateCall = (query) =>
  query
    .populate("conversation", "_id isGroup name avatar participants")
    .populate("caller", "_id name avatar")
    .populate("callee", "_id name avatar")
    .sort({ createdAt: -1 });

const formatCall = (call) => {
  if (!call) return call;
  const doc = typeof call.toObject === "function" ? call.toObject() : call;
  const startedAt = doc.startedAt ? new Date(doc.startedAt).getTime() : null;
  const endedAt = doc.endedAt ? new Date(doc.endedAt).getTime() : null;

  return {
    ...doc,
    durationSeconds:
      doc.durationSeconds || (startedAt && endedAt ? Math.max(0, Math.floor((endedAt - startedAt) / 1000)) : 0),
  };
};

const clearMissedTimer = (callId) => {
  const timer = missedTimers.get(callId.toString());
  if (timer) {
    clearTimeout(timer);
    missedTimers.delete(callId.toString());
  }
};

const scheduleMissedTimer = (callId) => {
  clearMissedTimer(callId);

  const timer = setTimeout(async () => {
    try {
      const call = await Call.findById(callId);
      if (!call || call.status !== "ringing") {
        return;
      }

      call.status = "missed";
      call.endedAt = new Date();
      call.endedReason = "missed";
      call.durationSeconds = 0;
      await call.save();

      const populatedCall = await populateCall(Call.findById(callId));
      socketService.emitCallMissed(populatedCall);
    } finally {
      missedTimers.delete(callId.toString());
    }
  }, MISSED_RING_TIMEOUT_MS);

  missedTimers.set(callId.toString(), timer);
};

const assertPersonalConversation = async (conversationId, userId) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  })
    .select("_id isGroup participants")
    .lean();

  if (!conversation) {
    return { error: "Hội thoại không tồn tại hoặc bạn không có quyền truy cập" };
  }

  if (conversation.isGroup) {
    return { error: "Hiện chỉ hỗ trợ gọi trong cuộc trò chuyện cá nhân" };
  }

  if (!Array.isArray(conversation.participants) || conversation.participants.length !== 2) {
    return { error: "Cuộc trò chuyện không hợp lệ để thực hiện cuộc gọi" };
  }

  return { conversation };
};

const createCall = async (conversationId, callerId, type = "audio") => {
  try {
    const conversationCheck = await assertPersonalConversation(conversationId, callerId);
    if (conversationCheck.error) {
      return { EC: 1, EM: conversationCheck.error };
    }

    const conversation = conversationCheck.conversation;
    const calleeId = conversation.participants.find((participantId) => participantId.toString() !== callerId.toString());

    const blockCheck = await Block.findOne({
      $or: [
        { blocker: callerId, blocked: calleeId },
        { blocker: calleeId, blocked: callerId },
      ],
    });

    if (blockCheck) {
      return {
        EC: 1,
        EM: "Bạn không thể thực hiện cuộc gọi vì hai bên đang bị chặn",
      };
    }

    const busyCall = await Call.findOne({
      participants: { $in: [callerId, calleeId] },
      status: { $in: ["ringing", "active"] },
    });

    if (busyCall) {
      const isCallerBusy = busyCall.participants.some(p => p.toString() === callerId.toString());
      if (isCallerBusy) {
         return {
           EC: 1,
           EM: "Bạn đang trong một cuộc gọi khác",
         };
      } else {
         const call = await Call.create({
           conversation: conversationId,
           caller: callerId,
           callee: calleeId,
           participants: [callerId, calleeId],
           type: type === "video" ? "video" : "audio",
           status: "ended",
           endedReason: "busy",
           roomId: null,
           startedAt: null,
           answeredAt: null,
           endedAt: new Date(),
           durationSeconds: 0
         });
         
         const populatedCall = await populateCall(Call.findById(call._id));
         socketService.emitCallMissed(populatedCall); // Emit missed call so it can update UI if needed
         
         return {
           EC: 1,
           EM: "Người dùng đang bận trong một cuộc gọi khác",
         };
      }
    }

    const call = await Call.create({
      conversation: conversationId,
      caller: callerId,
      callee: calleeId,
      participants: [callerId, calleeId],
      type: type === "video" ? "video" : "audio",
      status: "ringing",
      roomId: null,
    });

    const populatedCall = await populateCall(Call.findById(call._id));
    scheduleMissedTimer(call._id);
    socketService.emitCallIncoming(populatedCall);

    return {
      EC: 0,
      EM: "Đã bắt đầu cuộc gọi",
      data: formatCall(populatedCall),
    };
  } catch (error) {
    console.error("Error in createCall:", error);
    return {
      EC: 1,
      EM: "Không thể bắt đầu cuộc gọi",
      error: error.message,
    };
  }
};

const getCallHistory = async (conversationId, userId, limit = 50, skip = 0) => {
  try {
    const conversationCheck = await assertPersonalConversation(conversationId, userId);
    if (conversationCheck.error) {
      return { EC: 1, EM: conversationCheck.error };
    }

    const calls = await populateCall(
      Call.find({ conversation: conversationId })
        .sort({ createdAt: -1 })
        .skip(Math.max(0, skip))
        .limit(Math.max(1, limit))
    );

    return {
      EC: 0,
      EM: "Lấy lịch sử cuộc gọi thành công",
      data: calls.map(formatCall),
    };
  } catch (error) {
    console.error("Error in getCallHistory:", error);
    return {
      EC: 1,
      EM: "Lỗi khi lấy lịch sử cuộc gọi",
      error: error.message,
    };
  }
};

const acceptCall = async (callId, userId) => {
  try {
    const call = await Call.findById(callId);
    if (!call) {
      return { EC: 1, EM: "Không tìm thấy cuộc gọi" };
    }

    if (call.callee.toString() !== userId.toString()) {
      return { EC: 1, EM: "Bạn không có quyền chấp nhận cuộc gọi này" };
    }

    if (call.status !== "ringing") {
      return { EC: 1, EM: "Cuộc gọi không còn ở trạng thái chờ" };
    }

    clearMissedTimer(callId);
    call.status = "active";
    call.startedAt = new Date();
    call.answeredAt = new Date();
    call.endedAt = null;
    call.durationSeconds = 0;
    await call.save();

    const populatedCall = await populateCall(Call.findById(callId));
    socketService.emitCallAccepted(populatedCall);

    return {
      EC: 0,
      EM: "Đã chấp nhận cuộc gọi",
      data: formatCall(populatedCall),
    };
  } catch (error) {
    console.error("Error in acceptCall:", error);
    return { EC: 1, EM: "Lỗi khi chấp nhận cuộc gọi", error: error.message };
  }
};

const declineCall = async (callId, userId) => {
  try {
    const call = await Call.findById(callId);
    if (!call) {
      return { EC: 1, EM: "Không tìm thấy cuộc gọi" };
    }

    if (call.callee.toString() !== userId.toString()) {
      return { EC: 1, EM: "Bạn không có quyền từ chối cuộc gọi này" };
    }

    if (call.status !== "ringing") {
      return { EC: 1, EM: "Cuộc gọi không còn ở trạng thái chờ" };
    }

    clearMissedTimer(callId);
    call.status = "declined";
    call.endedAt = new Date();
    call.endedReason = "declined";
    call.durationSeconds = 0;
    await call.save();

    const populatedCall = await populateCall(Call.findById(callId));
    socketService.emitCallDeclined(populatedCall);

    return {
      EC: 0,
      EM: "Đã từ chối cuộc gọi",
      data: formatCall(populatedCall),
    };
  } catch (error) {
    console.error("Error in declineCall:", error);
    return { EC: 1, EM: "Lỗi khi từ chối cuộc gọi", error: error.message };
  }
};

const endCall = async (callId, userId) => {
  try {
    const call = await Call.findById(callId);
    if (!call) {
      return { EC: 1, EM: "Không tìm thấy cuộc gọi" };
    }

    if (!call.participants.some((participantId) => participantId.toString() === userId.toString())) {
      return { EC: 1, EM: "Bạn không có quyền kết thúc cuộc gọi này" };
    }

    clearMissedTimer(callId);

    const now = new Date();
    if (call.status === "ringing") {
      call.status = call.caller.toString() === userId.toString() ? "canceled" : "missed";
      call.endedReason = call.status === "canceled" ? "canceled" : "missed";
      call.startedAt = null;
      call.answeredAt = null;
      call.durationSeconds = 0;
    } else {
      call.status = "ended";
      call.endedReason = "hangup";
      if (!call.startedAt) {
        call.startedAt = now;
      }
      call.durationSeconds = Math.max(
        0,
        Math.floor((now.getTime() - new Date(call.startedAt).getTime()) / 1000)
      );
    }

    call.endedAt = now;
    await call.save();

    const populatedCall = await populateCall(Call.findById(callId));
    socketService.emitCallEnded(populatedCall);

    return {
      EC: 0,
      EM: "Đã kết thúc cuộc gọi",
      data: formatCall(populatedCall),
    };
  } catch (error) {
    console.error("Error in endCall:", error);
    return { EC: 1, EM: "Lỗi khi kết thúc cuộc gọi", error: error.message };
  }
};

module.exports = {
  createCall,
  getCallHistory,
  acceptCall,
  declineCall,
  endCall,
  clearMissedTimer,
};
