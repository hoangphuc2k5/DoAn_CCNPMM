import { Button, Card, Empty, Image, Spin, Typography } from "antd";
import {
  GlobalOutlined,
  HeartFilled,
  LoadingOutlined,
  LockOutlined,
  MessageFilled,
  PictureOutlined,
  PlaySquareOutlined,
  PlusOutlined,
  PushpinFilled,
  ShareAltOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { getMediaUrl } from "../../util/media";
import "../../styles/user-profile.css";

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

const getVisibilityIcon = (visibility) => {
  if (visibility === "friends") return <TeamOutlined />;
  if (visibility === "private") return <LockOutlined />;
  return <GlobalOutlined />;
};

const PostsList = ({
  posts = [],
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
        <Spin
          indicator={<LoadingOutlined style={{ fontSize: 48, color: "#7F00FD" }} spin />}
        />
      </div>
    );
  }

  return (
    <div className="posts-grid-container">
      <div className="posts-tab-header">
        <h2 className="posts-count-title">{posts.length} bài viết</h2>
        {isOwnProfile ? (
          <div className="posts-header-actions">
            <Button
              className="btn-post-action"
              icon={<PictureOutlined />}
              onClick={onAddPostClick}
            >
              Thêm ảnh
            </Button>
            <Button
              className="btn-post-action"
              icon={<PlaySquareOutlined />}
              onClick={onAddPostClick}
            >
              Thêm video
            </Button>
          </div>
        ) : null}
      </div>

      {posts.length === 0 ? (
        <Empty description="Chưa có bài viết nào" />
      ) : (
        <div className="posts-cards-grid">
          {posts.map((post) => {
            const mediaItems = normalizeMedia(post.media);
            const hero = mediaItems[0];
            const heroUrl = hero?.url ? getMediaUrl(hero.url) : "";

            return (
              <Card
                key={post._id}
                className="post-item-card"
                hoverable
                onClick={() => onPostClick?.(post)}
              >
                <div className="post-card-thumb-wrapper relative">
                  {post.isPinned ? (
                    <div className="absolute top-2 left-2 z-10 bg-purple-600 text-white rounded-full px-2 py-0.5 text-xs flex items-center gap-1 font-semibold shadow-md">
                      <PushpinFilled style={{ fontSize: "10px" }} /> Đã ghim
                    </div>
                  ) : null}

                  {hero ? (
                    hero.type === "video" ? (
                      <video
                        src={heroUrl}
                        controls
                        className="post-card-image"
                        style={{ width: "100%", borderRadius: "12px", objectFit: "cover" }}
                      />
                    ) : (
                      <Image
                        src={heroUrl}
                        alt="Post thumbnail"
                        className="post-card-image"
                        preview={false}
                      />
                    )
                  ) : (
                    <div className="post-card-thumb-circle">
                      <PictureOutlined style={{ fontSize: 24, color: "#a0a5b0" }} />
                    </div>
                  )}
                </div>

                <div className="post-card-body">
                  <Typography.Paragraph className="post-card-title" ellipsis={{ rows: 3 }}>
                    {post.content || "Bài viết không có nội dung"}
                  </Typography.Paragraph>

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
                      <span
                        className="post-card-stat text-gray-400"
                        title={post.visibility || "public"}
                      >
                        {getVisibilityIcon(post.visibility)}
                      </span>
                    </div>
                    <button
                      className="post-card-share-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        onShareClick?.(post);
                      }}
                    >
                      <ShareAltOutlined />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {hasNextPage ? (
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <Button
            block
            onClick={onLoadMore}
            loading={loading}
            style={{ borderRadius: "12px", height: "40px", fontWeight: 700 }}
          >
            Tải thêm
          </Button>
        </div>
      ) : null}

      {isOwnProfile ? (
        <Button
          type="primary"
          className="floating-action-button"
          icon={<PlusOutlined />}
          onClick={onAddPostClick}
        />
      ) : null}
    </div>
  );
};

export default PostsList;
