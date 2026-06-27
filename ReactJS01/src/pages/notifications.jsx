import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import {
  BellOutlined,
  CheckCircleOutlined,
  CommentOutlined,
  HeartFilled,
  MailOutlined,
  PushpinOutlined,
  RetweetOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  getNotificationsApi,
  getPushPublicKeyApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  subscribePushApi,
} from "../util/api";
import { getMediaUrl } from "../util/media";
import {
  enableBrowserPush,
  getNotificationTargetUrl,
  showLocalNotification,
} from "../util/notification";
import { useSocket } from "../components/context/socket.context";

const notificationText = {
  post_mention: "đã nhắc đến bạn trong một bài viết",
  comment_mention: "đã nhắc đến bạn trong bình luận",
  post_reaction: "đã thích/react bài viết của bạn",
  post_comment: "đã bình luận bài viết của bạn",
  comment_reply: "đã trả lời bình luận của bạn",
  post_share: "đã chia sẻ bài viết của bạn",
  follow: "đã theo dõi bạn",
  friend_request: "đã gửi lời mời kết bạn",
  friend_accept: "đã chấp nhận lời mời kết bạn",
  report_received: "có báo cáo mới",
};

const categoryMap = {
  post_reaction: "Tương tác",
  post_comment: "Tương tác",
  comment_reply: "Tương tác",
  post_mention: "Tương tác",
  comment_mention: "Tương tác",
  post_share: "Tương tác",
  follow: "Kết nối",
  friend_request: "Kết nối",
  friend_accept: "Kết nối",
  report_received: "Hệ thống",
};

const categoryOptions = ["Tất cả", "Tương tác", "Kết nối", "Hệ thống"];

const typeIcon = {
  post_reaction: <HeartFilled />,
  post_comment: <CommentOutlined />,
  comment_reply: <CommentOutlined />,
  post_mention: <BellOutlined />,
  comment_mention: <BellOutlined />,
  post_share: <RetweetOutlined />,
  follow: <UserAddOutlined />,
  friend_request: <TeamOutlined />,
  friend_accept: <CheckCircleOutlined />,
  report_received: <PushpinOutlined />,
};

const getPreview = (item) =>
  item?.metadata?.preview || item?.comment?.content || item?.post?.content || "";

const formatPreviewText = (text = "") =>
  text
    .replace(/@\[([^\]]+)\]\(([^)]+)\)/g, "@$1")
    .replace(/\s+/g, " ")
    .trim();

const isMentionNotification = (type) =>
  ["post_mention", "comment_mention"].includes(type);

const formatTime = (date) =>
  new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(date));

