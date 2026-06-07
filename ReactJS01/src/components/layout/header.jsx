import { useMemo, useState } from "react";
import {
  HomeOutlined,
  LogoutOutlined,
  SettingOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Menu } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../Redux/authSlice";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [current, setCurrent] = useState("home");

  const displayName = user?.name || user?.email || "Tài khoản";
  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith("/friends") || location.pathname.startsWith("/user")) return "friends";
    if (location.pathname.startsWith("/profile")) return "profile";
    if (location.pathname.startsWith("/login")) return "login";
    if (location.pathname.startsWith("/register")) return "register";
    return current;
  }, [current, location.pathname]);

  const items = [
    {
      label: <Link to="/">Bảng tin</Link>,
      key: "home",
      icon: <HomeOutlined />,
    },
    ...(isAuthenticated
      ? [
          {
            label: <Link to="/friends">Bạn bè</Link>,
            key: "friends",
            icon: <UsergroupAddOutlined />,
          },
          {
            label: <Link to="/profile">Hồ sơ</Link>,
            key: "profile",
            icon: <SettingOutlined />,
          },
        ]
      : [
          {
            label: <Link to="/login">Đăng nhập</Link>,
            key: "login",
          },
          {
            label: <Link to="/register">Đăng ký</Link>,
            key: "register",
          },
        ]),
  ];

  return (
    <header className="app-header">
      <Link to="/" className="app-brand">
        <span className="app-brand-mark">f</span>
        <span>Social Feed</span>
      </Link>

      <Menu
        className="app-menu"
        onClick={(event) => setCurrent(event.key)}
        selectedKeys={[selectedKey]}
        mode="horizontal"
        items={items}
      />

      <div className="app-account">
        {isAuthenticated ? (
          <>
            <Avatar src={user?.avatar}>{displayName[0]}</Avatar>
            <span className="app-account-name">{displayName}</span>
            <Button
              shape="circle"
              icon={<LogoutOutlined />}
              onClick={() => {
                dispatch(logout());
                navigate("/");
              }}
            />
          </>
        ) : (
          <Link to="/login">
            <Button type="primary">Đăng nhập</Button>
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
