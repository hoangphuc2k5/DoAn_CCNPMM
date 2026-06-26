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
  EditOutlined,
  DeleteOutlined,
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
  updatePostApi,
  deletePostApi,
  pinPostApi,
} from "../util/api";
import { getMediaUrl } from "../util/media";
import CreatePostModal from "../components/profile/CreatePostModal";
import MentionInput from "../components/ui/MentionInput";
import { getNotificationTargetUrl } from "../util/notification";
  deletePostApi,
  updatePostApi,
} from "../util/api";
import { getMediaUrl } from "../util/media";
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
  const targetPostId = searchParams.get("postId");
  const targetCommentId = searchParams.get("commentId");
  const [commentModalPostId, setCommentModalPostId] = useState("");
  const [hiddenPostIds, setHiddenPostIds] = useState([]);

  const isLoggedIn = Boolean(isAuthenticated);
  const displayName = user?.name || user?.email || "User";

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

  useEffect(() => {
    if (!isLoggedIn || !targetPostId) return;

    const openTargetPost = async () => {
      const hasPost = posts.some((post) => post._id === targetPostId);
      if (!hasPost) {
        const res = await getPostByIdApi(targetPostId);
        if (res?.EC === 0) {
          setPosts((prev) => [
            res.data,
            ...prev.filter((post) => post._id !== targetPostId),
          ]);
        } else {
          message.error(res?.EM || "Không thể mở bài viết từ thông báo");
          setSearchParams({}, { replace: true });
          return;
        }
      }

      setHighlightedPostId(targetPostId);
      setHighlightedCommentId(targetCommentId || "");
      scrollToPostTarget(targetPostId, targetCommentId);
      window.setTimeout(() => {
        setHighlightedPostId("");
        setHighlightedCommentId("");
      }, 3500);
      setSearchParams({}, { replace: true });
    };

    openTargetPost();
  }, [isLoggedIn, targetPostId, targetCommentId, posts]);
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

  const handleComment = async (postId, contentOverride) => {
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
    const items = [];

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

  const renderPostMenu = (post) => {
    const isMine = post.author?._id === user?._id;
    return {
      items: isMine
        ? [
            { key: "edit", icon: <EditOutlined />, label: "Chỉnh sửa bài viết" },
            { key: "delete", icon: <DeleteOutlined />, label: "Xóa bài viết", danger: true },
          ]
        : [
            { key: "hide", icon: <EyeInvisibleOutlined />, label: "Ẩn bài viết" },
            { key: "follow", icon: <UserAddOutlined />, label: "Theo dõi tác giả" },
            { key: "friend", icon: <TeamOutlined />, label: "Gửi lời mời kết bạn" },
            { key: "report", icon: <FlagOutlined />, label: "Báo cáo bài viết" },
            { key: "block", icon: <StopOutlined />, label: "Chặn người dùng", danger: true },
          ],
    onClick: async ({ key }) => {
      if (key === "edit") {
        handleEditPost(post);
      }
      if (key === "delete") {
        Modal.confirm({
          title: "Xóa bài viết?",
          okText: "Xóa",
          okButtonProps: { danger: true },
          cancelText: "Hủy",
          onOk: async () => {
            const res = await deletePostApi(post._id);
            if (res?.EC === 0) {
              setPosts((prev) => prev.filter((item) => item._id !== post._id));
              message.success(res.EM || "Đã xóa bài viết");
            } else {
              message.error(res?.EM || "Không thể xóa bài viết");
            }
          },
        });
      }
      if (key === "hide") {
        const res = await hidePostApi(post._id);
        if (res?.EC === 0) {
          setHiddenPostIds((prev) => (prev.includes(post._id) ? prev : [...prev, post._id]));
          message.success(res.EM || "Đã ẩn bài viết");
        } else {
          message.error(res?.EM || "Không thể ẩn bài viết");
        }
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
          if (res?.EC === 0) {
            message.success(res.EM || "Đã gửi báo cáo");
          } else {
            message.error(res?.EM || "Không thể gửi báo cáo");
          }
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
        <Card className="composer-card" onClick={() => setCreatePostVisible(true)} style={{ cursor: "pointer" }}>
        <CreatePostComposer
          avatar={userProfile?.avatar || user?.avatar}
          content={postContent}
          files={postMediaFiles}
          modalPlaceholder="Tạo bài viết công khai..."
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
          ]}
          visibilityValue={visibility}
          onVisibilityChange={setVisibility}
        />

        <Card className="composer-card composer-card-collapsed legacy-composer-hidden">
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
              value=""
              readOnly
              onClick={() => setComposeOpen(true)}
              onFocus={() => setComposeOpen(true)}
              value=""
              onChange={(event) => setPostContent(event.target.value)}
              placeholder={`${displayName}, bạn đang nghĩ gì?`}
              readOnly
            />
          </div>
          <Input.TextArea
            className="composer-textarea"
            rows={3}
            value=""
            placeholder="Viết bài đăng... dùng @email để mention và #topic để tạo trending"
            readOnly
          />
          <div className="composer-media">
            <Upload
              accept="image/*,video/*"
              beforeUpload={() => false}
              fileList={postMediaFiles}
              multiple
              onChange={handleMediaChange}
              showUploadList={false}
            >
              <Button icon={<PictureOutlined />}>Them anh/video</Button>
            </Upload>
            {postMediaFiles.length ? (
              <div className="composer-media-list">
                {postMediaFiles.map((file) => (
                  <Tag
                    key={file.uid}
                    closable
                    closeIcon={<DeleteOutlined />}
                    onClose={(event) => {
                      event.preventDefault();
                      removeMediaFile(file.uid);
                    }}
                  >
                    {file.name}
                  </Tag>
                ))}
              </div>
            ) : null}
          </div>
          <Divider className="compact-divider" />
          <div className="composer-actions">
            <Select
              value={visibility}
              open={false}
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
              disabled={!postContent.trim() && postMediaFiles.length === 0}
            >
              Đăng bài
            </Button>
          </div>
        </Card>

        <Modal
          className="create-post-modal"
          title={<div className="create-post-title">Tạo bài viết</div>}
          open={false}
          onCancel={() => setComposeOpen(false)}
          footer={null}
          width={620}
          centered
        >
          <div className="create-post-author">
            <Avatar
              size={48}
              src={getMediaUrl(userProfile?.avatar)}
              icon={<UserOutlined />}
            >
              {displayName[0]}
            </Avatar>
            <div>
              <strong>{displayName}</strong>
              <Select
                value={visibility}
                onChange={setVisibility}
                suffixIcon={<GlobalOutlined />}
                options={[
                  { value: "public", label: "Công khai" },
                  { value: "friends", label: "Bạn bè" },
                ]}
                size="small"
                style={{ minWidth: 132 }}
              />
            </div>
          </div>
          <Input.TextArea
            className="create-post-textarea"
            autoFocus
            autoSize={{ minRows: 7, maxRows: 12 }}
            value={postContent}
            onChange={(event) => setPostContent(event.target.value)}
            placeholder="Tạo bài viết công khai..."
          />
          <div className="create-post-addons">
            <strong>Thêm vào bài viết của bạn</strong>
            <Upload
              accept="image/*,video/*"
              beforeUpload={() => false}
              fileList={postMediaFiles}
              multiple
              onChange={handleMediaChange}
              showUploadList={false}
            >
              <Button icon={<PictureOutlined />} shape="circle" type="text" />
            </Upload>
          </div>
          {postMediaFiles.length ? (
            <div className="composer-media-list create-post-file-list">
              {postMediaFiles.map((file) => (
                <Tag
                  key={file.uid}
                  closable
                  closeIcon={<DeleteOutlined />}
                  onClose={(event) => {
                    event.preventDefault();
                    removeMediaFile(file.uid);
                  }}
                >
                  {file.name}
                </Tag>
              ))}
            </div>
          ) : null}
          <Button
            block
            className="create-post-submit"
            type="primary"
            onClick={handleCreatePost}
            disabled={!postContent.trim() && postMediaFiles.length === 0}
          >
            Đăng
          </Button>
        </Modal>

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
          {visiblePosts.length ? (
            visiblePosts.map((post) => (
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
                        {post.visibility === "friends" ? "👥 Bạn bè" : post.visibility === "private" ? "🔒 Chỉ mình tôi" : "🌐 Công khai"}
                        {post.isPinned && <span className="ml-2 font-semibold text-purple-600">📌 Đã ghim</span>}
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
                  {renderPostContent(post.content)}
                </Typography.Paragraph>

                {post.media && post.media.length > 0 ? (
                  <div className="post-media-gallery my-3 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center max-h-[400px]">
                    {post.media[0].includes("#type=video") || post.media[0].endsWith(".mp4") || post.media[0].endsWith(".mov") || post.media[0].includes("/video/") ? (
                      <video
                        src={getMediaUrl(post.media[0])}
                        controls
                        className="max-w-full max-h-[400px] object-contain"
                      />
                    ) : (
                      <img
                        src={getMediaUrl(post.media[0])}
                        alt="Post media"
                        className="max-w-full max-h-[400px] object-contain"
                      />
                    )}
                  </div>
                ) : null}

                {post.hashtags?.length ? (
                  <Space wrap className="post-tags">
                    {post.hashtags.map((tag) => (
                      <Tag key={tag} color="blue">
                        #{tag}
                      </Tag>
                    ))}
                  </Space>
                ) : null}

                {normalizePostMedia(post.media).length ? (
                  <div className="post-media-grid">
                    {normalizePostMedia(post.media).map((item, idx) => {
                      const src = getMediaUrl(item.url);
                      return item.type === "video" ? (
                        <video
                          key={`${src}-${idx}`}
                          className="post-media-item"
                          controls
                          src={src}
                        />
                      ) : (
                        <Image
                          key={`${src}-${idx}`}
                          className="post-media-item"
                          src={src}
                          alt={item.originalName || "post media"}
                        />
                      );
                    })}
                  </div>
                ) : null}

                {post.sharedPost ? (
                  <div
                    className="shared-post"
                    style={{ cursor: "pointer" }}
                    title="Xem bài viết gốc"
                    onClick={() => {
                      const origId = post.sharedPost._id;
                      const hasIt = posts.some((p) => p._id === origId);
                      if (hasIt) {
                        setHighlightedPostId(origId);
                        scrollToPostTarget(origId, null);
                        setTimeout(() => setHighlightedPostId(""), 3500);
                      } else {
                        getPostByIdApi(origId).then((res) => {
                          if (res?.EC === 0) {
                            setPosts((prev) => [res.data, ...prev.filter((p) => p._id !== origId)]);
                            setHighlightedPostId(origId);
                            scrollToPostTarget(origId, null);
                            setTimeout(() => setHighlightedPostId(""), 3500);
                          } else {
                            message.error("Không thể mở bài viết gốc");
                          }
                        });
                      }
                    }}
                  >
                    <Typography.Text strong style={{ display: "block", marginBottom: 4 }}>
                      🔗 Bài gốc của {post.sharedPost.author?.name}
                    </Typography.Text>
                    <Typography.Paragraph className="mb-0">
                      {renderPostContent(post.sharedPost.content)}
                    </Typography.Paragraph>
                    {post.sharedPost.media?.length > 0 && (
                      <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden", maxHeight: 160 }}>
                        <img
                          src={getMediaUrl(post.sharedPost.media[0])}
                          alt=""
                          style={{ width: "100%", objectFit: "cover", maxHeight: 160 }}
                        />
                      </div>
                    )}
                    <div style={{ marginTop: 6, fontSize: 12, color: "#7F00FD", fontWeight: 600 }}>
                      Nhấn để xem bài gốc →
                    </div>
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
                  <ReactionPicker
                    myReaction={post.myReaction}
                    onReact={(type) => handleReact(post._id, type)}
                  />
                  <Button
                    type="text"
                    icon={<CommentOutlined />}
                    onClick={() => {
                      setFocusedCommentPostId(post._id);
                      setTimeout(() => {
                        const el = commentInputRefs.current[post._id];
                        if (el) {
                          el.focus?.();
                          el.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
                        }
                      }, 80);
                    }}
                  >
                    Like
                  </Button>
                  <Button
                    type="text"
                    icon={<CommentOutlined />}
                    onClick={() => setCommentModalPostId(post._id)}
                  >
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
                  <Space.Compact
                    className="comment-input"
                    style={focusedCommentPostId === post._id ? {
                      borderRadius: 20,
                      boxShadow: "0 0 0 2px rgba(127,0,253,.35)",
                      transition: "box-shadow .2s",
                    } : { transition: "box-shadow .2s" }}
                  >
                    <MentionInput
                      type="input"
                      value={commentDrafts[post._id] || ""}
                      onChange={(event) =>
                        setCommentDrafts((prev) => ({
                          ...prev,
                          [post._id]: event.target.value,
                        }))
                      }
                      onPressEnter={(raw) => handleComment(post._id, raw)}
                      placeholder="Viết bình luận..."
                      inputRef={(el) => { commentInputRefs.current[post._id] = el; }}
                      onFocus={() => setFocusedCommentPostId(post._id)}
                      onBlur={() => setFocusedCommentPostId(null)}
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
                              {renderPostContent(comment.content)}
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
                                  {renderPostContent(reply.content)}
                                </Typography.Paragraph>
                              </div>
                            </Space>
                          ))}
                          <Space.Compact className="reply-input">
                            <MentionInput
                              type="input"
                              value={replyDrafts[comment._id] || ""}
                              onChange={(event) =>
                                setReplyDrafts((prev) => ({
                                  ...prev,
                                  [comment._id]: event.target.value,
                                }))
                              }
                              onPressEnter={(raw) =>
                                handleReply(post._id, comment._id, raw)
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
                {renderCommentList(post, { preview: true })}
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
