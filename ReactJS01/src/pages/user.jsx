import { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  List,
  Modal,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  blockUserApi,
  followUserApi,
  friendRequestApi,
  getRelationshipsApi,
  reportUserApi,
  respondFriendRequestApi,
} from "../util/api";

const FriendPage = () => {
  const [loading, setLoading] = useState(false);
  const [relationships, setRelationships] = useState({
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    following: [],
    followers: [],
    suggestions: [],
  });

  const fetchRelationships = async () => {
    setLoading(true);
    const res = await getRelationshipsApi();
    setLoading(false);
    if (res?.EC === 0) {
      setRelationships(res.data);
    } else {
      message.error(res?.EM || res?.message || "Không thể tải danh sách bạn bè");
    }
  };

  useEffect(() => {
    fetchRelationships();
  }, []);

  const handleFriendRequest = async (userId) => {
    const res = await friendRequestApi(userId);
    if (res?.EC === 0) {
      message.success(res.EM || "Đã gửi lời mời kết bạn");
      fetchRelationships();
    } else {
      message.error(res?.EM || "Không thể gửi lời mời");
    }
  };

  const handleFollow = async (userId) => {
    const res = await followUserApi(userId);
    if (res?.EC === 0) {
      message.success(res.EM || "Đã theo dõi");
      fetchRelationships();
    } else {
      message.error(res?.EM || "Không thể theo dõi");
    }
  };

  const handleRespond = async (requestId, action) => {
    const res = await respondFriendRequestApi(requestId, action);
    if (res?.EC === 0) {
      message.success(action === "accept" ? "Đã chấp nhận lời mời" : "Đã từ chối lời mời");
      fetchRelationships();
    } else {
      message.error(res?.EM || "Không thể xử lý lời mời");
    }
  };

  const askReportReason = (userId) => {
    let reason = "";
    Modal.confirm({
      title: "Báo cáo người dùng",
      content: (
        <Input.TextArea
          rows={3}
          placeholder="Nhập lý do báo cáo"
          onChange={(event) => {
            reason = event.target.value;
          }}
        />
      ),
      okText: "Gửi báo cáo",
      cancelText: "Hủy",
      onOk: async () => {
        const res = await reportUserApi(userId, reason);
        if (res?.EC === 0) {
          message.success(res.EM || "Đã gửi báo cáo");
        } else {
          message.error(res?.EM || "Không thể gửi báo cáo");
        }
      },
    });
  };

  const handleBlock = (userId) => {
    Modal.confirm({
      title: "Chặn người dùng này?",
      content: "Sau khi chặn, hai bên sẽ không còn thấy bài viết và không thể tương tác với nhau.",
      okText: "Chặn",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        const res = await blockUserApi(userId);
        if (res?.EC === 0) {
          message.success(res.EM || "Đã chặn người dùng");
          fetchRelationships();
        } else {
          message.error(res?.EM || "Không thể chặn người dùng");
        }
      },
    });
  };

  const moderationActions = (item) => [
    <Button key="report" onClick={() => askReportReason(item._id)}>
      Báo cáo
    </Button>,
    <Button key="block" danger onClick={() => handleBlock(item._id)}>
      Chặn
    </Button>,
  ];

  const renderUser = (item, actions = []) => (
    <List.Item actions={actions}>
      <List.Item.Meta
        avatar={<Avatar size={46} src={item?.avatar} icon={<UserOutlined />}>{item?.name?.[0]}</Avatar>}
        title={<Typography.Text strong>{item?.name}</Typography.Text>}
        description={
          <Space direction="vertical" size={2}>
            <Typography.Text type="secondary">{item?.email}</Typography.Text>
            {item?.bio ? <Typography.Text>{item.bio}</Typography.Text> : null}
          </Space>
        }
      />
    </List.Item>
  );

  const renderUserList = (data, emptyText, getActions) => (
    <List
      loading={loading}
      dataSource={data}
      locale={{ emptyText: <Empty description={emptyText} /> }}
      renderItem={(item) => renderUser(item, getActions?.(item) || [])}
    />
  );

  const tabs = [
    {
      key: "friends",
      label: `Bạn bè (${relationships.friends.length})`,
      children: renderUserList(relationships.friends, "Bạn chưa có bạn bè nào", (item) => [
        <Tag key="friend" color="green">
          <TeamOutlined /> Bạn bè
        </Tag>,
        ...moderationActions(item),
      ]),
    },
    {
      key: "incoming",
      label: `Lời mời (${relationships.incomingRequests.length})`,
      children: (
        <List
          loading={loading}
          dataSource={relationships.incomingRequests}
          locale={{ emptyText: <Empty description="Không có lời mời kết bạn mới" /> }}
          renderItem={(request) =>
            renderUser(request.user, [
              <Button
                key="accept"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleRespond(request._id, "accept")}
              >
                Chấp nhận
              </Button>,
              <Button
                key="reject"
                icon={<CloseOutlined />}
                onClick={() => handleRespond(request._id, "reject")}
              >
                Từ chối
              </Button>,
              ...moderationActions(request.user),
            ])
          }
        />
      ),
    },
    {
      key: "outgoing",
      label: `Đã gửi (${relationships.outgoingRequests.length})`,
      children: (
        <List
          loading={loading}
          dataSource={relationships.outgoingRequests}
          locale={{ emptyText: <Empty description="Bạn chưa gửi lời mời nào" /> }}
          renderItem={(request) =>
            renderUser(request.user, [
              <Tag key="pending" color="gold">
                Đang chờ
              </Tag>,
            ])
          }
        />
      ),
    },
    {
      key: "following",
      label: `Đang theo dõi (${relationships.following.length})`,
      children: renderUserList(relationships.following, "Bạn chưa theo dõi ai", (item) => [
        <Tag key="following" color="blue">
          Đang theo dõi
        </Tag>,
        ...moderationActions(item),
      ]),
    },
    {
      key: "followers",
      label: `Người theo dõi (${relationships.followers.length})`,
      children: renderUserList(relationships.followers, "Chưa có người theo dõi", (item) => [
        <Button key="follow" icon={<UserAddOutlined />} onClick={() => handleFollow(item._id)}>
          Theo dõi lại
        </Button>,
        ...moderationActions(item),
      ]),
    },
    {
      key: "suggestions",
      label: `Gợi ý (${relationships.suggestions.length})`,
      children: renderUserList(relationships.suggestions, "Chưa có gợi ý mới", (item) => [
        <Button key="friend" type="primary" onClick={() => handleFriendRequest(item._id)}>
          Kết bạn
        </Button>,
        <Button key="follow" onClick={() => handleFollow(item._id)}>
          Theo dõi
        </Button>,
        ...moderationActions(item),
      ]),
    },
  ];

  return (
    <div className="friends-page">
      <Card className="friends-card">
        <div className="friends-header">
          <div>
            <Typography.Title level={2}>Bạn bè</Typography.Title>
            <Typography.Paragraph>
              Quản lý bạn bè, lời mời kết bạn, người đang theo dõi và các gợi ý kết nối.
            </Typography.Paragraph>
          </div>
          <Button onClick={fetchRelationships}>Làm mới</Button>
        </div>
        <Tabs items={tabs} />
      </Card>
    </div>
  );
};

export default FriendPage;
