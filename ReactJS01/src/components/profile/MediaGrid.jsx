import { Empty, Button, Spin, Image } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

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
          {media.map((item, idx) => (
            <Image
              key={idx}
              src={item.url}
              alt={`media-${idx}`}
              style={{ height: "200px", objectFit: "cover" }}
            />
          ))}
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
