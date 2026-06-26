import { Avatar, Button, Statistic, Row, Col, Space } from "antd";
import { UserAddOutlined, UserOutlined, EditOutlined } from "@ant-design/icons";
import { getMediaUrl } from "../../util/media";

const ProfileHeader = ({
  profile,
  onFollowClick,
  onAddFriendClick,
  onBlockClick,
  onEditClick,
  isOwnProfile,
}) => {
  if (!profile) return null;

  return (
    <div className="profile-header" style={{ marginBottom: "24px" }}>
      {/* Cover Photo */}
      <div
          style={{
            height: "250px",
            backgroundColor: profile.coverPhoto ? "#f0f0f0" : "#e0e0e0",
            backgroundImage: profile.coverPhoto
            ? `url(${getMediaUrl(profile.coverPhoto)})`
            : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          marginBottom: "-50px",
          borderRadius: "8px 8px 0 0",
        }}
      />

      {/* User Info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          padding: "0 24px 24px",
          background: "#fff",
          borderRadius: "0 0 8px 8px",
        }}
      >
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
          <Avatar
            size={120}
            src={getMediaUrl(profile.avatar)}
            icon={<UserOutlined />}
          />
          <div>
            <h1 style={{ margin: "0 0 8px 0" }}>{profile.name}</h1>
            <p style={{ margin: "0 0 8px 0", color: "#666" }}>
              {profile.bio || "Chưa cập nhật tiểu sử"}
            </p>
            <Row gutter={16}>
              <Col>
                <Statistic title="Bạn bè" value={profile.friendCount || 0} />
              </Col>
              <Col>
                <Statistic
                  title="Người theo dõi"
                  value={profile.followerCount || 0}
                />
              </Col>
              <Col>
                <Statistic title="Bài viết" value={profile.postsCount || 0} />
              </Col>
            </Row>
          </div>
        </div>

        {/* Action Buttons */}
        {isOwnProfile ? (
          <Button type="primary" icon={<EditOutlined />} onClick={onEditClick}>
            Chỉnh sửa trang cá nhân
          </Button>
        ) : (
          <Space>
            {profile.isFollowing ? (
              <Button onClick={() => onFollowClick(false)}>
                Đang theo dõi
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => onFollowClick(true)}
              >
                Theo dõi
              </Button>
            )}

            {profile.isFriend ? (
              <Button>Đã là bạn bè</Button>
            ) : profile.hasPendingRequest ? (
              <Button>Đã gửi lời mời</Button>
            ) : (
              <Button onClick={onAddFriendClick}>Kết bạn</Button>
            )}

            <Button onClick={onBlockClick} danger>
              Chặn
            </Button>
          </Space>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
