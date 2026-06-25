import React, { useEffect, useState, useRef, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Input,
  Button,
  Upload,
  Modal,
  Popover,
  Tooltip,
  Badge,
  Spin,
  Checkbox,
  message as antdMessage,
  List,
} from "antd";
import {
  SendOutlined,
  PaperClipOutlined,
  SmileOutlined,
  PictureOutlined,
  FileOutlined,
  InfoCircleOutlined,
  TeamOutlined,
  CloseOutlined,
  PhoneOutlined,
  VideoCameraOutlined,
  UserOutlined,
  BellOutlined,
  SearchOutlined,
  StopOutlined,
  FlagOutlined,
  EditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";
import { useSocket } from "../components/context/socket.context";
import { getMediaUrl } from "../util/media";
import {
  getConversationsApi,
  createConversationApi,
  getMessagesApi,
  sendMessageApi,
  recallMessageApi,
  markSeenApi,
  getRelationshipsApi,
  blockUserApi,
  reportUserApi,
} from "../util/api";

dayjs.extend(relativeTime);
dayjs.locale("vi");

// Emojis for Sticker Panel
const STICKERS = [
  { id: "dog", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f436/512.webp", name: "Chó con" },
  { id: "cat", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f431/512.webp", name: "Mèo con" },
  { id: "rabbit", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f430/512.webp", name: "Thỏ" },
  { id: "bear", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f43b/512.webp", name: "Gấu" },
  { id: "mouse", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f42d/512.webp", name: "Chuột" },
  { id: "monkey", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f412/512.webp", name: "Khỉ" },
  { id: "penguin", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f427/512.webp", name: "Chim cánh cụt" },
  { id: "frog", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f438/512.webp", name: "Ếch" },
  { id: "lion", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f981/512.webp", name: "Sư tử" },
  { id: "fox", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f98a/512.webp", name: "Cáo" },
];

const EMOJIS = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"];

// Short Time Formatter (e.g. 2p, 15p, 1h, 1d)
const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  const now = dayjs();
  const date = dayjs(dateStr);
  const diffMin = now.diff(date, "minute");
  const diffHour = now.diff(date, "hour");
  const diffDay = now.diff(date, "day");

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin}p`;
  if (diffHour < 24) return `${diffHour}h`;
  return `${diffDay}d`;
};

const ChatPage = () => {
  const currentUser = useSelector((state) => state.auth.user);
  const { socket, onlineUsers } = useSocket();
  const navigate = useNavigate();

  const getConvDetails = (conv) => {
    if (conv.isGroup) {
      return {
        name: conv.name,
        avatar: conv.avatar || "",
        isOnline: false,
      };
    }

    const otherUser = conv.participants.find((p) => p._id !== currentUser?._id);
    const isOnline = otherUser ? onlineUsers.includes(otherUser._id.toString()) : false;

    return {
      name: otherUser ? otherUser.name : "Tài khoản Tegram",
      avatar: otherUser ? otherUser.avatar : "",
      isOnline,
      userId: otherUser?._id,
    };
  };

  // Conversations & message states
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // Sidebar Search and Tabs
  const [activeTab, setActiveTab] = useState("personal"); // "personal" or "group"
  const [searchQuery, setSearchQuery] = useState("");

  // Chat input and attachments
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Group creation modal state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState([]);

  // 1-1 Friend Selection Modal state
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // Staged Files
  const [fileList, setFileList] = useState([]);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  // Initial Fetches
  useEffect(() => {
    fetchConversations();
    fetchFriends();
  }, []);

  // Socket Listener Config
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      const isCurrent =
        selectedConv &&
        (message.conversation === selectedConv._id ||
          message.conversation._id === selectedConv._id);

      if (isCurrent) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        markSeenApi(selectedConv._id);
        socket.emit("message_seen", selectedConv._id);
      }

      setConversations((prev) => {
        const convId = message.conversation._id || message.conversation;
        const index = prev.findIndex((c) => c._id === convId);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            lastMessage: message,
            updatedAt: message.createdAt,
          };
          return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        } else {
          fetchConversations();
          return prev;
        }
      });
    };

    const handleMessageRecalled = (recalledMsg) => {
      const isCurrent =
        selectedConv &&
        (recalledMsg.conversation === selectedConv._id ||
          recalledMsg.conversation._id === selectedConv._id);

      if (isCurrent) {
        setMessages((prev) =>
          prev.map((m) => (m._id === recalledMsg._id ? recalledMsg : m))
        );
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c.lastMessage && c.lastMessage._id === recalledMsg._id) {
            return { ...c, lastMessage: recalledMsg };
          }
          return c;
        })
      );
    };

    const handleMessageSeen = ({ conversationId, userId, seenAt }) => {
      if (selectedConv && selectedConv._id === conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            const isSender = m.sender._id === userId;
            const alreadySeen = m.seenBy.some(
              (s) => (s.user._id || s.user) === userId
            );
            if (!isSender && !alreadySeen) {
              return {
                ...m,
                seenBy: [...m.seenBy, { user: userId, seenAt }],
              };
            }
            return m;
          })
        );
      }
    };

    const handleTyping = ({ conversationId, userId, userName }) => {
      if (selectedConv && selectedConv._id === conversationId && userId !== currentUser._id) {
        setTypingUsers((prev) => {
          if (!prev.some((u) => u.userId === userId)) {
            return [...prev, { userId, userName }];
          }
          return prev;
        });
      }
    };

    const handleStopTyping = ({ conversationId, userId }) => {
      if (selectedConv && selectedConv._id === conversationId) {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
      }
    };

    const handleConversationUpdated = ({ conversationId, lastMessage }) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c._id === conversationId);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            lastMessage,
            updatedAt: lastMessage.createdAt,
          };
          return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        } else {
          fetchConversations();
          return prev;
        }
      });
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("message_recalled", handleMessageRecalled);
    socket.on("message_seen", handleMessageSeen);
    socket.on("typing", handleTyping);
    socket.on("stop_typing", handleStopTyping);
    socket.on("conversation_updated", handleConversationUpdated);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_recalled", handleMessageRecalled);
      socket.off("message_seen", handleMessageSeen);
      socket.off("typing", handleTyping);
      socket.off("stop_typing", handleStopTyping);
      socket.off("conversation_updated", handleConversationUpdated);
    };
  }, [socket, selectedConv, currentUser]);

  // Join/leave rooms
  useEffect(() => {
    if (!socket || !selectedConv) return;

    socket.emit("join_room", selectedConv._id);
    markSeenApi(selectedConv._id);
    socket.emit("message_seen", selectedConv._id);

    return () => {
      socket.emit("leave_room", selectedConv._id);
    };
  }, [socket, selectedConv?._id]);

  // APIs fetchers
  const fetchConversations = async () => {
    setLoadingConv(true);
    const res = await getConversationsApi();
    if (res && res.EC === 0) {
      setConversations(res.data || []);
    } else {
      antdMessage.error(res?.EM || "Không thể tải danh sách cuộc trò chuyện");
    }
    setLoadingConv(false);
  };

  const fetchFriends = async () => {
    const res = await getRelationshipsApi();
    if (res && res.EC === 0) {
      setFriends(res.data?.friends || []);
    }
  };

  const fetchMessages = async (conversationId) => {
    setLoadingMsgs(true);
    const res = await getMessagesApi(conversationId);
    if (res && res.EC === 0) {
      setMessages(res.data || []);
    } else {
      antdMessage.error(res?.EM || "Không thể lấy lịch sử tin nhắn");
    }
    setLoadingMsgs(false);
  };

  const selectConversation = (conv) => {
    setSelectedConv(conv);
    setTypingUsers([]);
    setMessageInput("");
    setFileList([]);
    fetchMessages(conv._id);
  };

  // Online friends list
  const onlineFriends = useMemo(() => {
    return friends.filter((f) => onlineUsers.includes(f._id.toString()));
  }, [friends, onlineUsers]);

  // Filtering conversations by Active Tab (Personal/Group) and Search Query
  const filteredConversations = useMemo(() => {
    return conversations
      .filter((c) => {
        if (activeTab === "personal") return !c.isGroup;
        return c.isGroup;
      })
      .filter((c) => {
        const details = getConvDetails(c);
        return details.name.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [conversations, activeTab, searchQuery]);

  // Input actions
  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    if (!socket || !selectedConv) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", { conversationId: selectedConv._id });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("stop_typing", { conversationId: selectedConv._id });
    }, 2000);
  };

  const handleSendMessage = async (payloadOverride = {}) => {
    if (!selectedConv) return;
    if (!messageInput.trim() && fileList.length === 0 && !payloadOverride.sticker) return;

    if (isTyping && socket) {
      setIsTyping(false);
      socket.emit("stop_typing", { conversationId: selectedConv._id });
    }

    try {
      let res;
      if (fileList.length > 0) {
        const formData = new FormData();
        formData.append("content", messageInput);
        fileList.forEach((file) => {
          formData.append("attachments", file.originFileObj || file);
        });
        const hideLoading = antdMessage.loading("Đang gửi tệp tin...", 0);
        res = await sendMessageApi(selectedConv._id, formData);
        hideLoading();
      } else {
        const payload = {
          content: payloadOverride.sticker ? "" : messageInput,
          type: payloadOverride.sticker ? "sticker" : "text",
          sticker: payloadOverride.sticker || "",
        };
        res = await sendMessageApi(selectedConv._id, payload);
      }

      if (res && res.EC === 0) {
        setMessageInput("");
        setFileList([]);
      } else {
        antdMessage.error(res?.EM || "Gửi tin nhắn thất bại");
      }
    } catch (error) {
      console.error(error);
      antdMessage.error("Đã xảy ra lỗi khi gửi tin nhắn");
    }
  };

  const handleSendSticker = (stickerUrl) => {
    handleSendMessage({ sticker: stickerUrl });
  };

  const handleEmojiClick = (emoji) => {
    setMessageInput((prev) => prev + emoji);
  };

  const handleRecallMessage = async (messageId) => {
    const res = await recallMessageApi(messageId);
    if (res && res.EC === 0) {
      antdMessage.success("Tin nhắn đã được thu hồi");
    } else {
      antdMessage.error(res?.EM || "Không thể thu hồi tin nhắn");
    }
  };

  const handleStartNewChat = async (friendId) => {
    setIsNewChatModalOpen(false);
    // Open if already exists
    const existing = conversations.find(
      (c) => !c.isGroup && c.participants.some((p) => p._id === friendId)
    );
    if (existing) {
      selectConversation(existing);
      return;
    }

    const res = await createConversationApi({
      isGroup: false,
      participants: [friendId],
    });

    if (res && res.EC === 0) {
      const newConv = res.data;
      setConversations((prev) => [newConv, ...prev]);
      selectConversation(newConv);
    } else {
      antdMessage.error(res?.EM || "Không thể tạo cuộc trò chuyện");
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      antdMessage.warning("Vui lòng nhập tên nhóm!");
      return;
    }
    if (selectedFriends.length < 2) {
      antdMessage.warning("Nhóm chat phải có ít nhất 3 thành viên bao gồm cả bạn!");
      return;
    }

    const res = await createConversationApi({
      isGroup: true,
      name: groupName,
      participants: selectedFriends,
    });

    if (res && res.EC === 0) {
      const newConv = res.data;
      setConversations((prev) => [newConv, ...prev]);
      selectConversation(newConv);
      setIsGroupModalOpen(false);
      setGroupName("");
      setSelectedFriends([]);
      antdMessage.success("Tạo nhóm chat thành công!");
    } else {
      antdMessage.error(res?.EM || "Tạo nhóm chat thất bại");
    }
  };

  // Block & Report functionality inside Right Panel
  const handleBlockUser = (userId) => {
    Modal.confirm({
      title: "Chặn người dùng này?",
      content: "Sau khi chặn, hai bên sẽ không còn có thể nhắn tin hoặc tương tác với nhau.",
      okText: "Chặn",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        try {
          const res = await blockUserApi(userId);
          if (res?.EC === 0) {
            antdMessage.success("Đã chặn người dùng");
            fetchConversations();
            setSelectedConv(null);
          } else {
            antdMessage.error(res?.EM || "Lỗi chặn người dùng");
          }
        } catch (err) {
          antdMessage.error("Không thể hoàn thành hành động");
        }
      },
    });
  };

  const handleReportUser = (userId) => {
    let reason = "";
    Modal.confirm({
      title: "Báo cáo người dùng",
      content: (
        <Input.TextArea
          rows={3}
          placeholder="Nhập lý do báo cáo..."
          onChange={(e) => { reason = e.target.value; }}
        />
      ),
      okText: "Gửi báo cáo",
      cancelText: "Hủy",
      onOk: async () => {
        if (!reason.trim()) {
          antdMessage.warning("Vui lòng nhập lý do!");
          return;
        }
        try {
          const res = await reportUserApi(userId, reason);
          if (res?.EC === 0) {
            antdMessage.success(res.EM || "Đã gửi báo cáo thành công!");
          } else {
            antdMessage.error(res?.EM || "Lỗi gửi báo cáo");
          }
        } catch (err) {
          antdMessage.error("Không thể hoàn thành hành động");
        }
      },
    });
  };

  const showNotSupportedMessage = (featureName) => {
    antdMessage.info(`Tính năng "${featureName}" hiện chưa được hỗ trợ`);
  };

  const renderMessageContent = (msg) => {
    if (msg.isRecalled) {
      return <span style={{ fontStyle: "italic", opacity: 0.6 }}>Tin nhắn đã bị thu hồi</span>;
    }

    switch (msg.type) {
      case "sticker":
        return <img src={msg.sticker} alt="sticker" style={{ maxWidth: 120, height: "auto" }} />;
      case "image":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {msg.content && <div>{msg.content}</div>}
            <div style={{ display: "grid", gap: 4, gridTemplateColumns: "1fr", maxWidth: 280, borderRadius: 8, overflow: "hidden" }}>
              {msg.attachments.map((att) => (
                <img
                  key={att._id}
                  src={getMediaUrl(att.url)}
                  alt={att.filename}
                  className="chat-attachment-image"
                  onClick={() => {
                    Modal.info({
                      title: att.filename,
                      width: 800,
                      content: (
                        <div style={{ display: "flex", justifyContent: "center", padding: 8, backgroundColor: "#000" }}>
                          <img src={getMediaUrl(att.url)} alt={att.filename} style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }} />
                        </div>
                      ),
                      icon: null,
                      okText: "Đóng",
                    });
                  }}
                />
              ))}
            </div>
          </div>
        );
      case "video":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {msg.content && <div>{msg.content}</div>}
            {msg.attachments.map((att) => (
              <video
                key={att._id}
                src={getMediaUrl(att.url)}
                controls
                style={{ maxWidth: 280, borderRadius: 8, border: "1px solid #edf0f4" }}
              />
            ))}
          </div>
        );
      case "file":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {msg.content && <div>{msg.content}</div>}
            {msg.attachments.map((att) => {
              const isImg = att.mimetype.startsWith("image/");
              const isVid = att.mimetype.startsWith("video/");

              if (isImg) {
                return (
                  <img
                    key={att._id}
                    src={getMediaUrl(att.url)}
                    alt={att.filename}
                    style={{ maxWidth: 280, borderRadius: 8, border: "1px solid #edf0f4" }}
                  />
                );
              }
              if (isVid) {
                return (
                  <video
                    key={att._id}
                    src={getMediaUrl(att.url)}
                    controls
                    style={{ maxWidth: 280, borderRadius: 8, border: "1px solid #edf0f4" }}
                  />
                );
              }

              return (
                <a
                  key={att._id}
                  href={getMediaUrl(att.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="right-sidebar-file-item"
                  style={{ maxWidth: 280, display: "flex", margin: "4px 0" }}
                >
                  <FileOutlined className="text-xl text-blue-500" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "11px", fontWeight: "bold" }} className="truncate">{att.filename}</div>
                    <div style={{ fontSize: "9px", color: "gray" }}>Tải xuống tệp tin</div>
                  </div>
                </a>
              );
            })}
          </div>
        );
      case "text":
      default:
        return <div>{msg.content}</div>;
    }
  };

  const stickerPanel = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, padding: 8, maxWidth: 280, maxHeight: 240, overflowY: "auto" }}>
      {STICKERS.map((sticker) => (
        <Tooltip key={sticker.id} title={sticker.name}>
          <img
            src={sticker.url}
            alt={sticker.name}
            style={{ width: 44, height: 44, objectFit: "contain", cursor: "pointer", transition: "transform 0.15s ease" }}
            onClick={() => handleSendSticker(sticker.url)}
          />
        </Tooltip>
      ))}
    </div>
  );

  const emojiPanel = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, padding: 8, maxWidth: 300, maxHeight: 240, overflowY: "auto" }}>
      {EMOJIS.map((emoji, idx) => (
        <span
          key={idx}
          style={{ fontSize: 24, padding: 4, cursor: "pointer", textAlign: "center", borderRadius: 4 }}
          className="hover:bg-gray-100"
          onClick={() => handleEmojiClick(emoji)}
        >
          {emoji}
        </span>
      ))}
    </div>
  );

  return (
    <div className="chat-container">
      {/* Cột 1: Sidebar tin nhắn */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <span className="chat-sidebar-title">Tin nhắn</span>
          <Button
            type="text"
            shape="circle"
            icon={<EditOutlined style={{ fontSize: 18, color: "#7F00FD" }} />}
            onClick={() => setIsNewChatModalOpen(true)}
            style={{ backgroundColor: "rgba(127, 0, 253, 0.08)" }}
          />
        </div>

        {/* Tìm kiếm */}
        <div className="chat-search-container">
          <Input
            placeholder="Tìm kiếm tin nhắn..."
            prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="chat-search-input"
            allowClear
          />
        </div>

        {/* Tabs: Cá nhân / Nhóm */}
        <div className="chat-tabs">
          <button
            onClick={() => setActiveTab("personal")}
            className={`chat-tab-button ${activeTab === "personal" ? "active" : ""}`}
          >
            Cá nhân
          </button>
          <button
            onClick={() => setActiveTab("group")}
            className={`chat-tab-button ${activeTab === "group" ? "active" : ""}`}
          >
            Nhóm
          </button>
        </div>

        {/* Content list for Personal Tab (Online users & list) */}
        {activeTab === "personal" && (
          <div className="online-users-section">
            <div className="online-users-label">Đang hoạt động</div>
            <div className="online-users-list">
              {onlineFriends.length > 0 ? (
                onlineFriends.map((f) => (
                  <div key={f._id} className="online-user-item" onClick={() => handleStartNewChat(f._id)}>
                    <Badge dot status="success" offset={[-2, 32]}>
                      <Avatar src={getMediaUrl(f.avatar)} size={38}>
                        {f.name[0].toUpperCase()}
                      </Avatar>
                    </Badge>
                    <span className="online-user-name">{f.name.split(" ").pop()}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 11, color: "gray", padding: "4px 0" }}>Chưa có bạn bè online</div>
              )}
            </div>
          </div>
        )}

        {/* Content list for Group Tab (Create new button) */}
        {activeTab === "group" && (
          <div className="create-group-btn-container">
            <Button
              className="create-group-btn"
              onClick={() => setIsGroupModalOpen(true)}
              icon={<TeamOutlined />}
            >
              Tạo nhóm chat mới
            </Button>
          </div>
        )}

        {/* List of chat items */}
        <div className="chat-list-container">
          {loadingConv ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
              <Spin />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "gray", fontSize: 13 }}>
              Chưa có hội thoại nào. Gõ tìm kiếm hoặc nhấp bút 📝 để chat.
            </div>
          ) : (
            <List
              dataSource={filteredConversations}
              renderItem={(conv) => {
                const details = getConvDetails(conv);
                const isSelected = selectedConv && selectedConv._id === conv._id;
                const hasUnread =
                  conv.lastMessage &&
                  conv.lastMessage.sender?._id !== currentUser?._id &&
                  !conv.lastMessage.seenBy?.some(
                    (s) => (s.user?._id || s.user) === currentUser?._id
                  );

                return (
                  <List.Item
                    className={`chat-list-item ${isSelected ? "selected" : ""}`}
                    onClick={() => selectConversation(conv)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left" }}>
                      <Badge dot={details.isOnline} color="green" offset={[-2, 34]}>
                        <Avatar
                          src={getMediaUrl(details.avatar)}
                          size={42}
                          icon={conv.isGroup ? <TeamOutlined /> : null}
                          style={{ backgroundColor: isSelected ? "#ffffff" : "#7F00FD", color: isSelected ? "#7F00FD" : "#ffffff", fontWeight: "bold" }}
                        >
                          {details.name[0].toUpperCase()}
                        </Avatar>
                      </Badge>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                          <span className={`chat-item-name ${hasUnread ? "unread" : ""}`}>
                            {details.name}
                          </span>
                          <span style={{ fontSize: 10, color: "#8c8c8c" }}>
                            {conv.lastMessage
                              ? formatTimeAgo(conv.lastMessage.createdAt)
                              : ""}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className={`chat-item-snippet ${hasUnread ? "unread" : ""}`}>
                            {conv.lastMessage
                              ? conv.lastMessage.isRecalled
                                ? "Tin nhắn đã bị thu hồi"
                                : conv.lastMessage.sender?._id === currentUser?._id
                                  ? `Bạn: ${conv.lastMessage.content || "[Đính kèm]"}`
                                  : conv.lastMessage.content || "[Đính kèm]"
                              : "Chưa có tin nhắn"}
                          </span>
                          {hasUnread && (
                            <Badge color="#7F00FD" status="processing" />
                          )}
                        </div>
                      </div>
                    </div>
                  </List.Item>
                );
              }}
            />
          )}
        </div>
      </div>

      {/* Cột 2: Khung Chat chính */}
      <div className="chat-main">
        {selectedConv ? (
          <>
            {/* Header phòng chat */}
            <div style={{ height: 64, borderBottom: "1px solid #edf0f4", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", backgroundColor: "#ffffff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Badge dot={getConvDetails(selectedConv).isOnline} color="green" offset={[-2, 30]}>
                  <Avatar
                    src={getMediaUrl(getConvDetails(selectedConv).avatar)}
                    size={38}
                    icon={selectedConv.isGroup ? <TeamOutlined /> : null}
                    style={{ backgroundColor: "#7F00FD", fontWeight: "bold" }}
                  >
                    {getConvDetails(selectedConv).name[0].toUpperCase()}
                  </Avatar>
                </Badge>
                <div style={{ textAlign: "left" }}>
                  <h3 style={{ fontSize: 14.5, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
                    {getConvDetails(selectedConv).name}
                  </h3>
                  <span style={{ fontSize: 11, color: "#8c8c8c" }}>
                    {selectedConv.isGroup
                      ? `${selectedConv.participants.length} thành viên`
                      : getConvDetails(selectedConv).isOnline
                        ? "Đang hoạt động"
                        : "Ngoại tuyến"}
                  </span>
                </div>
              </div>

              {/* Icon actions */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Tooltip title="Gọi điện">
                  <Button type="text" shape="circle" icon={<PhoneOutlined style={{ fontSize: 18, color: "#65676b" }} />} onClick={() => showNotSupportedMessage("Gọi điện")} />
                </Tooltip>
                <Tooltip title="Gọi Video">
                  <Button type="text" shape="circle" icon={<VideoCameraOutlined style={{ fontSize: 18, color: "#65676b" }} />} onClick={() => showNotSupportedMessage("Gọi Video")} />
                </Tooltip>
                <Tooltip title={showRightPanel ? "Ẩn thông tin" : "Hiện thông tin"}>
                  <Button
                    type="text"
                    shape="circle"
                    icon={<InfoCircleOutlined style={{ fontSize: 18, color: showRightPanel ? "#7F00FD" : "#65676b" }} />}
                    onClick={() => setShowRightPanel(!showRightPanel)}
                  />
                </Tooltip>
              </div>
            </div>

            {/* Khung chứa các tin nhắn */}
            <div className="chat-messages-scroll">
              {loadingMsgs ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 24, margin: "auto" }}>
                  <Spin size="large" />
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMyMsg = msg.sender?._id === currentUser?._id;
                  const showSenderName = selectedConv.isGroup && !isMyMsg;
                  const seenAvatars = msg.seenBy
                    ? msg.seenBy
                      .filter((s) => s.user?._id !== msg.sender?._id)
                      .map((s) => s.user)
                    : [];

                  return (
                    <div
                      key={msg._id}
                      className={`chat-message-row ${isMyMsg ? "outgoing" : "incoming"}`}
                    >
                      {!isMyMsg && (
                        <Avatar
                          src={getMediaUrl(msg.sender?.avatar)}
                          size={32}
                          style={{ marginTop: 2, backgroundColor: "#7F00FD", fontWeight: "bold" }}
                        >
                          {msg.sender?.name?.[0].toUpperCase()}
                        </Avatar>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", maxWidth: "100%", alignItems: isMyMsg ? "flex-end" : "flex-start" }}>
                        {showSenderName && (
                          <span style={{ fontSize: 10, color: "#8c8c8c", marginBottom: 3, marginLeft: 2 }}>
                            {msg.sender?.name}
                          </span>
                        )}
                        <div className={`message-bubble ${isMyMsg ? "outgoing" : "incoming"} group`}>
                          {renderMessageContent(msg)}
                          <div className="message-time-inner">
                            {dayjs(msg.createdAt).format("HH:mm")}
                          </div>

                          {/* Action recall button */}
                          {isMyMsg && !msg.isRecalled && (
                            <div
                              style={{ position: "absolute", right: "102%", top: "50%", transform: "translateY(-50%)", transition: "opacity 0.2s ease" }}
                              className="opacity-0 group-hover:opacity-100"
                            >
                              <Tooltip title="Thu hồi tin nhắn">
                                <Button
                                  type="text"
                                  shape="circle"
                                  danger
                                  size="small"
                                  icon={<CloseOutlined style={{ fontSize: 10 }} />}
                                  onClick={() => handleRecallMessage(msg._id)}
                                />
                              </Tooltip>
                            </div>
                          )}
                        </div>

                        {/* Read/Seen Indicators */}
                        {index === messages.length - 1 && seenAvatars.length > 0 && (
                          <div style={{ display: "flex", gap: 3, marginTop: 4, justifyContent: isMyMsg ? "flex-end" : "flex-start" }}>
                            {seenAvatars.slice(0, 5).map((u) => (
                              <Tooltip key={u._id} title={`${u.name} đã xem`}>
                                <Avatar
                                  src={getMediaUrl(u.avatar)}
                                  size={14}
                                  style={{ border: "1px solid #ffffff", backgroundColor: "#7F00FD" }}
                                >
                                  {u.name[0].toUpperCase()}
                                </Avatar>
                              </Tooltip>
                            ))}
                            {seenAvatars.length > 5 && (
                              <span style={{ fontSize: 9, color: "gray" }}>+{seenAvatars.length - 5}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicators */}
              {typingUsers.length > 0 && (
                <div className="chat-message-row incoming" style={{ alignItems: "center" }}>
                  <Avatar size={32} style={{ backgroundColor: "#8c8c8c" }}>...</Avatar>
                  <div style={{ backgroundColor: "#ffffff", padding: "8px 12px", borderRadius: 16, borderBottomLeftRadius: 4, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8c8c8c" }}>
                    <span>
                      {typingUsers.map((u) => u.userName).join(", ")} đang nhập
                    </span>
                    <span className="flex gap-1 items-center">
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-300"></span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="chat-input-panel">
              {/* File list Staged Preview */}
              {fileList.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 8, backgroundColor: "#f9fafb", borderRadius: 8 }}>
                  {fileList.map((file, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", backgroundColor: "#ffffff", borderRadius: 6, fontSize: 11, border: "1px solid #edf0f4" }}>
                      <FileOutlined style={{ color: "#7F00FD" }} />
                      <span className="truncate" style={{ maxWidth: 120 }}>{file.name}</span>
                      <Button
                        type="text"
                        size="small"
                        danger
                        shape="circle"
                        icon={<CloseOutlined style={{ fontSize: 8 }} />}
                        onClick={() => setFileList((prev) => prev.filter((_, i) => i !== idx))}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="chat-input-row">
                {/* Upload Image */}
                <Upload
                  fileList={fileList}
                  beforeUpload={(file) => {
                    setFileList((prev) => [...prev, file]);
                    return false;
                  }}
                  showUploadList={false}
                  multiple
                >
                  <Tooltip title="Gửi ảnh/tệp tin">
                    <Button type="text" shape="circle" size="large" icon={<PaperClipOutlined style={{ fontSize: 20, color: "#65676b" }} />} />
                  </Tooltip>
                </Upload>

                {/* Stickers */}
                <Popover content={stickerPanel} title="Stickers" trigger="click" placement="topLeft">
                  <Tooltip title="Gửi sticker">
                    <Button type="text" shape="circle" size="large" icon={<PictureOutlined style={{ fontSize: 20, color: "#65676b" }} />} />
                  </Tooltip>
                </Popover>

                {/* Emoji */}
                <Popover content={emojiPanel} title="Emoji" trigger="click" placement="topLeft">
                  <Tooltip title="Chọn Emoji">
                    <Button type="text" shape="circle" size="large" icon={<SmileOutlined style={{ fontSize: 20, color: "#65676b" }} />} />
                  </Tooltip>
                </Popover>

                {/* Chat Input Field */}
                <Input
                  placeholder="Nhập tin nhắn..."
                  value={messageInput}
                  onChange={handleInputChange}
                  onPressEnter={() => handleSendMessage()}
                  className="chat-text-input"
                  size="large"
                />

                {/* Send Button */}
                <Button
                  type="primary"
                  shape="circle"
                  size="large"
                  icon={<SendOutlined style={{ fontSize: 16 }} />}
                  onClick={() => handleSendMessage()}
                  className="chat-send-btn"
                  disabled={!messageInput.trim() && fileList.length === 0}
                />
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, color: "gray" }}>
            <TeamOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />
            <h3 style={{ marginTop: 16, fontSize: 17, fontWeight: 700, color: "#1c1e21" }}>Chào mừng đến với Tegram Chat</h3>
            <p style={{ fontSize: 13, color: "gray" }}>Hãy chọn một cuộc hội thoại từ menu trái hoặc bắt đầu chat với bạn bè.</p>
            <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
              <Button type="primary" onClick={() => setIsNewChatModalOpen(true)} style={{ backgroundColor: "#7F00FD" }}>
                Nhắn tin mới
              </Button>
              <Button onClick={() => setIsGroupModalOpen(true)}>
                Tạo nhóm mới
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Cột 3: Right Sidebar (Thông tin chat) */}
      {selectedConv && showRightPanel && (
        <div className="chat-right-sidebar">
          <Avatar
            src={getMediaUrl(getConvDetails(selectedConv).avatar)}
            size={84}
            icon={selectedConv.isGroup ? <TeamOutlined /> : null}
            style={{ backgroundColor: "#7F00FD", fontWeight: "bold" }}
          >
            {getConvDetails(selectedConv).name[0].toUpperCase()}
          </Avatar>
          <h3 className="right-sidebar-name">
            {getConvDetails(selectedConv).name}
          </h3>
          <div className="right-sidebar-status">
            {selectedConv.isGroup
              ? `${selectedConv.participants.length} thành viên`
              : getConvDetails(selectedConv).isOnline
                ? "Đang hoạt động"
                : "Ngoại tuyến"}
          </div>

          {/* Hàng 3 icon tròn: Link trang cá nhân, Chuông thông báo, Tìm kiếm */}
          <div className="right-sidebar-actions-row">
            {!selectedConv.isGroup && getConvDetails(selectedConv).userId && (
              <Tooltip title="Trang cá nhân">
                <Button
                  shape="circle"
                  className="right-sidebar-action-btn"
                  icon={<UserOutlined />}
                  onClick={() => navigate(`/profile/${getConvDetails(selectedConv).userId}`)}
                />
              </Tooltip>
            )}
            <Tooltip title="Tắt thông báo">
              <Button
                shape="circle"
                className="right-sidebar-action-btn"
                icon={<BellOutlined />}
                onClick={() => showNotSupportedMessage("Tắt thông báo")}
              />
            </Tooltip>
            <Tooltip title="Tìm kiếm tin nhắn">
              <Button
                shape="circle"
                className="right-sidebar-action-btn"
                icon={<SearchOutlined />}
                onClick={() => showNotSupportedMessage("Tìm kiếm tin nhắn")}
              />
            </Tooltip>
          </div>

          {/* File phương tiện */}
          <div className="right-sidebar-section">
            <div className="right-sidebar-section-title">
              File phương tiện ({
                messages.filter((msg) => !msg.isRecalled && (msg.type === "image" || msg.type === "video")).flatMap((msg) => msg.attachments).length
              })
            </div>
            {(() => {
              const media = messages
                .filter((msg) => !msg.isRecalled && (msg.type === "image" || msg.type === "video"))
                .flatMap((msg) => msg.attachments);

              if (media.length === 0) {
                return <div style={{ fontSize: 12, color: "gray", padding: "4px 0", textAlign: "center" }}>Chưa có hình ảnh/video</div>;
              }

              return (
                <div className="right-sidebar-media-grid">
                  {media.map((att, idx) => (
                    <div
                      key={idx}
                      className="right-sidebar-media-item"
                      onClick={() => {
                        Modal.info({
                          title: att.filename,
                          width: 800,
                          content: (
                            <div style={{ display: "flex", justifyContent: "center", padding: 8, backgroundColor: "#000" }}>
                              {att.mimetype?.startsWith("video/") ? (
                                <video src={getMediaUrl(att.url)} controls style={{ maxWidth: "100%", maxHeight: "70vh" }} />
                              ) : (
                                <img src={getMediaUrl(att.url)} alt={att.filename} style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }} />
                              )}
                            </div>
                          ),
                          icon: null,
                          okText: "Đóng",
                        });
                      }}
                    >
                      {att.mimetype?.startsWith("video/") ? (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 9 }}>
                          Video
                        </div>
                      ) : (
                        <img src={getMediaUrl(att.url)} alt={att.filename} />
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Files / Tài liệu */}
          <div className="right-sidebar-section">
            <div className="right-sidebar-section-title">
              File / Tài liệu ({
                messages
                  .filter((msg) => !msg.isRecalled && msg.type === "file")
                  .flatMap((msg) => msg.attachments)
                  .filter((att) => !att.mimetype?.startsWith("image/") && !att.mimetype?.startsWith("video/")).length
              })
            </div>
            {(() => {
              const docs = messages
                .filter((msg) => !msg.isRecalled && msg.type === "file")
                .flatMap((msg) => msg.attachments)
                .filter((att) => !att.mimetype?.startsWith("image/") && !att.mimetype?.startsWith("video/"));

              if (docs.length === 0) {
                return <div style={{ fontSize: 12, color: "gray", padding: "4px 0", textAlign: "center" }}>Chưa có tài liệu</div>;
              }

              return (
                <div className="right-sidebar-file-list">
                  {docs.map((att, idx) => (
                    <a
                      key={idx}
                      href={getMediaUrl(att.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="right-sidebar-file-item"
                    >
                      <FileOutlined style={{ color: "#7F00FD", fontSize: 16 }} />
                      <span className="truncate" style={{ flex: 1 }}>{att.filename}</span>
                    </a>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Management Actions */}
          {!selectedConv.isGroup && getConvDetails(selectedConv).userId && (
            <div className="right-sidebar-section" style={{ marginTop: 12 }}>
              <div className="right-sidebar-management-menu">
                <button
                  className="right-sidebar-menu-btn"
                  onClick={() => showNotSupportedMessage("Hạn chế")}
                >
                  <StopOutlined />
                  <span>Hạn chế</span>
                </button>
                <button
                  className="right-sidebar-menu-btn danger"
                  onClick={() => handleBlockUser(getConvDetails(selectedConv).userId)}
                >
                  <StopOutlined />
                  <span>Chặn</span>
                </button>
                <button
                  className="right-sidebar-menu-btn danger"
                  onClick={() => handleReportUser(getConvDetails(selectedConv).userId)}
                >
                  <FlagOutlined />
                  <span>Báo cáo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal 1-1 Chat Selection */}
      <Modal
        title="Nhắn tin với bạn bè"
        open={isNewChatModalOpen}
        onCancel={() => setIsNewChatModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <List
          dataSource={friends}
          renderItem={(friend) => (
            <List.Item
              className="cursor-pointer hover:bg-gray-50 px-4 rounded transition-colors"
              onClick={() => handleStartNewChat(friend._id)}
              style={{ cursor: "pointer" }}
            >
              <List.Item.Meta
                avatar={<Avatar src={getMediaUrl(friend.avatar)}>{friend.name[0].toUpperCase()}</Avatar>}
                title={friend.name}
                description={friend.email}
              />
            </List.Item>
          )}
          locale={{ emptyText: "Chưa có người bạn nào. Hãy kết bạn trước!" }}
        />
      </Modal>

      {/* Modal Group Chat Creation */}
      <Modal
        title="Tạo nhóm chat mới"
        open={isGroupModalOpen}
        onOk={handleCreateGroup}
        onCancel={() => {
          setIsGroupModalOpen(false);
          setGroupName("");
          setSelectedFriends([]);
        }}
        okText="Tạo nhóm"
        cancelText="Hủy"
        destroyOnClose
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 0" }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: "bold", color: "#8c8c8c", marginBottom: 6 }}>TÊN NHÓM CHAT</label>
            <Input
              placeholder="Nhập tên nhóm..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: "bold", color: "#8c8c8c", marginBottom: 6 }}>CHỌN THÀNH VIÊN (ÍT NHẤT 2 NGƯỜI BẠN)</label>
            <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid #edf0f4", borderRadius: 8, padding: 8 }}>
              <Checkbox.Group
                value={selectedFriends}
                onChange={setSelectedFriends}
                style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}
              >
                {friends.map((friend) => (
                  <div key={friend._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px" }} className="hover:bg-gray-50 rounded">
                    <Checkbox value={friend._id} />
                    <Avatar src={getMediaUrl(friend.avatar)} size={28} style={{ marginLeft: 4 }}>
                      {friend.name[0].toUpperCase()}
                    </Avatar>
                    <span style={{ fontSize: 14, marginLeft: 4 }}>{friend.name}</span>
                  </div>
                ))}
              </Checkbox.Group>
              {friends.length === 0 && (
                <div style={{ textAlign: "center", padding: 16, color: "gray", fontSize: 12 }}>
                  Không tìm thấy bạn bè nào để tạo nhóm.
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChatPage;
