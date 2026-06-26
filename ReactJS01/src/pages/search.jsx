import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  Card,
  Tabs,
  List,
  Avatar,
  Button,
  Tag,
  Space,
  Typography,
  Empty,
  Spin,
  message,
  Menu,
  Input,
  AutoComplete,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  UserAddOutlined,
  CheckOutlined,
  GlobalOutlined,
  LikeFilled,
  LikeOutlined,
  CommentOutlined,
  RetweetOutlined,
  SearchOutlined,
  PlayCircleFilled,
  FireOutlined,
  CompassOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { searchApi, followUserApi, friendRequestApi, getTrendingApi } from "../util/api";
import { getMediaUrl } from "../util/media";
import "../styles/search.css";

const { Title, Text, Paragraph } = Typography;

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const activeTab = searchParams.get("tab") || "all";

  const [inputValue, setInputValue] = useState(query);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState([]);
  const [results, setResults] = useState({
    users: [],
    posts: [],
    groups: [],
    hashtags: [],
  });

  // Autocomplete Suggestions State
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const fetchResults = async () => {
    if (!query.trim()) {
      setResults({ users: [], posts: [], groups: [], hashtags: [] });
      return;
    }
    setLoading(true);
    try {
      const res = await searchApi(query);
      if (res?.EC === 0) {
        setResults({
          users: res.data?.users || [],
          posts: res.data?.posts || [],
          groups: res.data?.groups || [],
          hashtags: res.data?.hashtags || [],
        });
      } else {
        message.error(res?.EM || "Lỗi tải kết quả tìm kiếm");
      }
    } catch (err) {
      message.error("Đã xảy ra lỗi khi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  const loadTrending = async () => {
    try {
      const res = await getTrendingApi();
      if (res?.EC === 0) setTrending(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Sync input value when URL query param changes
  useEffect(() => {
    setInputValue(query);
    fetchResults();
  }, [query]);

  // Load trending topics on mount
  useEffect(() => {
    loadTrending();
  }, []);

  // Autocomplete Debounce Suggestions Query Effect
  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const res = await searchApi(inputValue);
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
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${u._id}`);
                    }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/search?q=${encodeURIComponent(g.name)}&tab=groups`);
                    }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/search?q=${encodeURIComponent(h.name)}`);
                    }}
                  >
                    <span style={{ color: "#7F00FD" }}>{h.name}</span>
                    <span style={{ fontSize: "11px", color: "gray" }}>({h.count} bài đăng)</span>
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
                  color: "#7F00FD",
                  cursor: "pointer",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/search?q=${encodeURIComponent(inputValue)}`);
                }}
              >
                Xem tất cả kết quả cho "{inputValue}"
              </div>
            ),
            options: [],
          });

          setSuggestions(options);
        }
      } catch (err) {
        console.error("Suggestions error:", err);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [inputValue, navigate]);

  const handleSearchSubmit = (value) => {
    const val = typeof value === "string" ? value : inputValue;
    if (val.trim()) {
      navigate(`/search?q=${encodeURIComponent(val.trim())}`);
    } else {
      navigate("/search");
    }
  };

  const handleFollow = async (userId) => {
    try {
      await followUserApi(userId);
      message.success("Đã theo dõi người dùng");
    } catch (err) {
      message.error("Lỗi khi theo dõi");
    }
  };

  const handleAddFriend = async (userId) => {
    try {
      const res = await friendRequestApi(userId);
      message.success(res?.EM || "Đã gửi lời mời kết bạn");
    } catch (err) {
      message.error("Lỗi gửi kết bạn");
    }
  };

  const handleTabChange = (key) => {
    navigate(`/search?q=${encodeURIComponent(query)}&tab=${key}`, { replace: true });
  };

  // Mock discover items for initial view (Image 1)
  const discoverItems = [
    {
      title: "Thiết kế hệ thống màu sắc",
      bg: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      isVideo: false,
    },
    {
      title: "Component library với Figma",
      bg: "linear-gradient(135deg, #2e1065 0%, #1e1b4b 100%)",
      isVideo: false,
    },
    {
      title: "Responsive layout patterns",
      bg: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      isVideo: false,
    },
    {
      title: "Dark UI best practices",
      bg: "linear-gradient(135deg, #3b0764 0%, #18002a 100%)",
      isVideo: true,
    },
    {
      title: "Icon design workflow",
      bg: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)",
      isVideo: false,
    },
    {
      title: "Typography in UI",
      bg: "linear-gradient(135deg, #450a0a 0%, #1c0000 100%)",
      isVideo: true,
    },
  ];

  // Results rendering callbacks
  const renderUsers = (limit) => {
    const data = limit ? results.users.slice(0, limit) : results.users;
    if (!data.length) return <Empty description="Không tìm thấy người dùng nào" />;
    return (
      <List
        itemLayout="horizontal"
        dataSource={data}
        renderItem={(item) => (
          <List.Item
            className="user-result-item"
            actions={[
              <Button
                key="follow"
                size="small"
                className="btn-search-purple-outline"
                icon={<CheckOutlined />}
                onClick={() => handleFollow(item._id)}
              >
                Theo dõi
              </Button>,
              <Button
                key="friend"
                size="small"
                type="primary"
                className="btn-search-purple-solid"
                icon={<UserAddOutlined />}
                onClick={() => handleAddFriend(item._id)}
              >
                Kết bạn
              </Button>,
            ]}
          >
            <List.Item.Meta
              avatar={
                <Avatar
                  src={getMediaUrl(item.avatar)}
                  icon={<UserOutlined />}
                  size={48}
                  className="user-result-avatar"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/profile/${item._id}`)}
                />
              }
              title={
                <Link to={`/profile/${item._id}`} className="user-result-name">
                  {item.name}
                </Link>
              }
              description={item.bio || item.email}
            />
          </List.Item>
        )}
      />
    );
  };

  const renderGroups = (limit) => {
    const data = limit ? results.groups.slice(0, limit) : results.groups;
    if (!data.length) return <Empty description="Không tìm thấy nhóm nào" />;
    return (
      <List
        itemLayout="horizontal"
        dataSource={data}
        renderItem={(item) => (
          <List.Item
            className="user-result-item"
            actions={[
              <Button key="join" type="primary" size="small" className="btn-search-purple-solid">
                Tham gia
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/groups/${item._id}`)}
            actions={[
              <Button
                key="join"
                type="primary"
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/groups/${item._id}`);
                }}
              >
                Vào nhóm
              </Button>,
            ]}
          >
            <List.Item.Meta
              avatar={
                <Avatar
                  src={item.avatar}
                  icon={<TeamOutlined />}
                  shape="square"
                  size={48}
                  className="user-result-avatar"
                />
              }
              title={<span style={{ fontWeight: "bold" }}>{item.name}</span>}
              description={
                <div>
                  <Paragraph ellipsis={{ rows: 1 }} style={{ marginBottom: 4 }}>
                    {item.description || "Chưa có mô tả nhóm"}
                  </Paragraph>
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    {item.members?.length || 0} thành viên
                  </Text>
                </div>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  const renderHashtags = (limit) => {
    const data = limit ? results.hashtags.slice(0, limit) : results.hashtags;
    if (!data.length) return <Empty description="Không tìm thấy hashtag nào" />;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", padding: "8px 0" }}>
        {data.map((item) => (
          <Link key={item.name} to={`/search?q=${encodeURIComponent(item.name)}`}>
            <Tag className="search-trend-pill" style={{ margin: 0 }}>
              <ThunderboltOutlined /> {item.name} ({item.count} bài đăng)
            </Tag>
          </Link>
        ))}
      </div>
    );
  };

  const renderPosts = (limit) => {
    const data = limit ? results.posts.slice(0, limit) : results.posts;
    if (!data.length) return <Empty description="Không tìm thấy bài viết nào" />;
    return (
      <List
        dataSource={data}
        renderItem={(item) => (
          <Card
            key={item._id}
            className="search-post-card"
            style={{ marginBottom: "16px" }}
          >
            <div className="search-post-head">
              <Space
                align="start"
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/profile/${item.author?._id}`)}
              >
                <Avatar
                  src={getMediaUrl(item.author?.avatar)}
                  icon={<UserOutlined />}
                  size={44}
                  className="user-result-avatar"
                />
                <div>
                  <Typography.Text strong style={{ display: "block" }}>
                    {item.author?.name}
                  </Typography.Text>
                  <div className="post-meta">
                    {new Date(item.createdAt).toLocaleString("vi-VN")} ·{" "}
                    {item.visibility === "friends" ? "Bạn bè" : "Công khai"}
                  </div>
                </div>
              </Space>
            </div>

            <Typography.Paragraph className="post-content">
              {item.content}
            </Typography.Paragraph>

            {item.hashtags?.length ? (
              <Space wrap className="post-tags" style={{ marginBottom: "8px" }}>
                {item.hashtags.map((tag) => (
                  <Tag key={tag} color="purple">
                    #{tag}
                  </Tag>
                ))}
              </Space>
            ) : null}

            <div className="post-stats">
              <span>
                <LikeFilled style={{ color: "#7F00FD" }} /> {item.stats?.reactions || 0} reaction
              </span>
              <span>
                {item.stats?.comments || 0} bình luận · {item.stats?.shares || 0} chia sẻ
              </span>
            </div>

            <div className="post-actions">
              <Button type="text" icon={<LikeOutlined />} style={{ color: "#7F00FD" }}>Like</Button>
              <Button
                type="text"
                icon={<CommentOutlined />}
                onClick={() => navigate(`/profile/${item.author?._id}`)}
              >
                Bình luận
              </Button>
              <Button type="text" icon={<RetweetOutlined />}>Chia sẻ</Button>
            </div>
          </Card>
        )}
      />
    );
  };

  const filterMenuItems = [
    { key: "all", label: "Tất cả", icon: <GlobalOutlined /> },
    { key: "users", label: "Mọi người", icon: <UserOutlined /> },
    { key: "groups", label: "Nhóm", icon: <TeamOutlined /> },
    { key: "hashtags", label: "Hashtag", icon: <ThunderboltOutlined /> },
    { key: "posts", label: "Bài viết", icon: <FileTextOutlined /> },
  ];

  return (
    <div className="search-page-container">
      {/* CASE 1: Query is empty - Render Discover page matching Photo 1 */}
      {!query.trim() ? (
        <div className="search-initial-container">
          {/* Huge centered Search input bar with AutoComplete dropdown suggestions */}
          <div className="search-bar-huge">
            <AutoComplete
              style={{ width: "100%" }}
              options={suggestions}
              value={inputValue}
              onChange={setInputValue}
              onSelect={handleSearchSubmit}
              popupClassName="search-dropdown-popup"
              defaultActiveFirstOption={false}
            >
              <Input.Search
                placeholder="Tìm kiếm người dùng, bài viết, hashtag..."
                enterButton="Tìm kiếm"
                size="large"
                loading={suggestionsLoading || loading}
                onSearch={handleSearchSubmit}
                allowClear
                autoFocus
                prefix={<SearchOutlined style={{ color: "#7F00FD", marginRight: 6 }} />}
              />
            </AutoComplete>
          </div>

          {/* Trending list Section */}
          <div className="search-section-title">
            <FireOutlined style={{ color: "#ff4d4f" }} />
            <span>Trending</span>
          </div>
          <div className="search-trending-box">
            {trending.length ? (
              trending.map((item) => (
                <Tag
                  key={item.topic}
                  className="search-trend-pill"
                  onClick={() => handleSearchSubmit(item.topic)}
                >
                  #{item.topic}
                </Tag>
              ))
            ) : (
              <Text type="secondary">Chưa có chủ đề nổi bật</Text>
            )}
          </div>

          {/* Khám phá grid section */}
          <div className="search-section-title">
            <CompassOutlined style={{ color: "#7F00FD" }} />
            <span>Khám phá</span>
          </div>
          <div className="discover-grid">
            {discoverItems.map((item, idx) => (
              <div
                key={idx}
                className="discover-card-item"
                style={{ background: item.bg }}
                onClick={() => handleSearchSubmit(item.title)}
              >
                <div className="discover-card-circle-logo">
                  {item.isVideo ? (
                    <PlayCircleFilled style={{ fontSize: 24, color: "#ffffff" }} />
                  ) : (
                    <CompassOutlined style={{ fontSize: 24, color: "#ffffff" }} />
                  )}
                </div>
                <div className="discover-card-title-overlay">
                  {item.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* CASE 2: Query is NOT empty - Render Results 2-column Grid with horizontal filters */
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Header search bar with AutoComplete dropdown suggestions */}
          <div style={{ maxWidth: "800px", width: "100%", margin: "0 auto 10px" }}>
            <AutoComplete
              style={{ width: "100%" }}
              options={suggestions}
              value={inputValue}
              onChange={setInputValue}
              onSelect={handleSearchSubmit}
              popupClassName="search-dropdown-popup"
              defaultActiveFirstOption={false}
            >
              <Input.Search
                placeholder="Tìm kiếm người dùng, bài viết, hashtag..."
                size="large"
                loading={suggestionsLoading || loading}
                onSearch={handleSearchSubmit}
                allowClear
                style={{ borderRadius: "999px" }}
                prefix={<SearchOutlined style={{ color: "#7F00FD", marginRight: 6 }} />}
              />
            </AutoComplete>
          </div>

          <div className="search-results-grid">
            {/* Left/Center Main Column: Search results (No Left Sidebar!) */}
            <main className="search-results-main">
              {/* Back button and title header */}
              <div className="results-header-box">
                <Button
                  className="results-back-btn"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate("/search")}
                />
                <div>
                  <h3 className="results-title-text">Kết quả tìm kiếm cho:</h3>
                  <div className="results-query-highlight">"{query}"</div>
                </div>
              </div>

              {/* Horizontal filters tabs (Rendered on all screen sizes in the center!) */}
              <div className="search-tabs-container" style={{ marginBottom: "16px" }}>
                <Tabs
                  activeKey={activeTab}
                  onChange={handleTabChange}
                  items={filterMenuItems.map((item) => ({
                    key: item.key,
                    label: (
                      <span>
                        {item.icon} {item.label}
                      </span>
                    ),
                  }))}
                  className="search-custom-tabs"
                />
              </div>

              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 40, color: "#7F00FD" }} spin />} tip="Đang tải kết quả..." />
                </div>
              ) : (
                <div className="search-results-content">
                  {activeTab === "all" && (
                    <Space direction="vertical" size={16} style={{ width: "100%" }}>
                      {/* People result block */}
                      {results.users.length > 0 && (
                        <Card
                          className="results-block-card"
                          title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><UserOutlined style={{ color: "#7F00FD" }} /> Mọi người</span>}
                          extra={<a href="#" className="results-view-all-link" onClick={(e) => { e.preventDefault(); handleTabChange("users"); }}>Xem tất cả</a>}
                        >
                          {renderUsers(3)}
                        </Card>
                      )}

                      {/* Group result block */}
                      {results.groups.length > 0 && (
                        <Card
                          className="results-block-card"
                          title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><TeamOutlined style={{ color: "#7F00FD" }} /> Nhóm</span>}
                          extra={<a href="#" className="results-view-all-link" onClick={(e) => { e.preventDefault(); handleTabChange("groups"); }}>Xem tất cả</a>}
                        >
                          {renderGroups(3)}
                        </Card>
                      )}

                      {/* Hashtag result block */}
                      {results.hashtags.length > 0 && (
                        <Card
                          className="results-block-card"
                          title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><ThunderboltOutlined style={{ color: "#7F00FD" }} /> Hashtag liên quan</span>}
                          extra={<a href="#" className="results-view-all-link" onClick={(e) => { e.preventDefault(); handleTabChange("hashtags"); }}>Xem tất cả</a>}
                        >
                          {renderHashtags(5)}
                        </Card>
                      )}

                      {/* Post result block */}
                      {results.posts.length > 0 && (
                        <Card
                          className="results-block-card"
                          title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><FileTextOutlined style={{ color: "#7F00FD" }} /> Bài viết</span>}
                          extra={<a href="#" className="results-view-all-link" onClick={(e) => { e.preventDefault(); handleTabChange("posts"); }}>Xem tất cả</a>}
                        >
                          {renderPosts(3)}
                        </Card>
                      )}

                      {!results.users.length && !results.posts.length && !results.groups.length && !results.hashtags.length && (
                        <Card className="results-block-card" style={{ padding: "40px 20px", textAlign: "center" }}>
                          <Empty description={`Không tìm thấy kết quả nào cho "${query}"`} />
                        </Card>
                      )}
                    </Space>
                  )}

                  {activeTab === "users" && (
                    <Card className="results-block-card" title={<span><UserOutlined style={{ color: "#7F00FD", marginRight: 8 }} /> Mọi người</span>}>
                      {renderUsers()}
                    </Card>
                  )}

                  {activeTab === "groups" && (
                    <Card className="results-block-card" title={<span><TeamOutlined style={{ color: "#7F00FD", marginRight: 8 }} /> Nhóm</span>}>
                      {renderGroups()}
                    </Card>
                  )}

                  {activeTab === "hashtags" && (
                    <Card className="results-block-card" title={<span><ThunderboltOutlined style={{ color: "#7F00FD", marginRight: 8 }} /> Hashtag</span>}>
                      {renderHashtags()}
                    </Card>
                  )}

                  {activeTab === "posts" && (
                    <div>
                      {renderPosts()}
                    </div>
                  )}
                </div>
              )}
            </main>

            {/* 3. Right Column: Trending sidepanel */}
            <aside className="social-right-rail" style={{ position: "sticky", top: "24px" }}>
              <Card
                className="results-block-card"
                title={<span><FireOutlined style={{ color: "#ff4d4f", marginRight: 8 }} /> Chủ đề thịnh hành</span>}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {trending.length ? (
                    trending.map((item) => (
                      <div
                        key={item.topic}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          background: "#f8f9fa",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        onClick={() => handleSearchSubmit(item.topic)}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(127, 0, 253, 0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#f8f9fa")}
                      >
                        <span style={{ fontWeight: 700, color: "#1a1a1a" }}>#{item.topic}</span>
                        <span style={{ fontSize: "12px", color: "#8c8c8c" }}>{item.count} bài đăng</span>
                      </div>
                    ))
                  ) : (
                    <Text type="secondary">Chưa có chủ đề nổi bật</Text>
                  )}
                </div>
              </Card>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
