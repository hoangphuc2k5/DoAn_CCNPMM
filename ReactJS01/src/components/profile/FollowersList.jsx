import { Card, Avatar, Empty, Button, List, Space, Spin } from "antd";
import { UserOutlined, LoadingOutlined } from "@ant-design/icons";
import { getMediaUrl } from "../../util/media";

const FollowersList = ({ followers, loading, onFollowBack }) => {
  if (loading && followers.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  if (!loading && followers.length === 0) {
    return <Empty description="Chưa có người theo dõi nào" />;
  }

  return (
    <List
      dataSource={followers}
      grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
      renderItem={(follower) => (
        <List.Item>
          <Card style={{ textAlign: "center" }}>
            <Avatar
              size={64}
              src={getMediaUrl(follower.avatar)}
              icon={<UserOutlined />}
            />
            <h3 style={{ margin: "12px 0 0 0" }}>{follower.name}</h3>
            <p style={{ color: "#999", fontSize: "12px", margin: "4px 0" }}>
              {follower.email}
            </p>
            <Space>
              <Button type="text" size="small">
                Xem profile
              </Button>
              <Button
                type="primary"
                size="small"
                onClick={() => onFollowBack?.(follower._id)}
              >
                Theo dõi lại
              </Button>
            </Space>
          </Card>
        </List.Item>
      )}
    />
  );
};

export default FollowersList;
