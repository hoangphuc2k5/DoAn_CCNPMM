import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Avatar,
  Badge,
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
  EllipsisOutlined,
  HomeOutlined,
  LeftOutlined,
  LogoutOutlined,
  MessageOutlined,
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
  getGroupPostsApi,
  getGroupsApi,
  joinGroupApi,
  leaveGroupApi,
  leaveGroupEventApi,
  removeGroupMemberApi,
  replyCommentApi,
  respondGroupJoinRequestApi,
  updateGroupMemberRoleApi,
  reactPostApi,
  sharePostApi,
  uploadGroupAvatarApi,
  uploadGroupCoverApi,
} from "../util/api";
import { getMediaUrl } from "../util/media";
import { logout } from "../Redux/authSlice";

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
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const userProfile = useSelector((state) => state.userProfile.profileUser);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("directory");
  const [listTab, setListTab] = useState("mine");
  const [detailTab, setDetailTab] = useState("posts");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postFiles, setPostFiles] = useState([]);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [groupForm] = Form.useForm();
  const [eventForm] = Form.useForm();

  const canPost = selectedGroup?.isMember;
  const canComment = selectedGroup?.isMember;
  const canModerate = ["admin", "moderator"].includes(selectedGroup?.myRole);
  const canManageRoles = selectedGroup?.myRole === "admin";
  const displayName = userProfile?.name || user?.name || user?.email || "Nguoi Dung";
  const displayHandle = user?.email ? user.email.split("@")[0] : "nguoidung";

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

    if (groupRes?.EC === 0) setSelectedGroup(groupRes.data);
    if (postRes?.EC === 0) setPosts(postRes.data || []);
    if (eventRes?.EC === 0) setEvents(eventRes.data || []);

    const canLoadRequests =
      groupRes?.EC === 0 && ["admin", "moderator"].includes(groupRes.data?.myRole);
    if (canLoadRequests) {
      const requestRes = await getGroupJoinRequestsApi(groupId);
      setJoinRequests(requestRes?.EC === 0 ? requestRes.data || [] : []);
    } else {
      setJoinRequests([]);
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
    loadGroupDetail(selectedGroupId);
  }, [selectedGroupId]);

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

  const openGroup = (groupId) => {
    setSelectedGroupId(groupId);
    setDetailTab("posts");
    setViewMode("detail");
  };

  const refreshCurrentGroup = async (groupId = selectedGroup?._id || selectedGroupId) => {
    await loadGroups();
    if (groupId) await loadGroupDetail(groupId);
  };

  const updateGroupPost = (postId, updater) => {
    setPosts((prev) => prev.map((post) => (post._id === postId ? updater(post) : post)));
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
        setSelectedGroupId(res.data._id);
        setSelectedGroup(res.data);
        setViewMode("detail");
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
    postFiles.forEach((file) => {
      formData.append("media", file.originFileObj || file);
    });

    const res = await createGroupPostApi(selectedGroup._id, formData);
    if (res?.EC === 0) {
      setPostContent("");
      setPostFiles([]);
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

  const handleCommentPost = async (postId) => {
    const content = commentDrafts[postId]?.trim();
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

  const handleReplyComment = async (postId, commentId) => {
    const content = replyDrafts[commentId]?.trim();
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
      updateGroupPost(post._id, (currentPost) => {
        const hadReaction = Boolean(currentPost.myReaction);
        const removedReaction = !res.data;
        return {
          ...currentPost,
          myReaction: res.data?.type || null,
          stats: {
            ...currentPost.stats,
            reactions:
              res.data?.type && !hadReaction
                ? (currentPost.stats?.reactions || 0) + 1
                : removedReaction && hadReaction
                  ? Math.max((currentPost.stats?.reactions || 0) - 1, 0)
                  : currentPost.stats?.reactions || 0,
          },
        };
      });
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

  const renderSidebar = () => (
    <aside className="tg-sidebar">
      <Link to="/" className="tg-brand">
        <span className="tg-brand-mark">T</span>
        <span>Tegram</span>
      </Link>

      <nav className="tg-nav" aria-label="Tegram">
        <Link to="/" className="tg-nav-item">
          <HomeOutlined />
          <span>Trang chủ</span>
        </Link>
        <Link to="/search" className="tg-nav-item">
          <SearchOutlined />
          <span>Tìm kiếm</span>
        </Link>
        <button className="tg-nav-item" type="button">
          <Badge count={3} size="small">
            <BellOutlined />
          </Badge>
          <span>Thông báo</span>
        </button>
        <Link to="/chat" className="tg-nav-item">
          <MessageOutlined />
          <span>Tin nhắn</span>
        </Link>
        <button className="tg-nav-item" type="button">
          <BookOutlined />
          <span>Đã lưu</span>
        </button>
        <Link to={`/profile/${user?._id || ""}`} className="tg-nav-item">
          <UserOutlined />
          <span>Trang cá nhân</span>
        </Link>
        <button className="tg-nav-item active" type="button">
          <TeamOutlined />
          <span>Nhóm</span>
        </button>
        <button className="tg-nav-item" type="button">
          <SettingOutlined />
          <span>Cài đặt</span>
        </button>
      </nav>

      <div className="tg-sidebar-user">
        <Avatar src={getMediaUrl(userProfile?.avatar)}>{getInitials(displayName)}</Avatar>
        <div>
          <strong>{displayName}</strong>
          <span>@{displayHandle}</span>
        </div>
      </div>
      <Button
        className="tg-logout"
        type="text"
        icon={<LogoutOutlined />}
        onClick={() => {
          dispatch(logout());
          navigate("/");
        }}
      >
        Đăng xuất
      </Button>
    </aside>
  );

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
          onClick={() => setViewMode("directory")}
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
          ["events", "Sự kiện"],
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
      <section className="tg-composer">
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
          <Button
            className="tg-primary-btn"
            disabled={!postContent.trim() && postFiles.length === 0}
            onClick={handleCreatePost}
          >
            Đăng bài
          </Button>
        </div>
      </section>
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

  const renderPosts = () => (
    <section className="tg-detail-section">
      {renderPostComposer()}
      {posts.length ? (
        posts.map((post, index) => (
          <article className="tg-post-row" key={post._id}>
            {index === 0 ? <strong className="tg-pinned">Bài ghim</strong> : null}
            <div className="tg-post-headline">
              <div className="tg-post-author">
                <Avatar src={getMediaUrl(post.author?.avatar)}>
                  {getInitials(post.author?.name)}
                </Avatar>
                <div>
                  <strong>{post.author?.name || post.author?.email || "Thành viên"}</strong>
                  <span>{new Date(post.createdAt).toLocaleString("vi-VN")}</span>
                </div>
              </div>
              {canDeletePost(post) ? (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  shape="circle"
                  type="text"
                  onClick={() => handleDeletePost(post)}
                />
              ) : null}
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
                  {post.myReaction ? getReactionOption(post.myReaction).label : "Thích"} (
                  {post.stats?.reactions || 0})
                </Button>
              </Popover>
              <Button type="text" icon={<CommentOutlined />}>
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
            {canComment ? (
              <div className="tg-comment-composer">
                <Avatar size={32} src={getMediaUrl(userProfile?.avatar)}>
                  {getInitials(displayName)}
                </Avatar>
                <Space.Compact className="tg-comment-input">
                  <Input
                    value={commentDrafts[post._id] || ""}
                    onChange={(event) =>
                      setCommentDrafts((prev) => ({
                        ...prev,
                        [post._id]: event.target.value,
                      }))
                    }
                    onPressEnter={() => handleCommentPost(post._id)}
                    placeholder="Viết bình luận..."
                  />
                  <Button onClick={() => handleCommentPost(post._id)}>Gửi</Button>
                </Space.Compact>
              </div>
            ) : (
              <div className="tg-comment-locked">Tham gia nhóm để bình luận.</div>
            )}
            <div className="tg-comment-list">
              {(post.comments || []).length ? (
                (post.comments || []).map((comment) => (
                  <div className="tg-comment-thread" key={comment._id}>
                    <div className="tg-comment-row">
                      <Avatar size={32} src={getMediaUrl(comment.author?.avatar)}>
                        {getInitials(comment.author?.name)}
                      </Avatar>
                      <div className="tg-comment-main">
                        <div className="tg-comment-bubble">
                          <strong>{comment.author?.name || comment.author?.email}</strong>
                          <Typography.Paragraph className="mb-0">
                            {comment.content}
                          </Typography.Paragraph>
                        </div>
                        {canComment ? (
                          <Space.Compact className="tg-reply-input">
                            <Input
                              value={replyDrafts[comment._id] || ""}
                              onChange={(event) =>
                                setReplyDrafts((prev) => ({
                                  ...prev,
                                  [comment._id]: event.target.value,
                                }))
                              }
                              onPressEnter={() => handleReplyComment(post._id, comment._id)}
                              placeholder="Trả lời..."
                            />
                            <Button onClick={() => handleReplyComment(post._id, comment._id)}>
                              Trả lời
                            </Button>
                          </Space.Compact>
                        ) : null}
                      </div>
                      {canDeleteComment(post, comment) ? (
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          type="text"
                          onClick={() => handleDeleteComment(post, comment)}
                        />
                      ) : null}
                    </div>
                    {(comment.replies || []).map((reply) => (
                      <div className="tg-comment-row reply" key={reply._id}>
                        <Avatar size={26} src={getMediaUrl(reply.author?.avatar)}>
                          {getInitials(reply.author?.name)}
                        </Avatar>
                        <div className="tg-comment-bubble">
                          <strong>{reply.author?.name || reply.author?.email}</strong>
                          <Typography.Paragraph className="mb-0">
                            {reply.content}
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
                    ))}
                  </div>
                ))
              ) : (
                <span className="tg-comment-empty">Chưa có bình luận.</span>
              )}
            </div>
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

  const renderDetail = () => (
    <section className="tg-group-detail">
      {selectedGroup ? (
        <>
          {renderDetailHeader()}
          {detailTab === "posts" ? renderPosts() : null}
          {detailTab === "members" ? renderMembers() : null}
          {detailTab === "events" ? renderEvents() : null}
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
      {renderSidebar()}
      <section className="tg-workspace">
        {viewMode === "detail" ? renderDetail() : renderDirectory()}
      </section>

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
