const Block = require("../models/block");
const Notification = require("../models/notification");
const User = require("../models/user");
const emailService = require("./emailService");
const pushService = require("./pushService");
const socketService = require("./socketService");

const notificationText = {
  post_mention: "đã nhắc đến bạn trong một bài viết",
  comment_mention: "đã nhắc đến bạn trong bình luận",
  post_reaction: "đã react bài viết của bạn",
  post_comment: "đã bình luận bài viết của bạn",
  comment_reply: "đã trả lời bình luận của bạn",
  post_share: "đã chia sẻ bài viết của bạn",
  follow: "đã theo dõi bạn",
  friend_request: "đã gửi lời mời kết bạn",
  friend_accept: "đã chấp nhận lời mời kết bạn",
  new_message: "đã gửi tin nhắn mới",
  report_received: "có báo cáo mới",
};

const hasBlockBetween = async (userA, userB) => {
  if (!userA || !userB || String(userA) === String(userB)) return false;
  const block = await Block.findOne({
    $or: [
      { blocker: userA, blocked: userB },
      { blocker: userB, blocked: userA },
    ],
  });
  return Boolean(block);
};

const buildTarget = ({ type, post, comment, actor, metadata = {} }) => {
  if (metadata.targetUrl) return metadata.targetUrl;

  if (type === "new_message" && metadata.conversationId) {
    return `/chat?conversationId=${metadata.conversationId}&messageId=${metadata.messageId || ""}`;
  }

  if (post) {
    const params = new URLSearchParams({ postId: String(post) });
    if (comment) params.set("commentId", String(comment));
    return `/?${params.toString()}`;
  }

  if (["follow", "friend_request", "friend_accept"].includes(type) && actor) {
    return `/profile/${actor}`;
  }

  return "/";
};

const populateNotification = (query) =>
  query
    .populate("actor", "name email avatar")
    .populate("post", "content")
    .populate("comment", "content");

const getNotificationSummary = (notification) => {
  const actorName = notification.actor?.name || "Hệ thống";
  return `${actorName} ${notificationText[notification.type] || notification.type}`;
};

const createNotification = async ({ recipient, actor, type, post, comment, metadata = {} }) => {
  if (!recipient || (actor && String(recipient) === String(actor))) return null;
  if (actor && (await hasBlockBetween(recipient, actor))) return null;

  const enrichedMetadata = {
    ...metadata,
    targetUrl: buildTarget({ type, post, comment, actor, metadata }),
  };

  const created = await Notification.create({
    recipient,
    actor: actor || null,
    type,
    post: post || null,
    comment: comment || null,
    metadata: enrichedMetadata,
  });

  const notification = await populateNotification(Notification.findById(created._id));
  const unread = await Notification.countDocuments({ recipient, readAt: null });

  socketService.emitNotification(recipient, {
    notification,
    unread,
  });

  const recipientUser = await User.findById(recipient).select("email name");
  const title = "Tegram notification";
  const body = getNotificationSummary(notification);

  await Promise.allSettled([
    emailService.sendEmail({
      to: recipientUser?.email,
      subject: title,
      text: `${body}\n\nMở: ${enrichedMetadata.targetUrl}`,
    }),
    pushService.sendPushToUser(recipient, {
      title,
      body,
      url: enrichedMetadata.targetUrl,
      notificationId: String(notification._id),
    }),
  ]);

  return notification;
};

module.exports = {
  createNotification,
};
