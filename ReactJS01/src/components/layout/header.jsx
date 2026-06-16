import { useMemo, useState, useEffect } from "react";
import {
  HomeOutlined,
  LogoutOutlined,
  SettingOutlined,
  UsergroupAddOutlined,
  SearchOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Menu, AutoComplete, Input } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../Redux/authSlice";
import { getMediaUrl } from "../../util/media";
import { searchApi } from "../../util/api";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const userProfile = useSelector((state) => state.userProfile.profileUser);
  const [current, setCurrent] = useState("home");

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await searchApi(searchQuery);
        if (res?.EC === 0) {
          const { users = [], posts = [], groups = [], hashtags = [] } = res.data || {};
          const options = [];

          if (users.length > 0) {
            options.push({
              label: <span style={{ fontWeight: "bold", color: "#8c8c8c" }}>Mọi người</span>,
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

          if (groups.length > 0) {
            options.push({
              label: <span style={{ fontWeight: "bold", color: "#8c8c8c" }}>Nhóm</span>,
              options: groups.slice(0, 3).map((g) => ({
                value: g.name,
                key: `group-${g._id}`,
                label: (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                    onClick={() => navigate(`/search?q=${encodeURIComponent(g.name)}&tab=groups`)}
                  >
                    <Avatar size="small" shape="square" src={g.avatar || ""} icon={<TeamOutlined />} />
                    <span>{g.name}</span>
                  </div>
                ),
              })),
            });
          }

          if (hashtags.length > 0) {
            options.push({
              label: <span style={{ fontWeight: "bold", color: "#8c8c8c" }}>Hashtag</span>,
              options: hashtags.slice(0, 3).map((h) => ({
                value: h.name,
                key: `hash-${h.name}`,
                label: (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                    onClick={() => navigate(`/search?q=${encodeURIComponent(h.name)}`)}
                  >
                    <span style={{ color: "#1890ff" }}>{h.name}</span>
                    <span style={{ fontSize: "11px", color: "gray" }}>({h.count} bài đăng)</span>
                  </div>
                ),
              })),
            });
          }

          if (posts.length > 0) {
            options.push({
              label: <span style={{ fontWeight: "bold", color: "#8c8c8c" }}>Bài viết</span>,
              options: posts.slice(0, 3).map((p) => ({
                value: searchQuery,
                key: `post-${p._id}`,
                label: (
                  <div
                    style={{ display: "flex", flexDirection: "column" }}
                    onClick={() => navigate(`/search?q=${encodeURIComponent(searchQuery)}&tab=posts`)}
                  >
                    <span style={{ fontWeight: "500", fontSize: "13px" }}>{p.author?.name}</span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "gray",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "200px",
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
                  textAlign: "center",
                  padding: "4px 0",
                  fontWeight: "bold",
                  color: "#1890ff",
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/search?q=${encodeURIComponent(searchQuery)}`)}
              >
                Xem tất cả kết quả cho "{searchQuery}"
              </div>
            ),
            options: [],
          });

          setSuggestions(options);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (value) => {
    if (value && value.trim()) {
      navigate(`/search?q=${encodeURIComponent(value.trim())}`);
    }
  };

  const displayName = user?.name || user?.email || "Tài khoản";
  const selectedKey = useMemo(() => {
    if (
      location.pathname.startsWith("/friends") ||
      location.pathname.startsWith("/user")
    )
      return "friends";
    if (location.pathname.startsWith("/chat")) return "chat";
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
          label: <Link to="/chat">Tin nhắn</Link>,
          key: "chat",
          icon: <MessageOutlined />,
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
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <Link to="/" className="app-brand">
          <span className="app-brand-mark">t</span>
          <span>Tegram</span>
        </Link>
        {isAuthenticated && (
          <AutoComplete
            classNames={{
              popup: {
                root: "search-dropdown-popup",
              },
            }}
            style={{ width: 250 }}
            options={suggestions}
            onSearch={setSearchQuery}
            onSelect={handleSearchSubmit}
          >
            <Input
              placeholder="Tìm kiếm trên Tegram..."
              prefix={<SearchOutlined style={{ color: "rgba(0,0,0,.45)" }} />}
              onPressEnter={(e) => handleSearchSubmit(e.target.value)}
              allowClear
            />
          </AutoComplete>
        )}
      </div>

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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
              onClick={() => navigate(`/profile/${user._id}`)}
            >
              <Avatar src={getMediaUrl(userProfile?.avatar)}>{displayName[0]}</Avatar>
              <span className="app-account-name">{displayName}</span>
            </div>
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
