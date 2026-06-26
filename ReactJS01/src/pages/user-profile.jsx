import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Spin, message, Empty, Modal, Input, Select, Button, Space, Tag } from "antd";
import { LoadingOutlined, GlobalOutlined, PushpinOutlined, EditOutlined, DeleteOutlined, TeamOutlined, LockOutlined } from "@ant-design/icons";

import {
  fetchUserProfile,
  fetchUserPosts,
  fetchUserFriends,
  fetchUserFollowers,
  fetchUserMedia,
  setActiveTab,
  resetUserProfile,
  clearError,
  addCreatedPost,
  updatePostInSlice,
  deletePostInSlice,
  togglePinInSlice,
} from "../Redux/userProfileSlice";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileTabs from "../components/profile/ProfileTabs";
import PostsList from "../components/profile/PostsList";
import FriendsList from "../components/profile/FriendsList";
import MediaGrid from "../components/profile/MediaGrid";
import EditProfileModal from "../components/profile/EditProfileModal";
import CreatePostModal from "../components/profile/CreatePostModal";
import { getMediaUrl } from "../util/media";

import axiosInstance from "../util/axios.customize";
import {
  followUserApi,
  unfollowUserApi,
  friendRequestApi,
  respondFriendRequestApi,
  blockUserApi,
  createPostApi,
  sharePostApi,
  deletePostApi,
  pinPostApi,
  unfriendUserApi,
} from "../util/api";

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

const UserProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Local state for following and incomingRequests lists
  const [following, setFollowing] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);

  // Local state for Create Post Modal
  const [createPostVisible, setCreatePostVisible] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postVisibility, setPostVisibility] = useState("public");
  const [createPostLoading, setCreatePostLoading] = useState(false);

  // Local state for Post Detail Modal
  const [selectedPost, setSelectedPost] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [postToEdit, setPostToEdit] = useState(null);

  const {
    profileUser,
    posts,
    friends,
    followers,
    media,
    loading,
    error,
    activeTab,
    postsCursor,
    mediaCursor,
  } = useSelector((state) => state.userProfile);

  const { user: currentUser } = useSelector((state) => state.auth);
  const isOwnProfile = currentUser?._id === userId;

  const loadRelationships = async () => {
    try {
      if (isOwnProfile) {
        // Fetch all own relationships (followers, friends, following, requests)
        const res = await axiosInstance.get("/v1/api/relationships");
        if (res?.EC === 0) {
          setFollowing(res.data.following || []);
          setIncomingRequests(res.data.incomingRequests || []);
        }
      } else {
        // Fetch followings of the viewed user
        const res = await axiosInstance.get(`/v1/api/profile/${userId}/following`);
        if (res?.EC === 0) {
          setFollowing(res.data.following || []);
        }
        setIncomingRequests([]);
      }
    } catch (err) {
      console.error("Error loading relationships:", err);
    }
  };

  useEffect(() => {
    dispatch(resetUserProfile());
    setFollowing([]);
    setIncomingRequests([]);
    if (userId) {
      dispatch(fetchUserProfile(userId));
      dispatch(fetchUserPosts({ userId }));
      dispatch(fetchUserFriends({ userId }));
      dispatch(fetchUserFollowers({ userId }));
      loadRelationships();
    }
  }, [userId, dispatch]);

  useEffect(() => {
    if (error) {
      message.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleTabChange = (key) => {
    dispatch(setActiveTab(key));
    if (key === "posts" && posts.length === 0) {
      dispatch(fetchUserPosts({ userId }));
    } else if (key === "friends" && friends.length === 0) {
      dispatch(fetchUserFriends({ userId }));
    } else if (key === "media" && media.length === 0) {
      dispatch(fetchUserMedia({ userId }));
    }
  };

  const handleLoadMorePosts = () => {
    if (postsCursor) {
      dispatch(fetchUserPosts({ userId, cursor: postsCursor }));
    }
  };

  const handleLoadMoreMedia = () => {
    if (mediaCursor) {
      dispatch(fetchUserMedia({ userId, cursor: mediaCursor }));
    }
  };

  // MAIN ACTIONS (Header & Buttons)
  const handleFollowClick = async (followStatus) => {
    try {
      if (followStatus) {
        await followUserApi(userId);
        message.success("Đã theo dõi");
      } else {
        await unfollowUserApi(userId);
        message.success("Đã bỏ theo dõi");
      }
      dispatch(fetchUserProfile(userId));
      dispatch(fetchUserFollowers({ userId }));
      loadRelationships();
    } catch (err) {
      message.error("Lỗi cập nhật trạng thái");
    }
  };

  const handleAddFriendClick = async () => {
    try {
      const res = await friendRequestApi(userId);
      if (res?.EC === 0) {
        message.success(res?.EM || "Đã gửi lời mời kết bạn");
      } else {
        message.error(res?.EM || "Lỗi gửi lời mời");
      }
      dispatch(fetchUserProfile(userId));
      loadRelationships();
    } catch (err) {
      message.error("Lỗi gửi yêu cầu kết bạn");
    }
  };

  const handleAcceptFriendClick = async () => {
    try {
      // Find request from incomingRequests
      const req = incomingRequests.find((r) => r.user?._id === userId);
      if (req) {
        const res = await respondFriendRequestApi(req._id, "accept");
        if (res?.EC === 0) {
          message.success("Đã đồng ý kết bạn!");
          dispatch(fetchUserProfile(userId));
          dispatch(fetchUserFriends({ userId }));
          loadRelationships();
        } else {
          message.error(res?.EM || "Lỗi chấp nhận");
        }
      } else {
        // Fetch relationship page fallback
        const relationshipsRes = await axiosInstance.get("/v1/api/relationships");
        const matchReq = relationshipsRes.data?.incomingRequests?.find(
          (r) => r.user?._id === userId
        );
        if (matchReq) {
          const res = await respondFriendRequestApi(matchReq._id, "accept");
          if (res?.EC === 0) {
            message.success("Đã đồng ý kết bạn!");
            dispatch(fetchUserProfile(userId));
            dispatch(fetchUserFriends({ userId }));
            loadRelationships();
            return;
          }
        }
        message.error("Không tìm thấy yêu cầu kết bạn tương ứng");
      }
    } catch (err) {
      message.error("Lỗi đồng ý kết bạn");
    }
  };

  const handleUnfriendClick = async () => {
    try {
      const res = await unfriendUserApi(userId);
      if (res?.EC === 0) {
        message.success(res?.EM || "Đã hủy kết bạn");
        dispatch(fetchUserProfile(userId));
        dispatch(fetchUserFriends({ userId }));
        loadRelationships();
      } else {
        message.error(res?.EM || "Thất bại");
      }
    } catch (err) {
      message.error("Lỗi hủy kết bạn/hủy yêu cầu");
    }
  };

  const handleRejectFriendClick = async () => {
    try {
      const req = incomingRequests.find((r) => r.user?._id === userId);
      let requestId = req?._id;
      if (!requestId) {
        const relationshipsRes = await axiosInstance.get("/v1/api/relationships");
        const matchReq = relationshipsRes.data?.incomingRequests?.find(
          (r) => r.user?._id === userId
        );
        requestId = matchReq?._id;
      }
      if (requestId) {
        const res = await respondFriendRequestApi(requestId, "reject");
        if (res?.EC === 0) {
          message.success("Đã từ chối lời mời kết bạn");
          dispatch(fetchUserProfile(userId));
          loadRelationships();
        } else {
          message.error(res?.EM || "Thất bại");
        }
      } else {
        message.error("Không tìm thấy yêu cầu kết bạn tương ứng");
      }
    } catch (err) {
      message.error("Lỗi từ chối kết bạn");
    }
  };

  const handleBlockClick = async () => {
    Modal.confirm({
      title: "Chặn người dùng này?",
      content: "Bạn sẽ không nhìn thấy bài viết hoặc tin nhắn từ người dùng này nữa.",
      okText: "Chặn",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          const res = await blockUserApi(userId);
          if (res?.EC === 0) {
            message.success("Đã chặn người dùng");
            navigate("/");
          } else {
            message.error(res?.EM || "Lỗi chặn");
          }
        } catch (err) {
          message.error("Lỗi thao tác chặn");
        }
      },
    });
  };

  const handleFriendsListAction = async (id, actionType) => {
    try {
      if (actionType === "unfriend") {
        const res = await unfriendUserApi(id);
        if (res?.EC === 0) {
          message.success("Đã hủy kết bạn thành công!");
          loadRelationships();
          dispatch(fetchUserProfile(userId));
          dispatch(fetchUserFriends({ userId }));
        } else {
          message.error(res?.EM || "Thất bại");
        }
        return;
      }
      if (actionType === "unfollow") {
        const res = await unfollowUserApi(id);
        if (res?.EC === 0) {
          message.success("Đã bỏ theo dõi");
          loadRelationships();
          dispatch(fetchUserProfile(userId));
          dispatch(fetchUserFollowers({ userId }));
        } else {
          message.error(res?.EM || "Thất bại");
        }
      }
      if (actionType === "accept_request") {
        const res = await respondFriendRequestApi(id, "accept");
        if (res?.EC === 0) {
          message.success("Đã đồng ý kết bạn!");
          loadRelationships();
          dispatch(fetchUserProfile(userId));
          dispatch(fetchUserFriends({ userId }));
        } else {
          message.error(res?.EM || "Thất bại");
        }
      }
      if (actionType === "add_friend") {
        const res = await friendRequestApi(id);
        if (res?.EC === 0) {
          message.success("Đã gửi lời mời kết bạn!");
          loadRelationships();
        } else {
          message.error(res?.EM || "Thất bại");
        }
      }
    } catch (err) {
      message.error("Lỗi thao tác");
    }
  };

  // COMPOSER ACTIONS
  const handleCreatePost = async () => {
    if (!postContent.trim()) return;
    try {
      setCreatePostLoading(true);
      const res = await createPostApi({
        content: postContent,
        visibility: postVisibility,
      });
      if (res?.EC === 0) {
        message.success("Đã đăng bài viết mới!");
        setPostContent("");
        setCreatePostVisible(false);
        dispatch(fetchUserPosts({ userId }));
        dispatch(fetchUserProfile(userId));
      } else {
        message.error(res?.EM || "Không thể đăng bài");
      }
    } catch (err) {
      message.error("Lỗi đăng bài");
    } finally {
      setCreatePostLoading(false);
    }
  };

  const handleShareClick = (post) => {
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
          message.success("Đã chia sẻ!");
          dispatch(fetchUserPosts({ userId }));
          dispatch(fetchUserProfile(userId));
        } else {
          message.error(res?.EM || "Không thể chia sẻ");
        }
      },
    });
  };

  const handlePostClick = (post) => {
    setSelectedPost(post);
    setDetailVisible(true);
  };

  const handlePinPost = async (post) => {
    try {
      const res = await pinPostApi(post._id);
      if (res?.EC === 0) {
        message.success(res?.EM);
        dispatch(togglePinInSlice(post._id));
        setSelectedPost((prev) => prev ? { ...prev, isPinned: !prev.isPinned } : null);
      } else {
        message.error(res?.EM || "Thất bại");
      }
    } catch (err) {
      message.error("Lỗi thao tác ghim");
    }
  };

  const handleDeletePost = (post) => {
    Modal.confirm({
      title: "Xóa bài viết",
      content: "Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          const res = await deletePostApi(post._id);
          if (res?.EC === 0) {
            message.success("Xóa bài viết thành công");
            dispatch(deletePostInSlice(post._id));
            setDetailVisible(false);
            setSelectedPost(null);
          } else {
            message.error(res?.EM || "Thất bại");
          }
        } catch (err) {
          message.error("Lỗi thao tác xóa");
        }
      },
    });
  };

  if (loading && !profileUser) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: "#7F00FD" }} spin />} />
      </div>
    );
  }

  if (error && !profileUser) {
    return (
      <div className="user-profile-container" style={{ marginTop: "24px" }}>
        <Empty description="Không thể tải profile người dùng này" />
      </div>
    );
  }

  return (
    <div className="user-profile-container">
      {/* Profile Header Block */}
      <ProfileHeader
        profile={profileUser}
        isOwnProfile={isOwnProfile}
        onFollowClick={handleFollowClick}
        onAddFriendClick={handleAddFriendClick}
        onAcceptFriendClick={handleAcceptFriendClick}
        onBlockClick={handleBlockClick}
        onEditClick={() => setEditModalVisible(true)}
        pendingRequestsCount={incomingRequests.length}
        onIncomingRequestsClick={() => {
          dispatch(setActiveTab("friends"));
        }}
        onUnfriendClick={handleUnfriendClick}
        onRejectFriendClick={handleRejectFriendClick}
      />

      {/* Edit Profile Modal Dialog */}
      <EditProfileModal
        visible={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        profile={profileUser}
        onSave={() => {
          dispatch(fetchUserProfile(userId));
          dispatch(fetchUserPosts({ userId }));
        }}
      />

      {/* Tabs Row Navigation */}
      <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Profile Tab Contents */}
      <div style={{ marginTop: "16px" }}>
        {activeTab === "posts" && (
          <PostsList
            posts={posts}
            loading={loading}
            hasNextPage={posts.length > 0 && !!postsCursor}
            onLoadMore={handleLoadMorePosts}
            isOwnProfile={isOwnProfile}
            onAddPostClick={() => setCreatePostVisible(true)}
            onPostClick={handlePostClick}
            onShareClick={handleShareClick}
          />
        )}

        {activeTab === "media" && (
          <MediaGrid
            media={media}
            loading={loading}
            hasNextPage={media.length > 0 && !!mediaCursor}
            onLoadMore={handleLoadMoreMedia}
            isOwnProfile={isOwnProfile}
            onAddMediaClick={() => setCreatePostVisible(true)}
          />
        )}

        {activeTab === "friends" && (
          <FriendsList
            friends={friends}
            followers={followers}
            following={following}
            incomingRequests={incomingRequests}
            isOwnProfile={isOwnProfile}
            loading={loading}
            onUserClick={(id) => navigate(`/profile/${id}`)}
            onAction={handleFriendsListAction}
          />
        )}
      </div>

      {/* Create New Post Modal Dialog */}
      {/* Create New Post Modal Dialog */}
      <CreatePostModal
        open={createPostVisible}
        onCancel={() => {
          setCreatePostVisible(false);
          setPostToEdit(null);
        }}
        onSuccess={(updatedPost) => {
          if (postToEdit) {
            dispatch(updatePostInSlice(updatedPost));
          } else {
            dispatch(addCreatedPost(updatedPost));
          }
          dispatch(fetchUserProfile(userId));
        }}
        currentUser={currentUser}
        postToEdit={postToEdit}
      />

      {/* Post Detail Viewer Modal Dialog */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span>Chi tiết bài viết</span>
            {selectedPost?.visibility === "friends" && (
              <Tag icon={<TeamOutlined />} color="blue">Bạn bè</Tag>
            )}
            {selectedPost?.visibility === "private" && (
              <Tag icon={<LockOutlined />} color="red">Chỉ mình tôi</Tag>
            )}
            {selectedPost?.visibility === "public" && (
              <Tag icon={<GlobalOutlined />} color="green">Công khai</Tag>
            )}
            {selectedPost?.isPinned && (
              <Tag icon={<PushpinOutlined />} color="purple">Đã ghim</Tag>
            )}
          </div>
        }
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setSelectedPost(null);
        }}
        footer={
          selectedPost && (isOwnProfile || selectedPost.author?._id === currentUser?._id) ? [
            <Button
              key="pin"
              icon={<PushpinOutlined />}
              onClick={() => handlePinPost(selectedPost)}
              style={{ borderRadius: "10px" }}
            >
              {selectedPost.isPinned ? "Bỏ ghim" : "Ghim"}
            </Button>,
            <Button
              key="edit"
              icon={<EditOutlined />}
              onClick={() => {
                setPostToEdit(selectedPost);
                setCreatePostVisible(true);
                setDetailVisible(false);
              }}
              style={{ borderRadius: "10px" }}
            >
              Chỉnh sửa
            </Button>,
            <Button
              key="delete"
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDeletePost(selectedPost)}
              style={{ borderRadius: "10px" }}
            >
              Xóa
            </Button>,
            <Button
              key="close"
              onClick={() => {
                setDetailVisible(false);
                setSelectedPost(null);
              }}
              style={{ borderRadius: "10px" }}
            >
              Đóng
            </Button>,
          ] : [
            <Button
              key="close"
              onClick={() => {
                setDetailVisible(false);
                setSelectedPost(null);
              }}
              style={{ borderRadius: "10px" }}
            >
              Đóng
            </Button>,
          ]
        }
        width={600}
      >
        {selectedPost && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }}>
            <div style={{ fontSize: "16px", color: "#1a1a1a", whiteSpace: "pre-wrap" }}>
              {renderPostContent(selectedPost.content)}
            </div>
            {selectedPost.media && selectedPost.media.length > 0 && (
              <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #edf0f4" }}>
                {selectedPost.media[0].includes("#type=video") || selectedPost.media[0].endsWith(".mp4") || selectedPost.media[0].endsWith(".mov") || selectedPost.media[0].includes("/video/") ? (
                  <video
                    src={getMediaUrl(selectedPost.media[0])}
                    controls
                    style={{ width: "100%", maxHeight: "400px", objectFit: "contain", backgroundColor: "#f8f9fa" }}
                  />
                ) : (
                  <img
                    src={getMediaUrl(selectedPost.media[0])}
                    alt="Post media"
                    style={{ width: "100%", maxHeight: "400px", objectFit: "contain", backgroundColor: "#f8f9fa" }}
                  />
                )}
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: "16px",
                borderTop: "1px solid #edf0f4",
                paddingTop: "12px",
                color: "#65676b",
                fontWeight: 600,
              }}
            >
              <span>👍 {selectedPost.stats?.reactions || 0} reactions</span>
              <span>💬 {selectedPost.stats?.comments || 0} bình luận</span>
              <span>↗️ {selectedPost.stats?.shares || 0} chia sẻ</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserProfilePage;