const NotificationPage = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [view, setView] = useState("all");
  const [category, setCategory] = useState("Tất cả");
  const [loading, setLoading] = useState(true);
  const [pushLoading, setPushLoading] = useState(false);

  const refreshNotifications = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await getNotificationsApi({ limit: 50 });
      if (res?.EC === 0) {
        setNotifications(res.data || []);
        setUnread(res.unread || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshNotifications();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const timer = window.setInterval(refreshNotifications, 10000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleNewNotification = ({ notification, unread: nextUnread }) => {
      if (notification?.type === "new_message") return;

      const enriched = {
        ...notification,
        text: notificationText[notification.type] || notification.type,
      };
      setNotifications((prev) => [
        enriched,
        ...prev.filter((item) => item._id !== enriched._id),
      ]);
      setUnread(nextUnread || 0);
      showLocalNotification(enriched);
    };

    socket.on("notification:new", handleNewNotification);
    return () => socket.off("notification:new", handleNewNotification);
  }, [socket]);

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((item) => {
        if (item.type === "new_message") return false;
        const readMatch = view === "all" || !item.readAt;
        const categoryMatch = category === "Tất cả" || categoryMap[item.type] === category;
        return readMatch && categoryMatch;
      }),
    [notifications, view, category],
  );

  const stats = useMemo(
    () => ({
      interactions: notifications.filter((item) => categoryMap[item.type] === "Tương tác").length,
      connections: notifications.filter((item) => categoryMap[item.type] === "Kết nối").length,
    }),
    [notifications],
  );

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
      setUnread((prev) => Math.max(prev - (item.readAt ? 0 : 1), 0));
    } catch (err) {
      message.error("Không thể cập nhật trạng thái thông báo");
    }

    navigate(getNotificationTargetUrl(item));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadApi();
    await refreshNotifications();
    message.success("Đã đánh dấu đọc tất cả thông báo");
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

  if (!isAuthenticated) {
    return (
      <div className="notification-page">
        <Empty description="Đăng nhập để xem thông báo" />
      </div>
    );
  }

  return (
    <div className="notification-page">
      <main className="notification-shell">
        <div className="notification-tabs">
          <button
            className={view === "all" ? "active" : ""}
            onClick={() => setView("all")}
          >
            Tất cả
          </button>
          <button
            className={view === "unread" ? "active" : ""}
            onClick={() => setView("unread")}
          >
            Chưa đọc
            {unread > 0 ? <Badge count={unread} size="small" color="#7F00FD" /> : null}
          </button>
        </div>

        <section className="notification-toolbar">
          <div>
            <Typography.Title level={3}>Thông báo</Typography.Title>
            <Typography.Text type="secondary">
              Theo dõi like, comment, kết bạn và các kênh gửi realtime.
            </Typography.Text>
          </div>
          <Space wrap>
            <Button
              icon={<ThunderboltOutlined />}
              loading={pushLoading}
              onClick={handleEnablePush}
            >
              Bật push
            </Button>
            <Button type="primary" onClick={handleMarkAllRead}>
              Đánh dấu đã đọc
            </Button>
          </Space>
        </section>

        <section className="notification-status-grid">
          <div className="notification-status-card">
            <HeartFilled />
            <strong>{stats.interactions}</strong>
            <span>Like / comment</span>
          </div>
          <div className="notification-status-card">
            <TeamOutlined />
            <strong>{stats.connections}</strong>
            <span>Follow / kết bạn</span>
          </div>
          <div className="notification-status-card">
            <MailOutlined />
            <strong>Email</strong>
            <span>Tự gửi khi server cấu hình SMTP</span>
          </div>
        </section>

        <div className="notification-filter-row">
          <Segmented
            value={category}
            onChange={setCategory}
            options={categoryOptions}
          />
        </div>

        {loading ? (
          <div className="notification-loading">
            <Spin />
          </div>
        ) : filteredNotifications.length ? (
          <div className="notification-list">
            {filteredNotifications.map((item) => {
              const preview = formatPreviewText(getPreview(item));
              const actorName = item.actor?.name || "Hệ thống";
              const isUnread = !item.readAt;

              return (
                <button
                  key={item._id}
                  className={`notification-card ${isUnread ? "unread" : ""}`}
                  onClick={() => handleReadNotification(item)}
                >
                  <Avatar
                    size={40}
                    src={getMediaUrl(item.actor?.avatar)}
                    icon={<UserOutlined />}
                    className="notification-avatar"
                  >
                    {actorName[0]}
                  </Avatar>

                  <div className="notification-card-body">
                    <div className="notification-card-head">
                      <span>
                        <strong>{actorName}</strong>{" "}
                        {notificationText[item.type] || item.type}
                      </span>
                      <span className="notification-card-time">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>
                    {preview ? (
                      <div
                        className={
                          isMentionNotification(item.type)
                            ? "notification-mention-preview"
                            : "notification-preview"
                        }
                      >
                        {isMentionNotification(item.type) ? (
                          <span className="notification-preview-label">
                            Nội dung được nhắc đến
                          </span>
                        ) : null}
                        <p>{preview}</p>
                      </div>
                    ) : null}
                    <div className="notification-card-meta">
                      <Tag>{categoryMap[item.type] || "Hệ thống"}</Tag>
                      <span className="notification-type-icon">
                        {typeIcon[item.type] || <BellOutlined />}
                      </span>
                      {isUnread ? <span className="notification-unread-dot" /> : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="notification-empty">
            <Empty description="Chưa có thông báo phù hợp" />
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationPage;
