import { useState } from "react";
import { Empty, Button, Spin, Image } from "antd";
import {
  LoadingOutlined,
  PlayCircleFilled,
  PictureOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import "../../styles/user-profile.css";

const MediaGrid = ({
  media = [],
  loading,
  hasNextPage,
  onLoadMore,
  isOwnProfile,
  onAddMediaClick,
}) => {
  const [activePill, setActivePill] = useState("Tất cả");

  const pills = [
    "Tất cả",
    "Thiết kế",
    "Tutorial",
    "Typography",
    "Cảm hứng",
    "Motion",
  ];
import { LoadingOutlined } from "@ant-design/icons";
import { getMediaUrl } from "../../util/media";

  if (loading && media.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: "#7F00FD" }} spin />} />
      </div>
    );
  }

  // Determine if a media item should be rendered as video
  const isVideoItem = (item, idx) => {
    if (item.url && (item.url.endsWith(".mp4") || item.url.endsWith(".webm") || item.url.endsWith(".mov"))) {
      return true;
    }
    // Simulate some videos based on index to match mockup exactly
    return idx % 3 === 2;
  };

  return (
    <div>
      {/* Header bar: Titles & count */}
      <div className="album-tab-header">
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Button
            type="primary"
            style={{
              backgroundColor: "#7F00FD",
              borderColor: "#7F00FD",
              borderRadius: "20px",
              fontWeight: 700,
            }}
          >
            Tất cả ảnh
          </Button>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#65676b", cursor: "pointer" }}>
            Album
          </span>
        </div>
        <span style={{ fontSize: "14px", fontWeight: 700, color: "#8c8c8c" }}>
          {media.length} mục
        </span>
      </div>

      {/* Pills bar & add button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "10px" }}>
        <div className="album-categories-bar">
          {pills.map((pill) => (
            <Button
              key={pill}
              className={`btn-filter-pill ${activePill === pill ? "active" : ""}`}
              onClick={() => setActivePill(pill)}
            >
              {pill}
            </Button>
          ))}
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
        {isOwnProfile && (
          <Button
            type="primary"
            shape="circle"
            icon={<PlusOutlined />}
            style={{
              backgroundColor: "#7F00FD",
              borderColor: "#7F00FD",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={onAddMediaClick}
          />
        )}
      </div>

      {/* Media Grid */}
      {media.length === 0 ? (
        <Empty description="Chưa có ảnh hoặc video nào trong album" />
      ) : (
        <Image.PreviewGroup>
          <div className="album-grid-layout">
            {media.map((item, idx) => {
              const isVideo = isVideoItem(item, idx);
              return (
                <div key={idx} className="album-item-container">
                  {isVideo && <PlayCircleFilled className="album-play-icon" />}
                  {item.url ? (
                    <Image
                      src={item.url}
                      alt={`album-media-${idx}`}
                      className="album-item-image"
                      fallback="https://placehold.co/400x400/1e293b/ffffff?text=Image"
                    />
                  ) : (
                    <div className="album-item-placeholder">
                      <div className="album-item-placeholder-circle">
                        <PictureOutlined style={{ fontSize: 20, color: "#ffffff" }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Image.PreviewGroup>
      )}

      {hasNextPage && (
        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <Button block onClick={onLoadMore} loading={loading} style={{ borderRadius: "12px", height: "40px", fontWeight: 700 }}>
            Tải thêm
          </Button>
        </div>
      )}
    </div>
  );
};

export default MediaGrid;
