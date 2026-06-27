import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Descriptions,
  Modal,
  Spin,
  Typography,
  message,
} from "antd";
import {
  UserOutlined,
  FileTextOutlined,
  WarningOutlined,
  BarChartOutlined,
  SearchOutlined,
  TeamOutlined,
  SafetyOutlined,
  DashboardOutlined,
  HistoryOutlined,
  FlagOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { getMediaUrl } from "../util/media";
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

const COLORS = {
  purple: "#7F00FD",
  textPrimary: "#101828",
  textSecondary: "#364153",
  textMuted: "#6a7282",
  textGray: "#4a5565",
  textLight: "#99a1af",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  bgPage: "#f9fafb",
  green: "#00a63e",
  greenBg: "#dcfce7",
  red: "#fb2c36",
  redBg: "#ffe2e2",
  orange: "#e17100",
  orangeBg: "#fef3c6",
  amber: "#fe9a00",
};

const roleLabels = {
  admin: "Quản trị viên",
  super_admin: "Super Admin",
  moderator: "Kiểm duyệt",
  user: "Người dùng",
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString("vi-VN") : "--");

const formatDateTime = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "--");

const actionLabels = {
  "auth.login.success": "Đăng nhập thành công",
  "auth.login.failed": "Đăng nhập thất bại",
  "auth.register": "Đăng ký tài khoản",
  "auth.password_reset.request": "Yêu cầu đặt lại mật khẩu",
  "auth.password_reset.complete": "Đặt lại mật khẩu",
};

const formatAction = (action) => actionLabels[action] || action?.replace(/\./g, " · ") || "--";

const formatTarget = (log) => {
  const type = log.targetType || "";
  const id = log.targetId ? ` #${String(log.targetId).slice(-6)}` : "";
  return type ? `${type}${id}` : "--";
};

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";

const timeAgo = (value) => {
  if (!value) return "--";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
};

const cardShadow = "0px 1px 1.5px rgba(0,0,0,0.1), 0px 1px 1px rgba(0,0,0,0.1)";

const StatusPill = ({ status }) => {
  const map = {
    active: { label: "Hoạt động", bg: COLORS.greenBg, color: COLORS.green },
    banned: { label: "Bị cấm", bg: COLORS.redBg, color: COLORS.red },
    open: { label: "Chờ xử lý", bg: COLORS.orangeBg, color: COLORS.orange },
    reviewing: { label: "Đang xem", bg: "#dbeafe", color: "#2563eb" },
    resolved: { label: "Đã xử lý", bg: COLORS.greenBg, color: COLORS.green },
    rejected: { label: "Bỏ qua", bg: "#f3f4f6", color: COLORS.textMuted },
  };
  const item = map[status] || map.active;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2px 8px",
        borderRadius: 999,
        background: item.bg,
        color: item.color,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: "16.5px",
        whiteSpace: "nowrap",
      }}
    >
      {item.label}
    </span>
  );
};

const StatCard = ({ icon: Icon, title, value, change, iconBg, iconColor }) => (
  <div
    style={{
      background: "#ffffff",
      border: `0.8px solid ${COLORS.borderLight}`,
      borderRadius: 16,
      boxShadow: cardShadow,
      padding: 20.8,
      minHeight: 143.57,
      display: "flex",
      flexDirection: "column",
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon style={{ fontSize: 18, color: iconColor }} />
      </div>
      {change && (
        <span style={{ fontSize: 12, fontWeight: 600, color: "#00c950" }}>{change}</span>
      )}
    </div>
    <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.textPrimary, lineHeight: "32px", marginTop: 12 }}>
      {Number(value || 0).toLocaleString("vi-VN")}
    </div>
    <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{title}</div>
  </div>
);

const SearchInput = ({ placeholder, value, onChange, onSearch }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      width: 224,
      height: 36,
      padding: "0 12.8px",
      background: "#ffffff",
      border: `0.8px solid ${COLORS.border}`,
      borderRadius: 14,
    }}
  >
    <SearchOutlined style={{ fontSize: 14, color: COLORS.textLight }} />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
      placeholder={placeholder}
      style={{
        flex: 1,
        border: "none",
        outline: "none",
        fontSize: 14,
        color: COLORS.textPrimary,
        background: "transparent",
      }}
    />
  </div>
);

