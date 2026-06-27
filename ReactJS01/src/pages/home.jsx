import { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Image,
  Input,
  List,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import {
  BellOutlined,
  BookOutlined,
  CommentOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  EyeInvisibleOutlined,
  FlagOutlined,
  GlobalOutlined,
  HomeOutlined,
  LikeFilled,
  LikeOutlined,
  PictureOutlined,
  RetweetOutlined,
  StopOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserAddOutlined,
  UserOutlined,
  PushpinOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  blockUserApi,
  commentPostApi,
  createPostApi,
  followUserApi,
  friendRequestApi,
  getFeedApi,
  hideCommentApi,
  hidePostApi,
  getNotificationsApi,
  getPostByIdApi,
  getTrendingApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  reactPostApi,
  replyCommentApi,
  reportCommentApi,
  reportPostApi,
  sharePostApi,
  savePostApi,
  updatePostApi,
  deletePostApi,
  pinPostApi,
  unsavePostApi,
} from "../util/api";
import { getMediaUrl } from "../util/media";
import CreatePostModal from "../components/profile/CreatePostModal";
import MentionInput from "../components/ui/MentionInput";
import { getNotificationTargetUrl } from "../util/notification";
import CreatePostComposer from "../components/post/CreatePostComposer";
import PostCommentsModal from "../components/post/PostCommentsModal";

const REACTIONS = [
  { type: "like",  emoji: "👍", label: "Thích",    color: "#1877f2" },
  { type: "love",  emoji: "❤️", label: "Yêu thích", color: "#f33e58" },
  { type: "haha",  emoji: "😆", label: "Haha",     color: "#f7b125" },
  { type: "wow",   emoji: "😮", label: "Wow",      color: "#f7b125" },
  { type: "sad",   emoji: "😢", label: "Buồn",     color: "#f7b125" },
  { type: "angry", emoji: "😡", label: "Phẫn nộ",  color: "#e9710f" },
];

const REACTION_MAP = REACTIONS.reduce((acc, r) => { acc[r.type] = r; return acc; }, {});

// Floating reaction picker (Facebook style)
const ReactionPicker = ({ myReaction, onReact }) => {
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const current = myReaction ? REACTION_MAP[myReaction] : null;

  const startOpen  = () => { clearTimeout(timerRef.current); timerRef.current = setTimeout(() => setOpen(true),  350); };
  const startClose = () => { timerRef.current = setTimeout(() => setOpen(false), 250); };
  const cancelClose = () => clearTimeout(timerRef.current);

  const handleClick = () => {
    // quick click = toggle like
    if (!open) onReact("like");
  };

  return (
    <div
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={startOpen}
      onMouseLeave={startClose}
    >
      {/* Floating picker */}
      {open && (
        <div
          onMouseEnter={cancelClose}
          onMouseLeave={startClose}
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "-12px",
            background: "#fff",
            borderRadius: "999px",
            boxShadow: "0 4px 20px rgba(0,0,0,.18)",
            padding: "6px 10px",
            display: "flex",
            gap: "4px",
            zIndex: 9999,
            whiteSpace: "nowrap",
            animation: "reactionFadeIn .15s ease",
          }}
        >
          {REACTIONS.map((r) => (
            <button
              key={r.type}
              title={r.label}
              onClick={() => { onReact(r.type); setOpen(false); }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "26px",
                lineHeight: 1,
                padding: "2px 4px",
                borderRadius: "50%",
                transition: "transform .15s",
                transform: myReaction === r.type ? "scale(1.35)" : "scale(1)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = myReaction === r.type ? "scale(1.35)" : "scale(1)"; }}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}

      {/* Like button */}
      <button
        onClick={handleClick}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          borderRadius: "8px",
          fontWeight: 600,
          fontSize: "14px",
          color: current ? current.color : "#65676b",
          transition: "background .15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f2f5"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
      >
        <span style={{ fontSize: "18px", lineHeight: 1 }}>
          {current ? current.emoji : "👍"}
        </span>
        {current ? current.label : "Thích"}
      </button>
    </div>
  );
};

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
const renderPostContent = (text = "") => {
  if (!text) return "";
  
  // Matches @[Display Name](emailPrefix)
  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }
    
    const displayName = match[1];
    parts.push(
      <span 
        key={matchIndex} 
        className="text-blue-600 font-bold hover:underline cursor-pointer"
        style={{ color: "#1890ff", fontWeight: "bold" }}
      >
        {displayName}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
};

const normalizePostMedia = (media = []) =>
  media
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") {
        return {
          url: item,
          type: /\.(mp4|mov|avi|mkv|webm)$/i.test(item) ? "video" : "image",
        };
      }
      return item;
    })
    .filter(Boolean);

const HomePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const userProfile = useSelector((state) => state.userProfile.profileUser);
  const [mode, setMode] = useState("latest");
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [createPostVisible, setCreatePostVisible] = useState(false);
  const [postToEdit, setPostToEdit] = useState(null);
  const [postContent, setPostContent] = useState("");
  const [postMediaFiles, setPostMediaFiles] = useState([]);
  const [visibility, setVisibility] = useState("public");
  const [composeOpen, setComposeOpen] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [trending, setTrending] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [highlightedPostId, setHighlightedPostId] = useState("");
  const [highlightedCommentId, setHighlightedCommentId] = useState("");
  const [focusedCommentPostId, setFocusedCommentPostId] = useState(null);
  const commentInputRefs = useRef({});
  const observerTarget = useRef(null);
  const postsRef = useRef([]);        // always holds latest posts without being a dep
  const targetPostId = searchParams.get("postId");
  const targetCommentId = searchParams.get("commentId");
  const [commentModalPostId, setCommentModalPostId] = useState("");
  const [hiddenPostIds, setHiddenPostIds] = useState([]);

  const isLoggedIn = Boolean(isAuthenticated);
  const displayName = user?.name || user?.email || "User";

  // If user is not authenticated, show a minimal landing page that only allows login
  if (!isLoggedIn) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", padding: 24 }}>
        <Card style={{ width: 780, textAlign: "center" }}>
          <Typography.Title level={2}>Chào mừng đến với Tegram</Typography.Title>
          <Typography.Paragraph type="secondary">
            Tegram là nền tảng chia sẻ nội dung và kết nối cộng đồng. Đăng nhập để bắt đầu khám phá.
          </Typography.Paragraph>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 12 }}>
            <Button type="primary" size="large" onClick={() => navigate('/login')}>Đăng nhập</Button>
            <Button type="default" size="large" onClick={() => navigate('/intro')}>Tìm hiểu thêm</Button>
          </div>
        </Card>
      </div>
    );
  }

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || loadingFeed || !isLoggedIn) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadFeed({ nextPage: page + 1, append: true });
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingFeed, page, isLoggedIn]);

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

  const activeCommentPost = useMemo(
    () => posts.find((post) => post._id === commentModalPostId) || null,
    [commentModalPostId, posts],
  );

  const visiblePosts = useMemo(
    () => posts.filter((post) => !hiddenPostIds.includes(post._id)),
    [hiddenPostIds, posts],
  );

  const updatePost = (postId, updater) => {
    setPosts((prev) =>
      prev.map((post) => (post._id === postId ? updater(post) : post)),
    );
  };

  // Keep postsRef in sync so openTargetPost can read latest posts without
  // having `posts` as a dependency (which caused multiple concurrent runs)
  useEffect(() => { postsRef.current = posts; }, [posts]);

  useEffect(() => {
    if (!isLoggedIn || !targetPostId) return;

    let cancelled = false;

    const openTargetPost = async () => {
      // Use ref so we always see the latest posts without re-running on every posts change
      const hasPost = postsRef.current.some((post) => post._id === targetPostId);
      if (!hasPost) {
        const res = await getPostByIdApi(targetPostId);
        if (cancelled) return;
        if (res?.EC === 0) {
          setPosts((prev) => [
            res.data,
            ...prev.filter((post) => post._id !== targetPostId),
          ]);
          // Wait for React to commit the new post to the DOM before scrolling
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          message.error(res?.EM || "Không thể mở bài viết từ thông báo");
          setSearchParams({}, { replace: true });
          return;
        }
      }

      if (cancelled) return;
      setHighlightedPostId(targetPostId);
      setHighlightedCommentId(targetCommentId || "");
      scrollToPostTarget(targetPostId, targetCommentId);
      window.setTimeout(() => {
        if (!cancelled) {
          setHighlightedPostId("");
          setHighlightedCommentId("");
        }
      }, 3500);
      setSearchParams({}, { replace: true });
    };

    openTargetPost();

    // Cleanup: mark as cancelled if targetPostId changes before async completes
    return () => { cancelled = true; };
  }, [isLoggedIn, targetPostId, targetCommentId]); // posts intentionally excluded – use postsRef instead
  const removeCommentFromPost = (postId, commentId) => {
    updatePost(postId, (post) => ({
      ...post,
      comments: (post.comments || [])
        .filter((comment) => comment._id !== commentId)
        .map((comment) => ({
          ...comment,
          replies: (comment.replies || []).filter((reply) => reply._id !== commentId),
        })),
    }));
  };

  const handleCreatePost = async () => {
    const formData = new FormData();
    formData.append("content", postContent);
    formData.append("visibility", visibility);
    postMediaFiles.forEach((file) => {
      formData.append("media", file.originFileObj || file);
    });

    const res = await createPostApi(formData);
    if (res?.EC === 0) {
      setPostContent("");
      setPostMediaFiles([]);
      setComposeOpen(false);
      message.success("Đã đăng bài");
      await loadFeed({ nextPage: 1 });
      await loadTrending();
    } else {
      message.error(res?.EM || "Không thể đăng bài");
    }
  };

  const handleMediaChange = ({ fileList }) => {
    setPostMediaFiles(fileList.slice(0, 10));
  };

  const removeMediaFile = (uid) => {
    setPostMediaFiles((prev) => prev.filter((file) => file.uid !== uid));
  };

  const requireAuthentication = (actionName) => {
    if (!isAuthenticated) {
      message.warning(`Vui lòng đăng nhập để ${actionName}`);
      navigate("/login");
      return false;
    }
    return true;
  };

  const handleReact = async (postId, type) => {
    if (!requireAuthentication("thích bài viết")) return;
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

  const handleComment = async (postId, contentOverride) => {
    if (!requireAuthentication("bình luận")) return;
    const content = (contentOverride ?? commentDrafts[postId] ?? "").trim();
    if (!content) return;
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

  const handleReply = async (postId, commentId, contentOverride) => {
    if (!requireAuthentication("trả lời bình luận")) return;
    const content = (contentOverride ?? replyDrafts[commentId] ?? "").trim();
    if (!content) return;
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
    if (!requireAuthentication("chia sẻ bài viết")) return;
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
    setNotificationOpen(false);
    navigate(getNotificationTargetUrl(item));
    setHighlightedPostId(postId);
    setHighlightedCommentId(commentId || "");
    if (commentId) setCommentModalPostId(postId);

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

  const renderPostMenu = (post) => {
    const isAuthor = post.author?._id === user?._id;
    const items = [
      {
        key: "save",
        icon: <BookOutlined />,
        label: post.isSaved ? "Bỏ lưu bài viết" : "Lưu bài viết",
      },
    ];

    if (isAuthor) {
      items.push(
        {
          key: "pin",
          icon: <PushpinOutlined />,
          label: post.isPinned ? "Bỏ ghim bài viết" : "Ghim bài viết",
        },
        {
          key: "edit",
          icon: <EditOutlined />,
          label: "Chỉnh sửa bài viết",
        },
        {
          key: "delete",
          icon: <DeleteOutlined />,
          label: "Xóa bài viết",
          danger: true,
        }
      );
    } else {
      items.push(
        {
          key: "follow",
          icon: <UserAddOutlined />,
          label: "Theo dõi tác giả",
        },
        {
          key: "friend",
          icon: <TeamOutlined />,
          label: "Gửi lời mời kết bạn",
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
          danger: true,
        }
      );
    }

    return {
      items,
      onClick: async ({ key }) => {
        if (!isAuthenticated) {
          message.warning("Vui long dang nhap de thuc hien hanh dong nay");
          navigate("/login");
          return;
        }
        if (key === "save") {
          const res = post.isSaved ? await unsavePostApi(post._id) : await savePostApi(post._id);
          if (res?.EC === 0) {
            setPosts((prev) =>
              prev.map((p) =>
                p._id === post._id ? { ...p, isSaved: !post.isSaved } : p,
              ),
            );
            message.success(res.EM || (post.isSaved ? "Đã bỏ lưu bài viết" : "Đã lưu bài viết"));
          } else {
            message.error(res?.EM || "Không thể cập nhật trạng thái lưu");
          }
        }
        if (key === "pin") {
          const res = await pinPostApi(post._id);
          if (res?.EC === 0) {
            message.success(res?.EM);
            setPosts((prev) =>
              prev.map((p) => {
                if (p.author?._id === user?._id) {
                  return {
                    ...p,
                    isPinned: p._id === post._id ? !p.isPinned : false,
                  };
                }
                return p;
              })
            );
          } else {
            message.error(res?.EM || "Thất bại");
          }
        }
        if (key === "edit") {
          setPostToEdit(post);
          setCreatePostVisible(true);
        }
        if (key === "delete") {
          Modal.confirm({
            title: "Xóa bài viết",
            content: "Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.",
            okText: "Xóa",
            okType: "danger",
            cancelText: "Hủy",
            onOk: async () => {
              const res = await deletePostApi(post._id);
              if (res?.EC === 0) {
                message.success("Xóa bài viết thành công");
                setPosts((prev) => prev.filter((p) => p._id !== post._id));
              } else {
                message.error(res?.EM || "Thất bại");
              }
            },
          });
        }
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
    };
  };
  const handleEditPost = (post) => {
    let content = post.content || "";
    Modal.confirm({
      title: "Chỉnh sửa bài viết",
      content: (
        <Input.TextArea
          autoSize={{ minRows: 3, maxRows: 8 }}
          defaultValue={content}
          onChange={(event) => {
            content = event.target.value;
          }}
        />
      ),
      okText: "Lưu",
      cancelText: "Hủy",
      onOk: async () => {
        const res = await updatePostApi(post._id, { content });
        if (res?.EC === 0) {
          setPosts((prev) => prev.map((item) => (item._id === post._id ? res.data : item)));
          message.success(res.EM || "Đã cập nhật bài viết");
        } else {
          message.error(res?.EM || "Không thể cập nhật bài viết");
        }
      },
    });
  };

  const renderCommentList = (post, { preview = false } = {}) => {
    const comments = post.comments || [];
    const visibleComments = preview ? comments.slice(-1) : comments;

    if (preview && !visibleComments.length) return null;

    return (
      <>
        <List
          className={preview ? "comment-list comment-list-preview" : "comment-list"}
          dataSource={visibleComments}
          locale={{ emptyText: "Chưa có bình luận" }}
          renderItem={(comment) => (
            <List.Item
              id={`comment-${comment._id}`}
              className={`comment-item ${
                highlightedCommentId === comment._id ? "comment-item-highlight" : ""
              }`}
            >
              <div className="comment-thread">
                <Space
                  align="start"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/profile/${comment.author?._id}`)}
                >
                  <Avatar
                    size={32}
                    src={comment.author?.avatar}
                    icon={<UserOutlined />}
                  >
                    {comment.author?.name?.[0] || "U"}
                  </Avatar>
                  <div className="comment-bubble">
                    <Typography.Text strong>{comment.author?.name}</Typography.Text>
                    <Typography.Paragraph className="mb-0">
                      {comment.content}
                    </Typography.Paragraph>
                  </div>
                </Space>

                {!preview ? (
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
                        onClick={() => navigate(`/profile/${reply.author?._id}`)}
                      >
                        <Avatar
                          size={26}
                          src={reply.author?.avatar}
                          icon={<UserOutlined />}
                        >
                          {reply.author?.name?.[0] || "U"}
                        </Avatar>
                        <div className="reply-bubble">
                          <Typography.Text strong>{reply.author?.name}</Typography.Text>
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
                        onPressEnter={() => handleReply(post._id, comment._id)}
                        placeholder="Trả lời bình luận..."
                      />
                      <Button onClick={() => handleReply(post._id, comment._id)}>
                        Trả lời
                      </Button>
                    </Space.Compact>
                  </div>
                ) : null}
              </div>
            </List.Item>
          )}
        />
      </>
    );
  };

  return (
    <div className="home-page-layout">
      <main className="social-feed">
        {/* Tabs: Dành cho bạn / Đã theo dõi */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            className={`flex-1 py-4 text-center font-semibold ${
              mode === "latest"
                ? "text-purple-700 border-b-2 border-purple-700"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setMode("latest")}
          >
            Dành cho bạn
          </button>
          <button
            className={`flex-1 py-4 text-center font-semibold ${
              mode === "friends"
                ? "text-purple-700 border-b-2 border-purple-700"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setMode("friends")}
          >
            Đã theo dõi
          </button>
        </div>

        <CreatePostComposer
          avatar={user?.avatar}
          content={postContent}
          files={postMediaFiles}
          modalPlaceholder="Bạn đang nghĩ gì thế?..."
          name={displayName}
          onContentChange={setPostContent}
          onFilesChange={(fileList) => setPostMediaFiles(fileList)}
          onOpenChange={setComposeOpen}
          onRemoveFile={removeMediaFile}
          onSubmit={handleCreatePost}
          open={composeOpen}
          triggerPlaceholder="Bạn viết gì đi..."
          visibilityOptions={[
            { value: "public", label: "Công khai" },
            { value: "friends", label: "Bạn bè" },
            { value: "private", label: "Riêng tư" },
          ]}
          visibilityValue={visibility}
          onVisibilityChange={setVisibility}
        />

        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          {visiblePosts.length ? (
            visiblePosts.map((post) => (
              <Card
                key={post._id}
                id={`post-${post._id}`}
                className={`post-card mb-4 ${highlightedPostId === post._id ? "post-card-highlight" : ""}`}
              >
                {/* Post Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3" style={{ cursor: "pointer" }} onClick={() => navigate(`/profile/${post.author?._id}`)}>
                    <Avatar
                      size={40}
                      src={getMediaUrl(post.author?.avatar)}
                      icon={<UserOutlined />}
                      className="bg-purple-600 text-white font-bold"
                    >
                      {post.author?.name?.[0] || "U"}
                    </Avatar>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {post.author?.name}
                        {post.group && (
                          <span className="text-purple-600 ml-2">
                            in {post.group.name}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(post.createdAt).toLocaleString("vi-VN")}
                      </div>
                    </div>
                  </div>
                  <Dropdown menu={renderPostMenu(post)} trigger={["click"]}>
                    <Button
                      shape="circle"
                      type="text"
                      icon={<EllipsisOutlined className="text-gray-500" />}
                    />
                  </Dropdown>
                </div>

                {/* Post Content */}
                <Typography.Paragraph className="post-content text-gray-800 mb-3">
                  {renderPostContent(post.content)}
                </Typography.Paragraph>

                {/* Shared Post */}
                {post.sharedPost && (
                  <div
                    className="border border-gray-200 rounded-lg p-3 mb-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      const sp = post.sharedPost;
                      const groupId = sp.group?._id || sp.group;
                      if (groupId) {
                        navigate(`/groups/${groupId}?postId=${sp._id}`);
                      } else {
                        navigate(`/?postId=${sp._id}`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar
                        size={24}
                        src={getMediaUrl(post.sharedPost.author?.avatar)}
                        icon={<UserOutlined />}
                      >
                        {post.sharedPost.author?.name?.[0] || "U"}
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm leading-tight">
                          {post.sharedPost.author?.name}
                          {post.sharedPost.group?.name && (
                            <span className="text-purple-600 font-normal">
                              {" "}trong{" "}
                              <span className="font-semibold">{post.sharedPost.group.name}</span>
                            </span>
                          )}
                        </span>
                        {post.sharedPost.createdAt && (
                          <span className="text-xs text-gray-400 leading-tight">
                            {new Date(post.sharedPost.createdAt).toLocaleString("vi-VN")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Typography.Paragraph className="text-gray-800 mb-2">
                      {renderPostContent(post.sharedPost.content)}
                    </Typography.Paragraph>
                    {normalizePostMedia(post.sharedPost.media).length ? (
                      <div className="post-media-grid">
                        {normalizePostMedia(post.sharedPost.media).map((item, idx) => {
                          const src = getMediaUrl(item.url);
                          return item.type === "video" ? (
                            <video
                              key={`${src}-${idx}`}
                              className="post-media-item rounded-lg"
                              controls
                              src={src}
                            />
                          ) : (
                            <Image
                              key={`${src}-${idx}`}
                              className="post-media-item rounded-lg"
                              src={src}
                              alt={item.originalName || "post media"}
                            />
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Post Hashtags */}
                {post.hashtags?.length ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.hashtags.map((tag) => (
                      <Tag key={tag} color="blue" className="m-0">
                        #{tag}
                      </Tag>
                    ))}
                  </div>
                ) : null}

                {/* Post Media (only if not a shared post, or if the share has its own media?) */}
                {!post.sharedPost && normalizePostMedia(post.media).length ? (
                  <div className="post-media-grid mb-3">
                    {normalizePostMedia(post.media).map((item, idx) => {
                      const src = getMediaUrl(item.url);
                      return item.type === "video" ? (
                        <video
                          key={`${src}-${idx}`}
                          className="post-media-item rounded-lg"
                          controls
                          src={src}
                        />
                      ) : (
                        <Image
                          key={`${src}-${idx}`}
                          className="post-media-item rounded-lg"
                          src={src}
                          alt={item.originalName || "post media"}
                        />
                      );
                    })}
                  </div>
                ) : null}

                {/* Post Stats */}
                <div className="flex items-center justify-between text-gray-500 text-sm mb-3 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      👍 {post.stats?.reactions || 0}
                    </span>
                  </div>
                  <div>
                    {post.stats?.comments || 0} bình luận · {post.stats?.shares || 0} chia sẻ
                  </div>
                </div>

                {/* Post Actions */}
                <div className="flex items-center justify-around py-2">
                  <ReactionPicker
                    myReaction={post.myReaction}
                    onReact={(type) => handleReact(post._id, type)}
                  />
                  <Button
                    type="text"
                    icon={<CommentOutlined />}
                    onClick={() => setCommentModalPostId(post._id)}
                    className="flex-1 justify-center"
                  >
                    Bình luận
                  </Button>
                  <Button
                    type="text"
                    icon={<RetweetOutlined />}
                    onClick={() => handleShare(post._id)}
                    className="flex-1 justify-center"
                  >
                    Chia sẻ
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="post-card">
              <Empty description="Chưa có bài viết nào" />
            </Card>
          )}
          {/* Infinite Scroll Sentinel element */}
          {hasMore && (
            <div
              ref={observerTarget}
              style={{
                padding: "24px 0",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
              }}
            >
              <Spin size="large" tip="Đang tải thêm bài viết..." />
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "32px 0 16px",
                color: "#8c8c8c",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              🎉 Bạn đã xem hết bài viết mới.
            </div>
          )}
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

      <PostCommentsModal
        open={Boolean(activeCommentPost)}
        post={activeCommentPost}
        onClose={() => setCommentModalPostId("")}
        currentUser={{ ...user, name: displayName, avatar: userProfile?.avatar || user?.avatar }}
        commentValue={activeCommentPost ? commentDrafts[activeCommentPost._id] || "" : ""}
        onCommentChange={(value) =>
          activeCommentPost &&
          setCommentDrafts((prev) => ({
            ...prev,
            [activeCommentPost._id]: value,
          }))
        }
        onSubmitComment={handleComment}
        replyDrafts={replyDrafts}
        onReplyChange={(commentId, value) =>
          setReplyDrafts((prev) => ({ ...prev, [commentId]: value }))
        }
        onSubmitReply={handleReply}
        onAuthorClick={(authorId) => authorId && navigate(`/profile/${authorId}`)}
        onReact={(post) => handleReact(post._id, "like")}
        onShare={(post) => handleShare(post._id)}
        onHideComment={async (post, commentId) => {
          const res = await hideCommentApi(commentId);
          if (res?.EC === 0) {
            removeCommentFromPost(post._id, commentId);
            message.success(res.EM || "Đã ẩn bình luận");
          } else {
            message.error(res?.EM || "Không thể ẩn bình luận");
          }
        }}
        onReportComment={(post, comment) =>
          askReason("Báo cáo bình luận", async (reason) => {
            const res = await reportCommentApi(comment._id, reason);
            if (res?.EC === 0) {
              message.success(res.EM || "Đã gửi báo cáo");
            } else {
              message.error(res?.EM || "Không thể gửi báo cáo");
            }
          })
        }
        highlightedCommentId={highlightedCommentId}
      />

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

      <CreatePostModal
        open={createPostVisible}
        onCancel={() => {
          setCreatePostVisible(false);
          setPostToEdit(null);
        }}
        onSuccess={(updatedPost) => {
          if (postToEdit) {
            setPosts((prev) => prev.map((p) => p._id === updatedPost._id || p.id === updatedPost.id ? updatedPost : p));
          } else {
            setPosts((prev) => [updatedPost, ...prev]);
          }
          loadTrending();
        }}
        currentUser={user}
        postToEdit={postToEdit}
      />
    </div>
  );
};

export default HomePage;
