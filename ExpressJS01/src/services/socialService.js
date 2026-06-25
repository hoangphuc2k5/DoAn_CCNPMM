const mongoose = require("mongoose");
const Block = require("../models/block");
const Comment = require("../models/comment");
const Follow = require("../models/follow");
const Friendship = require("../models/friendship");
const Notification = require("../models/notification");
const Post = require("../models/post");
const Reaction = require("../models/reaction");
const Report = require("../models/report");
const User = require("../models/user");
const { processPostMediaFiles } = require("./mediaService");

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractHashtags = (content = "") => {
  const matches = content.match(/#[A-Za-z0-9_]+/g) || [];
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
};

const extractMentionKeys = (content = "") => {
  const matches = content.match(/@[A-Za-z0-9_.-]+/g) || [];
  return [...new Set(matches.map((item) => item.slice(1).toLowerCase()))];
};

const findMentionedUsers = async (content) => {
  const keys = extractMentionKeys(content);
  if (!keys.length) return [];

  return User.find({
    $or: keys.flatMap((key) => [
      { email: new RegExp(`^${key}(@|$)`, "i") },
      { name: new RegExp(`^${key}$`, "i") },
    ]),
  }).select("_id name email");
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

const createNotification = async ({ recipient, actor, type, post, comment, metadata = {} }) => {
  if (!recipient || (actor && String(recipient) === String(actor))) return null;
  if (actor && (await hasBlockBetween(recipient, actor))) return null;

  return Notification.create({
    recipient,
    actor,
    type,
    post: post || null,
    comment: comment || null,
    metadata,
  });
};

const notifyMentionedUsers = async ({ users, actor, type, post, comment }) => {
  await Promise.all(
    users.map((user) =>
      createNotification({
        recipient: user._id,
        actor,
        type,
        post,
        comment,
      }),
    ),
  );
};

const decoratePosts = async (posts, currentUserId) => {
  const postIds = posts.map((post) => post._id);
  const comments = await Comment.find({ post: { $in: postIds }, deletedAt: null })
    .sort({ createdAt: 1 })
    .populate("author", "name email avatar")
    .lean();
  const reactions = await Reaction.find({ post: { $in: postIds } }).lean();

  return posts.map((post) => {
    const postObject = post.toObject ? post.toObject() : post;
    const postComments = comments.filter((comment) => String(comment.post) === String(post._id));
    const topComments = postComments
      .filter((comment) => !comment.parentComment)
      .map((comment) => ({
        ...comment,
        replies: postComments.filter(
          (reply) => String(reply.parentComment) === String(comment._id),
        ),
      }));
    const myReaction = reactions.find(
      (reaction) =>
        String(reaction.post) === String(post._id) &&
        String(reaction.user) === String(currentUserId),
    );

    return {
      ...postObject,
      comments: topComments,
      myReaction: myReaction?.type || null,
      reactionTypes: reactions
        .filter((reaction) => String(reaction.post) === String(post._id))
        .reduce((acc, reaction) => {
          acc[reaction.type] = (acc[reaction.type] || 0) + 1;
          return acc;
        }, {}),
    };
  });
};

const getVisibleAuthorIdsForFriendsFeed = async (userId) => {
  const [following, friendships] = await Promise.all([
    Follow.find({ follower: userId }).select("following"),
    Friendship.find({
      status: "accepted",
      $or: [{ requester: userId }, { recipient: userId }],
    }).select("requester recipient"),
  ]);

  const ids = new Set([String(userId)]);
  following.forEach((item) => ids.add(String(item.following)));
  friendships.forEach((item) => {
    ids.add(String(item.requester));
    ids.add(String(item.recipient));
  });

  return [...ids];
};

const getBlockedUserIds = async (userId) => {
  const blocks = await Block.find({
    $or: [{ blocker: userId }, { blocked: userId }],
  });
  return blocks.map((item) =>
    String(item.blocker) === String(userId) ? String(item.blocked) : String(item.blocker),
  );
};

const createPost = async (userId, payload, files = []) => {
  const content = payload.content?.trim() || (files.length ? " " : "");
  if (!content) return { EC: 1, EM: "Nội dung bài viết không được rỗng" };

  const media = await processPostMediaFiles(files, userId);
  const mentionedUsers = await findMentionedUsers(content.trim());
  const post = await Post.create({
    author: userId,
    content: content.trim(),
    visibility: payload.visibility || "public",
    mentions: mentionedUsers.map((user) => user._id),
    hashtags: extractHashtags(content.trim()),
    media,
  });

  await notifyMentionedUsers({
    users: mentionedUsers,
    actor: userId,
    type: "post_mention",
    post: post._id,
  });

  const populatedPost = await Post.findById(post._id)
    .populate("author", "name email avatar")
    .populate("mentions", "name email");
  return { EC: 0, EM: "Tạo bài viết thành công", data: populatedPost };
};

const getFeed = async (userId, query) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 30);
  const mode = query.mode || "latest";
  const blockedUserIds = await getBlockedUserIds(userId);

  const filter = {
    author: { $nin: blockedUserIds.map(toObjectId) },
    $or: [{ visibility: "public" }, { author: userId }],
  };

  if (mode === "friends") {
    const visibleAuthorIds = await getVisibleAuthorIdsForFriendsFeed(userId);
    filter.author = {
      $in: visibleAuthorIds.map(toObjectId),
      $nin: blockedUserIds.map(toObjectId),
    };
  }

  let posts = await Post.find(filter)
    .populate("author", "name email avatar")
    .populate("mentions", "name email")
    .populate({
      path: "sharedPost",
      populate: { path: "author", select: "name email avatar" },
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  if (mode === "algorithm") {
    posts = posts.sort((a, b) => {
      const scoreA =
        a.stats.reactions * 3 +
        a.stats.comments * 4 +
        a.stats.shares * 5 +
        new Date(a.createdAt).getTime() / 100000000;
      const scoreB =
        b.stats.reactions * 3 +
        b.stats.comments * 4 +
        b.stats.shares * 5 +
        new Date(b.createdAt).getTime() / 100000000;
      return scoreB - scoreA;
    });
  }

  const data = await decoratePosts(posts, userId);
  return {
    EC: 0,
    data,
    pagination: {
      page,
      limit,
      hasMore: data.length === limit,
    },
  };
};

const getPostById = async (userId, postId) => {
  const blockedUserIds = await getBlockedUserIds(userId);
  const post = await Post.findOne({
    _id: postId,
    author: { $nin: blockedUserIds.map(toObjectId) },
  })
    .populate("author", "name email avatar")
    .populate("mentions", "name email")
    .populate({
      path: "sharedPost",
      populate: { path: "author", select: "name email avatar" },
    });

  if (!post) {
    return { EC: 1, EM: "Không tìm thấy bài viết" };
  }

  const [data] = await decoratePosts([post], userId);
  return { EC: 0, data };
};

const reactPost = async (userId, postId, type = "like") => {
  const post = await Post.findById(postId);
  if (!post) return { EC: 1, EM: "Không tìm thấy bài viết" };
  if (await hasBlockBetween(userId, post.author)) return { EC: 2, EM: "Không thể tương tác" };

  const existing = await Reaction.findOne({ post: postId, user: userId });
  if (existing && existing.type === type) {
    await existing.deleteOne();
    await Post.findByIdAndUpdate(postId, { $inc: { "stats.reactions": -1 } });
    return { EC: 0, EM: "Đã bỏ reaction", data: null };
  }

  if (existing) {
    existing.type = type;
    await existing.save();
  } else {
    await Reaction.create({ post: postId, user: userId, type });
    await Post.findByIdAndUpdate(postId, { $inc: { "stats.reactions": 1 } });
  }

  await createNotification({
    recipient: post.author,
    actor: userId,
    type: "post_reaction",
    post: postId,
    metadata: { reaction: type },
  });

  return { EC: 0, EM: "Đã reaction", data: { type } };
};

const commentPost = async (userId, postId, content, parentComment = null) => {
  const post = await Post.findById(postId);
  if (!post) return { EC: 1, EM: "Không tìm thấy bài viết" };
  if (await hasBlockBetween(userId, post.author)) return { EC: 2, EM: "Không thể bình luận" };

  const trimmed = content?.trim();
  if (!trimmed) return { EC: 3, EM: "Nội dung bình luận không được rỗng" };

  const mentionedUsers = await findMentionedUsers(trimmed);
  const comment = await Comment.create({
    post: postId,
    author: userId,
    parentComment,
    content: trimmed,
    mentions: mentionedUsers.map((user) => user._id),
  });
  await Post.findByIdAndUpdate(postId, { $inc: { "stats.comments": 1 } });

  if (parentComment) {
    const parent = await Comment.findById(parentComment);
    await createNotification({
      recipient: parent?.author,
      actor: userId,
      type: "comment_reply",
      post: postId,
      comment: comment._id,
    });
  } else {
    await createNotification({
      recipient: post.author,
      actor: userId,
      type: "post_comment",
      post: postId,
      comment: comment._id,
    });
  }

  await notifyMentionedUsers({
    users: mentionedUsers,
    actor: userId,
    type: "comment_mention",
    post: postId,
    comment: comment._id,
  });

  const data = await Comment.findById(comment._id).populate("author", "name email avatar");
  return { EC: 0, EM: "Đã bình luận", data };
};

const sharePost = async (userId, postId, content = "") => {
  const sourcePost = await Post.findById(postId);
  if (!sourcePost) return { EC: 1, EM: "Không tìm thấy bài viết" };
  if (await hasBlockBetween(userId, sourcePost.author)) return { EC: 2, EM: "Không thể chia sẻ" };

  const sharedContent = content?.trim() || "Đã chia sẻ một bài viết";
  const mentionedUsers = await findMentionedUsers(sharedContent);
  const post = await Post.create({
    author: userId,
    content: sharedContent,
    sharedPost: postId,
    mentions: mentionedUsers.map((user) => user._id),
    hashtags: extractHashtags(sharedContent),
  });
  await Post.findByIdAndUpdate(postId, { $inc: { "stats.shares": 1 } });
  await createNotification({
    recipient: sourcePost.author,
    actor: userId,
    type: "post_share",
    post: postId,
  });

  const data = await Post.findById(post._id)
    .populate("author", "name email avatar")
    .populate({
      path: "sharedPost",
      populate: { path: "author", select: "name email avatar" },
    });
  return { EC: 0, EM: "Đã chia sẻ", data };
};

const followUser = async (userId, targetUserId) => {
  if (String(userId) === String(targetUserId)) return { EC: 1, EM: "Không thể theo dõi chính mình" };
  if (await hasBlockBetween(userId, targetUserId)) return { EC: 2, EM: "Không thể theo dõi người dùng này" };

  const follow = await Follow.findOneAndUpdate(
    { follower: userId, following: targetUserId },
    { follower: userId, following: targetUserId },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await createNotification({
    recipient: targetUserId,
    actor: userId,
    type: "follow",
  });
  return { EC: 0, EM: "Đã theo dõi", data: follow };
};

const unfollowUser = async (userId, targetUserId) => {
  await Follow.deleteOne({ follower: userId, following: targetUserId });
  return { EC: 0, EM: "Đã bỏ theo dõi" };
};

const sendFriendRequest = async (userId, targetUserId) => {
  if (String(userId) === String(targetUserId)) return { EC: 1, EM: "Không thể kết bạn với chính mình" };
  if (await hasBlockBetween(userId, targetUserId)) return { EC: 2, EM: "Không thể gửi lời mời" };

  const existing = await Friendship.findOne({
    $or: [
      { requester: userId, recipient: targetUserId },
      { requester: targetUserId, recipient: userId },
    ],
  });
  if (existing) return { EC: 0, EM: "Lời mời kết bạn đã tồn tại", data: existing };

  const friendship = await Friendship.create({
    requester: userId,
    recipient: targetUserId,
  });
  await createNotification({
    recipient: targetUserId,
    actor: userId,
    type: "friend_request",
    metadata: { requestId: friendship._id },
  });
  return { EC: 0, EM: "Đã gửi lời mời kết bạn", data: friendship };
};

const respondFriendRequest = async (userId, requestId, action) => {
  const friendship = await Friendship.findOne({
    _id: requestId,
    recipient: userId,
    status: "pending",
  });
  if (!friendship) return { EC: 1, EM: "Không tìm thấy lời mời" };

  friendship.status = action === "accept" ? "accepted" : "rejected";
  await friendship.save();

  if (friendship.status === "accepted") {
    await createNotification({
      recipient: friendship.requester,
      actor: userId,
      type: "friend_accept",
    });
  }

  return { EC: 0, EM: "Đã xử lý lời mời", data: friendship };
};

const blockUser = async (userId, targetUserId) => {
  if (String(userId) === String(targetUserId)) return { EC: 1, EM: "Không thể chặn chính mình" };
  const block = await Block.findOneAndUpdate(
    { blocker: userId, blocked: targetUserId },
    { blocker: userId, blocked: targetUserId },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await Follow.deleteMany({
    $or: [
      { follower: userId, following: targetUserId },
      { follower: targetUserId, following: userId },
    ],
  });
  await Friendship.deleteMany({
    $or: [
      { requester: userId, recipient: targetUserId },
      { requester: targetUserId, recipient: userId },
    ],
  });
  return { EC: 0, EM: "Đã chặn người dùng", data: block };
};

const unblockUser = async (userId, targetUserId) => {
  await Block.deleteOne({ blocker: userId, blocked: targetUserId });
  return { EC: 0, EM: "Đã bỏ chặn" };
};

const reportTarget = async ({ reporter, targetType, targetId, reason }) => {
  if (!reason?.trim()) return { EC: 1, EM: "Vui lòng nhập lý do báo cáo" };
  const report = await Report.create({
    reporter,
    targetType,
    targetId,
    reason: reason.trim(),
  });
  return { EC: 0, EM: "Đã gửi báo cáo cho quản trị viên", data: report };
};

const getTrendingTopics = async () => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const data = await Post.aggregate([
    { $match: { createdAt: { $gte: since }, hashtags: { $exists: true, $ne: [] } } },
    { $unwind: "$hashtags" },
    { $group: { _id: "$hashtags", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
  return { EC: 0, data: data.map((item) => ({ topic: item._id, count: item.count })) };
};

const getRelationships = async (userId) => {
  const blockedUserIds = await getBlockedUserIds(userId);

  const [friendships, incoming, outgoing, following, followers] = await Promise.all([
    Friendship.find({
      status: "accepted",
      $or: [{ requester: userId }, { recipient: userId }],
    })
      .populate("requester", "name email avatar bio")
      .populate("recipient", "name email avatar bio")
      .sort({ updatedAt: -1 }),
    Friendship.find({ recipient: userId, status: "pending" })
      .populate("requester", "name email avatar bio")
      .sort({ createdAt: -1 }),
    Friendship.find({ requester: userId, status: "pending" })
      .populate("recipient", "name email avatar bio")
      .sort({ createdAt: -1 }),
    Follow.find({ follower: userId })
      .populate("following", "name email avatar bio")
      .sort({ createdAt: -1 }),
    Follow.find({ following: userId })
      .populate("follower", "name email avatar bio")
      .sort({ createdAt: -1 }),
  ]);

  const friends = friendships
    .map((item) => {
      const requesterId = String(item.requester?._id);
      return requesterId === String(userId) ? item.recipient : item.requester;
    })
    .filter((item) => item && !blockedUserIds.includes(String(item._id)));

  const relatedIds = new Set([
    String(userId),
    ...blockedUserIds,
    ...friends.map((item) => String(item._id)),
    ...incoming.map((item) => String(item.requester?._id)),
    ...outgoing.map((item) => String(item.recipient?._id)),
    ...following.map((item) => String(item.following?._id)),
    ...followers.map((item) => String(item.follower?._id)),
  ]);

  const suggestions = await User.find({
    _id: { $nin: [...relatedIds].filter(Boolean).map(toObjectId) },
  })
    .select("name email avatar bio")
    .limit(8);

  return {
    EC: 0,
    data: {
      friends,
      incomingRequests: incoming.map((item) => ({
        _id: item._id,
        user: item.requester,
        createdAt: item.createdAt,
      })),
      outgoingRequests: outgoing.map((item) => ({
        _id: item._id,
        user: item.recipient,
        createdAt: item.createdAt,
      })),
      following: following
        .map((item) => item.following)
        .filter((item) => item && !blockedUserIds.includes(String(item._id))),
      followers: followers
        .map((item) => item.follower)
        .filter((item) => item && !blockedUserIds.includes(String(item._id))),
      suggestions,
    },
  };
};

const getNotifications = async (userId, page = 1, limit = 20) => {
  const data = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("actor", "name email avatar")
    .populate("post", "content")
    .populate("comment", "content");
  const unread = await Notification.countDocuments({ recipient: userId, readAt: null });
  return { EC: 0, data, unread };
};

const markNotificationRead = async (userId, notificationId) => {
  const data = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { readAt: new Date() },
    { new: true },
  );
  return { EC: 0, data };
};

const markAllNotificationsRead = async (userId) => {
  await Notification.updateMany({ recipient: userId, readAt: null }, { readAt: new Date() });
  return { EC: 0, EM: "Đã đánh dấu tất cả thông báo là đã đọc" };
};

module.exports = {
  blockUser,
  commentPost,
  createPost,
  followUser,
  getFeed,
  getNotifications,
  getPostById,
  getRelationships,
  getTrendingTopics,
  markAllNotificationsRead,
  markNotificationRead,
  reactPost,
  reportTarget,
  respondFriendRequest,
  sendFriendRequest,
  sharePost,
  unblockUser,
  unfollowUser,
};
