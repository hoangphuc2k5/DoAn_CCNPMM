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
} from "@ant-design/icons";
import { searchApi, followUserApi, friendRequestApi, getTrendingApi } from "../util/api";
import { getMediaUrl } from "../util/media";

const { Title, Text, Paragraph } = Typography;

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";

  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState([]);
  const [results, setResults] = useState({
    users: [],
    posts: [],
    groups: [],
    hashtags: [],
  });

  const fetchResults = async () => {
    if (!query.trim()) return;
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

  useEffect(() => {
    fetchResults();
  }, [query]);

  useEffect(() => {
    loadTrending();
  }, []);

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

  const renderUsers = (limit) => {
    const data = limit ? results.users.slice(0, limit) : results.users;
    if (!data.length) return <Empty description="Không tìm thấy người dùng nào" />;
    return (
      <List
        itemLayout="horizontal"
        dataSource={data}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button
                key="follow"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleFollow(item._id)}
              >
                Theo dõi
              </Button>,
              <Button
                key="friend"
                size="small"
                type="primary"
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
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/profile/${item._id}`)}
                />
              }
              title={
                <Link to={`/profile/${item._id}`} style={{ fontWeight: "bold" }}>
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
            <Tag color="blue" style={{ padding: "6px 12px", fontSize: "14px", cursor: "pointer" }}>
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
            className="post-card"
            style={{ marginBottom: "16px" }}
          >
            <div className="post-head" style={{ marginBottom: "12px" }}>
              <Space
                align="start"
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/profile/${item.author?._id}`)}
              >
                <Avatar
                  src={getMediaUrl(item.author?.avatar)}
                  icon={<UserOutlined />}
                  size={44}
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
                  <Tag key={tag} color="blue">
                    #{tag}
                  </Tag>
                ))}
              </Space>
            ) : null}

            <div className="post-stats">
              <span>
                <LikeFilled className="active-like" /> {item.stats?.reactions || 0} reaction
              </span>
              <span>
                {item.stats?.comments || 0} bình luận · {item.stats?.shares || 0} chia sẻ
              </span>
            </div>

            <div className="post-actions">
              <Button type="text" icon={<LikeOutlined />}>Like</Button>
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

  const activeTab = searchParams.get("tab") || "all";

  const handleTabChange = (key) => {
    navigate(`/search?q=${encodeURIComponent(query)}&tab=${key}`, { replace: true });
  };

  const filterMenuItems = [
    { key: "all", label: "Tất cả", icon: <GlobalOutlined /> },
    { key: "users", label: "Mọi người", icon: <UserOutlined /> },
    { key: "groups", label: "Nhóm", icon: <TeamOutlined /> },
    { key: "hashtags", label: "Hashtag", icon: <ThunderboltOutlined /> },
    { key: "posts", label: "Bài viết", icon: <FileTextOutlined /> },
  ];

  return (
    <div className="social-page">
      {/* 1. Cột trái: Bộ lọc (Ẩn trên thiết bị di động bằng CSS mặc định) */}
      <aside className="social-left-rail">
        <Card title="Bộ lọc tìm kiếm" className="social-panel">
          <Menu
            mode="inline"
            selectedKeys={[activeTab]}
            onClick={({ key }) => handleTabChange(key)}
            items={filterMenuItems}
            style={{ borderRight: 0 }}
          />
        </Card>
      </aside>

      {/* 2. Cột giữa: Danh sách kết quả chính */}
      <main className="social-feed">
        {/* Thanh tiêu đề tìm kiếm */}
        <div className="feed-toolbar" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <Button
            shape="circle"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
          />
          <div>
            <Title level={4} style={{ margin: 0, fontSize: "16px" }}>
              Kết quả tìm kiếm cho:
            </Title>
            <Text type="secondary" style={{ fontSize: "14px", fontWeight: "bold" }}>
              "{query}"
            </Text>
          </div>
        </div>

        {/* Bộ lọc ngang hiển thị ở Mobile (Khi cột trái bị ẩn) */}
        <div className="block min-[1181px]:hidden" style={{ marginBottom: "16px" }}>
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
            type="card"
          />
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
            <Spin size="large" tip="Đang tải kết quả..." />
          </div>
        ) : (
          <div className="search-results-content">
            {activeTab === "all" && (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                {results.users.length > 0 && (
                  <Card
                    className="social-panel"
                    title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><UserOutlined /> Mọi người</span>}
                    extra={<a href="#" onClick={(e) => { e.preventDefault(); handleTabChange("users"); }}>Xem tất cả</a>}
                  >
                    {renderUsers(3)}
                  </Card>
                )}

                {results.groups.length > 0 && (
                  <Card
                    className="social-panel"
                    title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><TeamOutlined /> Nhóm</span>}
                    extra={<a href="#" onClick={(e) => { e.preventDefault(); handleTabChange("groups"); }}>Xem tất cả</a>}
                  >
                    {renderGroups(3)}
                  </Card>
                )}

                {results.hashtags.length > 0 && (
                  <Card
                    className="social-panel"
                    title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><ThunderboltOutlined /> Hashtag liên quan</span>}
                    extra={<a href="#" onClick={(e) => { e.preventDefault(); handleTabChange("hashtags"); }}>Xem tất cả</a>}
                  >
                    {renderHashtags(5)}
                  </Card>
                )}

                {results.posts.length > 0 && (
                  <Card
                    className="social-panel"
                    title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><FileTextOutlined /> Bài viết</span>}
                    extra={<a href="#" onClick={(e) => { e.preventDefault(); handleTabChange("posts"); }}>Xem tất cả</a>}
                  >
                    {renderPosts(3)}
                  </Card>
                )}

                {!results.users.length && !results.posts.length && !results.groups.length && !results.hashtags.length && (
                  <Card className="post-card">
                    <Empty description={`Không tìm thấy kết quả nào cho "${query}"`} />
                  </Card>
                )}
              </Space>
            )}

            {activeTab === "users" && (
              <Card className="social-panel" title="Mọi người">
                {renderUsers()}
              </Card>
            )}

            {activeTab === "groups" && (
              <Card className="social-panel" title="Nhóm">
                {renderGroups()}
              </Card>
            )}

            {activeTab === "hashtags" && (
              <Card className="social-panel" title="Hashtag">
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

      {/* 3. Cột phải: Chủ đề thịnh hành */}
      <aside className="social-right-rail">
        <Card className="social-panel" title="Chủ đề thịnh hành">
          <Space wrap>
            {trending.length ? (
              trending.map((item) => (
                <Tag
                  key={item.topic}
                  color="blue"
                  className="trend-tag"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(item.topic)}`)}
                >
                  <ThunderboltOutlined /> #{item.topic} ({item.count})
                </Tag>
              ))
            ) : (
              <Text type="secondary">Chưa có chủ đề nổi bật</Text>
            )}
          </Space>
        </Card>
      </aside>
    </div>
  );
};

export default SearchPage;
