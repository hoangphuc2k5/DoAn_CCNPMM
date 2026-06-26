import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Image,
  Result,
  Space,
  Spin,
  Typography,
  message,
} from "antd";
import {
  BookFilled,
  CommentOutlined,
  DeleteOutlined,
  LikeFilled,
  RetweetOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { getSavedPostsApi, unsavePostApi } from "../util/api";
import { getMediaUrl } from "../util/media";

const normalizeMedia = (media = []) =>
  media
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") {
        const isVideo =
          item.includes("#type=video") ||
          item.includes("/video/") ||
          /\.(mp4|mov|webm|avi|mkv)$/i.test(item);
        return { url: item, type: isVideo ? "video" : "image" };
      }
      return item;
    })
    .filter(Boolean);

const SavedPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSavedPosts = async ({ nextPage = 1, append = false } = {}) => {
    try {
      setLoading(true);
      const res = await getSavedPostsApi({ page: nextPage, limit: 10 });
      if (res?.EC === 0) {
        setPosts((prev) => (append ? [...prev, ...(res.data || [])] : res.data || []));
        setPage(nextPage);
        setHasMore(Boolean(res.pagination?.hasMore));
      } else {
        message.error(res?.EM || "Không thể tải bài viết đã lưu");
      }
    } catch (error) {
      message.error(error?.message || "Không thể tải bài viết đã lưu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadSavedPosts();
    }
  }, [isAuthenticated]);

  const handleUnsave = async (postId) => {
    try {
      const res = await unsavePostApi(postId);
      if (res?.EC === 0) {
        setPosts((prev) => prev.filter((post) => post._id !== postId));
        message.success(res.EM || "Đã bỏ lưu bài viết");
      } else {
        message.error(res?.EM || "Không thể bỏ lưu bài viết");
      }
    } catch (error) {
      message.error(error?.message || "Không thể bỏ lưu bài viết");
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Space align="center" size={12}>
          <BookFilled style={{ color: "#7F00FD", fontSize: 24 }} />
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Đã lưu
            </Typography.Title>
            <Typography.Text type="secondary">
              Các bài viết bạn đã lưu để xem lại.
            </Typography.Text>
          </div>
        </Space>
      </Card>

      {loading && posts.length === 0 ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <Result
            icon={<BookFilled style={{ color: "#bfbfbf" }} />}
            title="Chưa có bài viết đã lưu"
            subTitle="Khi bạn lưu bài viết, nội dung đó sẽ xuất hiện ở đây."
            extra={
              <Link to="/">
                <Button type="primary">Về bảng tin</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {posts.map((post) => {
            const media = normalizeMedia(post.media);
            const firstMedia = media[0];
            const authorName = post.author?.name || post.author?.email || "Người dùng";
            return (
              <Card key={post._id} className="post-card">
                <div className="post-head">
                  <Space
                    align="start"
                    style={{ cursor: "pointer" }}
                    onClick={() => post.author?._id && navigate(`/profile/${post.author._id}`)}
                  >
                    <Avatar src={getMediaUrl(post.author?.avatar)} icon={<UserOutlined />}>
                      {authorName[0]}
                    </Avatar>
                    <div>
                      <Typography.Text strong>{authorName}</Typography.Text>
                      <div className="post-meta">
                        Lưu lúc {post.savedAt ? new Date(post.savedAt).toLocaleString("vi-VN") : "--"}
                      </div>
                    </div>
                  </Space>
                  <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => handleUnsave(post._id)}
                  >
                    Bỏ lưu
                  </Button>
                </div>

                <Typography.Paragraph className="post-content" ellipsis={{ rows: 4 }}>
                  {post.content || "Bài viết không có nội dung"}
                </Typography.Paragraph>

                {firstMedia ? (
                  <div className="post-media-gallery my-3 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center max-h-[360px]">
                    {firstMedia.type === "video" ? (
                      <video
                        src={getMediaUrl(firstMedia.url)}
                        controls
                        className="max-w-full max-h-[360px] object-contain"
                      />
                    ) : (
                      <Image
                        src={getMediaUrl(firstMedia.url)}
                        alt="Post media"
                        className="max-w-full max-h-[360px] object-contain"
                      />
                    )}
                  </div>
                ) : null}

                <div className="post-stats">
                  <span>
                    <LikeFilled /> {post.stats?.reactions || 0} reaction
                  </span>
                  <span>
                    {post.stats?.comments || 0} bình luận · {post.stats?.shares || 0} chia sẻ
                  </span>
                </div>

                <div className="post-actions">
                  <Button
                    type="text"
                    icon={<CommentOutlined />}
                    onClick={() => navigate(`/?postId=${post._id}`)}
                  >
                    Mở bài viết
                  </Button>
                  <Button
                    type="text"
                    icon={<RetweetOutlined />}
                    onClick={() => navigate(`/?postId=${post._id}`)}
                  >
                    Xem trong bảng tin
                  </Button>
                </div>
              </Card>
            );
          })}

          {hasMore ? (
            <Button block loading={loading} onClick={() => loadSavedPosts({ nextPage: page + 1, append: true })}>
              Tải thêm
            </Button>
          ) : null}
        </Space>
      )}
    </main>
  );
};

export default SavedPage;