const AdminSidebar = ({ activeTab, setActiveTab, badges }) => {
  const items = [
    { key: "overview", label: "Tổng quan", icon: DashboardOutlined },
    { key: "logs", label: "Lịch sử hệ thống", icon: HistoryOutlined },
    { key: "users", label: "Người dùng", icon: TeamOutlined, badge: badges.users },
    { key: "posts", label: "Bài viết", icon: FileTextOutlined },
    { key: "reports", label: "Báo cáo", icon: FlagOutlined, badge: badges.reports },
  ];

  return (
    <aside
      style={{
        width: 208,
        flexShrink: 0,
        background: COLORS.bgPage,
        borderRight: `0.8px solid ${COLORS.border}`,
        padding: "16px 16.8px 16px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minHeight: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 20px" }}>
        <SafetyOutlined style={{ fontSize: 20, color: COLORS.purple }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1e2939" }}>Admin Panel</span>
      </div>
      {items.map(({ key, label, icon: Icon, badge }) => {
        const active = activeTab === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            style={{
              position: "relative",
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 14,
              border: "none",
              cursor: "pointer",
              background: active ? COLORS.purple : "transparent",
              color: active ? "#ffffff" : COLORS.textGray,
              fontSize: 14,
              fontWeight: 500,
              textAlign: "left",
            }}
          >
            <Icon style={{ fontSize: 16 }} />
            {label}
            {badge > 0 && (
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: COLORS.red,
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </aside>
  );
};

const MonthlyChart = ({ posts }) => {
  const monthly = useMemo(() => {
    const counts = Array(12).fill(0);
    posts.forEach((post) => {
      if (!post.createdAt) return;
      const month = new Date(post.createdAt).getMonth();
      counts[month] += 1;
    });
    const max = Math.max(...counts, 1);
    return counts.map((count, index) => ({
      label: `T${index + 1}`,
      height: Math.max(8, Math.round((count / max) * 96)),
      count,
    }));
  }, [posts]);

  return (
    <div
      style={{
        background: "#ffffff",
        border: `0.8px solid ${COLORS.borderLight}`,
        borderRadius: 16,
        boxShadow: cardShadow,
        padding: 20.8,
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <BarChartOutlined style={{ fontSize: 16, color: COLORS.textSecondary }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textSecondary }}>Bài viết theo tháng</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 128, paddingTop: 16 }}>
        {monthly.map((item) => (
          <div key={item.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
              style={{
                width: "100%",
                maxWidth: 46,
                height: item.height,
                background: COLORS.purple,
                borderRadius: "6px 6px 0 0",
                opacity: item.count ? 0.85 : 0.15,
              }}
            />
            <span style={{ fontSize: 9, color: COLORS.textLight }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ActionItems = ({ metrics, onNavigate }) => {
  const items = [
    { label: "Báo cáo chưa xử lý", value: metrics.openReports, color: COLORS.red, tab: "reports" },
    { label: "Người dùng bị report", value: metrics.suspendedUsers, color: COLORS.amber, tab: "users" },
    { label: "Bài viết vi phạm", value: metrics.flaggedPosts, color: "#ff6900", tab: "posts" },
  ];

  return (
    <div
      style={{
        background: "#ffffff",
        border: `0.8px solid ${COLORS.borderLight}`,
        borderRadius: 16,
        boxShadow: cardShadow,
        padding: 20.8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <WarningOutlined style={{ fontSize: 16, color: COLORS.textSecondary }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textSecondary }}>Cần xử lý</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onNavigate(item.tab)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 12,
              borderRadius: 14,
              border: "none",
              background: COLORS.bgPage,
              cursor: "pointer",
              width: "100%",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.textSecondary }}>{item.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value || 0}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const OverviewView = ({ metrics, posts, setActiveTab }) => (
  <>
    <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>Tổng quan hệ thống</h1>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
      <StatCard
        icon={UserOutlined}
        title="Người dùng"
        value={metrics.totalUsers}
        change="+12% tuần"
        iconBg="rgba(127,0,253,0.13)"
        iconColor={COLORS.purple}
      />
      <StatCard
        icon={FileTextOutlined}
        title="Bài viết"
        value={metrics.totalPosts}
        change="+8% tuần"
        iconBg="rgba(14,165,233,0.13)"
        iconColor="#0ea5e9"
      />
      <StatCard
        icon={WarningOutlined}
        title="Báo cáo"
        value={metrics.openReports}
        change="-3 hôm nay"
        iconBg="rgba(245,158,11,0.13)"
        iconColor="#f59e0b"
      />
      <StatCard
        icon={BarChartOutlined}
        title="Hoạt động/ngày"
        value={metrics.activeUsers}
        change="+5% tuần"
        iconBg="rgba(16,185,129,0.13)"
        iconColor="#10b981"
      />
    </div>
    <div style={{ marginTop: 24 }}>
      <MonthlyChart posts={posts} />
      <ActionItems metrics={metrics} onNavigate={setActiveTab} />
    </div>
  </>
);

const UsersView = ({
  users,
  keyword,
  setKeyword,
  onSearch,
  onBan,
  onSuspend,
  onView,
  reportCounts,
}) => (
  <>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>Quản lý người dùng</h1>
      <SearchInput
        placeholder="Tìm người dùng..."
        value={keyword}
        onChange={setKeyword}
        onSearch={onSearch}
      />
    </div>
    <div
      style={{
        marginTop: 20,
        background: "#ffffff",
        border: `0.8px solid ${COLORS.borderLight}`,
        borderRadius: 16,
        boxShadow: "0px 1px 3px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 0.8fr 1fr 0.6fr 0.6fr 0.8fr 0.8fr",
          gap: 8,
          padding: "20px 16px",
          background: COLORS.bgPage,
          borderBottom: `0.8px solid ${COLORS.borderLight}`,
          fontSize: 12,
          fontWeight: 700,
          color: COLORS.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.3,
        }}
      >
        <span>Người dùng</span>
        <span>Vai trò</span>
        <span>Ngày tham gia</span>
        <span>Bài viết</span>
        <span>Report</span>
        <span>Trạng thái</span>
        <span>Hành động</span>
      </div>
      {users.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: COLORS.textMuted }}>Chưa có dữ liệu user</div>
      ) : (
        users.map((record) => (
          <div
            key={record._id}
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 0.8fr 1fr 0.6fr 0.6fr 0.8fr 0.8fr",
              gap: 8,
              padding: "12px 16px",
              alignItems: "center",
              borderBottom: `0.8px solid ${COLORS.borderLight}`,
              cursor: "pointer",
            }}
            onDoubleClick={() => onView(record)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <Avatar size={32} src={getMediaUrl(record.avatar)} style={{ backgroundColor: COLORS.purple, flexShrink: 0 }}>
                {getInitials(record.name || record.email)}
              </Avatar>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {record.name || "Chưa đặt tên"}
                </div>
                <div style={{ fontSize: 12, color: COLORS.textLight }}>
                  @{record.email?.split("@")[0] || "user"}
                </div>
              </div>
            </div>
            <span style={{ fontSize: 12, color: COLORS.textGray }}>{roleLabels[record.role] || record.role}</span>
            <span style={{ fontSize: 12, color: COLORS.textLight }}>{formatDate(record.createdAt)}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.textGray }}>{record.postCount || 0}</span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: (reportCounts[record._id] || 0) > 0 ? COLORS.red : COLORS.textLight,
              }}
            >
              {reportCounts[record._id] || 0}
            </span>
            <StatusPill status={record.status || "active"} />
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBan(record);
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  border: "none",
                  background: COLORS.redBg,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <DeleteOutlined style={{ fontSize: 13, color: COLORS.red }} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(record);
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  border: "none",
                  background: "rgba(127,0,253,0.1)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <EyeOutlined style={{ fontSize: 13, color: COLORS.purple }} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  </>
);

const PostsView = ({ posts, keyword, setKeyword, onSearch, onRemove, onView }) => (
  <>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>Quản lý bài viết</h1>
      <SearchInput placeholder="Tìm bài viết..." value={keyword} onChange={setKeyword} onSearch={onSearch} />
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
      {posts.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: COLORS.textMuted }}>Chưa có dữ liệu bài viết</div>
      ) : (
        posts.map((post) => (
          <div
            key={post._id}
            onDoubleClick={() => onView(post)}
            style={{
              background: "#ffffff",
              border: `0.8px solid ${COLORS.borderLight}`,
              borderRadius: 16,
              boxShadow: cardShadow,
              padding: 16.8,
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Avatar size={32} src={getMediaUrl(post.author?.avatar)} style={{ backgroundColor: COLORS.purple, flexShrink: 0 }}>
                {getInitials(post.author?.name || post.author?.email)}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>
                    {post.author?.name || post.author?.email || "Không rõ"}
                  </span>
                  <span style={{ fontSize: 12, color: COLORS.textLight }}>{timeAgo(post.createdAt)}</span>
                  <div style={{ marginLeft: "auto" }}>
                    <StatusPill status={post.status === "removed" ? "banned" : "active"} />
                  </div>
                </div>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 14,
                    color: COLORS.textGray,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {post.content || "(Không có nội dung)"}
                </p>
                <div style={{ marginTop: 8, fontSize: 12, color: COLORS.textLight }}>
                  {(post.stats?.reactions || 0).toLocaleString("vi-VN")} lượt thích · {(post.stats?.comments || 0).toLocaleString("vi-VN")} bình luận
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(post._id);
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: "none",
                  background: COLORS.redBg,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <DeleteOutlined style={{ fontSize: 14, color: COLORS.red }} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  </>
);

const ReportsView = ({ reports, onResolve }) => (
  <>
    <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>Báo cáo vi phạm — Chi tiết</h1>
    <p style={{ margin: "8px 0 0", fontSize: 14, color: COLORS.textMuted }}>
      Danh sách các báo cáo vi phạm với thông tin chi tiết về đối tượng, người báo cáo và chứng cứ (nếu có).
    </p>
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
      {reports.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: COLORS.textMuted }}>Chưa có báo cáo</div>
      ) : (
        reports.map((report) => <ReportCard key={report._id} report={report} onResolve={onResolve} />)
      )}
    </div>
  </>
);

const ReportCard = ({ report, onResolve }) => {
  const [expanded, setExpanded] = useState(false);
  const pending = ["open", "reviewing"].includes(report.status);
  const target = report.target || {};
  // Prefer actual person name. If the target is a post/comment, try the author fields.
  const author = target.author || target.user || {};
  let reportedName = "";
  if (report.targetType === "user") {
    reportedName = target.name || target.fullName || target.displayName || target.username || target.email || report.targetName || "Không rõ";
  } else if (report.targetType === "post" || report.targetType === "comment") {
    reportedName = author.name || author.fullName || author.displayName || author.username || author.email || report.targetName || "Không rõ";
  } else {
    reportedName = target.name || target.fullName || author.name || report.targetName || "Không rõ";
  }
  const reportedId = (author && (author._id || author.id)) || target._id || report.targetId || "-";

  return (
    <div
      style={{
        background: "#ffffff",
        border: `0.8px solid ${pending ? "#fee685" : COLORS.borderLight}`,
        borderRadius: 16,
        boxShadow: cardShadow,
        padding: 16.8,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 14,
            background: pending ? COLORS.orangeBg : "#dbeafe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <FlagOutlined style={{ fontSize: 16, color: pending ? COLORS.orange : "#2563eb" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>
              {report.targetType === "user" ? "Người dùng" : "Bài viết"} · {report.reason}
            </span>
            <StatusPill status={report.status || "open"} />
          </div>

          <div style={{ marginTop: 8, padding: 12, borderRadius: 12, background: COLORS.bgPage, border: `0.8px solid ${COLORS.borderLight}` }}>
            {report.targetType === "user" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar size={40} src={getMediaUrl(target.avatar)} style={{ backgroundColor: COLORS.purple }}>
                  {getInitials(target.name || target.email)}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {reportedName}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.textLight }}>ID: {reportedId}</div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: COLORS.textGray, marginBottom: 6 }}>Nội dung báo cáo</div>
                <div style={{ fontSize: 14, color: COLORS.textPrimary }}>
                  <div style={{ maxHeight: expanded ? 1000 : 72, overflow: "hidden", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {target.content || "(Không có nội dung)"}
                  </div>
                  {target.media?.length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      {target.media.map((m, idx) => (
                        <img key={idx} src={getMediaUrl(m)} alt={`evidence-${idx}`} style={{ width: 120, height: 84, objectFit: "cover", borderRadius: 6 }} />
                      ))}
                    </div>
                  )}
                  {String(target.content || "").length > 200 && (
                    <button type="button" onClick={() => setExpanded(!expanded)} style={{ marginTop: 8, border: "none", background: "transparent", color: COLORS.purple, cursor: "pointer", fontWeight: 700 }}>
                      {expanded ? "Thu gọn" : "Xem thêm"}
                    </button>
                  )}
                </div>
                        <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 6 }}>ID: {reportedId}</div>
              </div>
            )}
          </div>

          <p style={{ margin: "8px 0 0", fontSize: 13, color: COLORS.textGray }}>
            <strong>Lý do báo cáo:</strong> {report.reason}
          </p>
          {report.note && (
            <p style={{ margin: "6px 0 0", fontSize: 13, color: COLORS.textGray }}>
              <strong>Mô tả thêm:</strong> {report.note}
            </p>
          )}

          {report.media?.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {report.media.map((m, idx) => (
                <img key={idx} src={getMediaUrl(m)} alt={`evidence-${idx}`} style={{ width: 120, height: 84, objectFit: "cover", borderRadius: 8 }} />
              ))}
            </div>
          )}

          <p style={{ margin: "8px 0 0", fontSize: 12, color: COLORS.textLight }}>
            Báo cáo bởi <strong>{report.reporter?.name || report.reporter?.email || "Ẩn danh"}</strong>
            {report.reporter?.email ? ` · ${report.reporter.email}` : ""} · {timeAgo(report.createdAt)}
          </p>
        </div>
        {pending && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => onResolve(report._id, "resolved")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 12px",
                borderRadius: 10,
                border: "none",
                background: COLORS.greenBg,
                color: COLORS.green,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <CheckOutlined /> Xử lý
            </button>
            <button
              type="button"
              onClick={() => onResolve(report._id, "rejected")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 12px",
                borderRadius: 10,
                border: "none",
                background: "#f3f4f6",
                color: COLORS.textMuted,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <CloseOutlined /> Bỏ qua
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const HistoryView = ({ logs }) => (
  <>
    <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>Lịch sử hệ thống</h1>
    <p style={{ margin: "8px 0 0", fontSize: 14, color: COLORS.textMuted }}>
      Nhật ký các hoạt động quản trị và xác thực trên hệ thống.
    </p>
    <div
      style={{
        marginTop: 20,
        background: "#ffffff",
        border: `0.8px solid ${COLORS.borderLight}`,
        borderRadius: 16,
        boxShadow: "0px 1px 3px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr 0.8fr 1fr",
          gap: 8,
          padding: "20px 16px",
          background: COLORS.bgPage,
          borderBottom: `0.8px solid ${COLORS.borderLight}`,
          fontSize: 12,
          fontWeight: 700,
          color: COLORS.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.3,
        }}
      >
        <span>Hành động</span>
        <span>Người thực hiện</span>
        <span>Đối tượng</span>
        <span>Thời gian</span>
      </div>
      {logs.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: COLORS.textMuted }}>Chưa có bản ghi</div>
      ) : (
        logs.map((log) => (
          <div
            key={log._id}
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr 0.8fr 1fr",
              gap: 8,
              padding: "14px 16px",
              alignItems: "center",
              borderBottom: `0.8px solid ${COLORS.borderLight}`,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.textPrimary }}>{formatAction(log.action)}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <Avatar size={28} style={{ backgroundColor: COLORS.purple, flexShrink: 0, fontSize: 11 }}>
                {getInitials(log.actor?.name || log.actor?.email || "H")}
              </Avatar>
              <span style={{ fontSize: 13, color: COLORS.textGray, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {log.actor?.name || log.actor?.email || "Hệ thống"}
              </span>
            </div>
            <span style={{ fontSize: 12, color: COLORS.textLight }}>{formatTarget(log)}</span>
            <span style={{ fontSize: 12, color: COLORS.textLight }}>{formatDateTime(log.createdAt)}</span>
          </div>
        ))
      )}
    </div>
  </>
);

const AdminPage = () => {
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [postModalVisible, setPostModalVisible] = useState(false);

  const loadData = async (searchKeyword = keyword) => {
    try {
      setLoading(true);
      const [dashboardRes, usersRes, postsRes, reportsRes, logsRes] = await Promise.all([
        getAdminDashboardApi(),
        getAdminUsersApi({ q: searchKeyword, limit: 20 }),
        getAdminPostsApi({ q: searchKeyword, limit: 20 }),
        getAdminReportsApi({ limit: 20 }),
        getAdminLogsApi({ limit: 30 }),
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
    loadData("");
  }, []);

  const metrics = useMemo(() => {
    const base = dashboard?.metrics || {};
    const openReports = reports.filter((r) => ["open", "reviewing"].includes(r.status)).length || base.openReports || 0;
    const flaggedPosts = reports.filter((r) => r.targetType === "post" && ["open", "reviewing"].includes(r.status)).length;
    return {
      ...base,
      openReports,
      flaggedPosts,
      suspendedUsers: base.suspendedUsers || users.filter((u) => u.status === "suspended").length,
    };
  }, [dashboard, reports, users]);

  const reportCounts = useMemo(() => {
    const counts = {};
    reports.forEach((report) => {
      const targetId = report.targetId || report.target?._id;
      if (targetId) counts[targetId] = (counts[targetId] || 0) + 1;
    });
    return counts;
  }, [reports]);

  const sidebarBadges = useMemo(
    () => ({
      users: users.filter((u) => u.status === "suspended" || u.status === "banned").length,
      reports: metrics.openReports || 0,
    }),
    [users, metrics.openReports],
  );

  const handleSearch = () => loadData(keyword);

  const handleUserAction = async (userId, action) => {
    try {
      if (action === "ban") await banAdminUserApi(userId, { reason: "Vi phạm chính sách cộng đồng" });
      else if (action === "unban") await unbanAdminUserApi(userId);
      else await updateAdminUserStatusApi(userId, action);
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

  if (loading && !dashboard) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  const tabContent = {
    overview: <OverviewView metrics={metrics} posts={posts} setActiveTab={setActiveTab} />,
    logs: <HistoryView logs={logs} />,
    users: (
      <UsersView
        users={users}
        keyword={keyword}
        setKeyword={setKeyword}
        onSearch={handleSearch}
        reportCounts={reportCounts}
        onBan={(user) => handleUserAction(user._id, user.status === "banned" ? "unban" : "ban")}
        onSuspend={(user) => handleUserAction(user._id, "suspended")}
        onView={(user) => {
          setSelectedUser(user);
          setUserModalVisible(true);
        }}
      />
    ),
    posts: (
      <PostsView
        posts={posts}
        keyword={keyword}
        setKeyword={setKeyword}
        onSearch={handleSearch}
        onRemove={handleRemovePost}
        onView={(post) => {
          setSelectedPost(post);
          setPostModalVisible(true);
        }}
      />
    ),
    reports: <ReportsView reports={reports} onResolve={handleResolveReport} />,
  };

  return (
    <>
      <div style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
        <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} badges={sidebarBadges} />
        <main
          style={{
            flex: 1,
            background: COLORS.bgPage,
            padding: 24,
            minHeight: "100vh",
            boxSizing: "border-box",
            minWidth: 0,
          }}
        >
          {loading ? <Spin /> : tabContent[activeTab]}
        </main>
      </div>

      <Modal
        title="Chi tiết người dùng"
        open={userModalVisible}
        onCancel={() => {
          setUserModalVisible(false);
          setSelectedUser(null);
        }}
        footer={[
          <Button
            key="ban"
            danger
            onClick={() =>
              selectedUser &&
              handleUserAction(selectedUser._id, selectedUser.status === "banned" ? "unban" : "ban")
            }
          >
            {selectedUser?.status === "banned" ? "Gỡ ban" : "Ban"}
          </Button>,
          <Button
            key="close"
            type="primary"
            onClick={() => {
              setUserModalVisible(false);
              setSelectedUser(null);
            }}
          >
            Đóng
          </Button>,
        ]}
        width={600}
      >
        {selectedUser && (
          <div style={{ padding: "16px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <Avatar size={80} src={getMediaUrl(selectedUser.avatar)} style={{ backgroundColor: COLORS.purple }}>
                {getInitials(selectedUser.name || selectedUser.email)}
              </Avatar>
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {selectedUser.name || "Chưa đặt tên"}
                </Typography.Title>
                <Typography.Text type="secondary">{selectedUser.email}</Typography.Text>
              </div>
            </div>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="ID">{selectedUser._id}</Descriptions.Item>
              <Descriptions.Item label="Quyền">{roleLabels[selectedUser.role] || selectedUser.role}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <StatusPill status={selectedUser.status || "active"} />
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">{formatDate(selectedUser.createdAt)}</Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      <Modal
        title="Chi tiết bài viết"
        open={postModalVisible}
        onCancel={() => {
          setPostModalVisible(false);
          setSelectedPost(null);
        }}
        footer={[
          <Button
            key="remove"
            danger
            onClick={async () => {
              if (selectedPost) {
                await handleRemovePost(selectedPost._id);
                setPostModalVisible(false);
                setSelectedPost(null);
              }
            }}
          >
            Gỡ bài
          </Button>,
          <Button
            key="close"
            type="primary"
            onClick={() => {
              setPostModalVisible(false);
              setSelectedPost(null);
            }}
          >
            Đóng
          </Button>,
        ]}
        width={600}
      >
        {selectedPost && (
          <div style={{ padding: "16px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <Avatar size={48} src={getMediaUrl(selectedPost.author?.avatar)} style={{ backgroundColor: COLORS.purple }}>
                {getInitials(selectedPost.author?.name || selectedPost.author?.email)}
              </Avatar>
              <div>
                <Typography.Text strong>
                  {selectedPost.author?.name || selectedPost.author?.email || "Không rõ"}
                </Typography.Text>
                <div style={{ color: COLORS.textLight, fontSize: 12 }}>{formatDateTime(selectedPost.createdAt)}</div>
              </div>
            </div>
            <Typography.Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 16 }}>
              {selectedPost.content || "(Không có nội dung)"}
            </Typography.Paragraph>
            {selectedPost.media?.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                {selectedPost.media.map((url, idx) => (
                  <img
                    key={idx}
                    src={getMediaUrl(url)}
                    alt={`Media ${idx + 1}`}
                    style={{ borderRadius: 8, width: "100%", height: 160, objectFit: "cover" }}
                  />
                ))}
              </div>
            )}
            <Descriptions bordered column={1}>
              <Descriptions.Item label="ID">{selectedPost._id}</Descriptions.Item>
              <Descriptions.Item label="Số lượt thích">{selectedPost.stats?.reactions || 0}</Descriptions.Item>
              <Descriptions.Item label="Số bình luận">{selectedPost.stats?.comments || 0}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <StatusPill status={selectedPost.status === "removed" ? "banned" : "active"} />
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </>
  );
};

export default AdminPage;
