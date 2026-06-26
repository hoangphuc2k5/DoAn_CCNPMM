import { Avatar, Badge, Card, Space, Typography } from "antd";
import { BellOutlined, HomeOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { getMediaUrl } from "../../util/media";

const SocialLeftSidebar = ({
  avatar,
  displayName,
  email,
  onNotificationsClick,
  unread = 0,
}) => (
  <aside className="social-left-rail">
    <Card className="social-panel">
      <Space direction="vertical" size={14} style={{ width: "100%" }}>
        <div className="social-profile-row">
          <Avatar size={42} src={getMediaUrl(avatar)} icon={<UserOutlined />}>
            {displayName?.[0] || "U"}
          </Avatar>
          <div className="min-w-0">
            <Typography.Text strong ellipsis>
              {displayName}
            </Typography.Text>
            <div className="social-muted">{email}</div>
          </div>
        </div>
        <Link className="social-nav-item" to="/">
          <HomeOutlined /> Bảng tin
        </Link>
        <button className="social-nav-item" onClick={onNotificationsClick} type="button">
          <BellOutlined /> Thông báo
          {unread ? <Badge count={unread} size="small" /> : null}
        </button>
        <Link className="social-nav-item" to="/friends">
          <TeamOutlined /> Bạn bè
        </Link>
      </Space>
    </Card>
  </aside>
);

export default SocialLeftSidebar;
