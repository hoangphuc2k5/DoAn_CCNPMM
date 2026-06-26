const mongoose = require("mongoose");
const Block = require("../models/block");
const Comment = require("../models/comment");
const Follow = require("../models/follow");
const Friendship = require("../models/friendship");
const HiddenItem = require("../models/hiddenItem");
const Notification = require("../models/notification");
const Post = require("../models/post");
const Reaction = require("../models/reaction");
const Report = require("../models/report");
const Group = require("../models/group");
const User = require("../models/user");
const { createNotification } = require("./notificationService");
const { processPostMediaFiles, removeStoredMediaFiles } = require("./mediaService");

const toObjectId = (id) => new mongoose.Types.ObjectId(id);
const idOf = (value) => String(value?._id || value);
const isSameId = (a, b) => idOf(a) === idOf(b);

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractHashtags = (content = "") => {
  const matches = content.match(/#[A-Za-z0-9_]+/g) || [];
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
};

const extractMentionKeys = (content = "") => {
  const keys = [];
  
  // 1. Match markdown mentions: @[Name](emailPrefix)
  const matchesMarkdown = [...content.matchAll(/@\[([^\]]+)\]\(([^)]+)\)/g)];
  matchesMarkdown.forEach((match) => {
    if (match[2]) {
      keys.push(match[2].toLowerCase());
    }
  });

  // 2. Match legacy mentions: @username
  const matchesLegacy = content.match(/@[A-Za-z0-9_.-]+/g) || [];
  matchesLegacy.forEach((item) => {
    const key = item.slice(1).toLowerCase();
    keys.push(key);
  });

  return [...new Set(keys)];
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

const isGroupMember = (group, userId) =>
  group.members?.some((memberId) => isSameId(memberId, userId));

const isGroupAdmin = (group, userId) =>
  isSameId(group.createdBy, userId) ||
  group.admins?.some((adminId) => isSameId(adminId, userId));

const isGroupModerator = (group, userId) =>
  group.moderators?.some((moderatorId) => isSameId(moderatorId, userId));

const canModerateGroup = (group, userId) =>
  isGroupAdmin(group, userId) || isGroupModerator(group, userId);

const getPostGroup = async (post) => {
  if (!post?.group) return null;
  return Group.findById(post.group);
};

const canInteractWithPost = async (post, userId) => {
  const group = await getPostGroup(post);
  if (!group) return { allowed: true, group: null };
  return { allowed: isGroupMember(group, userId), group };
};

const canViewPost = async (post, userId) => {
  const group = await getPostGroup(post);
  if (!group) return { allowed: true, group: null };
  if (group.privacy === "private" && !isGroupMember(group, userId)) {
    return { allowed: false, group };
  }
  if (post.visibility === "group" && !isGroupMember(group, userId)) {
    return { allowed: false, group };
  }
  if (post.approvalStatus && post.approvalStatus !== "published") {
    return { allowed: false, group };
  }
  return { allowed: true, group };
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
  const hiddenCommentIds = (await getHiddenItemIds(currentUserId, "comment")).map(String);
  const comments = await Comment.find({ post: { $in: postIds }, deletedAt: null })
    .sort({ createdAt: 1 })
    .populate("author", "name email avatar")
    .lean();
  const reactions = await Reaction.find({ post: { $in: postIds } }).lean();

  return posts.map((post) => {
    const postObject = post.toObject ? post.toObject() : post;
    const postComments = comments.filter(
      (comment) =>
        String(comment.post) === String(post._id) &&
        !hiddenCommentIds.includes(String(comment._id)),
    );
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

    const authorId = post.author?._id || post.author;
    const isOwner = currentUserId ? String(authorId) === String(currentUserId) : false;

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
      id: post._id,
      privacy: post.visibility || "public",
      likeCount: post.stats?.reactions || 0,
      commentCount: post.stats?.comments || 0,
      shareCount: post.stats?.shares || 0,
      isLiked: Boolean(myReaction),
      isOwner: isOwner,
      isPinned: post.isPinned || false,
    };
  });
};

