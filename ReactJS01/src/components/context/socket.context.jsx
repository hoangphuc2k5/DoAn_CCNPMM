import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import io from "socket.io-client";
import { getChatUnreadSummaryApi } from "../../util/api";

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
  const unreadRefreshTimerRef = useRef(null);
  const messageRecalledHandlersRef = useRef(new Set());
  const blockStatusChangedHandlersRef = useRef(new Set());
  const restrictStatusChangedHandlersRef = useRef(new Set());

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

      socketInstance.on("chat_unread_updated", handleChatUnreadUpdated);
      socketInstance.on("receive_message", handleIncomingChatEvent);
      socketInstance.on("conversation_updated", scheduleChatUnreadRefresh);
      socketInstance.on("message_recalled", handleMessageRecalled);
      socketInstance.on("block_status_changed", handleBlockStatusChanged);
      socketInstance.on("restrict_status_changed", handleRestrictStatusChanged);

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
        socketInstance.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setOnlineUsers([]);
        setChatUnread({ total: 0, byConversation: {} });
      }
    }

    return undefined;
  }, [isAuthenticated, refreshChatUnread, scheduleChatUnreadRefresh, user?._id]);

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
