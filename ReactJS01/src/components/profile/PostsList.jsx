import { Card, Empty, Button, Spin, Image } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { getMediaUrl } from "../../util/media";

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

const PostsList = ({ posts, loading, hasNextPage, onLoadMore }) => {
  if (loading && posts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  if (!loading && posts.length === 0) {
    return <Empty description="Chưa có bài viết nào" />;
  }

  return (
    <div>
      {posts.map((post) => (
        <Card key={post._id} style={{ marginBottom: "16px" }}>
          <div style={{ marginBottom: "12px" }}>
            <strong>{post.author?.name || "Người dùng"}</strong>
            <p style={{ fontSize: "12px", color: "#999" }}>
              {new Date(post.createdAt).toLocaleDateString("vi-VN")}
            </p>
          </div>
          <p>{post.content}</p>
          {normalizeMedia(post.media).length > 0 && (
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {normalizeMedia(post.media).map((item, idx) => {
                const src = getMediaUrl(item.url);
                return item.type === "video" ? (
                  <video
                    key={`${src}-${idx}`}
                    src={src}
                    controls
                    style={{ maxWidth: "240px", height: "auto", borderRadius: "8px" }}
                  />
                ) : (
                  <Image
                    key={`${src}-${idx}`}
                    src={src}
                    alt={item.originalName || "media"}
                    style={{ maxWidth: "200px", height: "auto", borderRadius: "8px" }}
                  />
                );
              })}
            </div>
          )}
          <p style={{ marginTop: "12px", color: "#666", fontSize: "12px" }}>
            😍 {post.stats?.reactions || 0} | 💬 {post.stats?.comments || 0} |
            ↗️ {post.stats?.shares || 0}
          </p>
        </Card>
      ))}
      {hasNextPage && (
        <Button block onClick={onLoadMore} loading={loading}>
          Tải thêm
        </Button>
      )}
    </div>
  );
};

export default PostsList;
