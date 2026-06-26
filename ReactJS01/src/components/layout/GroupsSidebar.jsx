import { Avatar, Badge, Button } from "antd";
import {
  BellOutlined,
  BookOutlined,
  HomeOutlined,
  LogoutOutlined,
  MessageOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { getMediaUrl } from "../../util/media";

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";

const GroupsSidebar = ({
  avatar,
  displayHandle,
  displayName,
  notificationCount = 0,
  onLogout,
  userId,
}) => (
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
        <Badge count={notificationCount} size="small">
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
      <Link to={`/profile/${userId || ""}`} className="tg-nav-item">
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
      <Avatar src={getMediaUrl(avatar)}>{getInitials(displayName)}</Avatar>
      <div>
        <strong>{displayName}</strong>
        <span>@{displayHandle}</span>
      </div>
    </div>
    <Button className="tg-logout" type="text" icon={<LogoutOutlined />} onClick={onLogout}>
      Đăng xuất
    </Button>
  </aside>
);

export default GroupsSidebar;
