import { Avatar, Empty, Popover } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { getMediaUrl } from "../../util/media";
import { REACTIONS, getReactionCount, getReactionTotal } from "../../util/reactions";

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";

const ReactionSummary = ({ post, className = "", showZero = true }) => {
  const total = getReactionTotal(post);
  const usersByType = post?.reactionDetails?.usersByType || {};
  const activeReactions = REACTIONS.filter((reaction) => getReactionCount(post, reaction.type) > 0);

  if (!total && !showZero) return null;

  const content = total ? (
    <div style={{ minWidth: 260, maxWidth: 340 }}>
      {activeReactions.map((reaction) => {
        const users = usersByType[reaction.type] || [];
        return (
          <div key={reaction.type} style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <strong>
                <span style={{ marginRight: 6 }}>{reaction.emoji}</span>
                {reaction.label}
              </strong>
              <span>{getReactionCount(post, reaction.type)}</span>
            </div>
            {users.length ? (
              <div style={{ display: "grid", gap: 6 }}>
                {users.map((user, index) => (
                  <div
                    key={`${reaction.type}-${user?._id || user?.email || index}`}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Avatar size={24} src={getMediaUrl(user?.avatar)} icon={<UserOutlined />}>
                      {getInitials(user?.name || user?.email)}
                    </Avatar>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user?.name || user?.email || "Người dùng"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: "#8c8c8c" }}>Chưa có dữ liệu người dùng</span>
            )}
          </div>
        );
      })}
    </div>
  ) : (
    <Empty description="Chưa có reaction" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  );

  return (
    <Popover content={content} placement="bottomLeft" trigger="click">
      <button
        type="button"
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          border: 0,
          padding: 0,
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
          font: "inherit",
        }}
        aria-label="Xem thống kê reaction"
      >
        <span>{activeReactions.slice(0, 3).map((reaction) => reaction.emoji).join("") || "👍"}</span>
        <span>{total}</span>
      </button>
    </Popover>
  );
};

export default ReactionSummary;
