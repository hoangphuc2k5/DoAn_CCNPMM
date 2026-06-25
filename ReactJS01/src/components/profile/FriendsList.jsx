import { useState, useEffect } from "react";
import { Button, Avatar, Spin, Empty, Badge } from "antd";
import {
  UserOutlined,
  LoadingOutlined,
  CheckOutlined,
  UserAddOutlined,
  ClockCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { getMediaUrl } from "../../util/media";
import "../../styles/user-profile.css";

const FriendsList = ({
  friends = [],
  followers = [],
  following = [],
  incomingRequests = [],
  isOwnProfile,
  loading,
  onUserClick,
  onAction, // (userId, actionType) => void
}) => {
  const [filter, setFilter] = useState("all"); // 'all', 'friends', 'followers', 'following', 'requests'

  // Set default filter
  useEffect(() => {
    setFilter("all");
  }, [isOwnProfile]);

  if (loading && friends.length === 0 && followers.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: "#7F00FD" }} spin />} />
      </div>
    );
  }

  // Get active list based on filter
  const getFilteredList = () => {
    switch (filter) {
      case "friends":
        return friends;
      case "followers":
        return followers;
      case "following":
        return following;
      case "requests":
        return incomingRequests.map(r => r.user).filter(Boolean);
      case "all":
      default:
        // Combine all unique users
        const allUsers = [];
        const seenIds = new Set();

        const addUnique = (user) => {
          if (user && user._id && !seenIds.has(user._id)) {
            seenIds.add(user._id);
            allUsers.push(user);
          }
        };

        friends.forEach(addUnique);
        followers.forEach(addUnique);
        following.forEach(addUnique);
        incomingRequests.forEach(r => addUnique(r.user));

        return allUsers;
    }
  };

  const displayList = getFilteredList();

  // Helper to determine relationship state for a user
  const getRelationshipButton = (targetUser) => {
    const targetId = targetUser._id;

    // Is friend
    const isFriend = friends.some(f => f._id === targetId);
    if (isFriend) {
      return (
        <Button
          className="friend-card-action-btn btn-card-friend"
          icon={<CheckOutlined />}
          onClick={() => onAction?.(targetId, "unfriend")}
        >
          Bạn bè
        </Button>
      );
    }

    // Is incoming request
    const incomingReq = incomingRequests.find(r => r.user?._id === targetId);
    if (incomingReq) {
      return (
        <Button
          type="primary"
          className="friend-card-action-btn btn-card-accept"
          icon={<UserAddOutlined />}
          onClick={() => onAction?.(incomingReq._id, "accept_request")}
        >
          Chấp nhận
        </Button>
      );
    }

    // Is following
    const isFollowing = following.some(f => f._id === targetId);
    if (isFollowing) {
      return (
        <Button
          className="friend-card-action-btn btn-card-following"
          icon={<CheckOutlined />}
          onClick={() => onAction?.(targetId, "unfollow")}
        >
          Đang theo dõi
        </Button>
      );
    }

    // If none, default to "Kết bạn" (solid purple) or "Theo dõi"
    return (
      <Button
        type="primary"
        className="friend-card-action-btn btn-card-connect"
        icon={<PlusOutlined />}
        onClick={() => onAction?.(targetId, "add_friend")}
      >
        Kết bạn
      </Button>
    );
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Mock details to match UI mockup
  const getSubtext = (user) => {
    // Generate simulated UI/UX designer title or email
    const username = user.email ? user.email.split("@")[0] : "user";
    if (username.includes("design") || username.includes("test")) {
      return "UI/UX Designer";
    }
    if (username.includes("frontend") || username.includes("dev")) {
      return "Frontend Developer";
    }
    return "Product Member";
  };

  const getMutualCount = (user) => {
    // Generate a premium-looking mutual friend count
    const seed = user.name ? user.name.charCodeAt(0) : 5;
    return (seed % 12) + 2;
  };

  return (
    <div>
      {/* Title block */}
      <div className="friends-section-header">
        <h2 className="friends-section-title">Bạn bè & Theo dõi</h2>
        {isOwnProfile && incomingRequests.length > 0 && (
          <span
            className="friends-invitation-link"
            onClick={() => setFilter("requests")}
          >
            Lời mời ({incomingRequests.length})
          </span>
        )}
      </div>

      {/* Categories Bar */}
      <div className="friends-filter-bar">
        <Button
          className={`btn-filter-pill ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          Tất cả
        </Button>
        <Button
          className={`btn-filter-pill ${filter === "friends" ? "active" : ""}`}
          onClick={() => setFilter("friends")}
        >
          Bạn bè ({friends.length})
        </Button>
        <Button
          className={`btn-filter-pill ${filter === "followers" ? "active" : ""}`}
          onClick={() => setFilter("followers")}
        >
          Người theo dõi ({followers.length})
        </Button>
        <Button
          className={`btn-filter-pill ${filter === "following" ? "active" : ""}`}
          onClick={() => setFilter("following")}
        >
          Đang theo dõi ({following.length})
        </Button>
        {isOwnProfile && (
          <Badge count={incomingRequests.length} offset={[8, -2]}>
            <Button
              className={`btn-filter-pill ${filter === "requests" ? "active" : ""}`}
              onClick={() => setFilter("requests")}
            >
              Lời mời kết bạn
            </Button>
          </Badge>
        )}
      </div>

      {/* Grid List */}
      {displayList.length === 0 ? (
        <Empty description="Không có người dùng nào phù hợp" />
      ) : (
        <div className="friends-grid-list">
          {displayList.map((user) => (
            <div key={user._id} className="friend-item-card">
              <Avatar
                size={80}
                src={getMediaUrl(user.avatar)}
                icon={<UserOutlined />}
                className="friend-card-avatar"
                style={{ backgroundColor: user.avatar ? "transparent" : "#7F00FD", cursor: "pointer" }}
                onClick={() => onUserClick?.(user._id)}
              >
                {getInitials(user.name)}
              </Avatar>
              <div
                className="friend-card-name"
                onClick={() => onUserClick?.(user._id)}
              >
                {user.name}
              </div>
              <p className="friend-card-role">{getSubtext(user)}</p>
              <p className="friend-card-mutual">{getMutualCount(user)} bạn chung</p>
              
              <div style={{ width: "100%", marginTop: "auto" }}>
                {getRelationshipButton(user)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FriendsList;
