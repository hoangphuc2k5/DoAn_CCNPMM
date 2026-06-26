import { Button, Spin, Empty } from "antd";
import {
  LoadingOutlined,
  PictureOutlined,
  PlaySquareOutlined,
  HeartFilled,
  MessageFilled,
  ShareAltOutlined,
  PlusOutlined,
  PushpinFilled,
  LockOutlined,
  GlobalOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { getMediaUrl } from "../../util/media";
import "../../styles/user-profile.css";

const renderPostContent = (text = "") => {
  if (!text) return "";
  
  // Matches @[Display Name](emailPrefix)
  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }
    
    const displayName = match[1];
    parts.push(
      <span 
        key={matchIndex} 
        className="text-blue-600 font-bold hover:underline cursor-pointer"
        style={{ color: "#1890ff", fontWeight: "bold" }}
      >
        {displayName}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
};

const PostsList = ({
  posts,
  loading,
  hasNextPage,
  onLoadMore,
  isOwnProfile,
  onAddPostClick,
  onPostClick,
  onShareClick,
}) => {
  if (loading && posts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: "#7F00FD" }} spin />} />
      </div>
    );
  }

  if (!loading && posts.length === 0) {
    return (
      <div className="posts-grid-container">
        <div className="posts-tab-header">
          <h2 className="posts-count-title">0 bài viết</h2>
          {isOwnProfile && (
            <div className="posts-header-actions">
              <Button className="btn-post-action" icon={<PictureOutlined />} onClick={onAddPostClick}>
                Thêm ảnh
              </Button>
              <Button className="btn-post-action" icon={<PlaySquareOutlined />} onClick={onAddPostClick}>
                Thêm video
              </Button>
            </div>
          )}
        </div>
        <Empty description="Chưa có bài viết nào" />
        {isOwnProfile && (
          <Button
            type="primary"
            className="floating-action-button"
            icon={<PlusOutlined />}
            onClick={onAddPostClick}
          />
        )}
      </div>
    );
  }

  // Get first image or media if available in post
  const getPostMedia = (post) => {
    if (post.media && post.media.length > 0) {
      return getMediaUrl(post.media[0]);
    }
    return null;
  };

  return (
    <div className="posts-grid-container">
      {/* Header bar: Count & add buttons */}
      <div className="posts-tab-header">
        <h2 className="posts-count-title">{posts.length} bài viết</h2>
        {isOwnProfile && (
          <div className="posts-header-actions">
            <Button className="btn-post-action" icon={<PictureOutlined />} onClick={onAddPostClick}>
              Thêm ảnh
            </Button>
            <Button className="btn-post-action" icon={<PlaySquareOutlined />} onClick={onAddPostClick}>
              Thêm video
            </Button>
          </div>
        )}
      </div>

      {/* Grid of posts */}
      <div className="posts-cards-grid">
        {posts.map((post) => {
          const mediaUrl = getPostMedia(post);
          return (
            <div
              key={post._id}
              className="post-item-card"
              onClick={() => onPostClick?.(post)}
            >
              <div className="post-card-thumb-wrapper relative">
                {post.isPinned && (
                  <div className="absolute top-2 left-2 z-10 bg-purple-600 text-white rounded-full px-2 py-0.5 text-xs flex items-center gap-1 font-semibold shadow-md">
                    <PushpinFilled style={{ fontSize: "10px" }} /> Đã ghim
                  </div>
                )}
                {mediaUrl ? (
                  <img src={mediaUrl} className="post-card-image" alt="Post thumbnail" />
                ) : (
                  <div className="post-card-thumb-circle">
                    <PictureOutlined style={{ fontSize: 24, color: "#a0a5b0" }} />
                  </div>
                )}
              </div>
              <div className="post-card-body">
                <h3 className="post-card-title">{renderPostContent(post.content)}</h3>
                <div className="post-card-footer">
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <span className="post-card-stat">
                      <HeartFilled style={{ color: "#ff4d4f" }} />
                      {post.stats?.reactions || 0}
                    </span>
                    <span className="post-card-stat">
                      <MessageFilled style={{ color: "#7F00FD" }} />
                      {post.stats?.comments || 0}
                    </span>
                    <span className="post-card-stat text-gray-400" title={post.visibility === "friends" ? "Bạn bè" : post.visibility === "private" ? "Riêng tư" : "Công khai"}>
                      {post.visibility === "friends" ? <TeamOutlined /> : post.visibility === "private" ? <LockOutlined /> : <GlobalOutlined />}
                    </span>
                  </div>
                  <button
                    className="post-card-share-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareClick?.(post);
                    }}
                  >
                    <ShareAltOutlined />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasNextPage && (
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <Button block onClick={onLoadMore} loading={loading} style={{ borderRadius: "12px", height: "40px", fontWeight: 700 }}>
            Tải thêm
          </Button>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      {isOwnProfile && (
        <Button
          type="primary"
          className="floating-action-button"
          icon={<PlusOutlined />}
          onClick={onAddPostClick}
        />
      )}
    </div>
  );
};

export default PostsList;
