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
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  UserAddOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { searchApi, followUserApi, friendRequestApi } from "../util/api";
import { getMediaUrl } from "../util/media";

const { Title, Text, Paragraph } = Typography;

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    fetchResults();
  }, [query]);

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
            actions={[
              <Button key="join" type="primary" size="small">
                Tham gia nhóm
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
                  <Text type="secondary" size="small">
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
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", padding: "8px 0" }}>
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
            style={{ marginBottom: "16px" }}
            bodyStyle={{ padding: "16px" }}
            hoverable
          >
            <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
              <Avatar
                src={getMediaUrl(item.author?.avatar)}
                icon={<UserOutlined />}
                size={40}
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/profile/${item.author?._id}`)}
              />
              <div>
                <Link to={`/profile/${item.author?._id}`} style={{ fontWeight: "bold", color: "inherit" }}>
                  {item.author?.name}
                </Link>
                <div style={{ fontSize: "12px", color: "gray" }}>
                  {new Date(item.createdAt).toLocaleString("vi-VN")}
                </div>
              </div>
            </div>
            
            <Paragraph style={{ fontSize: "14px", whiteSpace: "pre-line" }}>
              {item.content}
            </Paragraph>

            {item.hashtags?.length ? (
              <Space wrap style={{ marginBottom: "8px" }}>
                {item.hashtags.map((tag) => (
                  <Tag key={tag} color="blue">
                    #{tag}
                  </Tag>
                ))}
              </Space>
            ) : null}
          </Card>
        )}
      />
    );
  };

  const tabItems = [
    {
      key: "all",
      label: "Tất cả",
      children: (
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          {results.users.length > 0 && (
            <Card
              title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><UserOutlined /> Mọi người</span>}
              extra={<Link to="#" onClick={(e) => { e.preventDefault(); navigate(`/search?q=${query}&tab=users`); }}>Xem thêm</Link>}
            >
              {renderUsers(3)}
            </Card>
          )}

          {results.groups.length > 0 && (
            <Card
              title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><TeamOutlined /> Nhóm</span>}
              extra={<Link to="#" onClick={(e) => { e.preventDefault(); navigate(`/search?q=${query}&tab=groups`); }}>Xem thêm</Link>}
            >
              {renderGroups(3)}
            </Card>
          )}

          {results.hashtags.length > 0 && (
            <Card
              title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><ThunderboltOutlined /> Hashtag thịnh hành</span>}
            >
              {renderHashtags(5)}
            </Card>
          )}

          {results.posts.length > 0 && (
            <Card
              title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><FileTextOutlined /> Bài viết</span>}
              extra={<Link to="#" onClick={(e) => { e.preventDefault(); navigate(`/search?q=${query}&tab=posts`); }}>Xem thêm</Link>}
            >
              {renderPosts(3)}
            </Card>
          )}

          {!results.users.length && !results.posts.length && !results.groups.length && !results.hashtags.length && (
            <Empty description={`Không tìm thấy kết quả nào cho "${query}"`} />
          )}
        </Space>
      ),
    },
    {
      key: "users",
      label: "Mọi người",
      children: renderUsers(),
    },
    {
      key: "groups",
      label: "Nhóm",
      children: renderGroups(),
    },
    {
      key: "hashtags",
      label: "Hashtag",
      children: renderHashtags(),
    },
    {
      key: "posts",
      label: "Bài viết",
      children: renderPosts(),
    },
  ];

  const activeTab = searchParams.get("tab") || "all";

  const handleTabChange = (key) => {
    navigate(`/search?q=${encodeURIComponent(query)}&tab=${key}`, { replace: true });
  };

  return (
    <div className="social-page" style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <Button
          shape="circle"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
        />
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Kết quả tìm kiếm cho
          </Title>
          <Text type="secondary" style={{ fontSize: "16px" }}>
            "{query}"
          </Text>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <Spin size="large" tip="Đang tải kết quả..." />
        </div>
      ) : (
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          type="card"
          className="search-tabs"
        />
      )}
    </div>
  );
};

export default SearchPage;
