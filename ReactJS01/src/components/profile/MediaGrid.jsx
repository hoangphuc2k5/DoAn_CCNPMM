import { Empty, Button, Spin, Image } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { getMediaUrl } from "../../util/media";

const MediaGrid = ({ media, loading, hasNextPage, onLoadMore }) => {
  if (loading && media.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  if (!loading && media.length === 0) {
    return <Empty description="Chưa có ảnh hoặc video nào" />;
  }

  return (
    <div>
      <Image.PreviewGroup>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "12px",
          }}
        >
          {media.map((item, idx) => {
            const type = item.type || (/\.(mp4|mov|avi|mkv|webm)$/i.test(item.url) ? "video" : "image");
            const src = getMediaUrl(item.url);

            return type === "video" ? (
              <video
                key={`${src}-${idx}`}
                src={src}
                controls
                style={{
                  width: "100%",
                  height: "200px",
                  objectFit: "cover",
                  borderRadius: "8px",
                }}
              />
            ) : (
              <Image
                key={`${src}-${idx}`}
                src={src}
                alt={`media-${idx}`}
                style={{ height: "200px", objectFit: "cover" }}
              />
            );
          })}
        </div>
      </Image.PreviewGroup>
      {hasNextPage && (
        <div style={{ marginTop: "16px" }}>
          <Button block onClick={onLoadMore} loading={loading}>
            Tải thêm
          </Button>
        </div>
      )}
    </div>
  );
};

export default MediaGrid;
