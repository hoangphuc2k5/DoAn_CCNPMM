import { Card, Empty, Button, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

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
          {post.media && post.media.length > 0 && (
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {post.media.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt="media"
                  style={{ maxWidth: "200px", height: "auto" }}
                />
              ))}
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