const getFriendUserIds = async (userId) => {
  const friendships = await Friendship.find({
    status: "accepted",
    $or: [{ requester: userId }, { recipient: userId }],
  }).select("requester recipient");

  const friendIds = new Set();
  friendships.forEach((item) => {
    const reqId = String(item.requester);
    const recId = String(item.recipient);
    if (reqId !== String(userId)) friendIds.add(reqId);
    if (recId !== String(userId)) friendIds.add(recId);
  });
  return [...friendIds];
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

const getHiddenItemIds = async (userId, targetType) =>
  HiddenItem.find({ user: userId, targetType }).distinct("targetId");

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
    hashtags: extractHashtags(content),
    media: payload.media || [],
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
  const friendUserIds = await getFriendUserIds(userId);
  const blockedUserIds = await getBlockedUserIds(userId);
  const hiddenPostIds = await getHiddenItemIds(userId, "post");

  const filter = {
    _id: { $nin: hiddenPostIds },
    author: { $nin: blockedUserIds.map(toObjectId) },
    $or: [
      { visibility: "public" },
      { visibility: "friends", author: { $in: friendUserIds.map(toObjectId) } },
      { author: userId }
    ],
    group: null,
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
  const hiddenPostIds = await getHiddenItemIds(userId, "post");
  const post = await Post.findOne({
    _id: { $nin: hiddenPostIds, $eq: postId },
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

  const access = await canViewPost(post, userId);
  if (!access.allowed) {
    return { EC: 2, EM: "Ban can tham gia nhom de xem bai viet" };
  }

  const [data] = await decoratePosts([post], userId);
  return { EC: 0, data };
};

const reactPost = async (userId, postId, type = "like") => {
  const reactionType = type || "like";
  const post = await Post.findById(postId);
  if (!post) return { EC: 1, EM: "Không tìm thấy bài viết" };
  if (await hasBlockBetween(userId, post.author)) return { EC: 2, EM: "Không thể tương tác" };

  const access = await canInteractWithPost(post, userId);
  if (!access.allowed) return { EC: 3, EM: "Ban can la thanh vien nhom de tuong tac" };

  const existing = await Reaction.findOne({ post: postId, user: userId });
  if (existing && existing.type === reactionType) {
    await existing.deleteOne();
    await Post.findByIdAndUpdate(postId, { $inc: { "stats.reactions": -1 } });
    return { EC: 0, EM: "Đã bỏ reaction", data: null };
  }

  if (existing) {
    existing.type = reactionType;
    await existing.save();
  } else {
    await Reaction.create({ post: postId, user: userId, type: reactionType });
    await Post.findByIdAndUpdate(postId, { $inc: { "stats.reactions": 1 } });
  }

  await createNotification({
    recipient: post.author,
    actor: userId,
    type: "post_reaction",
    post: postId,
    metadata: { reaction: reactionType },
  });

  return { EC: 0, EM: "Đã reaction", data: { type: reactionType } };
};

const commentPost = async (userId, postId, content, parentComment = null) => {
  const post = await Post.findById(postId);
  if (!post) return { EC: 1, EM: "Không tìm thấy bài viết" };
  if (await hasBlockBetween(userId, post.author)) return { EC: 2, EM: "Không thể bình luận" };
  const access = await canInteractWithPost(post, userId);
  if (!access.allowed) return { EC: 4, EM: "Ban can la thanh vien nhom de binh luan" };

  const trimmed = content?.trim();
  if (!trimmed) return { EC: 3, EM: "Nội dung bình luận không được rỗng" };

  if (parentComment) {
    const parent = await Comment.findOne({
      _id: parentComment,
      post: postId,
      parentComment: null,
      deletedAt: null,
    });
    if (!parent) return { EC: 5, EM: "Khong tim thay binh luan can tra loi" };
  }

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

const deleteComment = async (userId, commentId) => {
  const comment = await Comment.findById(commentId);
  if (!comment || comment.deletedAt) return { EC: 1, EM: "Khong tim thay binh luan" };

  const post = await Post.findById(comment.post);
  if (!post) return { EC: 2, EM: "Khong tim thay bai viet" };

  const group = await getPostGroup(post);
  const canDelete =
    isSameId(comment.author, userId) ||
    isSameId(post.author, userId) ||
    (group && canModerateGroup(group, userId));

  if (!canDelete) return { EC: 3, EM: "Ban khong co quyen xoa binh luan nay" };

  const deleteFilter = {
    deletedAt: null,
    $or: [{ _id: comment._id }, { parentComment: comment._id }],
  };
  const deletedCount = await Comment.countDocuments(deleteFilter);
  await Comment.updateMany(deleteFilter, { deletedAt: new Date() });
  await Post.findByIdAndUpdate(post._id, {
    $inc: { "stats.comments": -deletedCount },
  });

  return { EC: 0, EM: "Da xoa binh luan", data: { deletedCount } };
};

const deletePost = async (userId, postId) => {
  const post = await Post.findById(postId);
  if (!post) return { EC: 1, EM: "Khong tim thay bai viet" };

  const group = await getPostGroup(post);
  const canDelete = isSameId(post.author, userId) || (group && canModerateGroup(group, userId));
  if (!canDelete) return { EC: 2, EM: "Ban khong co quyen xoa bai viet nay" };

  await Promise.all([
    Comment.updateMany({ post: postId, deletedAt: null }, { deletedAt: new Date() }),
    Reaction.deleteMany({ post: postId }),
    Post.deleteOne({ _id: postId }),
    removeStoredMediaFiles(post.media),
  ]);

  return { EC: 0, EM: "Da xoa bai viet" };
};

const hideTarget = async ({ userId, targetType, targetId }) => {
  if (!["post", "comment"].includes(targetType)) {
    return { EC: 1, EM: "Loai noi dung khong hop le" };
  }

  if (targetType === "post") {
    const post = await Post.findById(targetId);
    if (!post) return { EC: 2, EM: "Khong tim thay bai viet" };
    if (isSameId(post.author, userId)) return { EC: 3, EM: "Khong the an bai viet cua minh" };

    const access = await canViewPost(post, userId);
    if (!access.allowed) return { EC: 4, EM: "Ban khong co quyen xem bai viet nay" };
  }

  if (targetType === "comment") {
    const comment = await Comment.findById(targetId);
    if (!comment || comment.deletedAt) return { EC: 5, EM: "Khong tim thay binh luan" };
    if (isSameId(comment.author, userId)) {
      return { EC: 6, EM: "Khong the an binh luan cua minh" };
    }

    const post = await Post.findById(comment.post);
    if (!post) return { EC: 7, EM: "Khong tim thay bai viet" };
    const access = await canViewPost(post, userId);
    if (!access.allowed) return { EC: 8, EM: "Ban khong co quyen xem binh luan nay" };
  }

  const hiddenItem = await HiddenItem.findOneAndUpdate(
    { user: userId, targetType, targetId },
    { user: userId, targetType, targetId },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return { EC: 0, EM: "Da an noi dung", data: hiddenItem };
};

const updatePost = async (userId, postId, payload = {}) => {
  const post = await Post.findById(postId);
  if (!post) return { EC: 1, EM: "Khong tim thay bai viet" };
  if (!isSameId(post.author, userId)) return { EC: 2, EM: "Chi tac gia moi duoc chinh sua bai viet" };

  const content = payload.content?.trim() || "";
  if (!content && !post.media?.length) {
    return { EC: 3, EM: "Bai viet can co noi dung hoac tep dinh kem" };
  }

  const update = {
    content,
    hashtags: extractHashtags(content),
  };

  if (payload.visibility && ["public", "group"].includes(payload.visibility)) {
    const group = await getPostGroup(post);
    if (group?.privacy === "private" && payload.visibility === "public") {
      return { EC: 4, EM: "Nhom rieng tu khong the dat bai cong khai" };
    }
    update.visibility = payload.visibility;
  }

  const mentionedUsers = await findMentionedUsers(content);
  update.mentions = mentionedUsers.map((user) => user._id);

  await Post.findByIdAndUpdate(postId, update);
  const updatedPost = await Post.findById(postId)
    .populate("author", "name email avatar")
    .populate({
      path: "sharedPost",
      populate: { path: "author", select: "name email avatar" },
    });
  const [data] = await decoratePosts([updatedPost], userId);
  return { EC: 0, EM: "Da cap nhat bai viet", data };
};

const sharePost = async (userId, postId, content = "") => {
  const sourcePost = await Post.findById(postId);
  if (!sourcePost) return { EC: 1, EM: "Không tìm thấy bài viết" };
  if (await hasBlockBetween(userId, sourcePost.author)) return { EC: 2, EM: "Không thể chia sẻ" };

  const access = await canInteractWithPost(sourcePost, userId);
  if (!access.allowed) return { EC: 3, EM: "Ban can la thanh vien nhom de chia se" };
  if (access.group?.privacy === "private") {
    return { EC: 4, EM: "Khong the chia se bai viet trong nhom rieng tu" };
  }
  if (sourcePost.visibility === "group") {
    return { EC: 5, EM: "Khong the chia se bai viet chi hien thi trong nhom" };
  }

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

const unfriend = async (userId, targetUserId) => {
  await Friendship.deleteOne({
    $or: [
      { requester: userId, recipient: targetUserId },
      { requester: targetUserId, recipient: userId },
    ],
  });
  await Follow.deleteMany({
    $or: [
      { follower: userId, following: targetUserId },
      { follower: targetUserId, following: userId },
    ],
  });
  return { EC: 0, EM: "Đã hủy kết bạn thành công" };
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
  if (targetType === "user" && isSameId(reporter, targetId)) {
    return { EC: 2, EM: "Khong the tu to cao chinh minh" };
  }

  if (targetType === "post") {
    const post = await Post.findById(targetId).select("author");
    if (!post) return { EC: 3, EM: "Khong tim thay bai viet" };
    if (isSameId(post.author, reporter)) {
      return { EC: 4, EM: "Khong the tu to cao bai viet cua minh" };
    }
  }

  if (targetType === "comment") {
    const comment = await Comment.findById(targetId).select("author deletedAt");
    if (!comment || comment.deletedAt) return { EC: 5, EM: "Khong tim thay binh luan" };
    if (isSameId(comment.author, reporter)) {
      return { EC: 6, EM: "Khong the tu to cao binh luan cua minh" };
    }
  }

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

const updatePost = async (userId, postId, payload) => {
  const post = await Post.findOne({ _id: postId, author: userId });
  if (!post) return { EC: 1, EM: "Không tìm thấy bài viết hoặc bạn không phải là tác giả" };

  const content = payload.content?.trim();
  if (content !== undefined) {
    if (!content) return { EC: 2, EM: "Nội dung bài viết không được rỗng" };
    post.content = content;
    post.hashtags = extractHashtags(content);
    // Find mentioned users
    const mentionedUsers = await findMentionedUsers(content);
    post.mentions = mentionedUsers.map((user) => user._id);
  }

  if (payload.visibility !== undefined) {
    post.visibility = payload.visibility;
  }

  if (payload.media !== undefined) {
    post.media = payload.media;
  }

  await post.save();
  const populatedPost = await Post.findById(post._id)
    .populate("author", "name email avatar")
    .populate("mentions", "name email");

  const [decorated] = await decoratePosts([populatedPost], userId);

  return { EC: 0, EM: "Cập nhật bài viết thành công", data: decorated };
};

const deletePost = async (userId, postId) => {
  const post = await Post.findOne({ _id: postId, author: userId });
  if (!post) return { EC: 1, EM: "Không tìm thấy bài viết hoặc bạn không phải là tác giả" };

  await post.deleteOne();
  await Comment.deleteMany({ post: postId });
  await Reaction.deleteMany({ post: postId });

  return { EC: 0, EM: "Xóa bài viết thành công" };
};

const pinPost = async (userId, postId) => {
  const post = await Post.findOne({ _id: postId, author: userId });
  if (!post) return { EC: 1, EM: "Không tìm thấy bài viết hoặc bạn không phải là tác giả" };

  const newPinState = !post.isPinned;

  if (newPinState) {
    // Unpin all other posts of this user
    await Post.updateMany({ author: userId, isPinned: true }, { isPinned: false });
  }

  post.isPinned = newPinState;
  await post.save();

  return { EC: 0, EM: newPinState ? "Đã ghim bài viết" : "Đã bỏ ghim bài viết", data: post };
};

module.exports = {
  blockUser,
  commentPost,
  createPost,
  decoratePosts,
  deleteComment,
  deletePost,
  followUser,
  getFeed,
  getHiddenItemIds,
  getNotifications,
  getPostById,
  getRelationships,
  getTrendingTopics,
  hideTarget,
  markAllNotificationsRead,
  markNotificationRead,
  reactPost,
  reportTarget,
  respondFriendRequest,
  sendFriendRequest,
  sharePost,
  unblockUser,
  unfollowUser,
  updatePost,
  deletePost,
  pinPost,
  unfriend,
};
