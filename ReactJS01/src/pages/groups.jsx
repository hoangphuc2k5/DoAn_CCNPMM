import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Image,
  Input,
  List,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import {
  CalendarOutlined,
  DeleteOutlined,
  PictureOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  attendGroupEventApi,
  createGroupApi,
  createGroupEventApi,
  createGroupPostApi,
  getGroupApi,
  getGroupEventsApi,
  getGroupJoinRequestsApi,
  getGroupPostsApi,
  getGroupsApi,
  joinGroupApi,
  leaveGroupEventApi,
  leaveGroupApi,
  removeGroupMemberApi,
  respondGroupJoinRequestApi,
  updateGroupMemberRoleApi,
} from "../util/api";
import { getMediaUrl } from "../util/media";

const normalizeMedia = (media = []) =>
  media
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") {
        return {
          url: item,
          type: /\.(mp4|mov|avi|mkv|webm)$/i.test(item) ? "video" : "image",
        };
      }
      return item;
    })
    .filter(Boolean);

const GroupsPage = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postFiles, setPostFiles] = useState([]);
  const [groupForm] = Form.useForm();
  const [eventForm] = Form.useForm();

  const canPost = selectedGroup?.isMember;
  const canModerate = ["admin", "moderator"].includes(selectedGroup?.myRole);
  const canManageRoles = selectedGroup?.myRole === "admin";

  const loadGroups = async () => {
    setLoading(true);
    const res = await getGroupsApi();
    setLoading(false);
    if (res?.EC === 0) {
      setGroups(res.data || []);
      if (!selectedGroupId && res.data?.[0]?._id) {
        setSelectedGroupId(res.data[0]._id);
      }
    } else {
      message.error(res?.EM || "Khong the tai danh sach nhom");
    }
  };

  const loadGroupDetail = async (groupId) => {
    if (!groupId) return;
    const [groupRes, postRes, eventRes] = await Promise.all([
      getGroupApi(groupId),
      getGroupPostsApi(groupId, { page: 1, limit: 20 }),
      getGroupEventsApi(groupId),
    ]);

    if (groupRes?.EC === 0) setSelectedGroup(groupRes.data);
    if (postRes?.EC === 0) setPosts(postRes.data || []);
    if (eventRes?.EC === 0) setEvents(eventRes.data || []);

    const canLoadRequests =
      groupRes?.EC === 0 && ["admin", "moderator"].includes(groupRes.data?.myRole);
    if (canLoadRequests) {
      const requestRes = await getGroupJoinRequestsApi(groupId);
      setJoinRequests(requestRes?.EC === 0 ? requestRes.data || [] : []);
    } else {
      setJoinRequests([]);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    loadGroupDetail(selectedGroupId);
  }, [selectedGroupId]);

  const selectedGroupFromList = useMemo(
    () => groups.find((group) => group._id === selectedGroupId),
    [groups, selectedGroupId],
  );

  const handleCreateGroup = async () => {
    const values = await groupForm.validateFields();
    const res = await createGroupApi(values);
    if (res?.EC === 0) {
      message.success("Da tao nhom");
      setCreateOpen(false);
      groupForm.resetFields();
      await loadGroups();
      setSelectedGroupId(res.data?._id);
    } else {
      message.error(res?.EM || "Khong the tao nhom");
    }
  };

  const handleJoinToggle = async () => {
    if (!selectedGroup) return;
    const res = selectedGroup.isMember
      ? await leaveGroupApi(selectedGroup._id)
      : await joinGroupApi(selectedGroup._id);
    if (res?.EC === 0) {
      message.success(res.EM || "Da cap nhat thanh vien");
      await loadGroups();
      await loadGroupDetail(selectedGroup._id);
    } else {
      message.error(res?.EM || "Khong the cap nhat thanh vien");
    }
  };

  const handleRespondJoinRequest = async (requestId, action) => {
    const res = await respondGroupJoinRequestApi(selectedGroup._id, requestId, action);
    if (res?.EC === 0) {
      message.success(res.EM || "Da xu ly yeu cau");
      await loadGroups();
      await loadGroupDetail(selectedGroup._id);
    } else {
      message.error(res?.EM || "Khong the xu ly yeu cau");
    }
  };

  const handleCreatePost = async () => {
    if (!selectedGroup) return;

    const formData = new FormData();
    formData.append("content", postContent);
    postFiles.forEach((file) => {
      formData.append("media", file.originFileObj || file);
    });

    const res = await createGroupPostApi(selectedGroup._id, formData);
    if (res?.EC === 0) {
      setPostContent("");
      setPostFiles([]);
      message.success("Da dang bai trong nhom");
      await loadGroupDetail(selectedGroup._id);
    } else {
      message.error(res?.EM || "Khong the dang bai");
    }
  };

  const handleCreateEvent = async () => {
    const values = await eventForm.validateFields();
    const res = await createGroupEventApi(selectedGroup._id, values);
    if (res?.EC === 0) {
      message.success("Da tao su kien");
      setEventOpen(false);
      eventForm.resetFields();
      await loadGroupDetail(selectedGroup._id);
    } else {
      message.error(res?.EM || "Khong the tao su kien");
    }
  };

  const handleRoleChange = async (memberId, role) => {
    const res = await updateGroupMemberRoleApi(selectedGroup._id, memberId, role);
    if (res?.EC === 0) {
      message.success("Da cap nhat quyen");
      await loadGroupDetail(selectedGroup._id);
    } else {
      message.error(res?.EM || "Khong the cap nhat quyen");
    }
  };

  const handleRemoveMember = async (memberId) => {
    const res = await removeGroupMemberApi(selectedGroup._id, memberId);
    if (res?.EC === 0) {
      message.success("Da xoa thanh vien");
      await loadGroupDetail(selectedGroup._id);
      await loadGroups();
    } else {
      message.error(res?.EM || "Khong the xoa thanh vien");
    }
  };

  const handleToggleEventAttend = async (event) => {
    const res = event.isAttending
      ? await leaveGroupEventApi(selectedGroup._id, event._id)
      : await attendGroupEventApi(selectedGroup._id, event._id);

    if (res?.EC === 0) {
      message.success(res.EM || "Da cap nhat su kien");
      await loadGroupDetail(selectedGroup._id);
    } else {
      message.error(res?.EM || "Khong the cap nhat su kien");
    }
  };

  return (
    <main className="community-shell">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card
            title="Nhom / Community"
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateOpen(true)}
              >
                Tao nhom
              </Button>
            }
          >
            <List
              loading={loading}
              dataSource={groups}
              locale={{ emptyText: <Empty description="Chua co nhom" /> }}
              renderItem={(group) => (
                <List.Item
                  className={`community-group-item ${
                    group._id === selectedGroupId ? "active" : ""
                  }`}
                  onClick={() => setSelectedGroupId(group._id)}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        shape="square"
                        src={getMediaUrl(group.avatar)}
                        icon={<TeamOutlined />}
                      />
                    }
                    title={group.name}
                    description={`${group.memberCount || 0} thanh vien · ${
                      group.privacy === "private" ? "Rieng tu" : "Cong khai"
                    }`}
                  />
                  {group.isMember ? <Tag color="green">Da tham gia</Tag> : null}
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          {selectedGroup || selectedGroupFromList ? (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Card>
                <div className="community-cover">
                  <Avatar
                    size={72}
                    shape="square"
                    src={getMediaUrl(selectedGroup?.avatar)}
                    icon={<TeamOutlined />}
                  />
                  <div>
                    <Typography.Title level={3} style={{ margin: 0 }}>
                      {selectedGroup?.name || selectedGroupFromList?.name}
                    </Typography.Title>
                    <Typography.Paragraph style={{ margin: "4px 0 8px" }}>
                      {selectedGroup?.description || "Chua co mo ta"}
                    </Typography.Paragraph>
                    <Space wrap>
                      <Tag>{selectedGroup?.privacy === "private" ? "Rieng tu" : "Cong khai"}</Tag>
                      <Tag>{selectedGroup?.memberCount || 0} thanh vien</Tag>
                      <Tag>{selectedGroup?.postCount || 0} bai viet</Tag>
                      <Tag>{selectedGroup?.eventCount || 0} su kien</Tag>
                      <Tag color="blue">{selectedGroup?.myRole || "guest"}</Tag>
                    </Space>
                  </div>
                  <Button onClick={handleJoinToggle}>
                    {selectedGroup?.isMember
                      ? "Roi nhom"
                      : selectedGroup?.myJoinRequestStatus === "pending"
                        ? "Da gui yeu cau"
                        : "Tham gia"}
                  </Button>
                </div>
              </Card>

              {canPost ? (
                <Card title="Dang bai trong nhom">
                  <Input.TextArea
                    rows={3}
                    value={postContent}
                    onChange={(event) => setPostContent(event.target.value)}
                    placeholder="Chia se noi dung voi nhom..."
                  />
                  <div className="community-composer-actions">
                    <Upload
                      accept="image/*,video/*"
                      beforeUpload={() => false}
                      fileList={postFiles}
                      multiple
                      onChange={({ fileList }) => setPostFiles(fileList.slice(0, 10))}
                      showUploadList={false}
                    >
                      <Button icon={<PictureOutlined />}>Them media</Button>
                    </Upload>
                    <div className="community-file-list">
                      {postFiles.map((file) => (
                        <Tag
                          key={file.uid}
                          closable
                          closeIcon={<DeleteOutlined />}
                          onClose={(event) => {
                            event.preventDefault();
                            setPostFiles((prev) => prev.filter((item) => item.uid !== file.uid));
                          }}
                        >
                          {file.name}
                        </Tag>
                      ))}
                    </div>
                    <Button
                      type="primary"
                      onClick={handleCreatePost}
                      disabled={!postContent.trim() && postFiles.length === 0}
                    >
                      Dang bai
                    </Button>
                  </div>
                </Card>
              ) : null}

              <Card
                title="Su kien nhom"
                extra={
                  canModerate ? (
                    <Button icon={<CalendarOutlined />} onClick={() => setEventOpen(true)}>
                      Tao su kien
                    </Button>
                  ) : null
                }
              >
                <List
                  dataSource={events}
                  locale={{ emptyText: <Empty description="Chua co su kien" /> }}
                  renderItem={(event) => (
                    <List.Item
                      actions={[
                        selectedGroup?.isMember ? (
                          <Button onClick={() => handleToggleEventAttend(event)}>
                            {event.isAttending ? "Huy tham gia" : "Tham gia"}
                          </Button>
                        ) : null,
                      ].filter(Boolean)}
                    >
                      <List.Item.Meta
                        title={event.title}
                        description={`${new Date(event.startAt).toLocaleString("vi-VN")} · ${
                          event.location || "Online"
                        } · ${event.attendeeCount || 0} nguoi tham gia`}
                      />
                      <Typography.Text type="secondary">{event.description}</Typography.Text>
                    </List.Item>
                  )}
                />
              </Card>

              {canModerate ? (
                <Card title={`Yeu cau tham gia (${joinRequests.length})`}>
                  <List
                    dataSource={joinRequests}
                    locale={{ emptyText: <Empty description="Khong co yeu cau moi" /> }}
                    renderItem={(request) => (
                      <List.Item
                        actions={[
                          <Button
                            key="approve"
                            type="primary"
                            onClick={() => handleRespondJoinRequest(request._id, "approve")}
                          >
                            Duyet
                          </Button>,
                          <Button
                            danger
                            key="reject"
                            onClick={() => handleRespondJoinRequest(request._id, "reject")}
                          >
                            Tu choi
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              src={getMediaUrl(request.user?.avatar)}
                              icon={<UserOutlined />}
                            />
                          }
                          title={request.user?.name || request.user?.email}
                          description={new Date(request.requestedAt).toLocaleString("vi-VN")}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              ) : null}

              <Card title="Bai viet trong nhom">
                <List
                  dataSource={posts}
                  locale={{ emptyText: <Empty description="Chua co bai viet" /> }}
                  renderItem={(post) => (
                    <List.Item>
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <Space>
                          <Avatar src={getMediaUrl(post.author?.avatar)} icon={<UserOutlined />} />
                          <div>
                            <Typography.Text strong>{post.author?.name}</Typography.Text>
                            <div className="social-muted">
                              {new Date(post.createdAt).toLocaleString("vi-VN")}
                            </div>
                          </div>
                        </Space>
                        {post.content ? <Typography.Paragraph>{post.content}</Typography.Paragraph> : null}
                        {normalizeMedia(post.media).length ? (
                          <div className="post-media-grid">
                            {normalizeMedia(post.media).map((item, idx) => {
                              const src = getMediaUrl(item.url);
                              return item.type === "video" ? (
                                <video
                                  key={`${src}-${idx}`}
                                  className="post-media-item"
                                  controls
                                  src={src}
                                />
                              ) : (
                                <Image
                                  key={`${src}-${idx}`}
                                  className="post-media-item"
                                  src={src}
                                  alt={item.originalName || "group media"}
                                />
                              );
                            })}
                          </div>
                        ) : null}
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>

              <Card title="Thanh vien va quyen">
                <List
                  dataSource={selectedGroup?.members || []}
                  locale={{ emptyText: <Empty description="Chua co thanh vien" /> }}
                  renderItem={(member) => {
                    const memberId = member._id || member;
                    const role = selectedGroup?.admins?.some((item) => (item._id || item) === memberId)
                      ? "admin"
                      : selectedGroup?.moderators?.some((item) => (item._id || item) === memberId)
                        ? "moderator"
                        : "member";

                    return (
                      <List.Item
                        actions={[
                          canManageRoles ? (
                            <Select
                              key="role"
                              value={role}
                              style={{ width: 130 }}
                              onChange={(value) => handleRoleChange(memberId, value)}
                              options={[
                                { value: "member", label: "Member" },
                                { value: "moderator", label: "Mod" },
                                { value: "admin", label: "Admin" },
                              ]}
                            />
                          ) : (
                            <Tag key="role">{role}</Tag>
                          ),
                          canModerate && role !== "admin" ? (
                            <Button
                              danger
                              key="remove"
                              onClick={() => handleRemoveMember(memberId)}
                            >
                              Xoa
                            </Button>
                          ) : null,
                        ].filter(Boolean)}
                      >
                        <List.Item.Meta
                          avatar={<Avatar src={getMediaUrl(member.avatar)} icon={<UserOutlined />} />}
                          title={member.name || member.email || memberId}
                          description={member.email}
                        />
                      </List.Item>
                    );
                  }}
                />
              </Card>
            </Space>
          ) : (
            <Card>
              <Empty description="Chon hoac tao mot nhom de bat dau" />
            </Card>
          )}
        </Col>
      </Row>

      <Modal
        title="Tao nhom moi"
        open={createOpen}
        onOk={handleCreateGroup}
        onCancel={() => setCreateOpen(false)}
      >
        <Form form={groupForm} layout="vertical" initialValues={{ privacy: "public" }}>
          <Form.Item name="name" label="Ten nhom" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mo ta">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="privacy" label="Che do">
            <Radio.Group>
              <Radio value="public">Cong khai</Radio>
              <Radio value="private">Rieng tu</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Tao su kien"
        open={eventOpen}
        onOk={handleCreateEvent}
        onCancel={() => setEventOpen(false)}
      >
        <Form form={eventForm} layout="vertical">
          <Form.Item name="title" label="Ten su kien" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mo ta">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="startAt" label="Bat dau" rules={[{ required: true }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="endAt" label="Ket thuc">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="location" label="Dia diem">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  );
};

export default GroupsPage;
