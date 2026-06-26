import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Popconfirm,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Modal,
  Avatar,
  Descriptions,
  message,
} from "antd";
import {
  UserOutlined,
  FileTextOutlined,
  WarningOutlined,
  BarChartOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { getMediaUrl } from "../util/media";
import Sidebar from "../components/layout/sidebar";
import {
  banAdminUserApi,
  getAdminDashboardApi,
  getAdminLogsApi,
  getAdminPostsApi,
  getAdminReportsApi,
  getAdminUsersApi,
  removeAdminPostApi,
  resolveAdminReportApi,
  unbanAdminUserApi,
  updateAdminUserStatusApi,
} from "../util/api";

const roleColors = {
  admin: "volcano",
  super_admin: "purple",
  moderator: "blue",
  user: "default",
};

const statusColors = {
  active: "green",
  suspended: "gold",
  banned: "red",
  open: "red",
  reviewing: "blue",
  resolved: "green",
  rejected: "default",
};

const formatDate = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "--");

const StatCard = ({ icon: Icon, title, value, change, color }) => (
  <div style={{
    width: 320.5,
    height: 143.57,
    background: '#ffffff',
    borderRadius: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    padding: '20.8px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon style={{ fontSize: 18, color: color }} />
      </div>
      {change && (
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: change.startsWith('+') ? '#10b981' : '#ef4444'
        }}>
          {change}
        </span>
      )}
    </div>
    <div style={{
      fontSize: 32,
      fontWeight: 800,
      color: '#111827',
      lineHeight: 1.2,
      marginBottom: 8
    }}>{value}</div>
    <div style={{
      fontSize: 14,
      color: '#6b7280',
      fontWeight: 500
    }}>{title}</div>
  </div>
);

const AdminSidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { key: "users", label: "Người dùng" },
    { key: "posts", label: "Bài viết" },
    { key: "reports", label: "Báo cáo" },
    { key: "logs", label: "Nhật ký" },
  ];

  return (
    <div style={{ width: 208, background: '#ffffff', borderRight: '1px solid #f0f0f0', padding: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {menuItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 600,
              transition: 'all 0.2s ease',
              ...(activeTab === item.key
                ? { background: '#7F00FD', color: '#ffffff' }
                : { background: 'transparent', color: '#4b5563' }),
            }}
            onMouseEnter={(e) => {
              if (activeTab !== item.key) {
                e.currentTarget.style.background = '#f5f5f5';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== item.key) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const AdminPage = () => {
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("users");

  // Modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, usersRes, postsRes, reportsRes, logsRes] = await Promise.all([
        getAdminDashboardApi(),
        getAdminUsersApi({ q: keyword, limit: 8 }),
        getAdminPostsApi({ q: keyword, limit: 8 }),
        getAdminReportsApi({ limit: 8 }),
        getAdminLogsApi({ limit: 8 }),
      ]);

      if (dashboardRes?.EC !== 0) {
        throw new Error(dashboardRes?.EM || "Không thể tải dashboard admin.");
      }

      setDashboard(dashboardRes.data);
      setUsers(usersRes?.data || []);
      setPosts(postsRes?.data || []);
      setReports(reportsRes?.data || []);
      setLogs(logsRes?.data || []);
    } catch (error) {
      message.error(error.message || "Không thể tải dữ liệu quản trị.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    loadData();
  };

  // Modal handlers
  const handleUserDoubleClick = (user) => {
    setSelectedUser(user);
    setUserModalVisible(true);
  };

  const handlePostDoubleClick = (post) => {
    setSelectedPost(post);
    setPostModalVisible(true);
  };

  const handleReportDoubleClick = (report) => {
    setSelectedReport(report);
    setReportModalVisible(true);
  };

  const handleUserAction = async (userId, action) => {
    try {
      if (action === "ban") {
        await banAdminUserApi(userId, { reason: "Vi phạm chính sách cộng đồng" });
      } else if (action === "unban") {
        await unbanAdminUserApi(userId);
      } else {
        await updateAdminUserStatusApi(userId, action);
      }
      message.success("Đã cập nhật trạng thái người dùng.");
      await loadData();
    } catch (error) {
      message.error(error?.EM || error.message || "Không thể cập nhật người dùng.");
    }
  };

  const handleRemovePost = async (postId) => {
    try {
      await removeAdminPostApi(postId);
      message.success("Đã gỡ bài viết.");
      await loadData();
    } catch (error) {
      message.error(error?.EM || error.message || "Không thể gỡ bài viết.");
    }
  };

  const handleResolveReport = async (reportId, action) => {
    try {
      await resolveAdminReportApi(reportId, action);
      message.success("Đã cập nhật report.");
      await loadData();
    } catch (error) {
      message.error(error?.EM || error.message || "Không thể xử lý report.");
    }
  };

  const userColumns = useMemo(
    () => [
      {
        title: "Người dùng",
        dataIndex: "name",
        key: "name",
        render: (_, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{record.name || "Chưa đặt tên"}</Typography.Text>
            <Typography.Text type="secondary">{record.email}</Typography.Text>
          </Space>
        ),
      },
      {
        title: "Quyền",
        dataIndex: "role",
        key: "role",
        render: (value) => <Tag color={roleColors[value] || "default"}>{value}</Tag>,
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        key: "status",
        render: (value) => <Tag color={statusColors[value] || "default"}>{value}</Tag>,
      },
      {
        title: "Hành động",
        key: "actions",
        render: (_, record) => (
          <Space wrap>
            <Button size="small" onClick={() => handleUserAction(record._id, "active")}>
              Mở lại
            </Button>
            <Button size="small" onClick={() => handleUserAction(record._id, "suspended")}>
              Tạm khóa
            </Button>
            {record.status === "banned" ? (
              <Button size="small" danger onClick={() => handleUserAction(record._id, "unban")}>
                Gỡ ban
              </Button>
            ) : (
              <Button size="small" danger onClick={() => handleUserAction(record._id, "ban")}>
                Ban
              </Button>
            )}
          </Space>
        ),
      },
    ],
    [],
  );

  const postColumns = useMemo(
    () => [
      {
        title: "Bài viết",
        dataIndex: "content",
        key: "content",
        render: (value) => <Typography.Paragraph ellipsis={{ rows: 2 }}>{value || "(Không có nội dung)"}</Typography.Paragraph>,
      },
      {
        title: "Tác giả",
        dataIndex: "author",
        key: "author",
        render: (author) => author?.name || author?.email || "Không rõ",
      },
      {
        title: "Tương tác",
        key: "stats",
        render: (_, record) => `${record.stats?.reactions || 0} react / ${record.stats?.comments || 0} bình luận`,
      },
      {
        title: "Hành động",
        key: "actions",
        render: (_, record) => (
          <Popconfirm
            title="Gỡ bài viết này?"
            description="Thao tác này sẽ xóa bài khỏi hệ thống."
            onConfirm={() => handleRemovePost(record._id)}
          >
            <Button size="small" danger>
              Gỡ bài
            </Button>
          </Popconfirm>
        ),
      },
    ],
    [],
  );

  const reportColumns = useMemo(
    () => [
      { title: "Đối tượng", dataIndex: "targetType", key: "targetType" },
      { title: "Lý do", dataIndex: "reason", key: "reason" },
      {
        title: "Reporter",
        dataIndex: "reporter",
        key: "reporter",
        render: (reporter) => reporter?.name || reporter?.email || "Ẩn danh",
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        key: "status",
        render: (value) => <Tag color={statusColors[value] || "default"}>{value}</Tag>,
      },
      {
        title: "Hành động",
        key: "actions",
        render: (_, record) => (
          <Space wrap>
            <Button size="small" type="primary" onClick={() => handleResolveReport(record._id, "resolved")}>
              Duyệt
            </Button>
            <Button size="small" onClick={() => handleResolveReport(record._id, "rejected")}>
              Bỏ qua
            </Button>
          </Space>
        ),
      },
    ],
    [],
  );

  const logColumns = useMemo(
    () => [
      { title: "Hành động", dataIndex: "action", key: "action" },
      {
        title: "Người thực hiện",
        dataIndex: "actor",
        key: "actor",
        render: (actor) => actor?.name || actor?.email || "Hệ thống",
      },
      { title: "Đối tượng", dataIndex: "targetType", key: "targetType" },
      {
        title: "Thời gian",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (value) => formatDate(value),
      },
    ],
    [],
  );

  const tabContent = {
    users: (
      <Table
        rowKey="_id"
        columns={userColumns}
        dataSource={users}
        pagination={false}
        locale={{ emptyText: <Empty description="Chưa có dữ liệu user" /> }}
        onRow={(record) => ({
          onDoubleClick: () => handleUserDoubleClick(record),
          style: { cursor: 'pointer' }
        })}
      />
    ),
    posts: (
      <Table
        rowKey="_id"
        columns={postColumns}
        dataSource={posts}
        pagination={false}
        locale={{ emptyText: <Empty description="Chưa có dữ liệu bài viết" /> }}
        onRow={(record) => ({
          onDoubleClick: () => handlePostDoubleClick(record),
          style: { cursor: 'pointer' }
        })}
      />
    ),
    reports: (
      <Table
        rowKey="_id"
        columns={reportColumns}
        dataSource={reports}
        pagination={false}
        locale={{ emptyText: <Empty description="Chưa có báo cáo" /> }}
        onRow={(record) => ({
          onDoubleClick: () => handleReportDoubleClick(record),
          style: { cursor: 'pointer' }
        })}
      />
    ),
    logs: <Table rowKey="_id" columns={logColumns} dataSource={logs} pagination={false} locale={{ emptyText: <Empty description="Chưa có bản ghi" /> }} />,
  };

  if (loading && !dashboard) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-gray-50">
        <Spin size="large" />
      </div>
    );
  }

  const metrics = dashboard?.metrics || {};

  return (
    <>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#ffffff', width: '100%' }}>
        {/* App Left Sidebar (267px, matches Figma) */}
        <Sidebar />
        
        {/* Main Content (913px, matches Figma's Main Content) */}
        <div style={{ width: 913, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {/* Admin Panel */}
          <div style={{ display: 'flex', width: '100%' }}>
            {/* Admin Sidebar (208px, matches Figma's Sidebar instance) */}
            <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            
            {/* Admin Main Content Container (705px, matches Figma) */}
            <div style={{ width: 705, padding: 24 }}>
              {/* Header (matches Figma's Heading 2) */}
              <div style={{ marginBottom: 28 }}>
                <h1 style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#111827',
                  margin: 0
                }}>Tổng quan hệ thống</h1>
              </div>

              {/* Stat Cards Container (matches Figma's Container:margin) */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <StatCard 
                    icon={UserOutlined} 
                    title="Người dùng" 
                    value={metrics.totalUsers || 0} 
                    change="+12% tuần"
                    color="#7F00FD"
                  />
                  <StatCard 
                    icon={FileTextOutlined} 
                    title="Bài viết" 
                    value={metrics.totalPosts || 0} 
                    change="+8% tuần"
                    color="#1890FF"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <StatCard 
                    icon={WarningOutlined} 
                    title="Báo cáo" 
                    value={metrics.openReports || 0} 
                    change="-3 hôm nay"
                    color="#FAAD14"
                  />
                  <StatCard 
                    icon={BarChartOutlined} 
                    title="Hoạt động/ngày" 
                    value={metrics.activeUsers || 0} 
                    change="+5% tuần"
                    color="#52C41A"
                  />
                </div>
              </div>

              {/* Chart Placeholder (matches Figma's MiniBarChart) */}
              <div style={{
                background: '#ffffff',
                borderRadius: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                padding: 20.8,
                marginBottom: 24
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <BarChartOutlined style={{ color: '#4b5563', fontSize: 16 }} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Bài viết theo tháng</span>
                </div>
                <div style={{
                  height: 128,
                  background: '#f9fafb',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af',
                  fontSize: 14
                }}>
                  Biểu đồ sẽ hiển thị ở đây
                </div>
              </div>

              {/* Search Bar and Table */}
              <div>
                {/* Search Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <Input.Search
                    allowClear
                    placeholder="Tìm theo tên, email hoặc nội dung"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    onSearch={handleSearch}
                    style={{ width: 320 }}
                  />
                  <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                    Cập nhật gần nhất: {formatDate(new Date().toISOString())}
                  </Typography.Text>
                </div>
                {/* Table */}
                {tabContent[activeTab]}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Detail Modal */}
      <Modal
        title="Chi tiết người dùng"
        open={userModalVisible}
        onCancel={() => { setUserModalVisible(false); setSelectedUser(null); }}
        footer={[
          <Button key="close" onClick={() => { setUserModalVisible(false); setSelectedUser(null); }}>
            Đóng
          </Button>
        ]}
        width={600}
      >
        {selectedUser && (
          <div className="py-4">
            <div className="flex items-center gap-4 mb-6">
              <Avatar size={80} icon={<UserOutlined />} src={getMediaUrl(selectedUser.avatar)} />
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {selectedUser.name || "Chưa đặt tên"}
                </Typography.Title>
                <Typography.Text type="secondary">{selectedUser.email}</Typography.Text>
              </div>
            </div>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="ID">{selectedUser._id}</Descriptions.Item>
              <Descriptions.Item label="Vai trò">
                <Tag color={roleColors[selectedUser.role] || "default"}>{selectedUser.role}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={statusColors[selectedUser.status] || "default"}>{selectedUser.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">{formatDate(selectedUser.createdAt)}</Descriptions.Item>
              {selectedUser.bio && <Descriptions.Item label="Giới thiệu">{selectedUser.bio}</Descriptions.Item>}
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Post Detail Modal */}
      <Modal
        title="Chi tiết bài viết"
        open={postModalVisible}
        onCancel={() => { setPostModalVisible(false); setSelectedPost(null); }}
        footer={[
          <Button key="close" onClick={() => { setPostModalVisible(false); setSelectedPost(null); }}>
            Đóng
          </Button>
        ]}
        width={600}
      >
        {selectedPost && (
          <div className="py-4">
            <div className="flex items-center gap-3 mb-4">
              <Avatar size={48} icon={<UserOutlined />} src={getMediaUrl(selectedPost.author?.avatar)} />
              <div>
                <Typography.Text strong>{selectedPost.author?.name || selectedPost.author?.email || "Không rõ"}</Typography.Text>
                <div className="text-gray-400 text-sm">{formatDate(selectedPost.createdAt)}</div>
              </div>
            </div>
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 16 }}>
              {selectedPost.content}
            </Typography.Paragraph>
            {selectedPost.media && selectedPost.media.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {selectedPost.media.map((url, idx) => (
                  <img key={idx} src={getMediaUrl(url)} alt={`Media ${idx + 1}`} className="rounded-lg w-full h-40 object-cover" />
                ))}
              </div>
            )}
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Số lượt thích">{selectedPost.stats?.reactions || 0}</Descriptions.Item>
              <Descriptions.Item label="Số bình luận">{selectedPost.stats?.comments || 0}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">{selectedPost.status || "Công khai"}</Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Report Detail Modal */}
      <Modal
        title="Chi tiết báo cáo"
        open={reportModalVisible}
        onCancel={() => { setReportModalVisible(false); setSelectedReport(null); }}
        footer={[
          <Button key="reject" onClick={() => {
            if (selectedReport) handleResolveReport(selectedReport._id, 'rejected');
            setReportModalVisible(false);
            setSelectedReport(null);
          }}>
            Bỏ qua
          </Button>,
          <Button key="resolve" type="primary" onClick={() => {
            if (selectedReport) handleResolveReport(selectedReport._id, 'resolved');
            setReportModalVisible(false);
            setSelectedReport(null);
          }}>
            Duyệt
          </Button>,
        ]}
        width={600}
      >
        {selectedReport && (
          <div className="py-4">
            <Descriptions bordered column={1}>
              <Descriptions.Item label="ID báo cáo">{selectedReport._id}</Descriptions.Item>
              <Descriptions.Item label="Đối tượng">{selectedReport.targetType}</Descriptions.Item>
              <Descriptions.Item label="Lý do">{selectedReport.reason}</Descriptions.Item>
              <Descriptions.Item label="Người báo cáo">
                {selectedReport.reporter?.name || selectedReport.reporter?.email || "Ẩn danh"}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={statusColors[selectedReport.status] || "default"}>{selectedReport.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">{formatDate(selectedReport.createdAt)}</Descriptions.Item>
              {selectedReport.description && (
                <Descriptions.Item label="Mô tả chi tiết">{selectedReport.description}</Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>
    </>
  );
};

export default AdminPage;
