import { useEffect, useMemo } from "react";
import { Avatar, Button, Card, Dropdown, Image, Modal, Tag, Upload } from "antd";
import { CaretDownOutlined, DeleteOutlined, PictureOutlined, TeamOutlined, UserOutlined, GlobalOutlined, LockOutlined } from "@ant-design/icons";
import { getMediaUrl } from "../../util/media";
import MentionInput from "../ui/MentionInput";

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";

const getFileSource = (file) => {
  if (file.thumbUrl || file.url) return file.thumbUrl || file.url;
  const rawFile = file.originFileObj || file;
  return rawFile instanceof Blob ? URL.createObjectURL(rawFile) : "";
};

const isVideoFile = (file) => {
  const rawFile = file.originFileObj || file;
  return rawFile?.type?.startsWith("video/") || /\.(mp4|mov|webm|avi|mkv)$/i.test(file.name || "");
};

const CreatePostComposer = ({
  avatar,
  canPost = true,
  content,
  files = [],
  modalPlaceholder = "Tạo bài viết...",
  name,
  onContentChange,
  onFilesChange,
  onOpenChange,
  onRemoveFile,
  onSubmit,
  open,
  submitText = "Đăng",
  triggerPlaceholder = "Bạn viết gì đi...",
  variant = "card",
  visibilityNode = null,
  visibilityOptions = [],
  visibilityValue,
  onVisibilityChange,
}) => {
  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        isVideo: isVideoFile(file),
        src: getFileSource(file),
      })),
    [files],
  );

  useEffect(
    () => () => {
      previews.forEach((item) => {
        if (item.src?.startsWith("blob:")) URL.revokeObjectURL(item.src);
      });
    },
    [previews],
  );

  if (!canPost) return null;

  const avatarNode = (
    <Avatar size={44} src={getMediaUrl(avatar)} icon={<UserOutlined />}>
      {getInitials(name)}
    </Avatar>
  );

  const trigger = (
    <button className="composer-trigger" type="button" onClick={() => onOpenChange(true)}>
      {avatarNode}
      <span className="composer-trigger-text">{triggerPlaceholder}</span>
    </button>
  );

  const visibilityItems = visibilityOptions.map((option) => ({
    key: option.value,
    label: option.label,
    onClick: () => onVisibilityChange(option.value),
  }));

  const getCurrentVisibilityLabel = () => {
    const current = visibilityOptions.find((item) => item.value === visibilityValue);
    return current ? current.label : "Quyền riêng tư";
  };

  const getCurrentVisibilityIcon = () => {
    if (visibilityValue === "friends") return <TeamOutlined />;
    if (visibilityValue === "private") return <LockOutlined />;
    return <GlobalOutlined />;
  };

  const triggerNode =
    variant === "group" ? (
      <section className="tg-composer tg-composer-collapsed">{trigger}</section>
    ) : (
      <Card className="composer-card composer-card-collapsed">{trigger}</Card>
    );

  return (
    <>
      {triggerNode}
      <Modal
        centered
        className="create-post-modal"
        footer={null}
        onCancel={() => onOpenChange(false)}
        open={open}
        title={<div className="create-post-title">Tạo bài viết</div>}
        width={620}
      >
        <div className="create-post-author">
          <Avatar size={48} src={getMediaUrl(avatar)} icon={<UserOutlined />}>
            {getInitials(name)}
          </Avatar>
          <div>
            <strong>{name}</strong>
            <div className="mt-2">
              {visibilityOptions.length ? (
                <Dropdown
                  menu={{ items: visibilityItems }}
                  trigger={["click"]}
                  placement="bottomLeft"
                >
                  <Button size="small" type="default" className="flex items-center gap-1">
                    {getCurrentVisibilityIcon()} {getCurrentVisibilityLabel()} <CaretDownOutlined />
                  </Button>
                </Dropdown>
              ) : null}
            </div>
          </div>
        </div>

        <MentionInput
          type="textarea"
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          placeholder={modalPlaceholder}
          rows={files.length ? 3 : 7}
          className="create-post-textarea"
        />

        {previews.length ? (
          <Image.PreviewGroup>
            <div className="create-post-preview-grid">
              {previews.map((item) =>
                item.isVideo ? (
                  <video
                    className="create-post-preview"
                    controls
                    key={item.file.uid || item.file.name}
                    src={item.src}
                  />
                ) : (
                  <Image
                    alt={item.file.name || "media"}
                    className="create-post-preview"
                    key={item.file.uid || item.file.name}
                    src={item.src}
                  />
                ),
              )}
            </div>
          </Image.PreviewGroup>
        ) : null}

        <div className="create-post-addons">
          <strong>Thêm vào bài viết của bạn</strong>
          <Upload
            accept="image/*,video/*"
            beforeUpload={() => false}
            fileList={files}
            multiple
            onChange={({ fileList }) => onFilesChange(fileList.slice(0, 10))}
            showUploadList={false}
          >
            <Button icon={<PictureOutlined />} shape="circle" type="text" />
          </Upload>
        </div>

        {files.length ? (
          <div className="composer-media-list create-post-file-list">
            {files.map((file) => (
              <Tag
                closable
                closeIcon={<DeleteOutlined />}
                key={file.uid || file.name}
                onClose={(event) => {
                  event.preventDefault();
                  onRemoveFile(file.uid);
                }}
              >
                {file.name}
              </Tag>
            ))}
          </div>
        ) : null}

        <Button
          block
          className="create-post-submit"
          disabled={!content.trim() && files.length === 0}
          onClick={onSubmit}
          type="primary"
        >
          {submitText}
        </Button>
      </Modal>
    </>
  );
};

export default CreatePostComposer;
