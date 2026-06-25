import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Spin, message, Empty, Modal, Input, Select, Button, Space } from "antd";
import { LoadingOutlined, GlobalOutlined } from "@ant-design/icons";

import {
  fetchUserProfile,
  fetchUserPosts,
  fetchUserFriends,
  fetchUserFollowers,
  fetchUserMedia,
  setActiveTab,
  resetUserProfile,
  clearError,
} from "../Redux/userProfileSlice";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileTabs from "../components/profile/ProfileTabs";
import PostsList from "../components/profile/PostsList";
import FriendsList from "../components/profile/FriendsList";
import MediaGrid from "../components/profile/MediaGrid";
import EditProfileModal from "../components/profile/EditProfileModal";

import axiosInstance from "../util/axios.customize";
import {
  followUserApi,
  unfollowUserApi,
  friendRequestApi,
  respondFriendRequestApi,
  blockUserApi,
  createPostApi,
  sharePostApi,
} from "../util/api";

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
        message.info(
          "Tính năng hủy kết bạn trực tiếp chưa hỗ trợ, vui lòng dùng nút Chặn để hủy liên kết!"
        );
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
          // Direct element click or state transition handled internally in FriendsList
        }}
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
      <Modal
        title="Tạo bài viết mới"
        open={createPostVisible}
        onCancel={() => setCreatePostVisible(false)}
        footer={null}
        width={560}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
          <Input.TextArea
            rows={4}
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="Bạn đang nghĩ gì thế?..."
            style={{ borderRadius: "12px" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Select
              value={postVisibility}
              onChange={setPostVisibility}
              style={{ width: 148 }}
              options={[
                { value: "public", label: "Công khai" },
                { value: "friends", label: "Bạn bè" },
              ]}
              suffixIcon={<GlobalOutlined />}
            />
            <Space>
              <Button onClick={() => setCreatePostVisible(false)} style={{ borderRadius: "10px" }}>
                Hủy
              </Button>
              <Button
                type="primary"
                onClick={handleCreatePost}
                loading={createPostLoading}
                disabled={!postContent.trim()}
                style={{
                  backgroundColor: "#7F00FD",
                  borderColor: "#7F00FD",
                  borderRadius: "10px",
                  fontWeight: 600,
                }}
              >
                Đăng bài
              </Button>
            </Space>
          </div>
        </div>
      </Modal>

      {/* Post Detail Viewer Modal Dialog */}
      <Modal
        title="Chi tiết bài viết"
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setSelectedPost(null);
        }}
        footer={[
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
        ]}
        width={600}
      >
        {selectedPost && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }}>
            <div style={{ fontSize: "16px", color: "#1a1a1a", whiteSpace: "pre-wrap" }}>
              {selectedPost.content}
            </div>
            {selectedPost.media && selectedPost.media.length > 0 && (
              <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #edf0f4" }}>
                <img
                  src={getMediaUrl(selectedPost.media[0])}
                  alt="Post media"
                  style={{ width: "100%", maxHeight: "400px", objectFit: "contain", backgroundColor: "#f8f9fa" }}
                />
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
