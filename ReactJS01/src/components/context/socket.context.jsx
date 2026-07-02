import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import io from "socket.io-client";
import { getChatUnreadSummaryApi } from "../../util/api";
import { useCall } from "./call.context";

const SocketContext = createContext({
  socket: null,
  onlineUsers: [],
  chatUnread: { total: 0, byConversation: {} },
  refreshChatUnread: () => {},
  subscribeMessageRecalled: () => () => {},
  subscribeBlockStatusChanged: () => () => {},
  subscribeRestrictStatusChanged: () => () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [chatUnread, setChatUnread] = useState({ total: 0, byConversation: {} });
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { 
    callSession, 
    setCallSession, 
    clearCallSession, 
    playRingtone, 
    playHoldMusic, 
    stopAllSounds 
  } = useCall();
  const unreadRefreshTimerRef = useRef(null);
  const messageRecalledHandlersRef = useRef(new Set());
  const blockStatusChangedHandlersRef = useRef(new Set());
  const restrictStatusChangedHandlersRef = useRef(new Set());
  const callSessionRef = useRef(null);

  useEffect(() => {
    callSessionRef.current = callSession;
  }, [callSession]);

  const subscribeMessageRecalled = useCallback((handler) => {
    messageRecalledHandlersRef.current.add(handler);
    return () => {
      messageRecalledHandlersRef.current.delete(handler);
    };
  }, []);

  const subscribeBlockStatusChanged = useCallback((handler) => {
    blockStatusChangedHandlersRef.current.add(handler);
    return () => {
      blockStatusChangedHandlersRef.current.delete(handler);
    };
  }, []);

  const subscribeRestrictStatusChanged = useCallback((handler) => {
    restrictStatusChangedHandlersRef.current.add(handler);
    return () => {
      restrictStatusChangedHandlersRef.current.delete(handler);
    };
  }, []);

  const refreshChatUnread = useCallback(async () => {
    if (!isAuthenticated) {
      setChatUnread({ total: 0, byConversation: {} });
      return;
    }
    try {
      const res = await getChatUnreadSummaryApi();
      if (res?.EC === 0) {
        setChatUnread({
          total: res.data?.total || 0,
          byConversation: res.data?.byConversation || {},
        });
      }
    } catch (err) {
      console.error("Failed to refresh chat unread:", err);
    }
  }, [isAuthenticated]);

  const scheduleChatUnreadRefresh = useCallback(() => {
    if (unreadRefreshTimerRef.current) {
      clearTimeout(unreadRefreshTimerRef.current);
    }
    unreadRefreshTimerRef.current = setTimeout(() => {
      refreshChatUnread();
    }, 250);
  }, [refreshChatUnread]);

  useEffect(() => {
    let socketInstance = null;

    if (isAuthenticated) {
      const envUrl = import.meta.env.VITE_BACKEND_URL?.trim();
      const backendUrl = envUrl || window.location.origin;
      const token = localStorage.getItem("access_token");

      socketInstance = io(backendUrl, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 10,
      });

      setSocket(socketInstance);

      socketInstance.on("connect", () => {
        console.log("Socket connected successfully");
        refreshChatUnread();
      });

      socketInstance.on("get_online_users", (users) => {
        setOnlineUsers(users);
      });

      socketInstance.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message);
      });

      const handleChatUnreadUpdated = (summary) => {
        setChatUnread({
          total: summary?.total || 0,
          byConversation: summary?.byConversation || {},
        });
      };

      const handleIncomingChatEvent = (message) => {
        const senderId = (message?.sender?._id || message?.sender)?.toString();
        const myId = user?._id?.toString();
        if (senderId && myId && senderId === myId) return;
        scheduleChatUnreadRefresh();
      };

      const handleMessageRecalled = (payload) => {
        messageRecalledHandlersRef.current.forEach((handler) => {
          try {
            handler(payload);
          } catch (err) {
            console.error("message_recalled handler failed:", err);
          }
        });
      };

      const handleBlockStatusChanged = (data) => {
        blockStatusChangedHandlersRef.current.forEach((handler) => {
          try {
            handler(data);
          } catch (err) {
            console.error("block_status_changed handler failed:", err);
          }
        });
      };

      const handleRestrictStatusChanged = (data) => {
        restrictStatusChangedHandlersRef.current.forEach((handler) => {
          try {
            handler(data);
          } catch (err) {
            console.error("restrict_status_changed handler failed:", err);
          }
        });
      };

      // Handle call events
      const handleCallIncoming = (payload) => {
        if (!payload?._id || callSessionRef.current) return;
        
        const callerId = (payload.caller?._id || payload.caller)?.toString();
        const calleeId = (payload.callee?._id || payload.callee)?.toString();
        const myId = user?._id?.toString();
        const peerUser = callerId === myId ? payload.callee : payload.caller;
        
        const newSession = {
          callId: payload._id,
          conversationId: payload.conversation?._id || payload.conversation,
          type: payload.type,
          role: calleeId === myId ? "callee" : "caller",
          status: payload.status || "ringing",
          peerUser,
          call: payload,
        };
        
        setCallSession(newSession);
        playRingtone();
      };
      
      const handleCallOutgoing = (payload) => {
        if (!payload?._id) return;
        
        const callerId = (payload.caller?._id || payload.caller)?.toString();
        const myId = user?._id?.toString();
        
        if (callerId !== myId) return;
        
        const peerUser = payload.callee;
        
        const newSession = {
          callId: payload._id,
          conversationId: payload.conversation?._id || payload.conversation,
          type: payload.type,
          role: "caller",
          status: payload.status || "ringing",
          peerUser,
          call: payload,
        };
        
        socketInstance.emit("call:join", { callId: payload._id });
        setCallSession(newSession);
        playHoldMusic();
      };
      
      const handleCallAccepted = (payload) => {
        const currentCallSession = callSessionRef.current;
        if (!currentCallSession || currentCallSession.callId?.toString() !== payload?._id?.toString()) return;
        
        stopAllSounds();
        setCallSession(prev => prev ? { ...prev, status: "active", call: payload } : null);
      };
      
      const handleCallTerminated = (payload) => {
        const currentCallSession = callSessionRef.current;
        if (!currentCallSession || currentCallSession.callId?.toString() !== payload?._id?.toString()) return;
        clearCallSession();
      };

      socketInstance.on("chat_unread_updated", handleChatUnreadUpdated);
      socketInstance.on("receive_message", handleIncomingChatEvent);
      socketInstance.on("conversation_updated", scheduleChatUnreadRefresh);
      socketInstance.on("message_recalled", handleMessageRecalled);
      socketInstance.on("block_status_changed", handleBlockStatusChanged);
      socketInstance.on("restrict_status_changed", handleRestrictStatusChanged);
      
      // Call event listeners
      socketInstance.on("call:incoming", handleCallIncoming);
      socketInstance.on("call:outgoing", handleCallOutgoing);
      socketInstance.on("call:accepted", handleCallAccepted);
      socketInstance.on("call:declined", handleCallTerminated);
      socketInstance.on("call:ended", handleCallTerminated);
      socketInstance.on("call:missed", handleCallTerminated);

      refreshChatUnread();

      return () => {
        if (unreadRefreshTimerRef.current) {
          clearTimeout(unreadRefreshTimerRef.current);
        }
        socketInstance.off("chat_unread_updated", handleChatUnreadUpdated);
        socketInstance.off("receive_message", handleIncomingChatEvent);
        socketInstance.off("conversation_updated", scheduleChatUnreadRefresh);
        socketInstance.off("message_recalled", handleMessageRecalled);
        socketInstance.off("block_status_changed", handleBlockStatusChanged);
        socketInstance.off("restrict_status_changed", handleRestrictStatusChanged);
        
        // Clean up call event listeners
        socketInstance.off("call:incoming", handleCallIncoming);
        socketInstance.off("call:outgoing", handleCallOutgoing);
        socketInstance.off("call:accepted", handleCallAccepted);
        socketInstance.off("call:declined", handleCallTerminated);
        socketInstance.off("call:ended", handleCallTerminated);
        socketInstance.off("call:missed", handleCallTerminated);
        
        socketInstance.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setOnlineUsers([]);
        setChatUnread({ total: 0, byConversation: {} });
      }
      clearCallSession();
    }

    return undefined;
  }, [isAuthenticated, refreshChatUnread, scheduleChatUnreadRefresh, user?._id, setCallSession, clearCallSession, playRingtone, playHoldMusic, stopAllSounds]);

  return (
    <SocketContext.Provider
      value={{ 
        socket, 
        onlineUsers, 
        chatUnread, 
        refreshChatUnread, 
        subscribeMessageRecalled,
        subscribeBlockStatusChanged,
        subscribeRestrictStatusChanged,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
