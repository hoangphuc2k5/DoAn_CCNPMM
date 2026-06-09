import { Card, Avatar, Empty, Button, List, Space, Spin } from "antd";
import { UserOutlined, LoadingOutlined } from "@ant-design/icons";
import { getMediaUrl } from "../../util/media";

const FriendsList = ({ friends, loading, onRemoveFriend }) => {
  if (loading && friends.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  if (!loading && friends.length === 0) {
    return <Empty description="Chưa có bạn bè nào" />;
  }

  return (
    <List
      dataSource={friends}
      grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
      renderItem={(friend) => (
        <List.Item>
          <Card style={{ textAlign: "center" }}>
            <Avatar
              size={64}
              src={getMediaUrl(friend.avatar)}
              icon={<UserOutlined />}
            />
            <h3 style={{ margin: "12px 0 0 0" }}>{friend.name}</h3>
            <p style={{ color: "#999", fontSize: "12px", margin: "4px 0" }}>
              {friend.email}
            </p>
            <Space>
              <Button type="text" size="small">
                Xem profile
              </Button>
              <Button
                type="text"
                danger
                size="small"
                onClick={() => onRemoveFriend?.(friend._id)}
              >
                Xóa bạn
              </Button>
            </Space>
          </Card>
        </List.Item>
      )}
    />
  );
};

export default FriendsList;
