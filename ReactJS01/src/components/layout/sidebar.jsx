import { useEffect, useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Avatar, Badge, Button, Drawer, List, Modal, Input, AutoComplete, message, Typography } from "antd";
import {
  HomeOutlined,
  SearchOutlined,
  BellOutlined,
  MessageOutlined,
  BookOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  LikeFilled,
  CommentOutlined,
  RetweetOutlined,
  PushpinOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { logout } from "../../Redux/authSlice";
import { getMediaUrl } from "../../util/media";
import {
  getNotificationsApi,
  getPushPublicKeyApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  searchApi,
  subscribePushApi,
} from "../../util/api";
import { useSocket } from "../context/socket.context";
import {
  enableBrowserPush,
  getNotificationTargetUrl,
  showLocalNotification,
} from "../../util/notification";

const notificationText = {
  post_mention: "đã nhắc đến bạn trong một bài viết",
  comment_mention: "đã nhắc đến bạn trong bình luận",
  post_reaction: "đã react bài viết của bạn",
  post_comment: "đã bình luận bài viết của bạn",
  comment_reply: "đã trả lời bình luận của bạn",
  post_share: "đã chia sẻ bài viết của bạn",
  follow: "đã theo dõi bạn",
  friend_request: "đã gửi lời mời kết bạn",
  friend_accept: "đã chấp nhận lời mời kết bạn",
  new_message: "đã gửi tin nhắn mới",
  report_received: "có báo cáo mới",
};

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { socket } = useSocket();
  
  // States
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushLoading, setPushLoading] = useState(false);

  // Search Autocomplete Suggestion Logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await searchApi(searchQuery);
        if (res?.EC === 0) {
          const { users = [], posts = [], groups = [], hashtags = [] } = res.data || {};
          const options = [];

          if (users.length > 0) {
            options.push({
              label: <span style={{ fontWeight: "bold", color: "#8c8c8c" }}>Mọi người</span>,
              options: users.slice(0, 3).map((u) => ({
                value: u.name,
                key: `user-${u._id}`,
                label: (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                    onClick={() => {
                      setSearchOpen(false);
                      navigate(`/profile/${u._id}`);
                    }}
                  >
                    <Avatar size="small" src={getMediaUrl(u.avatar)} />
                    <span>{u.name}</span>
                  </div>
                ),
              })),
            });
          }

          if (groups.length > 0) {
            options.push({
              label: <span style={{ fontWeight: "bold", color: "#8c8c8c" }}>Nhóm</span>,
              options: groups.slice(0, 3).map((g) => ({
                value: g.name,
                key: `group-${g._id}`,
                label: (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                    onClick={() => {
                      setSearchOpen(false);
                      navigate(`/search?q=${encodeURIComponent(g.name)}&tab=groups`);
                    }}
                  >
                    <Avatar size="small" shape="square" src={g.avatar || ""} icon={<TeamOutlined />} />
                    <span>{g.name}</span>
                  </div>
                ),
              })),
            });
          }

          if (hashtags.length > 0) {
            options.push({
              label: <span style={{ fontWeight: "bold", color: "#8c8c8c" }}>Hashtag</span>,
              options: hashtags.slice(0, 3).map((h) => ({
                value: h.name,
                key: `hash-${h.name}`,
                label: (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                    onClick={() => {
                      setSearchOpen(false);
                      navigate(`/search?q=${encodeURIComponent(h.name)}`);
                    }}
                  >
                    <span style={{ color: "#7F00FD" }}>{h.name}</span>
                    <span style={{ fontSize: "11px", color: "gray" }}>({h.count} bài đăng)</span>
                  </div>
                ),
              })),
            });
          }

          options.push({
            label: (
              <div
                style={{
                  textAlign: "center",
                  padding: "4px 0",
                  fontWeight: "bold",
                  color: "#7F00FD",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setSearchOpen(false);
                  navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                }}
              >
                Xem tất cả kết quả cho "{searchQuery}"
              </div>
            ),
            options: [],
          });

          setSuggestions(options);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, navigate]);

  const handleSearchSubmit = (value) => {
    if (value && value.trim()) {
      setSearchOpen(false);
      navigate(`/search?q=${encodeURIComponent(value.trim())}`);
    }
  };

  // Notification Polling Logic
  const refreshNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await getNotificationsApi();
      if (res?.EC === 0) {
        setNotifications(res.data || []);
        setUnreadCount(res.unread || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshNotifications();
    if (!isAuthenticated) return undefined;
    const timer = window.setInterval(refreshNotifications, 10000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleNewNotification = ({ notification, unread }) => {
      const enriched = {
        ...notification,
        text: notificationText[notification.type] || notification.type,
      };
      setNotifications((prev) => [
        enriched,
        ...prev.filter((item) => item._id !== enriched._id),
      ]);
      setUnreadCount(unread || 0);
      showLocalNotification(enriched);
    };

    socket.on("notification:new", handleNewNotification);
    return () => socket.off("notification:new", handleNewNotification);
  }, [socket]);

  const handleReadNotification = async (item) => {
    try {
      await markNotificationReadApi(item._id);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === item._id
            ? { ...notification, readAt: notification.readAt || new Date().toISOString() }
            : notification,
        ),
      );
      setUnreadCount((prev) => Math.max(prev - (item.readAt ? 0 : 1), 0));
    } catch (err) {
      console.error(err);
    }
    setNotificationOpen(false);
    navigate(getNotificationTargetUrl(item));
  };

  const handleEnablePush = async () => {
    try {
      setPushLoading(true);
      const res = await enableBrowserPush({ getPushPublicKeyApi, subscribePushApi });
      message.success(res?.EM || "Đã bật push notification");
    } catch (err) {
      message.warning(err.message || "Không thể bật push notification");
    } finally {
      setPushLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsReadApi();
      await refreshNotifications();
      message.success("Đã đánh dấu đọc tất cả thông báo");
    } catch (err) {
      console.error(err);
    }
  };

  // Logout Logic
  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
    message.success("Đăng xuất thành công");
  };

  const showNotSupportedMessage = (featureName) => {
    message.info(`Tính năng "${featureName}" hiện chưa được hỗ trợ`);
  };

  // Active Key determination based on pathname
  const activeKey = useMemo(() => {
    const path = location.pathname;
    if (path === "/" || path === "") return "home";
    if (path.startsWith("/search")) return "search";
    if (path.startsWith("/notifications")) return "notifications";
    if (path.startsWith("/chat")) return "chat";
    if (path.startsWith("/profile") || path.startsWith("/friends") || path.startsWith("/user")) return "profile";
    return "";
  }, [location.pathname]);

  const displayName = user?.name || user?.email || "Tài khoản";

  return (
    <>
      <aside className="app-sidebar">
        {/* Brand/Logo Section */}
        <div>
          <Link to="/" className="sidebar-logo">
            <span className="sidebar-logo-icon">T</span>
            <span className="sidebar-logo-text">Tegram</span>
          </Link>

          {/* Sidebar Menu */}
          <nav className="sidebar-menu">
            {/* Trang chủ */}
            <Link
              to="/"
              className={`sidebar-item ${activeKey === "home" ? "active" : ""}`}
            >
              <HomeOutlined />
              <span>Trang chủ</span>
            </Link>

            {/* Tìm kiếm */}
            <Link
              to="/search"
              className={`sidebar-item ${activeKey === "search" ? "active" : ""}`}
            >
              <SearchOutlined />
              <span>Tìm kiếm</span>
            </Link>

            {isAuthenticated && (
              <>
                {/* Thông báo */}
                <Link
                  to="/notifications"
                  className={`sidebar-item ${activeKey === "notifications" ? "active" : ""}`}
                  style={{ position: "relative" }}
                >
                  <Badge count={unreadCount} size="small" offset={[5, -5]} color="#FF3B30">
                    <BellOutlined style={{ fontSize: 20 }} />
                  </Badge>
                  <span>Thông báo</span>
                </Link>

                {/* Tin nhắn */}
                <Link
                  to="/chat"
                  className={`sidebar-item ${activeKey === "chat" ? "active" : ""}`}
                >
                  <MessageOutlined />
                  <span>Tin nhắn</span>
                </Link>

                {/* Đã lưu */}
                <button
                  onClick={() => showNotSupportedMessage("Đã lưu")}
                  className="sidebar-item"
                >
                  <BookOutlined />
                  <span>Đã lưu</span>
                </button>

                {/* Trang cá nhân */}
                <Link
                  to={user?._id ? `/profile/${user._id}` : "/profile"}
                  className={`sidebar-item ${activeKey === "profile" ? "active" : ""}`}
                >
                  <UserOutlined />
                  <span>Trang cá nhân</span>
                </Link>

                {/* Nhóm */}
                <button
                  onClick={() => showNotSupportedMessage("Nhóm")}
                  className="sidebar-item"
                >
                  <TeamOutlined />
                  <span>Nhóm</span>
                </button>

                {/* Cài đặt */}
                <button
                  onClick={() => showNotSupportedMessage("Cài đặt")}
                  className="sidebar-item"
                >
                  <SettingOutlined />
                  <span>Cài đặt</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Footer / Account Section */}
        <div className="sidebar-footer">
          {isAuthenticated ? (
            <>
              <div
                className="sidebar-user-card"
                onClick={() => navigate(`/profile/${user._id}`)}
              >
                <Avatar
                  size={42}
                  src={getMediaUrl(user?.avatar)}
                  style={{ backgroundColor: "#7F00FD", fontWeight: "bold" }}
                >
                  {displayName[0].toUpperCase()}
                </Avatar>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{displayName}</span>
                  <span className="sidebar-user-username">
                    @{user?.email ? user.email.split("@")[0] : "user"}
                  </span>
                </div>
              </div>
              <button className="sidebar-logout-btn" onClick={handleLogout}>
                <LogoutOutlined />
                <span>Đăng xuất</span>
              </button>
            </>
          ) : (
            <Link to="/login" className="sidebar-logout-btn" style={{ color: "#7F00FD" }}>
              <LogoutOutlined style={{ color: "#7F00FD" }} />
              <span>Đăng nhập</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Global Search Modal */}
      <Modal
        title="Tìm kiếm trên Tegram"
        open={searchOpen}
        onCancel={() => setSearchOpen(false)}
        footer={null}
        destroyOnClose
        centered
        width={500}
      >
        <div style={{ padding: "12px 0" }}>
          <AutoComplete
            style={{ width: "100%" }}
            options={suggestions}
            onSearch={setSearchQuery}
            onSelect={handleSearchSubmit}
            popupClassName="search-dropdown-popup"
            defaultActiveFirstOption={false}
          >
            <Input.Search
              placeholder="Nhập từ khóa tìm kiếm..."
              enterButton="Tìm kiếm"
              size="large"
              loading={searchLoading}
              onSearch={handleSearchSubmit}
              allowClear
              autoFocus
            />
          </AutoComplete>
        </div>
      </Modal>

      {/* Global Notifications Drawer */}
      <Drawer
        title="Thông báo"
        placement="right"
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        width={380}
        extra={
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="text" loading={pushLoading} onClick={handleEnablePush} style={{ color: "#7F00FD", fontWeight: 600 }}>
              Bật push
            </Button>
            <Button type="text" onClick={handleMarkAllRead} style={{ color: "#7F00FD", fontWeight: 600 }}>
              Đánh dấu đã đọc
            </Button>
          </div>
        }
      >
        <List
          dataSource={notifications}
          locale={{ emptyText: "Chưa có thông báo nào" }}
          renderItem={(item) => (
            <List.Item
              className={item.readAt ? "notification-item" : "notification-item unread"}
              onClick={() => handleReadNotification(item)}
              style={{
                cursor: "pointer",
                padding: "16px",
                borderBottom: "1px solid #edf0f4",
                backgroundColor: item.readAt ? "transparent" : "#f5e6ff",
                transition: "background-color 0.2s ease"
              }}
            >
              <Badge dot={!item.readAt} color="#FF3B30">
                <div style={{ textAlign: "left", paddingLeft: 8 }}>
                  <Typography.Text strong style={{ color: "#1a1a1a" }}>
                    {item.actor?.name || "Hệ thống"}{" "}
                  </Typography.Text>
                  <Typography.Text style={{ color: "#333" }}>
                    {notificationText[item.type] || item.type}
                  </Typography.Text>
                  <div className="social-muted" style={{ fontSize: "12px", marginTop: "4px", color: "#8c8c8c" }}>
                    {new Date(item.createdAt).toLocaleString("vi-VN")}
                  </div>
                </div>
              </Badge>
            </List.Item>
          )}
        />
      </Drawer>
    </>
  );
};

export default Sidebar;
