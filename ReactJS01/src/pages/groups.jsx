import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Avatar,
  Button,
  Dropdown,
  Empty,
  Form,
  Image,
  Input,
  Modal,
  Popover,
  Radio,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import {
  BellOutlined,
  BookOutlined,
  CameraOutlined,
  CalendarOutlined,
  CommentOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  EyeInvisibleOutlined,
  FlagOutlined,
  LeftOutlined,
  PictureOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import {
  attendGroupEventApi,
  createGroupApi,
  createGroupEventApi,
  createGroupPostApi,
  commentPostApi,
  deleteCommentApi,
  deletePostApi,
  getGroupApi,
  getGroupEventsApi,
  getGroupJoinRequestsApi,
  getGroupMediaApi,
  getGroupPendingPostsApi,
  getGroupPostsApi,
  getGroupReportsApi,
  getGroupsApi,
  hideCommentApi,
  hidePostApi,
  joinGroupApi,
  leaveGroupApi,
  leaveGroupEventApi,
  removeGroupMemberApi,
  reportCommentApi,
  reportPostApi,
  resolveGroupReportApi,
  replyCommentApi,
  respondGroupJoinRequestApi,
  reviewGroupPostApi,
  savePostApi,
  updateGroupApi,
  updateGroupMemberRoleApi,
  updatePostApi,
  reactPostApi,
  sharePostApi,
  unsavePostApi,
  uploadGroupAvatarApi,
  uploadGroupCoverApi,
} from "../util/api";
import { getMediaUrl } from "../util/media";
import CreatePostComposer from "../components/post/CreatePostComposer";
import PostCommentsModal from "../components/post/PostCommentsModal";
import ReactionSummary from "../components/post/ReactionSummary";
import MentionInput from "../components/ui/MentionInput";
import { applyPostReaction } from "../util/reactions";

const renderMentionContent = (text = "") => {
  if (!text) return "";
  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <span key={`${match.index}-${match[2]}`} style={{ color: "#1677ff", fontWeight: 700 }}>
        {match[1]}
      </span>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : text;
};
const normalizeMedia = (media = []) =>
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

const formatCount = (value = 0) => Number(value || 0).toLocaleString("vi-VN");

const formatDateTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "T";

const getMemberId = (member) => member?._id || member;

const getMemberRole = (group, member) => {
  const memberId = getMemberId(member);
  if (group?.admins?.some((item) => getMemberId(item) === memberId)) return "admin";
  if (group?.moderators?.some((item) => getMemberId(item) === memberId)) return "moderator";
  return "member";
};

const roleText = {
  admin: "Admin",
  moderator: "Mod",
  member: "Thành viên",
  guest: "Khách",
};

const reactionOptions = [
  { value: "like", label: "Thích", icon: "👍" },
  { value: "love", label: "Yêu thích", icon: "❤️" },
  { value: "haha", label: "Haha", icon: "😆" },
  { value: "wow", label: "Wow", icon: "😮" },
  { value: "sad", label: "Buồn", icon: "😢" },
  { value: "angry", label: "Phẫn nộ", icon: "😡" },
];

const getReactionOption = (type) =>
  reactionOptions.find((item) => item.value === type) || reactionOptions[0];

const GroupsPage = () => {
  const navigate = useNavigate();
  const { groupId: routeGroupId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetPostId = searchParams.get("postId");
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const userProfile = useSelector((state) => state.userProfile.profileUser);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [groupMedia, setGroupMedia] = useState([]);
  const [events, setEvents] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [groupReports, setGroupReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("directory");
  const [listTab, setListTab] = useState("mine");
  const [detailTab, setDetailTab] = useState("posts");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [postComposerOpen, setPostComposerOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postFiles, setPostFiles] = useState([]);
  const [postVisibility, setPostVisibility] = useState("group");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [commentModalPostId, setCommentModalPostId] = useState("");
  const [hiddenPostIds, setHiddenPostIds] = useState([]);
  const [highlightedPostId, setHighlightedPostId] = useState("");
  const postsRef = useRef([]);
  const [groupForm] = Form.useForm();
  const [eventForm] = Form.useForm();
  const [settingsForm] = Form.useForm();

  const canPost = selectedGroup?.isMember;
  const canComment = selectedGroup?.isMember;
  const canModerate = ["admin", "moderator"].includes(selectedGroup?.myRole);
  const canManageRoles = selectedGroup?.myRole === "admin";
  const settingPrivacy = Form.useWatch("privacy", settingsForm) || selectedGroup?.privacy;
  const displayName = userProfile?.name || user?.name || user?.email || "Nguoi Dung";

  const loadGroups = async () => {
    setLoading(true);
    const params = {
      ...(searchQuery.trim() ? { q: searchQuery.trim() } : {}),
    };
    const res = await getGroupsApi(params);
    setLoading(false);
    if (res?.EC === 0) {
      setGroups(res.data || []);
    } else {
      message.error(res?.EM || "Không thể tải danh sách nhóm");
    }
  };

  const loadGroupDetail = async (groupId) => {
    if (!groupId) return;
    const [groupRes, postRes, eventRes] = await Promise.all([
      getGroupApi(groupId),
      getGroupPostsApi(groupId, { page: 1, limit: 20 }),
      getGroupEventsApi(groupId),
    ]);

    if (groupRes?.EC === 0) {
      setSelectedGroup(groupRes.data);
      setPostVisibility(groupRes.data.defaultPostVisibility || "group");
      settingsForm.setFieldsValue({
        name: groupRes.data.name || "",
        description: groupRes.data.description || "",
        privacy: groupRes.data.privacy || "public",
        postApprovalEnabled: Boolean(groupRes.data.postApprovalEnabled),
        defaultPostVisibility: groupRes.data.defaultPostVisibility || "group",
      });
    }
    if (postRes?.EC === 0) {
      setPosts(postRes.data || []);
    } else {
      setPosts([]);
    }
    if (eventRes?.EC === 0) {
      setEvents(eventRes.data || []);
    } else {
      setEvents([]);
    }

    if (groupRes?.EC === 0 && (groupRes.data?.privacy !== "private" || groupRes.data?.isMember)) {
      const mediaRes = await getGroupMediaApi(groupId, { page: 1, limit: 60 });
      setGroupMedia(mediaRes?.EC === 0 ? mediaRes.data || [] : []);
    } else {
      setGroupMedia([]);
    }

    const canLoadRequests =
      groupRes?.EC === 0 && ["admin", "moderator"].includes(groupRes.data?.myRole);
    if (canLoadRequests) {
      const [requestRes, pendingRes, reportRes] = await Promise.all([
        getGroupJoinRequestsApi(groupId),
        getGroupPendingPostsApi(groupId),
        getGroupReportsApi(groupId),
      ]);
      setJoinRequests(requestRes?.EC === 0 ? requestRes.data || [] : []);
      setPendingPosts(pendingRes?.EC === 0 ? pendingRes.data || [] : []);
      setGroupReports(reportRes?.EC === 0 ? reportRes.data || [] : []);
    } else {
      setJoinRequests([]);
      setPendingPosts([]);
      setGroupReports([]);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadGroups();
  }, [isAuthenticated, navigate, searchQuery]);

  useEffect(() => {
    if (routeGroupId) {
      setSelectedGroupId(routeGroupId);
      setViewMode("detail");
      loadGroupDetail(routeGroupId);
      return;
    }

    setSelectedGroupId("");
    setSelectedGroup(null);
    setPosts([]);
    setGroupMedia([]);
    setEvents([]);
    setJoinRequests([]);
    setPendingPosts([]);
    setGroupReports([]);
    setCommentModalPostId("");
    setViewMode("directory");
  }, [routeGroupId]);

  const joinedCount = useMemo(
    () => groups.filter((group) => group.isMember).length,
    [groups],
  );

  const exploreCount = useMemo(
    () => groups.filter((group) => !group.isMember).length,
    [groups],
  );

  const visibleGroups = useMemo(
    () =>
      listTab === "mine"
        ? groups.filter((group) => group.isMember)
        : groups.filter((group) => !group.isMember),
    [groups, listTab],
  );

  const activeCommentPost = useMemo(
    () => posts.find((post) => post._id === commentModalPostId) || null,
    [commentModalPostId, posts],
  );

  const visiblePosts = useMemo(
    () => posts.filter((post) => !hiddenPostIds.includes(post._id)),
    [hiddenPostIds, posts],
  );

  const openGroup = (groupId) => {
    setDetailTab("posts");
    navigate(`/groups/${groupId}`);
  };

  const refreshCurrentGroup = async (groupId = selectedGroup?._id || selectedGroupId) => {
    await loadGroups();
    if (groupId) await loadGroupDetail(groupId);
  };

  const updateGroupPost = (postId, updater) => {
    setPosts((prev) => prev.map((post) => (post._id === postId ? updater(post) : post)));
  };

  // Keep postsRef in sync
  useEffect(() => { postsRef.current = posts; }, [posts]);

  // Scroll to target post when navigating with ?postId
  useEffect(() => {
    if (!targetPostId || !posts.length) return;
    let cancelled = false;
    const scrollToTarget = async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (cancelled) return;
      const el = document.getElementById(`post-${targetPostId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedPostId(targetPostId);
        setTimeout(() => { if (!cancelled) setHighlightedPostId(""); }, 3000);
      }
      setSearchParams({}, { replace: true });
    };
    scrollToTarget();
    return () => { cancelled = true; };
  }, [targetPostId, posts]);

  const removeCommentFromGroupPost = (postId, commentId) => {
    updateGroupPost(postId, (post) => ({
      ...post,
      comments: (post.comments || [])
        .filter((comment) => comment._id !== commentId)
        .map((comment) => ({
          ...comment,
          replies: (comment.replies || []).filter((reply) => reply._id !== commentId),
        })),
    }));
  };

  const handleCreateGroup = async () => {
    const values = await groupForm.validateFields();
    const res = await createGroupApi(values);
    if (res?.EC === 0) {
      message.success("Đã tạo nhóm");
      setCreateOpen(false);
      groupForm.resetFields();
      await loadGroups();
      if (res.data?._id) {
        setSelectedGroup(res.data);
        navigate(`/groups/${res.data._id}`);
      }
    } else {
      message.error(res?.EM || "Không thể tạo nhóm");
    }
  };

  const handleJoinToggle = async (group = selectedGroup) => {
    if (!group) return;
    const res = group.isMember
      ? await leaveGroupApi(group._id)
      : await joinGroupApi(group._id);
    if (res?.EC === 0) {
      message.success(res.EM || "Đã cập nhật thành viên");
      await refreshCurrentGroup(group._id);
    } else {
      message.error(res?.EM || "Không thể cập nhật thành viên");
    }
  };

  const handleRespondJoinRequest = async (requestId, action) => {
    const res = await respondGroupJoinRequestApi(selectedGroup._id, requestId, action);
    if (res?.EC === 0) {
      message.success(res.EM || "Đã xử lý yêu cầu");
      await refreshCurrentGroup();
    } else {
      message.error(res?.EM || "Không thể xử lý yêu cầu");
    }
  };

  const handleCreatePost = async () => {
    if (!selectedGroup) return;

    const formData = new FormData();
    formData.append("content", postContent);
    formData.append("visibility", selectedGroup?.privacy === "private" ? "group" : postVisibility);
    postFiles.forEach((file) => {
      formData.append("media", file.originFileObj || file);
    });

    const res = await createGroupPostApi(selectedGroup._id, formData);
    if (res?.EC === 0) {
      setPostContent("");
      setPostFiles([]);
      setPostComposerOpen(false);
      message.success("Đã đăng bài trong nhóm");
      await loadGroupDetail(selectedGroup._id);
    } else {
      message.error(res?.EM || "Không thể đăng bài");
    }
  };

  const canDeletePost = (post) =>
    post?.author?._id === user?._id || ["admin", "moderator"].includes(selectedGroup?.myRole);

  const canDeleteComment = (post, comment) =>
    comment?.author?._id === user?._id ||
    post?.author?._id === user?._id ||
    ["admin", "moderator"].includes(selectedGroup?.myRole);

  const handleCommentPost = async (postId, contentOverride) => {
    const content = (contentOverride ?? commentDrafts[postId] ?? "").trim();
    if (!content) return;

    const res = await commentPostApi(postId, content);
    if (res?.EC === 0) {
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      updateGroupPost(postId, (post) => ({
        ...post,
        comments: [...(post.comments || []), { ...res.data, replies: [] }],
        stats: { ...post.stats, comments: (post.stats?.comments || 0) + 1 },
      }));
    } else {
      message.error(res?.EM || "Không thể bình luận");
    }
  };

  const handleReplyComment = async (postId, commentId, contentOverride) => {
    const content = (contentOverride ?? replyDrafts[commentId] ?? "").trim();
    if (!content) return;

    const res = await replyCommentApi(commentId, postId, content);
    if (res?.EC === 0) {
      setReplyDrafts((prev) => ({ ...prev, [commentId]: "" }));
      updateGroupPost(postId, (post) => ({
        ...post,
        comments: (post.comments || []).map((comment) =>
          comment._id === commentId
            ? { ...comment, replies: [...(comment.replies || []), res.data] }
            : comment,
        ),
        stats: { ...post.stats, comments: (post.stats?.comments || 0) + 1 },
      }));
    } else {
      message.error(res?.EM || "Không thể trả lời bình luận");
    }
  };

  const handleDeleteComment = (post, comment) => {
    Modal.confirm({
      title: "Xóa bình luận?",
      content: "Bình luận và các trả lời bên dưới sẽ được ẩn khỏi bài viết.",
      okText: "Xóa",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        const res = await deleteCommentApi(comment._id);
        if (res?.EC === 0) {
          const deletedCount = res.data?.deletedCount || 1;
          updateGroupPost(post._id, (currentPost) => ({
            ...currentPost,
            comments: (currentPost.comments || [])
              .filter((item) => item._id !== comment._id)
              .map((item) => ({
                ...item,
                replies: (item.replies || []).filter((reply) => reply._id !== comment._id),
              })),
            stats: {
              ...currentPost.stats,
              comments: Math.max((currentPost.stats?.comments || 0) - deletedCount, 0),
            },
          }));
          message.success(res.EM || "Đã xóa bình luận");
        } else {
          message.error(res?.EM || "Không thể xóa bình luận");
        }
      },
    });
  };

  const handleDeletePost = (post) => {
    Modal.confirm({
      title: "Xóa bài viết?",
      content: "Bài viết, bình luận và reaction liên quan sẽ bị xóa khỏi nhóm.",
      okText: "Xóa",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        const res = await deletePostApi(post._id);
        if (res?.EC === 0) {
          setPosts((prev) => prev.filter((item) => item._id !== post._id));
          await loadGroups();
          message.success(res.EM || "Đã xóa bài viết");
        } else {
          message.error(res?.EM || "Không thể xóa bài viết");
        }
      },
    });
  };

  const handleReactPost = async (post, type) => {
    const res = await reactPostApi(post._id, type);
    if (res?.EC === 0) {
      updateGroupPost(post._id, (currentPost) =>
        applyPostReaction(currentPost, res.data?.type || null, {
          ...user,
          name: displayName,
          avatar: userProfile?.avatar || user?.avatar,
        }),
      );
    } else {
      message.error(res?.EM || "Không thể thả cảm xúc");
    }
  };

  const handleSharePost = (post) => {
    let content = "";
    Modal.confirm({
      title: "Chia sẻ bài viết",
      content: (
        <Input.TextArea
          rows={3}
          placeholder="Viết cảm nghĩ của bạn..."
          onChange={(event) => {
            content = event.target.value;
          }}
        />
      ),
      okText: "Chia sẻ",
      cancelText: "Hủy",
      onOk: async () => {
        const res = await sharePostApi(post._id, content);
        if (res?.EC === 0) {
          updateGroupPost(post._id, (currentPost) => ({
            ...currentPost,
            stats: {
              ...currentPost.stats,
              shares: (currentPost.stats?.shares || 0) + 1,
            },
          }));
          message.success(res.EM || "Đã chia sẻ bài viết");
        } else {
          message.error(res?.EM || "Không thể chia sẻ bài viết");
        }
      },
    });
  };

  const handleReportPost = (post) => {
    if (post.author?._id === user?._id) {
      message.warning("Không thể tự tố cáo bài viết của mình");
      return;
    }
    let reason = "";
    Modal.confirm({
      title: "Báo cáo bài viết",
      content: (
        <Input.TextArea
          rows={3}
          placeholder="Nhập lý do báo cáo"
          onChange={(event) => {
            reason = event.target.value;
          }}
        />
      ),
      okText: "Gửi báo cáo",
      cancelText: "Hủy",
      onOk: async () => {
        const res = await reportPostApi(post._id, reason);
        if (res?.EC === 0) {
          message.success(res.EM || "Đã gửi báo cáo");
        } else {
          message.error(res?.EM || "Không thể gửi báo cáo");
        }
      },
    });
  };

  const handleReportComment = (post, comment) => {
    if (comment.author?._id === user?._id) {
      message.warning("Không thể tự tố cáo bình luận của mình");
      return;
    }
    let reason = "";
    Modal.confirm({
      title: "Báo cáo bình luận",
      content: (
        <Input.TextArea
          rows={3}
          placeholder="Nhập lý do báo cáo"
          onChange={(event) => {
            reason = event.target.value;
          }}
        />
      ),
      okText: "Gửi báo cáo",
      cancelText: "Hủy",
      onOk: async () => {
        const res = await reportCommentApi(comment._id, reason);
        if (res?.EC === 0) {
          message.success(res.EM || "Đã gửi báo cáo");
        } else {
          message.error(res?.EM || "Không thể gửi báo cáo");
        }
      },
    });
  };

  const handleEditGroupPost = (post) => {
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
          updateGroupPost(post._id, () => res.data);
          message.success(res.EM || "Đã cập nhật bài viết");
        } else {
          message.error(res?.EM || "Không thể cập nhật bài viết");
        }
      },
    });
  };

  const renderGroupPostMenu = (post) => {
    const isMine = post.author?._id === user?._id;
    const canRemove = canDeletePost(post);
    const items = [
      { key: "save", icon: <BookOutlined />, label: post.isSaved ? "Bỏ lưu bài viết" : "Lưu bài viết" },
      isMine ? { key: "edit", icon: <EditOutlined />, label: "Chỉnh sửa bài viết" } : null,
      !isMine ? { key: "hide", icon: <EyeInvisibleOutlined />, label: "Ẩn bài viết" } : null,
      !isMine ? { key: "report", icon: <FlagOutlined />, label: "Báo cáo bài viết" } : null,
      canRemove ? { key: "delete", icon: <DeleteOutlined />, label: "Xóa bài viết", danger: true } : null,
    ].filter(Boolean);

    return {
      items,
      onClick: async ({ key }) => {
        if (key === "save") {
          const res = post.isSaved ? await unsavePostApi(post._id) : await savePostApi(post._id);
          if (res?.EC === 0) {
            updateGroupPost(post._id, (currentPost) => ({
              ...currentPost,
              isSaved: !post.isSaved,
            }));
            message.success(res.EM || (post.isSaved ? "Đã bỏ lưu bài viết" : "Đã lưu bài viết"));
          } else {
            message.error(res?.EM || "Không thể cập nhật trạng thái lưu");
          }
        }
        if (key === "edit") {
          handleEditGroupPost(post);
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
        if (key === "report") {
          handleReportPost(post);
        }
        if (key === "delete") {
          handleDeletePost(post);
        }
      },
    };
  };

  const handleCreateEvent = async () => {
    const values = await eventForm.validateFields();
    const res = await createGroupEventApi(selectedGroup._id, values);
    if (res?.EC === 0) {
      message.success("Đã tạo sự kiện");
      setEventOpen(false);
      eventForm.resetFields();
      await loadGroupDetail(selectedGroup._id);
    } else {
      message.error(res?.EM || "Không thể tạo sự kiện");
    }
  };

  const handleSaveSettings = async () => {
    const values = await settingsForm.validateFields();
    const res = await updateGroupApi(selectedGroup._id, values);
    if (res?.EC === 0) {
      message.success("Đã cập nhật cài đặt nhóm");
      setSettingsOpen(false);
      await refreshCurrentGroup(selectedGroup._id);
    } else {
      message.error(res?.EM || "Không thể cập nhật cài đặt nhóm");
    }
  };

  const handleReviewPost = async (postId, action) => {
    const res = await reviewGroupPostApi(selectedGroup._id, postId, action);
    if (res?.EC === 0) {
      message.success(res.EM || "Đã xử lý bài viết");
      await loadGroupDetail(selectedGroup._id);
    } else {
      message.error(res?.EM || "Không thể xử lý bài viết");
    }
  };

  const handleResolveReport = async (reportId, action) => {
    if (action === "delete_target") {
      Modal.confirm({
        title: "Xóa nội dung bị tố cáo?",
        content: "Nội dung sẽ bị xóa khỏi nhóm và tố cáo được đánh dấu đã xử lý.",
        okText: "Xóa",
        okButtonProps: { danger: true },
        cancelText: "Hủy",
        onOk: () => handleResolveReport(reportId, "confirm_delete_target"),
      });
      return;
    }

    const normalizedAction = action === "confirm_delete_target" ? "delete_target" : action;
    const res = await resolveGroupReportApi(selectedGroup._id, reportId, normalizedAction);
    if (res?.EC === 0) {
      message.success(res.EM || "Đã xử lý tố cáo");
      await loadGroupDetail(selectedGroup._id);
    } else {
      message.error(res?.EM || "Không thể xử lý tố cáo");
    }
  };

  const handleRoleChange = async (memberId, role) => {
    const res = await updateGroupMemberRoleApi(selectedGroup._id, memberId, role);
    if (res?.EC === 0) {
      message.success("Đã cập nhật quyền");
      await loadGroupDetail(selectedGroup._id);
    } else {
      message.error(res?.EM || "Không thể cập nhật quyền");
    }
  };

  const handleRemoveMember = async (memberId) => {
    const res = await removeGroupMemberApi(selectedGroup._id, memberId);
    if (res?.EC === 0) {
      message.success("Đã xóa thành viên");
      await refreshCurrentGroup();
    } else {
      message.error(res?.EM || "Không thể xóa thành viên");
    }
  };

  const handleToggleEventAttend = async (event) => {
    const res = event.isAttending
      ? await leaveGroupEventApi(selectedGroup._id, event._id)
      : await attendGroupEventApi(selectedGroup._id, event._id);

    if (res?.EC === 0) {
      message.success(res.EM || "Đã cập nhật sự kiện");
      await loadGroupDetail(selectedGroup._id);
    } else {
      message.error(res?.EM || "Không thể cập nhật sự kiện");
    }
  };

  const handleUploadGroupImage = async (type, file) => {
    if (!selectedGroup?._id) return false;

    const formData = new FormData();
    formData.append(type === "avatar" ? "avatar" : "cover", file);

    const res =
      type === "avatar"
        ? await uploadGroupAvatarApi(selectedGroup._id, formData)
        : await uploadGroupCoverApi(selectedGroup._id, formData);

    if (res?.EC === 0) {
      setSelectedGroup(res.data);
      setGroups((prev) =>
        prev.map((group) => (group._id === res.data._id ? { ...group, ...res.data } : group)),
      );
      message.success(type === "avatar" ? "Đã đổi ảnh đại diện nhóm" : "Đã đổi ảnh bìa nhóm");
    } else {
      message.error(res?.EM || "Không thể cập nhật ảnh nhóm");
    }

    return false;
  };

  const renderCover = (group, compact = false, editable = false) => {
    const coverUrl = getMediaUrl(group?.coverPhoto);
    return (
      <div
        className={`tg-group-cover ${compact ? "compact" : ""} ${
          coverUrl ? "has-image" : ""
        }`}
        style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
      >
        <Avatar
          className="tg-group-avatar"
          size={compact ? 72 : 132}
          src={getMediaUrl(group?.avatar)}
        >
          {getInitials(group?.name)}
        </Avatar>
        {editable ? (
          <>
            <Upload
              accept="image/*"
              beforeUpload={(file) => handleUploadGroupImage("cover", file)}
              showUploadList={false}
            >
              <Button className="tg-cover-upload" icon={<CameraOutlined />}>
                Đổi ảnh bìa
              </Button>
            </Upload>
            <Upload
              accept="image/*"
              beforeUpload={(file) => handleUploadGroupImage("avatar", file)}
              showUploadList={false}
            >
              <Button className="tg-avatar-upload" icon={<CameraOutlined />} shape="circle" />
            </Upload>
          </>
        ) : null}
        {group?.privacy === "private" ? (
          <span className="tg-cover-badge">Riêng tư</span>
        ) : null}
      </div>
    );
  };

  const renderGroupAction = (group) => {
    if (group.isMember) {
      return (
        <Button
          className="tg-outline-btn"
          onClick={(event) => {
            event.stopPropagation();
            handleJoinToggle(group);
          }}
        >
          Rời
        </Button>
      );
    }

    return (
      <Button
        className="tg-primary-btn"
        disabled={group.myJoinRequestStatus === "pending"}
        icon={<PlusOutlined />}
        onClick={(event) => {
          event.stopPropagation();
          handleJoinToggle(group);
        }}
      >
        {group.myJoinRequestStatus === "pending" ? "Đã gửi yêu cầu" : "Tham gia"}
      </Button>
    );
  };

  const renderDirectory = () => (
    <section className="tg-groups-page">
      <header className="tg-page-head">
        <div className="tg-title-row">
          <TeamOutlined />
          <h1>Nhóm</h1>
        </div>
        <Button
          className="tg-primary-btn"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          Tạo nhóm
        </Button>
      </header>

      <Input
        className="tg-search"
        allowClear
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Tìm nhóm..."
        prefix={<SearchOutlined />}
      />

      <div className="tg-tabs">
        <button
          className={listTab === "mine" ? "active" : ""}
          onClick={() => setListTab("mine")}
          type="button"
        >
          Nhóm đã tham gia ({joinedCount})
        </button>
        <button
          className={listTab === "discover" ? "active" : ""}
          onClick={() => setListTab("discover")}
          type="button"
        >
          Khám phá ({exploreCount})
        </button>
      </div>

      <div className="tg-group-list">
        {visibleGroups.length ? (
          visibleGroups.map((group) => (
            <article
              className="tg-group-card"
              key={group._id}
              onClick={() => openGroup(group._id)}
            >
              {renderCover(group, true)}
              <div className="tg-group-card-body">
                <div>
                  <div className="tg-card-title-line">
                    <h2>{group.name}</h2>
                    {group.myRole === "admin" ? <Tag color="purple">Admin</Tag> : null}
                  </div>
                  <p>{group.description || "Chưa có mô tả"}</p>
                  <span>
                    {formatCount(group.memberCount)} thành viên ·{" "}
                    {formatCount(group.postCount)} bài viết
                  </span>
                </div>
                {renderGroupAction(group)}
              </div>
            </article>
          ))
        ) : (
          <div className="tg-empty-state">
            <Empty
              description={
                loading ? "Đang tải danh sách nhóm..." : "Chưa có nhóm phù hợp"
              }
            />
          </div>
        )}
      </div>
    </section>
  );

  const renderDetailHeader = () => (
    <header className="tg-detail-head">
      <div className="tg-detail-cover-wrap">
        {renderCover(selectedGroup, false, canManageRoles)}
        <Button
          className="tg-back-btn"
          icon={<LeftOutlined />}
          shape="circle"
          onClick={() => navigate("/groups")}
        />
      </div>
      <div className="tg-detail-info">
        <div>
          <div className="tg-detail-title-row">
            <h1>{selectedGroup?.name}</h1>
            <Tag color={selectedGroup?.myRole === "admin" ? "purple" : "blue"}>
              {roleText[selectedGroup?.myRole] || "Khách"}
            </Tag>
          </div>
          <p>{selectedGroup?.description || "Chưa có mô tả"}</p>
          <div className="tg-detail-meta">
            <strong>{formatCount(selectedGroup?.memberCount)}</strong> thành viên
            <strong>{formatCount(selectedGroup?.postCount)}</strong> bài viết
            <span>
              {selectedGroup?.privacy === "private" ? "Riêng tư" : "Công khai"}
            </span>
          </div>
        </div>
        <div className="tg-detail-actions">
          {canManageRoles ? (
            <Button
              className="tg-round-btn"
              icon={<SettingOutlined />}
              shape="circle"
              onClick={() => setSettingsOpen(true)}
            />
          ) : null}
          <Button className="tg-outline-btn" onClick={() => handleJoinToggle(selectedGroup)}>
            {selectedGroup?.isMember ? "Rời nhóm" : "Tham gia"}
          </Button>
          <Button className="tg-round-btn" icon={<BellOutlined />} shape="circle" />
        </div>
      </div>
      <div className="tg-tabs detail">
        {[
          ["posts", "Bài viết"],
          ["members", `Thành viên (${selectedGroup?.members?.length || 0})`],
          ["media", `Media (${groupMedia.length})`],
          ["events", "Sự kiện"],
          ...(canModerate
            ? [["moderation", `Kiểm duyệt (${pendingPosts.length + groupReports.length})`]]
            : []),
        ].map(([key, label]) => (
          <button
            className={detailTab === key ? "active" : ""}
            key={key}
            onClick={() => setDetailTab(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  );

  const renderPostComposer = () =>
    canPost ? (
      <>
      <CreatePostComposer
        avatar={userProfile?.avatar || user?.avatar}
        content={postContent}
        files={postFiles}
        modalPlaceholder="Tạo bài viết trong nhóm..."
        name={displayName}
        onContentChange={setPostContent}
        onFilesChange={(fileList) => setPostFiles(fileList)}
        onOpenChange={setPostComposerOpen}
        onRemoveFile={(uid) => setPostFiles((prev) => prev.filter((item) => item.uid !== uid))}
        onSubmit={handleCreatePost}
        open={postComposerOpen}
        triggerPlaceholder="Bạn viết gì đi..."
        variant="group"
        visibilityNode={
          selectedGroup?.privacy !== "private" ? null : <Tag>Chỉ thành viên nhóm</Tag>
        }
        visibilityOptions={
          selectedGroup?.privacy !== "private"
            ? [
                { value: "group", label: "Chỉ trong nhóm" },
                { value: "public", label: "Công khai" },
              ]
            : []
        }
        visibilityValue={postVisibility}
        onVisibilityChange={setPostVisibility}
      />
      <section className="tg-composer tg-composer-collapsed legacy-composer-hidden">
        <button
          className="composer-trigger"
          type="button"
          onClick={() => setPostComposerOpen(true)}
        >
          <Avatar size={44} src={getMediaUrl(userProfile?.avatar)} icon={<UserOutlined />}>
            {getInitials(displayName)}
          </Avatar>
          <span>Bạn viết gì đi...</span>
        </button>
        <Input.TextArea
          rows={3}
          value={postContent}
          onChange={(event) => setPostContent(event.target.value)}
          placeholder="Chia sẻ nội dung với nhóm..."
        />
        <div className="tg-composer-actions">
          <Upload
            accept="image/*,video/*"
            beforeUpload={() => false}
            fileList={postFiles}
            multiple
            onChange={({ fileList }) => setPostFiles(fileList.slice(0, 10))}
            showUploadList={false}
          >
            <Button icon={<PictureOutlined />}>Thêm media</Button>
          </Upload>
          <div className="tg-file-list">
            {postFiles.map((file) => (
              <Tag
                key={file.uid}
                closable
                closeIcon={<DeleteOutlined />}
                onClose={(event) => {
                  event.preventDefault();
                  setPostFiles((prev) => prev.filter((item) => item.uid !== file.uid));
                }}
              >
                {file.name}
              </Tag>
            ))}
          </div>
          {selectedGroup?.privacy !== "private" ? (
            <Select
              value={postVisibility}
              onChange={setPostVisibility}
              style={{ width: 180 }}
              options={[
                { value: "group", label: "Chỉ trong nhóm" },
                { value: "public", label: "Công khai" },
              ]}
            />
          ) : (
            <Tag>Chỉ thành viên nhóm</Tag>
          )}
          <Button
            className="tg-primary-btn"
            disabled={!postContent.trim() && postFiles.length === 0}
            onClick={handleCreatePost}
          >
            Đăng bài
          </Button>
        </div>
      </section>
      <Modal
        className="create-post-modal"
        title={<div className="create-post-title">Tạo bài viết</div>}
        open={false}
        onCancel={() => setPostComposerOpen(false)}
        footer={null}
        width={620}
        centered
      >
        <div className="create-post-author">
          <Avatar size={48} src={getMediaUrl(userProfile?.avatar)} icon={<UserOutlined />}>
            {getInitials(displayName)}
          </Avatar>
          <div>
            <strong>{displayName}</strong>
            {selectedGroup?.privacy !== "private" ? (
              <Select
                value={postVisibility}
                onChange={setPostVisibility}
                size="small"
                style={{ minWidth: 150 }}
                options={[
                  { value: "group", label: "Chỉ trong nhóm" },
                  { value: "public", label: "Công khai" },
                ]}
              />
            ) : (
              <Tag>Chỉ thành viên nhóm</Tag>
            )}
          </div>
        </div>
        <Input.TextArea
          className="create-post-textarea"
          autoFocus
          autoSize={{ minRows: 7, maxRows: 12 }}
          value={postContent}
          onChange={(event) => setPostContent(event.target.value)}
          placeholder="Tạo bài viết trong nhóm..."
        />
        <div className="create-post-addons">
          <strong>Thêm vào bài viết của bạn</strong>
          <Upload
            accept="image/*,video/*"
            beforeUpload={() => false}
            fileList={postFiles}
            multiple
            onChange={({ fileList }) => setPostFiles(fileList.slice(0, 10))}
            showUploadList={false}
          >
            <Button icon={<PictureOutlined />} shape="circle" type="text" />
          </Upload>
        </div>
        {postFiles.length ? (
          <div className="composer-media-list create-post-file-list">
            {postFiles.map((file) => (
              <Tag
                key={file.uid}
                closable
                closeIcon={<DeleteOutlined />}
                onClose={(event) => {
                  event.preventDefault();
                  setPostFiles((prev) => prev.filter((item) => item.uid !== file.uid));
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
          disabled={!postContent.trim() && postFiles.length === 0}
          onClick={handleCreatePost}
        >
          Đăng
        </Button>
      </Modal>
      </>
    ) : null;

  const renderReactionPicker = (post) => (
    <div className="tg-reaction-picker">
      {reactionOptions.map((reaction) => (
        <button
          aria-label={reaction.label}
          className={post.myReaction === reaction.value ? "active" : ""}
          key={reaction.value}
          onClick={() => handleReactPost(post, reaction.value)}
          title={reaction.label}
          type="button"
        >
          <span>{reaction.icon}</span>
        </button>
      ))}
    </div>
  );

  const renderGroupCommentList = (post, { preview = false } = {}) => {
    const comments = post.comments || [];
    const visibleComments = preview ? comments.slice(-1) : comments;

    if (preview && !visibleComments.length) return null;

    return (
      <div className={preview ? "tg-comment-list preview" : "tg-comment-list"}>
        {visibleComments.length ? (
          visibleComments.map((comment) => (
            <div className="tg-comment-thread" key={comment._id}>
              <div className="tg-comment-row">
                <Avatar size={32} src={getMediaUrl(comment.author?.avatar)}>
                  {getInitials(comment.author?.name)}
                </Avatar>
                <div className="tg-comment-main">
                  <div className="tg-comment-bubble">
                    <strong>{comment.author?.name || comment.author?.email}</strong>
                    <Typography.Paragraph className="mb-0">
                      {renderMentionContent(comment.content)}
                    </Typography.Paragraph>
                  </div>
                  {!preview && canComment ? (
                    <Space.Compact className="tg-reply-input">
                      <MentionInput
                        type="input"
                        value={replyDrafts[comment._id] || ""}
                        onChange={(event) =>
                          setReplyDrafts((prev) => ({
                            ...prev,
                            [comment._id]: event.target.value,
                          }))
                        }
                        onPressEnter={(raw) => handleReplyComment(post._id, comment._id, raw)}
                        placeholder="Trả lời..."
                      />
                      <Button onClick={() => handleReplyComment(post._id, comment._id)}>
                        Trả lời
                      </Button>
                    </Space.Compact>
                  ) : null}
                </div>
                {!preview && canDeleteComment(post, comment) ? (
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    type="text"
                    onClick={() => handleDeleteComment(post, comment)}
                  />
                ) : null}
              </div>
              {!preview
                ? (comment.replies || []).map((reply) => (
                    <div className="tg-comment-row reply" key={reply._id}>
                      <Avatar size={26} src={getMediaUrl(reply.author?.avatar)}>
                        {getInitials(reply.author?.name)}
                      </Avatar>
                      <div className="tg-comment-bubble">
                        <strong>{reply.author?.name || reply.author?.email}</strong>
                        <Typography.Paragraph className="mb-0">
                          {renderMentionContent(reply.content)}
                        </Typography.Paragraph>
                      </div>
                      {canDeleteComment(post, reply) ? (
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          type="text"
                          onClick={() => handleDeleteComment(post, reply)}
                        />
                      ) : null}
                    </div>
                  ))
                : null}
            </div>
          ))
        ) : (
          <span className="tg-comment-empty">Chưa có bình luận.</span>
        )}
      </div>
    );
  };

  const renderPosts = () => (
    <section className="tg-detail-section">
      {renderPostComposer()}
      {visiblePosts.length ? (
        visiblePosts.map((post) => (
          <article
            className={`tg-post-row${highlightedPostId === post._id ? " tg-post-highlighted" : ""}`}
            key={post._id}
            id={`post-${post._id}`}
          >
            <div className="tg-post-headline">
              <div className="tg-post-author">
                <Avatar src={getMediaUrl(post.author?.avatar)}>
                  {getInitials(post.author?.name)}
                </Avatar>
                <div>
                  <strong>{post.author?.name || post.author?.email || "Thành viên"}</strong>
                  <span>
                    {new Date(post.createdAt).toLocaleString("vi-VN")} ·{" "}
                    {post.visibility === "public" ? "Công khai" : "Chỉ trong nhóm"}
                  </span>
                </div>
              </div>
              <Dropdown menu={renderGroupPostMenu(post)} trigger={["click"]}>
                <Button icon={<EllipsisOutlined />} shape="circle" type="text" />
              </Dropdown>
            </div>
            {post.content ? <p className="tg-post-content">{post.content}</p> : null}
            {normalizeMedia(post.media).length ? (
              <div className="post-media-grid">
                {normalizeMedia(post.media).map((item, idx) => {
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
                      alt={item.originalName || "group media"}
                    />
                  );
                })}
              </div>
            ) : null}
            <div className="tg-post-actions">
              <Popover
                content={renderReactionPicker(post)}
                mouseEnterDelay={0.08}
                placement="topLeft"
                trigger="hover"
              >
                <Button
                  className={post.myReaction ? "tg-reaction-button active" : "tg-reaction-button"}
                  type="text"
                  onClick={() => handleReactPost(post, post.myReaction || "like")}
                >
                  <span className="tg-reaction-icon">
                    {getReactionOption(post.myReaction).icon}
                  </span>
                  {post.myReaction ? getReactionOption(post.myReaction).label : "Thích"}
                </Button>
              </Popover>
              <Button
                type="text"
                icon={<CommentOutlined />}
                onClick={() => setCommentModalPostId(post._id)}
              >
                {post.stats?.comments || 0} bình luận
              </Button>
              <Button
                type="text"
                disabled={selectedGroup?.privacy === "private"}
                onClick={() => handleSharePost(post)}
              >
                Chia sẻ ({post.stats?.shares || 0})
              </Button>
            </div>
            {renderGroupCommentList(post, { preview: true })}
          </article>
        ))
      ) : (
        <div className="tg-empty-state">
          <Empty description="Chưa có bài viết trong nhóm" />
        </div>
      )}
    </section>
  );

  const renderMembers = () => (
    <section className="tg-detail-section">
      {canModerate && joinRequests.length ? (
        <div className="tg-request-panel">
          <h2>Yeu cau tham gia ({joinRequests.length})</h2>
          {joinRequests.map((request) => (
            <div className="tg-request-row" key={request._id}>
              <Space>
                <Avatar src={getMediaUrl(request.user?.avatar)}>
                  {getInitials(request.user?.name)}
                </Avatar>
                <div>
                  <strong>{request.user?.name || request.user?.email}</strong>
                  <span>{formatDateTime(request.requestedAt)}</span>
                </div>
              </Space>
              <Space>
                <Button
                  className="tg-primary-btn"
                  onClick={() => handleRespondJoinRequest(request._id, "approve")}
                >
                  Duyệt
                </Button>
                <Button danger onClick={() => handleRespondJoinRequest(request._id, "reject")}>
                  Từ chối
                </Button>
              </Space>
            </div>
          ))}
        </div>
      ) : null}

      {(selectedGroup?.members || []).map((member) => {
        const memberId = getMemberId(member);
        const role = getMemberRole(selectedGroup, member);
        const menuItems = [
          canManageRoles
            ? {
                key: "role",
                label: (
                  <Select
                    value={role}
                    style={{ width: 136 }}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(value) => handleRoleChange(memberId, value)}
                    options={[
                      { value: "member", label: "Thành viên" },
                      { value: "moderator", label: "Mod" },
                      { value: "admin", label: "Admin" },
                    ]}
                  />
                ),
              }
            : null,
          canModerate && role !== "admin"
            ? {
                key: "remove",
                danger: true,
                label: "Xóa khỏi nhóm",
                onClick: () => handleRemoveMember(memberId),
              }
            : null,
        ].filter(Boolean);

        return (
          <article className="tg-member-row" key={memberId}>
            <Space>
              <Avatar src={getMediaUrl(member.avatar)}>{getInitials(member.name)}</Avatar>
              <div className="tg-member-info">
                <strong>{member.name || member.email || memberId}</strong>
                <span>Tham gia nhóm</span>
              </div>
              <Tag color={role === "admin" ? "purple" : role === "moderator" ? "blue" : "default"}>
                {roleText[role]}
              </Tag>
            </Space>
            {menuItems.length ? (
              <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
                <Button icon={<EllipsisOutlined />} type="text" />
              </Dropdown>
            ) : null}
          </article>
        );
      })}
    </section>
  );

  const renderMedia = () => (
    <section className="tg-detail-section">
      {groupMedia.length ? (
        <Image.PreviewGroup>
          <div className="tg-media-gallery">
            {groupMedia.map((item, index) => {
              const src = getMediaUrl(item.url);
              const key = `${src}-${item.postId || index}`;
              return item.type === "video" ? (
                <video className="tg-media-tile" controls key={key} src={src} />
              ) : (
                <Image
                  alt={item.originalName || "group media"}
                  className="tg-media-tile"
                  key={key}
                  src={src}
                />
              );
            })}
          </div>
        </Image.PreviewGroup>
      ) : (
        <div className="tg-empty-state">
          <Empty description="Chưa có media trong nhóm" />
        </div>
      )}
    </section>
  );

  const renderEvents = () => (
    <section className="tg-detail-section">
      {canModerate ? (
        <button className="tg-create-event" onClick={() => setEventOpen(true)} type="button">
          <CalendarOutlined />
          <span>+ Tạo sự kiện</span>
        </button>
      ) : null}

      {events.length ? (
        events.map((event) => (
          <article className="tg-event-row" key={event._id}>
            <div>
              <h2>{event.title}</h2>
              <p>
                <CalendarOutlined /> {formatDateTime(event.startAt)}
              </p>
              <p>{event.location || "Online"}</p>
              <span>{formatCount(event.attendeeCount)} người tham gia</span>
              {event.description ? <p className="tg-event-desc">{event.description}</p> : null}
            </div>
            {selectedGroup?.isMember ? (
              <Button
                className={event.isAttending ? "tg-success-btn" : "tg-primary-btn"}
                onClick={() => handleToggleEventAttend(event)}
              >
                {event.isAttending ? "Sẽ tham gia" : "Tham gia"}
              </Button>
            ) : null}
          </article>
        ))
      ) : (
        <div className="tg-empty-state">
          <Empty description="Chưa có sự kiện" />
        </div>
      )}
    </section>
  );

  const renderModeration = () => (
    <section className="tg-detail-section">
      <div className="tg-request-panel">
        <h2>Bài viết chờ duyệt ({pendingPosts.length})</h2>
        {pendingPosts.length ? (
          pendingPosts.map((post) => (
            <article className="tg-moderation-row" key={post._id}>
              <div>
                <Space>
                  <Avatar src={getMediaUrl(post.author?.avatar)}>
                    {getInitials(post.author?.name)}
                  </Avatar>
                  <strong>{post.author?.name || post.author?.email}</strong>
                  <Tag>{post.visibility === "public" ? "Công khai" : "Chỉ trong nhóm"}</Tag>
                </Space>
                <p>{post.content || "[Media]"}</p>
              </div>
              <Space>
                <Button
                  className="tg-primary-btn"
                  onClick={() => handleReviewPost(post._id, "approve")}
                >
                  Phê duyệt
                </Button>
                <Button danger onClick={() => handleReviewPost(post._id, "reject")}>
                  Từ chối
                </Button>
              </Space>
            </article>
          ))
        ) : (
          <Empty description="Không có bài viết chờ duyệt" />
        )}
      </div>

      <div className="tg-request-panel">
        <h2>Tố cáo trong nhóm ({groupReports.length})</h2>
        {groupReports.length ? (
          groupReports.map((report) => (
            <article className="tg-moderation-row" key={report._id}>
              <div>
                <Space wrap>
                  <Tag color="red">
                    {report.targetType === "comment" ? "Báo cáo bình luận" : "Báo cáo bài viết"}
                  </Tag>
                  <span>{formatDateTime(report.createdAt)}</span>
                  <strong>{report.reporter?.name || report.reporter?.email}</strong>
                </Space>
                <p>Lý do: {report.reason}</p>
                {report.targetType === "comment" ? (
                  <>
                    <p>Bình luận bị báo cáo: {report.targetComment?.content || "[Đã xóa]"}</p>
                    <p>Bài chứa bình luận: {report.targetPost?.content || "[Media]"}</p>
                  </>
                ) : (
                  <p>Bài bị báo cáo: {report.targetPost?.content || "[Media]"}</p>
                )}
              </div>
              <Space>
                <Button onClick={() => handleResolveReport(report._id, "reviewing")}>
                  Đang xem
                </Button>
                <Button
                  className="tg-primary-btn"
                  onClick={() => handleResolveReport(report._id, "resolved")}
                >
                  Đã xử lý
                </Button>
                <Button danger onClick={() => handleResolveReport(report._id, "delete_target")}>
                  Xóa nội dung
                </Button>
                <Button danger onClick={() => handleResolveReport(report._id, "rejected")}>
                  Bỏ qua
                </Button>
              </Space>
            </article>
          ))
        ) : (
          <Empty description="Không có tố cáo đang mở" />
        )}
      </div>
    </section>
  );

  const renderDetail = () => (
    <section className="tg-group-detail">
      {selectedGroup ? (
        <>
          {renderDetailHeader()}
          {detailTab === "posts" ? renderPosts() : null}
          {detailTab === "members" ? renderMembers() : null}
          {detailTab === "media" ? renderMedia() : null}
          {detailTab === "events" ? renderEvents() : null}
          {detailTab === "moderation" ? renderModeration() : null}
        </>
      ) : (
        <div className="tg-empty-state">
          <Empty description="Đang tải nhóm..." />
        </div>
      )}
    </section>
  );

  return (
    <main className="tegram-groups-app">
      <section className="tg-workspace">
        {viewMode === "detail" ? renderDetail() : renderDirectory()}
      </section>

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
        onSubmitComment={handleCommentPost}
        replyDrafts={replyDrafts}
        onReplyChange={(commentId, value) =>
          setReplyDrafts((prev) => ({ ...prev, [commentId]: value }))
        }
        onSubmitReply={handleReplyComment}
        canComment={canComment}
        canDeleteComment={canDeleteComment}
        onDeleteComment={handleDeleteComment}
        onHideComment={async (post, commentId) => {
          const res = await hideCommentApi(commentId);
          if (res?.EC === 0) {
            removeCommentFromGroupPost(post._id, commentId);
            message.success(res.EM || "Đã ẩn bình luận");
          } else {
            message.error(res?.EM || "Không thể ẩn bình luận");
          }
        }}
        onReportComment={handleReportComment}
        onReact={(post) => handleReactPost(post, post.myReaction || "like")}
        onShare={handleSharePost}
        shareDisabled={selectedGroup?.privacy === "private"}
      />

      <Modal
        title="Cài đặt nhóm"
        open={settingsOpen}
        onOk={handleSaveSettings}
        onCancel={() => setSettingsOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form
          form={settingsForm}
          layout="vertical"
          onValuesChange={(changedValues) => {
            if (changedValues.privacy === "private") {
              settingsForm.setFieldValue("defaultPostVisibility", "group");
            }
          }}
        >
          <Form.Item
            name="name"
            label="Tên nhóm"
            rules={[{ required: true, message: "Vui lòng nhập tên nhóm" }]}
          >
            <Input placeholder="Tên nhóm" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder="Mô tả ngắn về nhóm"
            />
          </Form.Item>
          <Form.Item name="privacy" label="Quyền riêng tư">
            <Radio.Group>
              <Radio value="public">Công khai</Radio>
              <Radio value="private">Riêng tư</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="postApprovalEnabled"
            label="Phê duyệt bài viết trước khi hiển thị"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item name="defaultPostVisibility" label="Chế độ hiển thị mặc định">
            <Radio.Group>
              <Radio value="group">Chỉ thành viên nhóm</Radio>
              <Radio value="public" disabled={settingPrivacy === "private"}>
                Công khai
              </Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Tạo nhóm mới"
        open={createOpen}
        onOk={handleCreateGroup}
        onCancel={() => setCreateOpen(false)}
        okText="Tạo nhóm"
        cancelText="Huy"
      >
        <Form form={groupForm} layout="vertical" initialValues={{ privacy: "public" }}>
          <Form.Item name="name" label="Tên nhóm" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="privacy" label="Chế độ">
            <Radio.Group>
              <Radio value="public">Công khai</Radio>
              <Radio value="private">Riêng tư</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Tạo sự kiện"
        open={eventOpen}
        onOk={handleCreateEvent}
        onCancel={() => setEventOpen(false)}
        okText="Tạo sự kiện"
        cancelText="Huy"
      >
        <Form form={eventForm} layout="vertical">
          <Form.Item name="title" label="Tên sự kiện" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="startAt" label="Bắt đầu" rules={[{ required: true }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="endAt" label="Kết thúc">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="location" label="Địa điểm">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  );
};

export default GroupsPage;

