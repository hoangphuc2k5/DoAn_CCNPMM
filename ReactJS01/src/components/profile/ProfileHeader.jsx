import { useState } from "react";
import { Avatar, Button, Space, message, Badge, Dropdown, Modal, Descriptions } from "antd";
import {
  CheckCircleFilled,
  EditOutlined,
  ShareAltOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  UserOutlined,
  StopOutlined,
  CheckOutlined,
  CameraOutlined,
  ClockCircleOutlined,
  CaretDownOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { getMediaUrl } from "../../util/media";
import "../../styles/user-profile.css";

const ProfileHeader = ({
  profile,
  onFollowClick,
  onAddFriendClick,
  onAcceptFriendClick,
  onBlockClick,
  onUnblockClick,
  onEditClick,
  isOwnProfile,
  pendingRequestsCount = 0,
  onIncomingRequestsClick,
  onUnfriendClick,
  onRejectFriendClick,
  isBlocked = false,
}) => {
  const [detailsVisible, setDetailsVisible] = useState(false);

  if (!profile) return null;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    message.success("Đã sao chép liên kết trang cá nhân!");
  };

  const hasCover = Boolean(profile.coverPhoto);
  const coverUrl = hasCover ? getMediaUrl(profile.coverPhoto) : "";

  // Helper to format large numbers (e.g. 1.2K)
  const formatStat = (num) => {
    if (!num) return "0";
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  // Get name initials for avatar
  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatDate = (value) => {
    if (!value) return "Chưa cập nhật";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
    return date.toLocaleDateString("vi-VN");
  };

  const formatGender = (value) => {
    if (value === "male") return "Nam";
    if (value === "female") return "Nữ";
    if (value === "other") return "Khác";
    return "Chưa cập nhật";
  };

  return (
    <div className="profile-card-wrapper">
      {/* Cover Photo */}
      <div
        className="profile-cover-banner"
        style={
          hasCover
            ? {
                backgroundImage: `url(${coverUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}
        }
      >
        {/* Decorative background circles if no cover photo */}
        {!hasCover && (
          <>
            <div className="cover-circle cover-circle-1" />
            <div className="cover-circle cover-circle-2" />
            <div className="cover-circle cover-circle-3" />
            <div className="cover-circle cover-circle-4" />
            <div className="cover-circle cover-circle-5" />
          </>
        )}

        {isOwnProfile && (
          <Button
            className="btn-change-cover"
            icon={<CameraOutlined />}
            onClick={onEditClick}
          >
            Đổi ảnh bìa
          </Button>
        )}
      </div>

      {/* User Info Area */}
      <div className="profile-info-header">
        {/* Avatar and Action buttons row */}
        <div className="profile-avatar-row">
          <div className="profile-avatar-wrapper">
            {profile.avatar ? (
              <img
                className="profile-avatar-img"
                src={getMediaUrl(profile.avatar)}
                alt={profile.name}
              />
            ) : (
              <div className="profile-avatar-initials">
                {getInitials(profile.name)}
              </div>
            )}
          </div>

          <div className="profile-actions-wrapper" style={{ flexWrap: "nowrap", overflow: "visible" }}>
            {isOwnProfile ? (
              <>
                {pendingRequestsCount > 0 && (
                  <Badge count={pendingRequestsCount} color="#ff4d4f" size="small" offset={[-4, 4]}>
                    <Button
                      className="btn-yellow-outline"
                      onClick={onIncomingRequestsClick}
                    >
                      Lời mời kết bạn
                    </Button>
                  </Badge>
                )}
                <Button
                  type="primary"
                  className="btn-purple"
                  icon={<EditOutlined />}
                  onClick={onEditClick}
                >
                  Chỉnh sửa
                </Button>
              </>
            ) : (
              <>
                {/* Follow Button */}
                {profile.isFollowing ? (
                  <Button
                    className="btn-purple-outline"
                    icon={<CheckOutlined />}
                    onClick={() => onFollowClick?.(false)}
                  >
                    Đang theo dõi
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    className="btn-purple"
                    icon={<UserAddOutlined />}
                    onClick={() => onFollowClick?.(true)}
                  >
                    Theo dõi
                  </Button>
                )}

                {/* Friend request dropdown menu definitions */}
                {(() => {
                  const friendMenuItems = {
                    items: [
                      {
                        key: "unfriend",
                        icon: <UserDeleteOutlined />,
                        label: "Hủy kết bạn",
                        danger: true,
                        onClick: onUnfriendClick,
                      }
                    ]
                  };

                  const requestSentMenuItems = {
                    items: [
                      {
                        key: "cancel_request",
                        icon: <UserDeleteOutlined />,
                        label: "Hủy lời mời",
                        danger: true,
                        onClick: onUnfriendClick,
                      }
                    ]
                  };

                  return (
                    <>
                      {profile.isFriend ? (
                        <Dropdown menu={friendMenuItems} trigger={["click"]}>
                          <Button
                            className="btn-purple-outline"
                            icon={<CheckOutlined />}
                          >
                            Bạn bè <CaretDownOutlined style={{ fontSize: "10px" }} />
                          </Button>
                        </Dropdown>
                      ) : profile.hasPendingRequest ? (
                        <Dropdown menu={requestSentMenuItems} trigger={["click"]}>
                          <Button
                            className="btn-action-gray"
                            icon={<ClockCircleOutlined />}
                          >
                            Đã gửi <CaretDownOutlined style={{ fontSize: "10px" }} />
                          </Button>
                        </Dropdown>
                      ) : profile.hasIncomingRequest ? (
                        <Space size={8}>
                          <Button
                            type="primary"
                            className="btn-card-accept"
                            style={{ borderRadius: "12px", height: "auto", padding: "6px 16px", fontWeight: 600 }}
                            icon={<UserAddOutlined />}
                            onClick={onAcceptFriendClick}
                          >
                            Chấp nhận
                          </Button>
                          <Button
                            className="btn-action-gray"
                            icon={<UserDeleteOutlined />}
                            onClick={onRejectFriendClick}
                          >
                            Từ chối
                          </Button>
                        </Space>
                      ) : (
                        <Button
                          type="primary"
                          className="btn-purple"
                          icon={<UserAddOutlined />}
                          onClick={onAddFriendClick}
                        >
                          Kết bạn
                        </Button>
                      )}
                    </>
                  );
                })()}

                {/* Block Button */}
                {isBlocked ? (
                  <Button
                    className="btn-icon-only"
                    icon={<StopOutlined />}
                    onClick={onUnblockClick}
                    title="Bỏ chặn người dùng này"
                  />
                ) : (
                  <Button
                    className="btn-icon-only"
                    danger
                    icon={<StopOutlined />}
                    onClick={onBlockClick}
                    title="Chặn người dùng này"
                  />
                )}
              </>
            )}

            <Button
              className="btn-icon-only"
              icon={<ShareAltOutlined />}
              onClick={handleShare}
            />
          </div>
        </div>

        {/* Name and Identity */}
        <div className="profile-user-identity">
          <div className="profile-name-row">
            <h1 className="profile-display-name">{profile.name}</h1>
            <CheckCircleFilled className="verified-badge" />
          </div>
          <div className="profile-username">
            @{profile.email ? profile.email.split("@")[0] : "user"} · {profile.address || "Chưa cập nhật địa chỉ"} 📍
          </div>
          <div className="profile-bio-text">
            {profile.bio || "UI/UX Designer · Yêu thích thiết kế và công nghệ 💜"}
          </div>

          <Button
            type="text"
            icon={<MoreOutlined />}
            onClick={() => setDetailsVisible(true)}
            style={{
              paddingLeft: 0,
              color: "#7F00FD",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            Xem thêm
          </Button>
        </div>

        {/* Stats row */}
        <div className="profile-stats-row">
          <div className="profile-stat-item">
            <span className="profile-stat-value">{formatStat(profile.postsCount)}</span>
            <span className="profile-stat-label">Bài viết</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-value">{formatStat(profile.followerCount)}</span>
            <span className="profile-stat-label">Người theo dõi</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-value">{formatStat(profile.followingCount)}</span>
            <span className="profile-stat-label">Đang theo dõi</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-value">{formatStat(profile.friendCount)}</span>
            <span className="profile-stat-label">Bạn bè</span>
          </div>
        </div>
      </div>

      <Modal
        title="Thông tin chi tiết"
        open={detailsVisible}
        onCancel={() => setDetailsVisible(false)}
        footer={null}
        centered
      >
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Email">{profile.email || "Chưa cập nhật"}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{profile.phone || "Chưa cập nhật"}</Descriptions.Item>
          <Descriptions.Item label="Ngày sinh">{formatDate(profile.dateOfBirth)}</Descriptions.Item>
          <Descriptions.Item label="Giới tính">{formatGender(profile.gender)}</Descriptions.Item>
          <Descriptions.Item label="Địa chỉ">{profile.address || "Chưa cập nhật"}</Descriptions.Item>
          <Descriptions.Item label="Tiểu sử">{profile.bio || "Chưa cập nhật"}</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
};

export default ProfileHeader;
