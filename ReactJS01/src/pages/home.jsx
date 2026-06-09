import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Input,
  List,
  Modal,
  Radio,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  BellOutlined,
  CommentOutlined,
  EllipsisOutlined,
  FlagOutlined,
  GlobalOutlined,
  HomeOutlined,
  LikeFilled,
  LikeOutlined,
  RetweetOutlined,
  StopOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  blockUserApi,
  commentPostApi,
  createPostApi,
  followUserApi,
  friendRequestApi,
  getFeedApi,
  getNotificationsApi,
  getPostByIdApi,
  getTrendingApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  reactPostApi,
  replyCommentApi,
  reportPostApi,
  sharePostApi,
} from "../util/api";
import { getMediaUrl } from "../util/media";

const reactionOptions = [
  { value: "like", label: "Like" },
  { value: "love", label: "Love" },
  { value: "haha", label: "Haha" },
  { value: "wow", label: "Wow" },
  { value: "sad", label: "Sad" },
  { value: "angry", label: "Angry" },
];

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

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const userProfile = useSelector((state) => state.userProfile.profileUser);
  const [mode, setMode] = useState("latest");
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [trending, setTrending] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [highlightedPostId, setHighlightedPostId] = useState("");
  const [highlightedCommentId, setHighlightedCommentId] = useState("");

  const isLoggedIn = Boolean(isAuthenticated);
  const displayName = user?.name || user?.email || "User";

  const refreshNotifications = async () => {
    if (!isLoggedIn) return;
    const res = await getNotificationsApi();
    if (res?.EC === 0) {
      setNotifications(res.data);
      setUnread(res.unread);
    }
  };

  const loadFeed = async ({ nextPage = 1, append = false } = {}) => {
    if (!isLoggedIn) return;
    setLoadingFeed(true);
    const res = await getFeedApi({ mode, page: nextPage, limit: 6 });
    setLoadingFeed(false);
    if (res?.EC === 0) {
      setPosts((prev) => (append ? [...prev, ...res.data] : res.data));
      setPage(nextPage);
      setHasMore(res.pagination.hasMore);
    } else {
      message.error(res?.EM || "Không thể tải feed");
    }
  };

  const loadTrending = async () => {
    if (!isLoggedIn) return;
    const res = await getTrendingApi();
    if (res?.EC === 0) setTrending(res.data);
  };

  useEffect(() => {
    loadFeed({ nextPage: 1 });
  }, [mode, isLoggedIn]);

  useEffect(() => {
    loadTrending();
    refreshNotifications();
    if (!isLoggedIn) return undefined;
    const timer = window.setInterval(refreshNotifications, 10000);
    return () => window.clearInterval(timer);
  }, [isLoggedIn]);

  const postById = useMemo(
    () =>
      posts.reduce((acc, post) => {
        acc[post._id] = post;
        return acc;
      }, {}),
    [posts],
  );

  const updatePost = (postId, updater) => {
    setPosts((prev) =>
      prev.map((post) => (post._id === postId ? updater(post) : post)),
    );
  };

  const handleCreatePost = async () => {
    const res = await createPostApi({ content: postContent, visibility });
    if (res?.EC === 0) {
      setPostContent("");
      message.success("Đã đăng bài");
      await loadFeed({ nextPage: 1 });
      await loadTrending();
    } else {
      message.error(res?.EM || "Không thể đăng bài");
    }
  };

  const handleReact = async (postId, type) => {
    const before = postById[postId];
    const res = await reactPostApi(postId, type);
    if (res?.EC === 0) {
      updatePost(postId, (post) => ({
        ...post,
        myReaction: res.data?.type || null,
        stats: {
          ...post.stats,
          reactions:
            res.data?.type && !before.myReaction
              ? post.stats.reactions + 1
              : !res.data && before.myReaction
                ? Math.max(post.stats.reactions - 1, 0)
                : post.stats.reactions,
        },
      }));
    } else {
      message.error(res?.EM || "Không thể react");
    }
  };

  const handleComment = async (postId) => {
    const content = commentDrafts[postId];
    const res = await commentPostApi(postId, content);
    if (res?.EC === 0) {
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      updatePost(postId, (post) => ({
        ...post,
        comments: [...post.comments, { ...res.data, replies: [] }],
        stats: { ...post.stats, comments: post.stats.comments + 1 },
      }));
    } else {
      message.error(res?.EM || "Không thể bình luận");
    }
  };

  const handleReply = async (postId, commentId) => {
    const content = replyDrafts[commentId];
    const res = await replyCommentApi(commentId, postId, content);
    if (res?.EC === 0) {
      setReplyDrafts((prev) => ({ ...prev, [commentId]: "" }));
      updatePost(postId, (post) => ({
        ...post,
        comments: post.comments.map((comment) =>
          comment._id === commentId
            ? { ...comment, replies: [...(comment.replies || []), res.data] }
            : comment,
        ),
        stats: { ...post.stats, comments: post.stats.comments + 1 },
      }));
    } else {
      message.error(res?.EM || "Không thể trả lời bình luận");
    }
  };

  const handleShare = (postId) => {
    let content = "";
    Modal.confirm({
      title: "Chia sẻ bài viết",
      content: (
        <Input.TextArea
          rows={3}
          placeholder="Viết cảm nghĩ của bạn"
          onChange={(event) => {
            content = event.target.value;
          }}
        />
      ),
      okText: "Chia sẻ",
      cancelText: "Hủy",
      onOk: async () => {
        const res = await sharePostApi(postId, content);
        if (res?.EC === 0) {
          message.success("Đã chia sẻ");
          await loadFeed({ nextPage: 1 });
        } else {
          message.error(res?.EM || "Không thể chia sẻ");
        }
      },
    });
  };

  const askReason = (title, callback) => {
    let reason = "";
    Modal.confirm({
      title,
      content: (
        <Input.TextArea
          rows={3}
          placeholder="Nhập lý do để hệ thống ghi nhận báo cáo"
          onChange={(event) => {
            reason = event.target.value;
          }}
        />
      ),
      okText: "Gửi báo cáo",
      cancelText: "Hủy",
      onOk: () => callback(reason),
    });
  };

  const scrollToPostTarget = (postId, commentId) => {
    window.setTimeout(() => {
      const target =
        (commentId && document.getElementById(`comment-${commentId}`)) ||
        document.getElementById(`post-${postId}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  };

  const handleReadNotification = async (item) => {
    await markNotificationReadApi(item._id);
    await refreshNotifications();
    const postId = item.post?._id || item.post;
    const commentId = item.comment?._id || item.comment;

    if (!postId) return;

    setNotificationOpen(false);
    setHighlightedPostId(postId);
    setHighlightedCommentId(commentId || "");

    const hasPost = posts.some((post) => post._id === postId);
    if (!hasPost) {
      const res = await getPostByIdApi(postId);
      if (res?.EC === 0) {
        setPosts((prev) => [
          res.data,
          ...prev.filter((post) => post._id !== postId),
        ]);
      } else {
        message.error(res?.EM || "Không thể mở bài viết từ thông báo");
        return;
      }
    }

    scrollToPostTarget(postId, commentId);
    window.setTimeout(() => {
      setHighlightedPostId("");
      setHighlightedCommentId("");
    }, 3500);
  };

  if (!isLoggedIn) {
    return (
      <div className="social-guest">
        <Card className="social-guest-card">
          <Typography.Title level={2}>Social Feed</Typography.Title>
          <Typography.Paragraph>
            Đăng nhập để sử dụng feed, react, comment, theo dõi, kết bạn, report
            và thông báo gần realtime.
          </Typography.Paragraph>
          <Space>
            <Link to="/login">
              <Button type="primary">Đăng nhập</Button>
            </Link>
            <Link to="/register">
              <Button>Đăng ký</Button>
            </Link>
          </Space>
        </Card>
      </div>
    );
  }

  const renderPostMenu = (post) => ({
    items: [
      {
        key: "follow",
        icon: <UserAddOutlined />,
        label: "Theo dõi tác giả",
        disabled: post.author?._id === user?._id,
      },
      {
        key: "friend",
        icon: <TeamOutlined />,
        label: "Gửi lời mời kết bạn",
        disabled: post.author?._id === user?._id,
      },
      {
        key: "report",
        icon: <FlagOutlined />,
        label: "Báo cáo bài viết",
      },
      {
        key: "block",
        icon: <StopOutlined />,
        label: "Chặn người dùng",
        disabled: post.author?._id === user?._id,
        danger: true,
      },
    ],
    onClick: async ({ key }) => {
      if (key === "follow") {
        await followUserApi(post.author._id);
        message.success("Đã theo dõi");
      }
      if (key === "friend") {
        const res = await friendRequestApi(post.author._id);
        message.success(res?.EM || "Đã gửi lời mời");
      }
      if (key === "report") {
        askReason("Báo cáo bài viết", async (reason) => {
          const res = await reportPostApi(post._id, reason);
          message.success(res?.EM || "Đã gửi báo cáo");
        });
      }
      if (key === "block") {
        await blockUserApi(post.author._id);
        message.success("Đã chặn người dùng");
        await loadFeed({ nextPage: 1 });
      }
    },
  });

  return (
    <div className="social-page">
      <aside className="social-left-rail">
        <Card className="social-panel">
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            <div className="social-profile-row">
              <Avatar
                size={42}
                src={getMediaUrl(userProfile?.avatar)}
                icon={<UserOutlined />}
              >
                {displayName[0]}
              </Avatar>
              <div className="min-w-0">
                <Typography.Text strong ellipsis>
                  {displayName}
                </Typography.Text>
                <div className="social-muted">{user?.email}</div>
              </div>
            </div>
            <Link className="social-nav-item" to="/">
              <HomeOutlined /> Bảng tin
            </Link>
            <button
              className="social-nav-item"
              onClick={() => setNotificationOpen(true)}
            >
              <BellOutlined /> Thông báo
              {unread ? <Badge count={unread} size="small" /> : null}
            </button>
            <Link className="social-nav-item" to="/friends">
              <TeamOutlined /> Bạn bè
            </Link>
          </Space>
        </Card>
      </aside>

      <main className="social-feed">
        <Card className="composer-card">
          <div className="composer-head">
            <Avatar
              size={44}
              src={getMediaUrl(userProfile?.avatar)}
              icon={<UserOutlined />}
            >
              {displayName[0]}
            </Avatar>

            <Input
              className="composer-pill"
              value={postContent}
              onChange={(event) => setPostContent(event.target.value)}
              placeholder={`${displayName}, bạn đang nghĩ gì?`}
              onPressEnter={handleCreatePost}
            />
          </div>
          <Input.TextArea
            className="composer-textarea"
            rows={3}
            value={postContent}
            onChange={(event) => setPostContent(event.target.value)}
            placeholder="Viết bài đăng... dùng @email để mention và #topic để tạo trending"
          />
          <Divider className="compact-divider" />
          <div className="composer-actions">
            <Select
              value={visibility}
              onChange={setVisibility}
              suffixIcon={<GlobalOutlined />}
              options={[
                { value: "public", label: "Công khai" },
                { value: "friends", label: "Bạn bè" },
              ]}
              style={{ width: 148 }}
            />
            <Button
              type="primary"
              onClick={handleCreatePost}
              disabled={!postContent.trim()}
            >
              Đăng bài
            </Button>
          </div>
        </Card>

        <div className="feed-toolbar">
          <Radio.Group
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <Radio.Button value="latest">Mới nhất</Radio.Button>
            <Radio.Button value="algorithm">Gợi ý</Radio.Button>
            <Radio.Button value="friends">Bạn bè</Radio.Button>
          </Radio.Group>
          <Button
            icon={<BellOutlined />}
            onClick={() => setNotificationOpen(true)}
          >
            <Badge count={unread} offset={[10, -6]}>
              Thông báo
            </Badge>
          </Button>
        </div>

        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          {posts.length ? (
            posts.map((post) => (
              <Card
                key={post._id}
                id={`post-${post._id}`}
                className={`post-card ${highlightedPostId === post._id ? "post-card-highlight" : ""}`}
              >
                <div className="post-head">
                  <Space
                    align="start"
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/profile/${post.author?._id}`)}
                  >
                    <Avatar
                      size={44}
                      src={getMediaUrl(post.author?.avatar)}
                      icon={<UserOutlined />}
                    >
                      {post.author?.name?.[0] || "U"}
                    </Avatar>
                    <div>
                      <Typography.Text strong>
                        {post.author?.name}
                      </Typography.Text>
                      <div className="post-meta">
                        {new Date(post.createdAt).toLocaleString("vi-VN")} ·{" "}
                        {post.visibility === "friends" ? "Bạn bè" : "Công khai"}
                      </div>
                    </div>
                  </Space>
                  <Dropdown menu={renderPostMenu(post)} trigger={["click"]}>
                    <Button
                      shape="circle"
                      type="text"
                      icon={<EllipsisOutlined />}
                    />
                  </Dropdown>
                </div>

                <Typography.Paragraph className="post-content">
                  {post.content}
                </Typography.Paragraph>

                {post.hashtags?.length ? (
                  <Space wrap className="post-tags">
                    {post.hashtags.map((tag) => (
                      <Tag key={tag} color="blue">
                        #{tag}
                      </Tag>
                    ))}
                  </Space>
                ) : null}

                {post.sharedPost ? (
                  <div className="shared-post">
                    <Typography.Text strong>
                      Bài gốc của {post.sharedPost.author?.name}
                    </Typography.Text>
                    <Typography.Paragraph className="mb-0">
                      {post.sharedPost.content}
                    </Typography.Paragraph>
                  </div>
                ) : null}

                <div className="post-stats">
                  <span>
                    <LikeFilled
                      className={post.myReaction ? "active-like" : ""}
                    />{" "}
                    {post.stats?.reactions || 0} reaction
                  </span>
                  <span>
                    {post.stats?.comments || 0} bình luận ·{" "}
                    {post.stats?.shares || 0} chia sẻ
                  </span>
                </div>

                <div className="post-actions">
                  <Select
                    className="reaction-select"
                    value={post.myReaction || "like"}
                    options={reactionOptions}
                    onChange={(value) => handleReact(post._id, value)}
                  />
                  <Button
                    type="text"
                    icon={post.myReaction ? <LikeFilled /> : <LikeOutlined />}
                    onClick={() => handleReact(post._id, "like")}
                  >
                    Like
                  </Button>
                  <Button type="text" icon={<CommentOutlined />}>
                    Bình luận
                  </Button>
                  <Button
                    type="text"
                    icon={<RetweetOutlined />}
                    onClick={() => handleShare(post._id)}
                  >
                    Chia sẻ
                  </Button>
                </div>

                <div className="comment-box">
                  <Avatar size={32} src={user?.avatar} icon={<UserOutlined />}>
                    {displayName[0]}
                  </Avatar>
                  <Space.Compact className="comment-input">
                    <Input
                      value={commentDrafts[post._id] || ""}
                      onChange={(event) =>
                        setCommentDrafts((prev) => ({
                          ...prev,
                          [post._id]: event.target.value,
                        }))
                      }
                      onPressEnter={() => handleComment(post._id)}
                      placeholder="Viết bình luận..."
                    />
                    <Button onClick={() => handleComment(post._id)}>Gửi</Button>
                  </Space.Compact>
                </div>

                <List
                  className="comment-list"
                  dataSource={post.comments || []}
                  locale={{ emptyText: "Chưa có bình luận" }}
                  renderItem={(comment) => (
                    <List.Item
                      id={`comment-${comment._id}`}
                      className={`comment-item ${
                        highlightedCommentId === comment._id
                          ? "comment-item-highlight"
                          : ""
                      }`}
                    >
                      <div className="comment-thread">
                        <Space
                          align="start"
                          style={{ cursor: "pointer" }}
                          onClick={() =>
                            navigate(`/profile/${comment.author?._id}`)
                          }
                        >
                          <Avatar
                            size={32}
                            src={comment.author?.avatar}
                            icon={<UserOutlined />}
                          >
                            {comment.author?.name?.[0] || "U"}
                          </Avatar>
                          <div className="comment-bubble">
                            <Typography.Text strong>
                              {comment.author?.name}
                            </Typography.Text>
                            <Typography.Paragraph className="mb-0">
                              {comment.content}
                            </Typography.Paragraph>
                          </div>
                        </Space>

                        <div className="reply-area">
                          {(comment.replies || []).map((reply) => (
                            <Space
                              key={reply._id}
                              id={`comment-${reply._id}`}
                              align="start"
                              className={`reply-row ${
                                highlightedCommentId === reply._id
                                  ? "comment-item-highlight"
                                  : ""
                              }`}
                              style={{ cursor: "pointer" }}
                              onClick={() =>
                                navigate(`/profile/${reply.author?._id}`)
                              }
                            >
                              <Avatar
                                size={26}
                                src={reply.author?.avatar}
                                icon={<UserOutlined />}
                              >
                                {reply.author?.name?.[0] || "U"}
                              </Avatar>
                              <div className="reply-bubble">
                                <Typography.Text strong>
                                  {reply.author?.name}
                                </Typography.Text>
                                <Typography.Paragraph className="mb-0">
                                  {reply.content}
                                </Typography.Paragraph>
                              </div>
                            </Space>
                          ))}
                          <Space.Compact className="reply-input">
                            <Input
                              value={replyDrafts[comment._id] || ""}
                              onChange={(event) =>
                                setReplyDrafts((prev) => ({
                                  ...prev,
                                  [comment._id]: event.target.value,
                                }))
                              }
                              onPressEnter={() =>
                                handleReply(post._id, comment._id)
                              }
                              placeholder="Trả lời bình luận..."
                            />
                            <Button
                              onClick={() => handleReply(post._id, comment._id)}
                            >
                              Trả lời
                            </Button>
                          </Space.Compact>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            ))
          ) : (
            <Card className="post-card">
              <Empty description="Chưa có bài viết nào" />
            </Card>
          )}
          {hasMore ? (
            <Button
              className="load-more-btn"
              loading={loadingFeed}
              onClick={() => loadFeed({ nextPage: page + 1, append: true })}
            >
              Tải thêm bài viết
            </Button>
          ) : null}
        </Space>
      </main>

      <aside className="social-right-rail">
        <Card className="social-panel" title="Chủ đề thịnh hành">
          <Space wrap>
            {trending.length ? (
              trending.map((item) => (
                <Tag key={item.topic} color="blue" className="trend-tag">
                  <ThunderboltOutlined /> #{item.topic} ({item.count})
                </Tag>
              ))
            ) : (
              <Typography.Text type="secondary">
                Chưa có chủ đề nổi bật
              </Typography.Text>
            )}
          </Space>
        </Card>
      </aside>

      <Drawer
        title="Thông báo"
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        extra={
          <Button
            onClick={async () => {
              await markAllNotificationsReadApi();
              await refreshNotifications();
            }}
          >
            Đánh dấu đã đọc
          </Button>
        }
      >
        <List
          dataSource={notifications}
          locale={{ emptyText: "Chưa có thông báo" }}
          renderItem={(item) => (
            <List.Item
              className={
                item.readAt ? "notification-item" : "notification-item unread"
              }
              onClick={() => handleReadNotification(item)}
            >
              <Badge dot={!item.readAt}>
                <div>
                  <Typography.Text strong>
                    {item.actor?.name || "Hệ thống"}{" "}
                  </Typography.Text>
                  <Typography.Text>
                    {notificationText[item.type] || item.type}
                  </Typography.Text>
                  <div className="social-muted">
                    {new Date(item.createdAt).toLocaleString("vi-VN")}
                  </div>
                </div>
              </Badge>
            </List.Item>
          )}
        />
      </Drawer>
    </div>
  );
};

export default HomePage;
