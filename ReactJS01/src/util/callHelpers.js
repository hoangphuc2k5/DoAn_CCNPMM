export const CALL_SYNC_CHANNEL = "tegram-call-sync";
export const CALL_SESSION_PREFIX = "tegram-call-session:";
export const CALL_TAB_PREFIX = "tegram-call-tab:";

export const getConvId = (value) => (value?._id || value)?.toString();

export const getInitial = (value, fallback = "?") => {
  if (value == null) return fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  return text[0].toUpperCase();
};

export const getCallStatusLabel = (status) => {
  switch (status) {
    case "active":
      return "Đang gọi";
    case "ringing":
      return "Đang đổ chuông";
    case "connecting":
      return "Đang kết nối";
    case "missed":
      return "Cuộc gọi nhỡ";
    case "declined":
      return "Đã từ chối";
    case "canceled":
      return "Đã hủy";
    case "ended":
      return "Đã kết thúc";
    default:
      return "Cuộc gọi";
  }
};

export const buildCallSessionFromPayload = (payload, currentUserId) => {
  if (!payload?._id) return null;

  const callerId = getConvId(payload.caller);
  const calleeId = getConvId(payload.callee);
  const myId = currentUserId?.toString();
  const peerUser = callerId === myId ? payload.callee : payload.caller;

  return {
    callId: payload._id,
    conversationId: getConvId(payload.conversation) || payload.conversation,
    type: payload.type === "video" ? "video" : "audio",
    role: calleeId === myId ? "callee" : "caller",
    status: payload.status || "ringing",
    peerUser,
    call: payload,
  };
};

export const saveCallSession = (session) => {
  if (!session?.callId) return;
  sessionStorage.setItem(`${CALL_SESSION_PREFIX}${session.callId}`, JSON.stringify(session));
};

export const loadCallSession = (callId) => {
  try {
    const raw = sessionStorage.getItem(`${CALL_SESSION_PREFIX}${callId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const markCallTabOpen = (callId) => {
  sessionStorage.setItem(`${CALL_TAB_PREFIX}${callId}`, String(Date.now()));
};

export const isCallTabOpen = (callId) => Boolean(sessionStorage.getItem(`${CALL_TAB_PREFIX}${callId}`));

export const clearCallTabMark = (callId) => {
  sessionStorage.removeItem(`${CALL_TAB_PREFIX}${callId}`);
  sessionStorage.removeItem(`${CALL_SESSION_PREFIX}${callId}`);
};

export const buildCallRoomUrl = (callId, { role, type, autoAccept = false } = {}) => {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (type) params.set("type", type);
  if (autoAccept) params.set("autoAccept", "1");
  const query = params.toString();
  return `/call/${callId}${query ? `?${query}` : ""}`;
};

export const openCallRoomTab = (callId, options = {}) => {
  const url = buildCallRoomUrl(callId, options);
  markCallTabOpen(callId);
  const popup = window.open(url, `tegram-call-${callId}`, "noopener,noreferrer");
  return popup;
};

export const isOnCallRoomPage = (callId) => {
  const path = window.location.pathname;
  if (!path.startsWith("/call/")) return false;
  if (!callId) return true;
  return path === `/call/${callId}` || path.startsWith(`/call/${callId}/`);
};

export const postCallSyncMessage = (message) => {
  try {
    const channel = new BroadcastChannel(CALL_SYNC_CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch {
    /* ignore */
  }
};
