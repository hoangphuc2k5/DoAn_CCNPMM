import { useEffect, useMemo, useState } from "react";
import {
  HomeOutlined,
  LogoutOutlined,
  MessageOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { Avatar, AutoComplete, Button, Input, Menu } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../Redux/authSlice";
import { searchApi } from "../../util/api";
import { getMediaUrl } from "../../util/media";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const userProfile = useSelector((state) => state.userProfile.profileUser);
  const [current, setCurrent] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      const res = await searchApi(searchQuery);
      if (res?.EC !== 0) return;

      const { users = [], posts = [], groups = [], hashtags = [] } = res.data || {};
      const options = [];

      if (users.length) {
        options.push({
          label: <span style={{ fontWeight: 700, color: "#8c8c8c" }}>Moi nguoi</span>,
          options: users.slice(0, 3).map((u) => ({
            value: u.name,
            key: `user-${u._id}`,
            label: (
              <div
                style={{ display: "flex", alignItems: "center", gap: 8 }}
                onClick={() => navigate(`/profile/${u._id}`)}
              >
                <Avatar size="small" src={getMediaUrl(u.avatar)} />
                <span>{u.name}</span>
              </div>
            ),
          })),
        });
      }

      if (groups.length) {
        options.push({
          label: <span style={{ fontWeight: 700, color: "#8c8c8c" }}>Nhom</span>,
          options: groups.slice(0, 3).map((g) => ({
            value: g.name,
            key: `group-${g._id}`,
            label: (
              <div
                style={{ display: "flex", alignItems: "center", gap: 8 }}
                onClick={() => navigate(`/groups`)}
              >
                <Avatar
                  size="small"
                  shape="square"
                  src={getMediaUrl(g.avatar)}
                  icon={<TeamOutlined />}
                />
                <span>{g.name}</span>
              </div>
            ),
          })),
        });
      }

      if (hashtags.length) {
        options.push({
          label: <span style={{ fontWeight: 700, color: "#8c8c8c" }}>Hashtag</span>,
          options: hashtags.slice(0, 3).map((h) => ({
            value: h.name,
            key: `hash-${h.name}`,
            label: (
              <div
                style={{ display: "flex", alignItems: "center", gap: 8 }}
                onClick={() => navigate(`/search?q=${encodeURIComponent(h.name)}`)}
              >
                <span style={{ color: "#1890ff" }}>{h.name}</span>
                <span style={{ fontSize: 11, color: "gray" }}>({h.count} bai dang)</span>
              </div>
            ),
          })),
        });
      }

      if (posts.length) {
        options.push({
          label: <span style={{ fontWeight: 700, color: "#8c8c8c" }}>Bai viet</span>,
          options: posts.slice(0, 3).map((p) => ({
            value: searchQuery,
            key: `post-${p._id}`,
            label: (
              <div
                style={{ display: "flex", flexDirection: "column" }}
                onClick={() => navigate(`/search?q=${encodeURIComponent(searchQuery)}&tab=posts`)}
              >
                <span style={{ fontWeight: 500, fontSize: 13 }}>{p.author?.name}</span>
                <span
                  style={{
                    fontSize: 11,
                    color: "gray",
                    maxWidth: 200,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.content}
                </span>
              </div>
            ),
          })),
        });
      }

      options.push({
        label: (
          <div
            style={{
              color: "#1890ff",
              cursor: "pointer",
              fontWeight: 700,
              padding: "4px 0",
              textAlign: "center",
            }}
            onClick={() => navigate(`/search?q=${encodeURIComponent(searchQuery)}`)}
          >
            Xem tat ca ket qua cho "{searchQuery}"
          </div>
        ),
        options: [],
      });

      setSuggestions(options);
    }, 250);

    return () => clearTimeout(timer);
  }, [navigate, searchQuery]);

  const handleSearchSubmit = (value) => {
    if (value?.trim()) {
      navigate(`/search?q=${encodeURIComponent(value.trim())}`);
    }
  };

  const displayName = user?.name || user?.email || "Tai khoan";
  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith("/friends") || location.pathname.startsWith("/user")) {
      return "friends";
    }
    if (location.pathname.startsWith("/chat")) return "chat";
    if (location.pathname.startsWith("/groups")) return "groups";
    if (location.pathname.startsWith("/profile")) return "profile";
    if (location.pathname.startsWith("/login")) return "login";
    if (location.pathname.startsWith("/register")) return "register";
    return current;
  }, [current, location.pathname]);

  const items = [
    {
      label: <Link to="/">Bang tin</Link>,
      key: "home",
      icon: <HomeOutlined />,
    },
    ...(isAuthenticated
      ? [
          {
            label: <Link to="/friends">Ban be</Link>,
            key: "friends",
            icon: <UsergroupAddOutlined />,
          },
          {
            label: <Link to="/chat">Tin nhan</Link>,
            key: "chat",
            icon: <MessageOutlined />,
          },
          {
            label: <Link to="/groups">Nhom</Link>,
            key: "groups",
            icon: <TeamOutlined />,
          },
          {
            label: <Link to="/profile">Ho so</Link>,
            key: "profile",
            icon: <SettingOutlined />,
          },
        ]
      : [
          {
            label: <Link to="/login">Dang nhap</Link>,
            key: "login",
          },
          {
            label: <Link to="/register">Dang ky</Link>,
            key: "register",
          },
        ]),
  ];

  return (
    <header className="app-header">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link to="/" className="app-brand">
          <span className="app-brand-mark">t</span>
          <span>Tegram</span>
        </Link>
        {isAuthenticated ? (
          <AutoComplete
            classNames={{ popup: { root: "search-dropdown-popup" } }}
            options={suggestions}
            onSearch={setSearchQuery}
            onSelect={handleSearchSubmit}
            style={{ width: 250 }}
          >
            <Input
              allowClear
              onPressEnter={(event) => handleSearchSubmit(event.target.value)}
              placeholder="Tim kiem tren Tegram..."
              prefix={<SearchOutlined style={{ color: "rgba(0,0,0,.45)" }} />}
            />
          </AutoComplete>
        ) : null}
      </div>

      <Menu
        className="app-menu"
        items={items}
        mode="horizontal"
        onClick={(event) => setCurrent(event.key)}
        selectedKeys={[selectedKey]}
      />

      <div className="app-account">
        {isAuthenticated ? (
          <>
            <div
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
              onClick={() => navigate(`/profile/${user._id}`)}
            >
              <Avatar src={getMediaUrl(userProfile?.avatar)}>{displayName[0]}</Avatar>
              <span className="app-account-name">{displayName}</span>
            </div>
            <Button
              icon={<LogoutOutlined />}
              onClick={() => {
                dispatch(logout());
                navigate("/");
              }}
              shape="circle"
            />
          </>
        ) : (
          <Link to="/login">
            <Button type="primary">Dang nhap</Button>
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
