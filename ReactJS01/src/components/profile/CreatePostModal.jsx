import { useState, useRef, useEffect } from "react";
import { Modal, Avatar, Button, Typography, message } from "antd";
import {
  CloseOutlined,
  PictureOutlined,
  PlaySquareOutlined,
  SmileOutlined,
  EnvironmentOutlined,
  DeleteOutlined,
  GlobalOutlined,
  LockOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { createPostApi, updatePostApi, uploadPostMediaApi } from "../../util/api";
import { getMediaUrl } from "../../util/media";
import MentionInput from "../ui/MentionInput";

const { Text } = Typography;

const getMediaSource = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.url || item.src || item.path || "";
};

const getMediaType = (item) => {
  if (item?.type) return item.type;
  const src = getMediaSource(item);
  const cleanSrc = src.split("#")[0];
  return src.includes("#type=video") ||
    src.includes("/video/") ||
    /\.(mp4|mov|webm|avi|mkv)$/i.test(cleanSrc)
    ? "video"
    : "image";
};

const CreatePostModal = ({ open, onCancel, onSuccess, currentUser, postToEdit }) => {
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [loading, setLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]); // List of { file, previewUrl, type: 'image' | 'video' }
  const fileInputRef = useRef(null);
  const [uploadType, setUploadType] = useState("image/*");

  useEffect(() => {
    if (open && postToEdit) {
      setContent(postToEdit.content || "");
      setVisibility(postToEdit.visibility || postToEdit.privacy || "public");
      
      if (postToEdit.media && postToEdit.media.length > 0) {
        const existing = postToEdit.media.map((item) => {
          const src = getMediaSource(item);
          return {
            file: null,
            previewUrl: getMediaUrl(src),
            type: getMediaType(item),
            isExisting: true,
            originalSrc: src,
          };
        }).filter((item) => item.originalSrc);
        setMediaFiles(existing);
      } else {
        setMediaFiles([]);
      }
    } else if (open && !postToEdit) {
      setContent("");
      setVisibility("public");
      setMediaFiles([]);
    }
  }, [open, postToEdit]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newMedia = files.map((file) => {
      const type = file.type.startsWith("video/") ? "video" : "image";
      const previewUrl = URL.createObjectURL(file) + `#type=${type}`;
      return { file, previewUrl, type };
    });

    setMediaFiles((prev) => [...prev, ...newMedia]);
    // Clear input value so same file can be selected again
    e.target.value = "";
  };

  const removeMedia = (index) => {
    setMediaFiles((prev) => {
      const item = prev[index];
      if (item?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const triggerUpload = (acceptType) => {
    setUploadType(acceptType);
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 50);
  };

  const handlePost = async () => {
    if (!content.trim() && mediaFiles.length === 0) {
      return;
    }

    try {
      setLoading(true);

      // Upload any new files to the server
      const newFilesToUpload = mediaFiles.filter((m) => m.file);
      let finalMediaUrls = [];

      if (newFilesToUpload.length > 0) {
        const formData = new FormData();
        newFilesToUpload.forEach((m) => {
          formData.append("media", m.file);
        });

        const uploadRes = await uploadPostMediaApi(formData);
        if (uploadRes?.EC !== 0) {
          throw new Error(uploadRes?.EM || "Lỗi upload media");
        }

        const uploadedUrls = uploadRes.data;
        let uploadIdx = 0;
        finalMediaUrls = mediaFiles.map((m) => {
          if (m.isExisting) {
            return m.originalSrc;
          } else {
            const url = uploadedUrls[uploadIdx];
            uploadIdx++;
            return url;
          }
        }).filter(Boolean);
      } else {
        finalMediaUrls = mediaFiles.map((m) => m.originalSrc).filter(Boolean);
      }

      if (postToEdit) {
        // Edit mode
        const res = await updatePostApi(postToEdit._id || postToEdit.id, {
          content: content.trim(),
          visibility: visibility,
          media: finalMediaUrls,
        });

        if (res?.EC === 0) {
          message.success("Cập nhật bài viết thành công!");
          
          // Construct updated post object
          const updatedPost = {
            ...res.data,
            id: res.data._id || res.data.id,
            privacy: res.data.visibility || visibility,
            isOwner: true,
          };

          onSuccess(updatedPost);
          onCancel();
        } else {
          message.error(res?.EM || "Không thể cập nhật bài");
        }
      } else {
        // Create mode
        const res = await createPostApi({
          content: content.trim(),
          visibility: visibility,
          media: finalMediaUrls,
        });

        if (res?.EC === 0) {
          message.success("Đăng bài viết thành công!");
          
          const newPost = {
            ...res.data,
            media: res.data.media || finalMediaUrls,
            id: res.data._id || res.data.id,
            privacy: res.data.visibility || visibility,
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
            isLiked: false,
            isOwner: true,
            isPinned: false,
            comments: []
          };

          setContent("");
          setMediaFiles([]);
          onSuccess(newPost);
          onCancel();
        } else {
          message.error(res?.EM || "Không thể đăng bài");
        }
      }
    } catch (err) {
      console.error(err);
      message.error(err?.message || (postToEdit ? "Có lỗi xảy ra khi cập nhật bài viết." : "Có lỗi xảy ra khi đăng bài."));
    } finally {
      setLoading(false);
    }
  };

  const isPostDisabled = !content.trim() && mediaFiles.length === 0;

  const privacyOptions = [
    { value: "public", label: "Công khai", icon: <GlobalOutlined /> },
    { value: "friends", label: "Bạn bè", icon: <TeamOutlined /> },
    { value: "private", label: "Riêng tư", icon: <LockOutlined /> },
  ];

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      closable={false}
      width={576}
      centered
      styles={{
        body: { padding: 0 },
        content: { borderRadius: "24px", overflow: "hidden", padding: 0 }
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={uploadType}
        multiple
        style={{ display: "none" }}
      />

      <div className="flex flex-col bg-white w-full max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <Button
            type="text"
            shape="circle"
            className="flex items-center justify-center bg-gray-100 hover:bg-gray-200"
            icon={<CloseOutlined style={{ fontSize: "14px", color: "#101828" }} />}
            onClick={onCancel}
          />
          <Text className="font-bold text-gray-900 text-base">{postToEdit ? "Chỉnh sửa bài viết" : "Bài viết mới"}</Text>
          <Button
            type="primary"
            onClick={handlePost}
            loading={loading}
            disabled={isPostDisabled}
            style={{
              backgroundColor: isPostDisabled ? "#F3F4F6" : "#7F00FD",
              borderColor: isPostDisabled ? "#F3F4F6" : "#7F00FD",
              color: isPostDisabled ? "#99A1AF" : "#FFFFFF",
              borderRadius: "20px",
              fontWeight: 700,
              boxShadow: "none",
            }}
          >
            Đăng
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-[320px]">
          {/* User Row */}
          <div className="flex gap-3 items-center mb-4">
            <Avatar
              size={44}
              src={getMediaUrl(currentUser?.avatar)}
              style={{ backgroundColor: "#7F00FD", fontWeight: "bold" }}
            >
              {currentUser?.name?.[0]?.toUpperCase() || "U"}
            </Avatar>
            <div className="flex flex-col items-start">
              <Text className="font-bold text-gray-900 text-sm">
                {currentUser?.name || "Người Dùng"}
              </Text>
              <div className="mt-2 flex flex-wrap gap-2">
                {privacyOptions.map((option) => (
                  <Button
                    key={option.value}
                    type={visibility === option.value ? "primary" : "default"}
                    onClick={() => setVisibility(option.value)}
                    size="small"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 20 }}
                  >
                    {option.icon}
                    <span>{option.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Text Area */}
          <MentionInput
            type="textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Bạn đang nghĩ gì thế?... dùng @ để nhắc bạn bè"
            rows={4}
          />

          {/* Media Preview Grid */}
          {mediaFiles.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-4 max-h-[300px] overflow-y-auto p-1">
              {mediaFiles.map((media, index) => (
                <div key={index} className="relative rounded-xl overflow-hidden border border-gray-100 group aspect-video bg-gray-50">
                  {media.type === "image" ? (
                    <img
                      src={media.previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={media.previewUrl}
                      className="w-full h-full object-cover"
                      controls
                    />
                  )}
                  <Button
                    type="primary"
                    danger
                    shape="circle"
                    size="small"
                    className="absolute top-2 right-2 opacity-90 hover:opacity-100"
                    icon={<DeleteOutlined />}
                    onClick={() => removeMedia(index)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between bg-white">
          <div className="flex gap-1 items-center">
            <Button
              type="text"
              shape="circle"
              className="hover:bg-gray-100 flex items-center justify-center text-gray-500"
              icon={<PictureOutlined style={{ fontSize: "20px", color: "#101828" }} />}
              onClick={() => triggerUpload("image/*")}
              title="Thêm ảnh"
            />
            <Button
              type="text"
              shape="circle"
              className="hover:bg-gray-100 flex items-center justify-center text-gray-500"
              icon={<PlaySquareOutlined style={{ fontSize: "20px", color: "#101828" }} />}
              onClick={() => triggerUpload("video/*")}
              title="Thêm video"
            />
            <Button
              type="text"
              shape="circle"
              className="hover:bg-gray-100 flex items-center justify-center text-gray-500"
              icon={<SmileOutlined style={{ fontSize: "20px", color: "#101828" }} />}
              title="Cảm xúc"
            />
            <Button
              type="text"
              shape="circle"
              className="hover:bg-gray-100 flex items-center justify-center text-gray-500"
              icon={<EnvironmentOutlined style={{ fontSize: "20px", color: "#101828" }} />}
              title="Vị trí"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CreatePostModal;
