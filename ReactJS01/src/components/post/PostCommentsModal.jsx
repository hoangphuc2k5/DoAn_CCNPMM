import { useState } from "react";
import MentionInput from "../ui/MentionInput";
import {
  Avatar,
  Button,
  Dropdown,
  Empty,
  Image,
  message,
  Modal,
  Space,
  Typography,
} from "antd";
import {
  CommentOutlined,
  DeleteOutlined,
  EyeInvisibleOutlined,
  FlagOutlined,
  LikeFilled,
  LikeOutlined,
  MoreOutlined,
  RetweetOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { getMediaUrl } from "../../util/media";
import ReactionSummary from "./ReactionSummary";

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

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";

const renderMentionContent = (text = "") => {
  if (!text) return "";
  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <span key={`${match.index}-${match[2]}`} style={{ color: "#1677ff", fontWeight: 700 }}>
        {match[1]}
      </span>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : text;
};
const PostCommentsModal = ({
  post,
  open,
  onClose,
  currentUser,
  commentValue = "",
  onCommentChange,
  onSubmitComment,
  replyDrafts = {},
  onReplyChange,
  onSubmitReply,
  canComment = true,
  canDeleteComment,
  onDeleteComment,
  onAuthorClick,
  onReact,
  onShare,
  onHideComment,
  onReportComment,
  shareDisabled = false,
  highlightedCommentId = "",
}) => {
  const [activeReplyId, setActiveReplyId] = useState("");
  const [hiddenCommentIds, setHiddenCommentIds] = useState([]);
  const comments = post?.comments || [];
  const titleName = post?.author?.name || post?.author?.email || "người dùng";
  // Use shared post's media if available, otherwise use post's own media
  const media = normalizeMedia(post?.sharedPost?.media || post?.media);

  const isHidden = (commentId) => hiddenCommentIds.includes(commentId);
  const getEntityId = (entity) => entity?._id || entity?.id || entity;
  const isOwnAuthor = (author) => {
    const authorId = getEntityId(author);
    const currentUserId = getEntityId(currentUser);
    return Boolean(authorId && currentUserId && String(authorId) === String(currentUserId));
  };

  const hideComment = (commentId) => {
    if (onHideComment) {
      onHideComment(post, commentId);
      return;
    }
    setHiddenCommentIds((prev) => (prev.includes(commentId) ? prev : [...prev, commentId]));
  };

  const reportComment = (comment) => {
    if (isOwnAuthor(comment.author)) {
      message.warning("Không thể tự tố cáo bình luận của mình");
      return;
    }
    if (onReportComment) {
      onReportComment(post, comment);
      return;
    }
    message.success("Đã ghi nhận báo cáo bình luận");
  };

  const commentMenuItems = (comment, canDelete) =>
    canDelete
      ? [
          {
            danger: true,
            icon: <DeleteOutlined />,
            key: "delete",
            label: "Xóa",
            onClick: () => onDeleteComment?.(post, comment),
          },
        ]
      : isOwnAuthor(comment.author)
      ? []
      : [
          {
            icon: <EyeInvisibleOutlined />,
            key: "hide",
            label: "Ẩn bình luận",
            onClick: () => hideComment(comment._id),
          },
          {
            icon: <FlagOutlined />,
            key: "report",
            label: "Báo cáo bình luận",
            onClick: () => reportComment(comment),
          },
        ];

  const renderCommentMenu = (comment, canDelete) => {
    const items = commentMenuItems(comment, canDelete);
    if (!items.length) return null;

    return (
      <Dropdown menu={{ items }} placement="bottomRight" trigger={["click"]}>
        <Button
          className="post-dialog-comment-menu"
          icon={<MoreOutlined />}
          shape="circle"
          type="text"
          onClick={(event) => event.stopPropagation()}
        />
      </Dropdown>
    );
  };

  const renderReplyInput = (commentId) =>
    canComment && activeReplyId === commentId ? (
      <Space.Compact className="post-dialog-reply-input">
        <MentionInput
          type="input"
          value={replyDrafts[commentId] || ""}
          onChange={(event) => onReplyChange?.(commentId, event.target.value)}
          onPressEnter={(raw) => onSubmitReply?.(post._id, commentId, raw)}
          placeholder="Trả lời..."
        />
        <Button
          icon={<SendOutlined />}
          onClick={() => onSubmitReply?.(post._id, commentId)}
        />
      </Space.Compact>
    ) : null;

  const renderComment = (comment) => {
    if (isHidden(comment._id)) return null;
    const canDelete = Boolean(canDeleteComment?.(post, comment));

    return (
      <div className="post-dialog-comment-thread" key={comment._id}>
        <div
          id={`comment-${comment._id}`}
          className={`post-dialog-comment-row ${
            highlightedCommentId === comment._id ? "comment-item-highlight" : ""
          }`}
        >
          <Avatar
            size={36}
            src={getMediaUrl(comment.author?.avatar)}
            icon={<UserOutlined />}
            onClick={() => onAuthorClick?.(comment.author?._id)}
          >
            {getInitials(comment.author?.name)}
          </Avatar>
          <div className="post-dialog-comment-main">
            <div className="post-dialog-bubble-row">
              <div className="post-dialog-bubble">
                <strong>{comment.author?.name || comment.author?.email}</strong>
                <Typography.Paragraph className="mb-0">
                  {renderMentionContent(comment.content)}
                </Typography.Paragraph>
              </div>
              {renderCommentMenu(comment, canDelete)}
            </div>
            <div className="post-dialog-comment-actions">
              {canComment ? (
                <button type="button" onClick={() => setActiveReplyId(comment._id)}>
                  Trả lời
                </button>
              ) : null}
            </div>
            {renderReplyInput(comment._id)}
          </div>
        </div>

        {(comment.replies || []).map((reply) => {
          if (isHidden(reply._id)) return null;
          const canDeleteReply = Boolean(canDeleteComment?.(post, reply));
          return (
            <div
              id={`comment-${reply._id}`}
              className={`post-dialog-comment-row reply ${
                highlightedCommentId === reply._id ? "comment-item-highlight" : ""
              }`}
              key={reply._id}
            >
              <Avatar
                size={30}
                src={getMediaUrl(reply.author?.avatar)}
                icon={<UserOutlined />}
                onClick={() => onAuthorClick?.(reply.author?._id)}
              >
                {getInitials(reply.author?.name)}
              </Avatar>
              <div className="post-dialog-bubble-row">
                <div className="post-dialog-bubble">
                  <strong>{reply.author?.name || reply.author?.email}</strong>
                  <Typography.Paragraph className="mb-0">
                    {renderMentionContent(reply.content)}
                  </Typography.Paragraph>
                </div>
                {renderCommentMenu(reply, canDeleteReply)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Modal
      className="post-comments-modal"
      footer={null}
      open={open}
      title={<div className="post-comments-title">Bài viết của {titleName}</div>}
      onCancel={onClose}
      width={880}
    >
      {post ? (
        <div className="post-dialog">
          <div className="post-dialog-scroll">
            <div className="post-dialog-author">
              <Avatar
                size={44}
                src={getMediaUrl(post.author?.avatar)}
                icon={<UserOutlined />}
                onClick={() => onAuthorClick?.(post.author?._id)}
              >
                {getInitials(post.author?.name)}
              </Avatar>
              <div>
                <strong>{post.author?.name || post.author?.email}</strong>
                <span>{post.createdAt ? new Date(post.createdAt).toLocaleString("vi-VN") : ""}</span>
              </div>
            </div>

            {post.content ? (
              <Typography.Paragraph className="post-dialog-content">
                {renderMentionContent(post.content)}
              </Typography.Paragraph>
            ) : null}

            {/* Render shared post if exists */}
            {post.sharedPost ? (
              <div className="border border-gray-200 rounded-lg p-3 mb-3 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar
                    size={24}
                    src={getMediaUrl(post.sharedPost.author?.avatar)}
                    icon={<UserOutlined />}
                  >
                    {post.sharedPost.author?.name?.[0] || "U"}
                  </Avatar>
                  <span className="font-semibold text-sm">
                    {post.sharedPost.author?.name}
                  </span>
                </div>
                <Typography.Paragraph className="mb-2">
                  {renderMentionContent(post.sharedPost.content)}
                </Typography.Paragraph>
              </div>
            ) : null}

            {media.length ? (
              <Image.PreviewGroup>
                <div className="post-dialog-media-grid">
                  {media.map((item, index) => {
                    const src = getMediaUrl(item.url);
                    return item.type === "video" ? (
                      <video
                        className="post-dialog-media"
                        controls
                        key={`${src}-${index}`}
                        src={src}
                      />
                    ) : (
                      <Image
                        alt={item.originalName || "post media"}
                        className="post-dialog-media"
                        key={`${src}-${index}`}
                        src={src}
                      />
                    );
                  })}
                </div>
              </Image.PreviewGroup>
            ) : null}

            <div className="post-dialog-stats">
              <ReactionSummary post={post} />
              <span>
                {post.stats?.comments || 0} bình luận · {post.stats?.shares || 0} lượt chia sẻ
              </span>
            </div>

            <div className="post-dialog-actions">
              {onReact ? (
                <Button
                  type="text"
                  icon={post.myReaction ? <LikeFilled /> : <LikeOutlined />}
                  onClick={() => onReact(post)}
                >
                  Thích
                </Button>
              ) : null}
              <Button type="text" icon={<CommentOutlined />}>
                Bình luận
              </Button>
              {onShare ? (
                <Button
                  type="text"
                  icon={<RetweetOutlined />}
                  disabled={shareDisabled}
                  onClick={() => onShare(post)}
                >
                  Chia sẻ
                </Button>
              ) : null}
            </div>

            <div className="post-dialog-comments">
              {comments.length ? comments.map(renderComment) : <Empty description="Chưa có bình luận" />}
            </div>
          </div>

          {canComment ? (
            <div className="post-dialog-composer">
              <Avatar
                size={38}
                src={getMediaUrl(currentUser?.avatar)}
                icon={<UserOutlined />}
              >
                {getInitials(currentUser?.name)}
              </Avatar>
              <Space.Compact className="post-dialog-comment-input">
                <MentionInput
                  type="input"
                  value={commentValue}
                  onChange={(event) => onCommentChange?.(event.target.value)}
                  onPressEnter={(raw) => onSubmitComment?.(post._id, raw)}
                  placeholder="Viết bình luận..."
                />
                <Button
                  icon={<SendOutlined />}
                  onClick={() => onSubmitComment?.(post._id)}
                />
              </Space.Compact>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
};

export default PostCommentsModal;



