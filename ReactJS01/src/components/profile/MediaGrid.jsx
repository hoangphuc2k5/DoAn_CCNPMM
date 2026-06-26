import { useState } from "react";
import { Button, Empty, Image, Spin } from "antd";
import {
  LoadingOutlined,
  PictureOutlined,
  PlayCircleFilled,
  PlusOutlined,
} from "@ant-design/icons";
import { getMediaUrl } from "../../util/media";
import "../../styles/user-profile.css";

const PILLS = ["Tất cả", "Ảnh", "Video", "Gần đây"];

const isVideoUrl = (url = "") => /\.(mp4|mov|avi|mkv|webm)$/i.test(url);

const MediaGrid = ({
  media = [],
  loading,
  hasNextPage,
  onLoadMore,
  isOwnProfile,
  onAddMediaClick,
}) => {
  const [activePill, setActivePill] = useState("Tất cả");

  if (loading && media.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Spin
          indicator={<LoadingOutlined style={{ fontSize: 48, color: "#7F00FD" }} spin />}
        />
      </div>
    );
  }

  const filteredMedia = media.filter((item) => {
    const type = item.type || (isVideoUrl(item.url) ? "video" : "image");
    if (activePill === "Ảnh") return type === "image";
    if (activePill === "Video") return type === "video";
    return true;
  });

  return (
    <div>
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
            Tất cả media
          </Button>
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#65676b",
            }}
          >
            Album
          </span>
        </div>
        <span style={{ fontSize: "14px", fontWeight: 700, color: "#8c8c8c" }}>
          {filteredMedia.length} mục
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div className="album-categories-bar">
          {PILLS.map((pill) => (
            <Button
              key={pill}
              className={`btn-filter-pill ${activePill === pill ? "active" : ""}`}
              onClick={() => setActivePill(pill)}
            >
              {pill}
            </Button>
          ))}
        </div>

        {isOwnProfile ? (
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
        ) : null}
      </div>

      {filteredMedia.length === 0 ? (
        <Empty description="Chưa có ảnh hoặc video nào trong album" />
      ) : (
        <Image.PreviewGroup>
          <div className="album-grid-layout">
            {filteredMedia.map((item, idx) => {
              const src = getMediaUrl(item.url);
              const type = item.type || (isVideoUrl(item.url) ? "video" : "image");

              return (
                <div key={`${src}-${idx}`} className="album-item-container">
                  {type === "video" ? (
                    <div className="album-item-placeholder">
                      <video
                        src={src}
                        controls
                        className="album-item-image"
                        style={{ objectFit: "cover" }}
                      />
                      <PlayCircleFilled className="album-play-icon" />
                    </div>
                  ) : item.url ? (
                    <Image
                      src={src}
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

      {hasNextPage ? (
        <div style={{ marginTop: "24px", textAlign: "center" }}>
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
    </div>
  );
};

export default MediaGrid;
