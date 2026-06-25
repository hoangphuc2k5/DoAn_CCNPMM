import { Button, Spin, Empty } from "antd";
import {
  LoadingOutlined,
  PictureOutlined,
  PlaySquareOutlined,
  HeartFilled,
  MessageFilled,
  ShareAltOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { getMediaUrl } from "../../util/media";
import "../../styles/user-profile.css";

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
              <div className="post-card-thumb-wrapper">
                {mediaUrl ? (
                  <img src={mediaUrl} className="post-card-image" alt="Post thumbnail" />
                ) : (
                  <div className="post-card-thumb-circle">
                    <PictureOutlined style={{ fontSize: 24, color: "#a0a5b0" }} />
                  </div>
                )}
              </div>
              <div className="post-card-body">
                <h3 className="post-card-title">{post.content}</h3>
                <div className="post-card-footer">
                  <div style={{ display: "flex", gap: "16px" }}>
                    <span className="post-card-stat">
                      <HeartFilled style={{ color: "#ff4d4f" }} />
                      {post.stats?.reactions || 0}
                    </span>
                    <span className="post-card-stat">
                      <MessageFilled style={{ color: "#7F00FD" }} />
                      {post.stats?.comments || 0}
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
