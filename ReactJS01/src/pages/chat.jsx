import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Layout,
  List,
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
} from "antd";
import {
  SendOutlined,
  PaperClipOutlined,
  SmileOutlined,
  UsergroupAddOutlined,
  DeleteOutlined,
  PictureOutlined,
  FileOutlined,
  CheckOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  MessageOutlined,
  TeamOutlined,
  CloseOutlined,
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
} from "../util/api";

dayjs.extend(relativeTime);
dayjs.locale("vi");

const { Sidebar, Content } = Layout;

// Static animated Noto Emojis for stickers
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

const ChatPage = () => {
  const currentUser = useSelector((state) => state.auth.user);
  const { socket, onlineUsers } = useSocket();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showRightPanel, setShowRightPanel] = useState(false);

  // Create Group Modal
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState([]);

  // Create 1-1 Chat Modal
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // File Upload state
  const [fileList, setFileList] = useState([]);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  // Initial fetch conversations and friends list
  useEffect(() => {
    fetchConversations();
    fetchFriends();
  }, []);

  // Socket listener setup
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      const isCurrent =
        selectedConv &&
        (message.conversation === selectedConv._id ||
          message.conversation._id === selectedConv._id);

      if (isCurrent) {
        setMessages((prev) => {
          // Tránh bị duplicate tin nhắn
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        // Đánh dấu đã xem trên server
        markSeenApi(selectedConv._id);
        // Phát socket đã xem tin nhắn
        socket.emit("message_seen", selectedConv._id);
      }

      // Cập nhật cuộc hội thoại ở sidebar
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
            return {
              ...c,
              lastMessage: recalledMsg,
            };
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

  // Join/leave rooms when active conversation changes
  useEffect(() => {
    if (!socket || !selectedConv) return;

    socket.emit("join_room", selectedConv._id);

    // Đánh dấu đã xem
    markSeenApi(selectedConv._id);
    socket.emit("message_seen", selectedConv._id);

    return () => {
      socket.emit("leave_room", selectedConv._id);
    };
  }, [socket, selectedConv?._id]);

  const fetchConversations = async () => {
    setLoadingConv(true);
    const res = await getConversationsApi();
    if (res && res.EC === 0) {
      setConversations(res.data || []);
    } else {
      antdMessage.error(res?.EM || "Không thể lấy danh sách cuộc trò chuyện");
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

  // Chat Input Typing events
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

  // Send message handler
  const handleSendMessage = async (payloadOverride = {}) => {
    if (!selectedConv) return;

    // Nếu không có nội dung và không có file đính kèm/sticker
    if (!messageInput.trim() && fileList.length === 0 && !payloadOverride.sticker) {
      return;
    }

    // Stop typing
    if (isTyping && socket) {
      setIsTyping(false);
      socket.emit("stop_typing", { conversationId: selectedConv._id });
    }

    try {
      let res;

      if (fileList.length > 0) {
        // Gửi file đính kèm bằng FormData
        const formData = new FormData();
        formData.append("content", messageInput);
        // Bỏ type: "file" để backend tự động nhận diện đúng loại tệp tin
        fileList.forEach((file) => {
          formData.append("attachments", file.originFileObj || file);
        });

        // Tạm thời hiển thị loading cho user biết
        const hideLoading = antdMessage.loading("Đang gửi tệp tin...", 0);
        res = await sendMessageApi(selectedConv._id, formData);
        hideLoading();
      } else {
        // Gửi tin nhắn text hoặc sticker thông thường bằng JSON
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

  // Send Sticker handler
  const handleSendSticker = (stickerUrl) => {
    handleSendMessage({ sticker: stickerUrl });
  };

  // Append emoji to text input
  const handleEmojiClick = (emoji) => {
    setMessageInput((prev) => prev + emoji);
  };

  // Recall message handler
  const handleRecallMessage = async (messageId) => {
    const res = await recallMessageApi(messageId);
    if (res && res.EC === 0) {
      antdMessage.success("Tin nhắn đã được thu hồi");
    } else {
      antdMessage.error(res?.EM || "Không thể thu hồi tin nhắn");
    }
  };

  // Create new conversation
  const handleStartNewChat = async (friendId) => {
    setIsNewChatModalOpen(false);
    const res = await createConversationApi({
      isGroup: false,
      participants: [friendId],
    });

    if (res && res.EC === 0) {
      const newConv = res.data;
      // Add to list if not exist
      setConversations((prev) => {
        if (prev.some((c) => c._id === newConv._id)) return prev;
        return [newConv, ...prev];
      });
      selectConversation(newConv);
    } else {
      antdMessage.error(res?.EM || "Không thể tạo cuộc trò chuyện");
    }
  };

  // Create new Group conversation
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

  // Helper: Get conversation displayName and avatar
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
    };
  };

  // Helpers to render message content
  const renderMessageContent = (msg) => {
    if (msg.isRecalled) {
      return <span style={{ fontStyle: "italic", color: "#8c8c8c" }}>{msg.content}</span>;
    }

    switch (msg.type) {
      case "sticker":
        return <img src={msg.sticker} alt="sticker" style={{ maxWidth: 120, height: "auto" }} />;
      case "image":
        return (
          <div className="flex flex-col gap-2">
            {msg.content && <div>{msg.content}</div>}
            <div className="grid grid-cols-1 gap-1 max-w-sm rounded-lg overflow-hidden border border-gray-100">
              {msg.attachments.map((att) => (
                <img
                  key={att._id}
                  src={getMediaUrl(att.url)}
                  alt={att.filename}
                  className="w-full object-cover max-h-60 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    Modal.info({
                      title: att.filename,
                      width: 800,
                      content: (
                        <div className="flex justify-center p-2 bg-black rounded">
                          <img src={getMediaUrl(att.url)} alt={att.filename} className="max-w-full max-h-[70vh] object-contain" />
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
          <div className="flex flex-col gap-2">
            {msg.content && <div>{msg.content}</div>}
            {msg.attachments.map((att) => (
              <video
                key={att._id}
                src={getMediaUrl(att.url)}
                controls
                className="max-w-xs rounded-lg border border-gray-200"
              />
            ))}
          </div>
        );
      case "file":
        return (
          <div className="flex flex-col gap-2">
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
                    className="max-w-xs max-h-40 object-cover rounded border"
                  />
                );
              }
              if (isVid) {
                return (
                  <video
                    key={att._id}
                    src={getMediaUrl(att.url)}
                    controls
                    className="max-w-xs rounded border"
                  />
                );
              }

              return (
                <a
                  key={att._id}
                  href={getMediaUrl(att.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg hover:bg-gray-100 border transition-all text-inherit font-medium max-w-xs"
                >
                  <FileOutlined className="text-xl text-blue-500" />
                  <div className="flex-1 overflow-hidden">
                    <div className="text-xs truncate">{att.filename}</div>
                    <div className="text-[10px] text-gray-400">Tải xuống tệp tin</div>
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

  // Sticker Panel Component
  const stickerPanel = (
    <div className="grid grid-cols-5 gap-2 p-2 max-w-xs max-h-60 overflow-y-auto">
      {STICKERS.map((sticker) => (
        <Tooltip key={sticker.id} title={sticker.name}>
          <img
            src={sticker.url}
            alt={sticker.name}
            className="w-12 h-12 object-contain cursor-pointer hover:scale-110 transition-transform"
            onClick={() => handleSendSticker(sticker.url)}
          />
        </Tooltip>
      ))}
    </div>
  );

  // Emoji Panel Component
  const emojiPanel = (
    <div className="grid grid-cols-8 gap-1 p-2 max-w-sm max-h-60 overflow-y-auto">
      {EMOJIS.map((emoji, idx) => (
        <span
          key={idx}
          className="text-2xl p-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-all text-center"
          onClick={() => handleEmojiClick(emoji)}
        >
          {emoji}
        </span>
      ))}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-100 dark:bg-zinc-900 overflow-hidden">
      {/* Sidebar - Hộp chat */}
      <div className="w-80 md:w-96 flex flex-col bg-white border-r border-gray-200 dark:bg-zinc-800 dark:border-zinc-700 flex-shrink-0">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-700 flex justify-between items-center">
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <MessageOutlined className="text-blue-500" />
            Nhắn tin
          </h2>
          <div className="flex gap-2">
            <Tooltip title="Tạo chat mới">
              <Button
                type="text"
                shape="circle"
                icon={<MessageOutlined />}
                onClick={() => setIsNewChatModalOpen(true)}
              />
            </Tooltip>
            <Tooltip title="Tạo nhóm chat">
              <Button
                type="text"
                shape="circle"
                icon={<UsergroupAddOutlined />}
                onClick={() => setIsGroupModalOpen(true)}
              />
            </Tooltip>
          </div>
        </div>

        {/* Danh sách các phòng chat */}
        <div className="flex-1 overflow-y-auto">
          {loadingConv ? (
            <div className="flex justify-center p-8">
              <Spin />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center p-8 text-gray-400">
              Chưa có cuộc trò chuyện nào. Bấm nút tạo chat mới để bắt đầu.
            </div>
          ) : (
            <List
              dataSource={conversations}
              renderItem={(conv) => {
                const details = getConvDetails(conv);
                const isSelected = selectedConv && selectedConv._id === conv._id;

                // Xem có tin nhắn chưa đọc hay không
                // Trực quan: nếu tin nhắn cuối không rỗng, không phải do mình gửi, và mình chưa nằm trong seenBy
                const hasUnread =
                  conv.lastMessage &&
                  conv.lastMessage.sender?._id !== currentUser?._id &&
                  !conv.lastMessage.seenBy?.some(
                    (s) => (s.user?._id || s.user) === currentUser?._id
                  );

                return (
                  <List.Item
                    className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-all border-b border-gray-50 ${isSelected ? "bg-blue-50/70 hover:bg-blue-50" : ""
                      }`}
                    onClick={() => selectConversation(conv)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Badge dot={details.isOnline} color="green" offset={[-2, 38]}>
                        <Avatar
                          src={getMediaUrl(details.avatar)}
                          size={46}
                          icon={conv.isGroup ? <TeamOutlined /> : null}
                          className="bg-blue-500 text-white"
                        >
                          {details.name[0]}
                        </Avatar>
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className={`font-semibold text-sm truncate ${hasUnread ? "text-black font-bold" : "text-gray-800"}`}>
                            {details.name}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {conv.lastMessage
                              ? dayjs(conv.lastMessage.createdAt).fromNow(true)
                              : ""}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs truncate ${hasUnread ? "text-blue-500 font-medium" : "text-gray-500"}`}>
                            {conv.lastMessage
                              ? conv.lastMessage.isRecalled
                                ? "Tin nhắn đã bị thu hồi"
                                : conv.lastMessage.sender?._id === currentUser?._id
                                  ? `Bạn: ${conv.lastMessage.content || "[Đính kèm]"}`
                                  : conv.lastMessage.content || "[Đính kèm]"
                              : "Chưa có tin nhắn"}
                          </span>
                          {hasUnread && (
                            <Badge status="processing" color="blue" />
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

      {/* Main chat window */}
      <div className="flex flex-col flex-1 bg-gray-50 dark:bg-zinc-900 min-w-0">
        {selectedConv ? (
          <>
            {/* Header phòng chat */}
            <div className="h-16 px-6 bg-white border-b border-gray-200 dark:bg-zinc-800 dark:border-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge dot={getConvDetails(selectedConv).isOnline} color="green">
                  <Avatar
                    src={getMediaUrl(getConvDetails(selectedConv).avatar)}
                    size={40}
                    icon={selectedConv.isGroup ? <TeamOutlined /> : null}
                    className="bg-blue-500 text-white"
                  >
                    {getConvDetails(selectedConv).name[0]}
                  </Avatar>
                </Badge>
                <div>
                  <h3 className="font-semibold text-sm text-gray-800 dark:text-white">
                    {getConvDetails(selectedConv).name}
                  </h3>
                  <span className="text-xs text-gray-400">
                    {selectedConv.isGroup
                      ? `${selectedConv.participants.length} thành viên`
                      : getConvDetails(selectedConv).isOnline
                        ? "Đang hoạt động"
                        : "Ngoại tuyến"}
                  </span>
                </div>
              </div>

              <div>
                <Tooltip title="Thông tin cuộc trò chuyện">
                  <Button
                    type={showRightPanel ? "primary" : "text"}
                    shape="circle"
                    icon={<InfoCircleOutlined />}
                    onClick={() => setShowRightPanel(!showRightPanel)}
                  />
                </Tooltip>
              </div>
            </div>

            {/* Khung tin nhắn */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {loadingMsgs ? (
                <div className="flex justify-center p-8 my-auto">
                  <Spin size="large" />
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMyMsg = msg.sender?._id === currentUser?._id;
                  const showSenderName = selectedConv.isGroup && !isMyMsg;

                  // Lấy avatar của những người đã xem tin nhắn này (ngoại trừ người gửi)
                  const seenAvatars = msg.seenBy
                    ? msg.seenBy
                      .filter((s) => s.user?._id !== msg.sender?._id)
                      .map((s) => s.user)
                    : [];

                  return (
                    <div
                      key={msg._id}
                      className={`flex gap-3 max-w-[70%] ${isMyMsg ? "self-end flex-row-reverse" : "self-start"
                        }`}
                    >
                      {!isMyMsg && (
                        <Avatar
                          src={getMediaUrl(msg.sender?.avatar)}
                          size={32}
                          className="mt-1"
                        >
                          {msg.sender?.name?.[0]}
                        </Avatar>
                      )}
                      <div className="flex flex-col">
                        {showSenderName && (
                          <span className="text-[11px] text-gray-400 mb-1 ml-1">
                            {msg.sender?.name}
                          </span>
                        )}
                        <div
                          className={`p-3 rounded-2xl shadow-sm text-sm relative group transition-all ${isMyMsg
                            ? "bg-blue-500 text-white rounded-tr-none"
                            : "bg-white text-gray-800 dark:bg-zinc-800 dark:text-white rounded-tl-none"
                            }`}
                        >
                          {renderMessageContent(msg)}

                          <div className="text-[9px] text-gray-300 text-right mt-1">
                            {dayjs(msg.createdAt).format("HH:mm")}
                          </div>

                          {/* Hover action to recall message (only for my messages & not recalled yet) */}
                          {isMyMsg && !msg.isRecalled && (
                            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Tooltip title="Thu hồi tin nhắn">
                                <Button
                                  type="text"
                                  shape="circle"
                                  danger
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  onClick={() => handleRecallMessage(msg._id)}
                                />
                              </Tooltip>
                            </div>
                          )}
                        </div>

                        {/* Seen indicators (small avatars) under the latest message */}
                        {index === messages.length - 1 && seenAvatars.length > 0 && (
                          <div className={`flex gap-1 mt-1 ${isMyMsg ? "justify-end" : "justify-start"}`}>
                            {seenAvatars.slice(0, 5).map((u) => (
                              <Tooltip key={u._id} title={`${u.name} đã xem`}>
                                <Avatar
                                  src={getMediaUrl(u.avatar)}
                                  size={14}
                                  className="border border-white"
                                >
                                  {u.name[0]}
                                </Avatar>
                              </Tooltip>
                            ))}
                            {seenAvatars.length > 5 && (
                              <span className="text-[10px] text-gray-400">
                                +{seenAvatars.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="flex gap-3 max-w-[70%] self-start items-center">
                  <Avatar size={32} className="bg-gray-300">
                    ...
                  </Avatar>
                  <div className="bg-white dark:bg-zinc-800 px-4 py-2 rounded-2xl rounded-tl-none text-xs text-gray-500 shadow-sm flex items-center gap-2">
                    <span>
                      {typingUsers.map((u) => u.userName).join(", ")}{" "}
                      {typingUsers.length === 1 ? "đang nhập" : "đang nhập"}
                    </span>
                    <span className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-300"></span>
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input panel - Gửi tin nhắn */}
            <div className="p-4 bg-white border-t border-gray-200 dark:bg-zinc-800 dark:border-zinc-700 flex flex-col gap-2">
              {/* File list preview */}
              {fileList.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-zinc-900 rounded-lg">
                  {fileList.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg text-xs shadow-sm">
                      <FileOutlined className="text-blue-500" />
                      <span className="max-w-[150px] truncate">{file.name}</span>
                      <Button
                        type="text"
                        size="small"
                        danger
                        shape="circle"
                        icon={<CloseOutlined style={{ fontSize: 10 }} />}
                        onClick={() => {
                          setFileList((prev) => prev.filter((_, i) => i !== idx));
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                {/* File Upload button */}
                <Upload
                  fileList={fileList}
                  beforeUpload={(file) => {
                    setFileList((prev) => [...prev, file]);
                    return false; // Prevent automatic upload
                  }}
                  showUploadList={false}
                  multiple
                >
                  <Tooltip title="Đính kèm ảnh/video/file">
                    <Button type="text" shape="circle" size="large" icon={<PaperClipOutlined />} />
                  </Tooltip>
                </Upload>

                {/* Sticker Popover */}
                <Popover content={stickerPanel} title="Stickers" trigger="click" placement="topLeft">
                  <Tooltip title="Gửi Sticker">
                    <Button type="text" shape="circle" size="large" icon={<PictureOutlined />} />
                  </Tooltip>
                </Popover>

                {/* Emoji Popover */}
                <Popover content={emojiPanel} title="Emoji" trigger="click" placement="topLeft">
                  <Tooltip title="Chọn Emoji">
                    <Button type="text" shape="circle" size="large" icon={<SmileOutlined />} />
                  </Tooltip>
                </Popover>

                {/* Chat Input */}
                <Input
                  placeholder="Nhập tin nhắn..."
                  value={messageInput}
                  onChange={handleInputChange}
                  onPressEnter={() => handleSendMessage()}
                  className="rounded-full py-2 px-4 border-gray-200"
                  size="large"
                />

                {/* Send Button */}
                <Button
                  type="primary"
                  shape="circle"
                  size="large"
                  icon={<SendOutlined />}
                  onClick={() => handleSendMessage()}
                  disabled={!messageInput.trim() && fileList.length === 0}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
            <MessageOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />
            <h3 className="mt-4 text-lg font-medium">Chào mừng đến với Tegram Chat</h3>
            <p className="text-sm">Hãy chọn một cuộc hội thoại hoặc bắt đầu chat với bạn bè.</p>
            <div className="mt-4 flex gap-3">
              <Button type="primary" icon={<MessageOutlined />} onClick={() => setIsNewChatModalOpen(true)}>
                Nhắn tin mới
              </Button>
              <Button icon={<TeamOutlined />} onClick={() => setIsGroupModalOpen(true)}>
                Tạo nhóm chat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Thanh thông tin cuộc trò chuyện bên phải (Info Sidebar) */}
      {selectedConv && showRightPanel && (
        <div className="w-72 md:w-80 flex-shrink-0 flex flex-col bg-white dark:bg-zinc-800 border-l border-gray-200 dark:border-zinc-700 p-6 overflow-y-auto items-center text-center">
          <Avatar
            src={getMediaUrl(getConvDetails(selectedConv).avatar)}
            size={84}
            icon={selectedConv.isGroup ? <TeamOutlined /> : null}
            className="bg-blue-500 text-white mb-4"
          >
            {getConvDetails(selectedConv).name[0]}
          </Avatar>
          <h3 className="font-bold text-base text-gray-800 dark:text-white mb-1">
            {getConvDetails(selectedConv).name}
          </h3>
          <div className="text-xs text-gray-400 mb-6">
            {selectedConv.isGroup
              ? `${selectedConv.participants.length} thành viên`
              : getConvDetails(selectedConv).isOnline
                ? "Đang hoạt động"
                : "Ngoại tuyến"}
          </div>

          {!selectedConv.isGroup && (
            <Button
              type="primary"
              ghost
              className="w-full mb-6 rounded-full"
              onClick={() => {
                const otherUser = selectedConv.participants.find((p) => p._id !== currentUser?._id);
                if (otherUser) {
                  navigate(`/profile/${otherUser._id}`);
                }
              }}
            >
              Xem trang cá nhân
            </Button>
          )}

          {/* Media section */}
          <div className="w-full mb-6 text-left">
            <div className="font-semibold text-sm text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-zinc-700 pb-2 mb-3">
              File phương tiện ({
                messages.filter((msg) => !msg.isRecalled && (msg.type === "image" || msg.type === "video")).flatMap((msg) => msg.attachments).length
              })
            </div>
            {(() => {
              const media = messages
                .filter((msg) => !msg.isRecalled && (msg.type === "image" || msg.type === "video"))
                .flatMap((msg) => msg.attachments);

              if (media.length === 0) {
                return <div className="text-xs text-gray-400 py-1 text-center">Chưa có ảnh/video</div>;
              }

              return (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {media.map((att, idx) => (
                    <div
                      key={idx}
                      className="aspect-square rounded overflow-hidden bg-gray-100 dark:bg-zinc-700 border dark:border-zinc-600 relative group cursor-pointer"
                      onClick={() => {
                        Modal.info({
                          title: att.filename,
                          width: 800,
                          content: (
                            <div className="flex justify-center p-2 bg-black rounded">
                              {att.mimetype?.startsWith("video/") ? (
                                <video src={getMediaUrl(att.url)} controls className="max-w-full max-h-[70vh]" />
                              ) : (
                                <img src={getMediaUrl(att.url)} alt={att.filename} className="max-w-full max-h-[70vh] object-contain" />
                              )}
                            </div>
                          ),
                          icon: null,
                          okText: "Đóng",
                        });
                      }}
                    >
                      {att.mimetype?.startsWith("video/") ? (
                        <div className="w-full h-full flex items-center justify-center bg-black/60 text-white text-[9px]">
                          Video
                        </div>
                      ) : (
                        <img src={getMediaUrl(att.url)} alt={att.filename} className="w-full h-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Documents section */}
          <div className="w-full text-left">
            <div className="font-semibold text-sm text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-zinc-700 pb-2 mb-3">
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
                return <div className="text-xs text-gray-400 py-1 text-center">Chưa có tài liệu</div>;
              }

              return (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {docs.map((att, idx) => (
                    <a
                      key={idx}
                      href={getMediaUrl(att.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 border dark:border-zinc-700 text-gray-700 dark:text-gray-200 text-xs rounded transition-all truncate"
                    >
                      <FileOutlined className="text-blue-500 flex-shrink-0" />
                      <span className="truncate flex-1">{att.filename}</span>
                    </a>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal 1-1 Chat */}
      <Modal
        title="Nhắn tin với bạn bè"
        open={isNewChatModalOpen}
        onCancel={() => setIsNewChatModalOpen(false)}
        footer={null}
        destroyOnHidden={true}
      >
        <List
          dataSource={friends}
          renderItem={(friend) => (
            <List.Item
              className="cursor-pointer hover:bg-gray-50 px-4 rounded transition-colors"
              onClick={() => handleStartNewChat(friend._id)}
            >
              <List.Item.Meta
                avatar={<Avatar src={getMediaUrl(friend.avatar)}>{friend.name[0]}</Avatar>}
                title={friend.name}
                description={friend.email}
              />
            </List.Item>
          )}
          locale={{ emptyText: "Chưa có người bạn nào. Hãy kết bạn trước!" }}
        />
      </Modal>

      {/* Modal Group Chat */}
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
        destroyOnHidden={true}
      >
        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">TÊN NHÓM CHAT</label>
            <Input
              placeholder="Nhập tên nhóm..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">CHỌN THÀNH VIÊN (ÍT NHẤT 2 NGƯỜI BẠN)</label>
            <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg p-2">
              <Checkbox.Group
                value={selectedFriends}
                onChange={setSelectedFriends}
                className="w-full flex flex-col gap-2"
              >
                {friends.map((friend) => (
                  <div key={friend._id} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded">
                    <Checkbox value={friend._id} />
                    <Avatar src={getMediaUrl(friend.avatar)} size={28} className="ml-1">
                      {friend.name[0]}
                    </Avatar>
                    <span className="text-sm ml-1">{friend.name}</span>
                  </div>
                ))}
              </Checkbox.Group>
              {friends.length === 0 && (
                <div className="text-center p-4 text-gray-400 text-xs">
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
