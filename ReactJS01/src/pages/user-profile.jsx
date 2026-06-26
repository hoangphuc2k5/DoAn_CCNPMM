import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Card, Spin, message, Empty } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

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
import FollowersList from "../components/profile/FollowersList";
import MediaGrid from "../components/profile/MediaGrid";
import EditProfileModal from "../components/profile/EditProfileModal";

const UserProfilePage = () => {
  const { userId } = useParams();
  const dispatch = useDispatch();
  const [editModalVisible, setEditModalVisible] = useState(false);

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
    postsHasNextPage,
    mediaHasNextPage,
  } = useSelector((state) => state.userProfile);

  const { user: currentUser } = useSelector((state) => state.auth);
  const isOwnProfile = currentUser?._id === userId;

  useEffect(() => {
    dispatch(resetUserProfile());
    if (userId) {
      dispatch(fetchUserProfile(userId));
      dispatch(fetchUserPosts({ userId }));
      dispatch(fetchUserFriends({ userId }));
      dispatch(fetchUserFollowers({ userId }));
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
    } else if (key === "followers" && followers.length === 0) {
      dispatch(fetchUserFollowers({ userId }));
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

  if (loading && !profileUser) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  if (error && !profileUser) {
    return (
      <Card style={{ maxWidth: "1000px", margin: "20px auto" }}>
        <Empty description="Không thể tải profile" />
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px" }}>
      <ProfileHeader
        profile={profileUser}
        isOwnProfile={isOwnProfile}
        onEditClick={() => setEditModalVisible(true)}
      />
      <EditProfileModal
        visible={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        profile={profileUser}
        onSave={() => dispatch(fetchUserProfile(userId))}
      />

      <Card>
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          postsCount={profileUser?.postsCount || 0}
          friendsCount={profileUser?.friendCount || 0}
          followersCount={profileUser?.followerCount || 0}
        />

        <div style={{ marginTop: "20px" }}>
          {activeTab === "posts" && (
            <PostsList
              posts={posts}
              loading={loading}
              hasNextPage={postsHasNextPage}
              onLoadMore={handleLoadMorePosts}
            />
          )}
          {activeTab === "friends" && (
            <FriendsList friends={friends} loading={loading} />
          )}
          {activeTab === "followers" && (
            <FollowersList followers={followers} loading={loading} />
          )}
          {activeTab === "media" && (
            <MediaGrid
              media={media}
              loading={loading}
              hasNextPage={mediaHasNextPage}
              onLoadMore={handleLoadMoreMedia}
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export default UserProfilePage;
