const mongoose = require("mongoose");
const User = require("../models/user");
const Block = require("../models/block");
const Follow = require("../models/follow");
const Friendship = require("../models/friendship");
const Post = require("../models/post");

const toObjectId = (id) => new mongoose.Types.ObjectId(id);
const MAX_BIO_CHARS = 500;
const PHONE_REGEX = /^(?:0\d{9,10}|\+84\d{9})$/;

const normalizePhone = (value = "") => String(value).replace(/[\s-]/g, "").trim();

const sanitizeText = (value = "") =>
  String(value)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/[<>]/g, "")
    .trim();

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeMediaItem = (item, postId, createdAt) => {
  if (!item) return null;

  if (typeof item === "string") {
    return {
      url: item,
      type: /\.(mp4|mov|avi|mkv|webm)$/i.test(item) ? "video" : "image",
      postId,
      createdAt,
    };
  }

  return {
    url: item.url,
    type: item.type || (item.mimeType?.startsWith("video/") ? "video" : "image"),
    postId,
    createdAt,
    originalName: item.originalName,
    mimeType: item.mimeType,
    size: item.size,
    originalSize: item.originalSize,
    width: item.width,
    height: item.height,
    storageProvider: item.storageProvider,
  };
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

const getFullProfileService = async (userId, currentUserId) => {
  try {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return { EC: 1, EM: "Người dùng không tồn tại" };
    }

    // Check if blocked
    if (currentUserId && String(userId) !== String(currentUserId)) {
      const isBlocked = await hasBlockBetween(userId, currentUserId);
      if (isBlocked) {
        return { EC: 1, EM: "Không thể xem profile này" };
      }
    }

    // Count followers, friends, posts, following
    const followerCount = await Follow.countDocuments({ following: userId });
    const followingCount = await Follow.countDocuments({ follower: userId });
    const friendCount = await Friendship.countDocuments({
      $or: [
        { requester: userId, status: "accepted" },
        { recipient: userId, status: "accepted" },
      ],
    });
    const postsCount = await Post.countDocuments({ author: userId, group: null });

    // Check current user relationship
    let isFollowing = false;
    let isFriend = false;
    let hasPendingRequest = false;
    let hasIncomingRequest = false;

    if (currentUserId && String(userId) !== String(currentUserId)) {
      isFollowing = Boolean(
        await Follow.findOne({ follower: currentUserId, following: userId }),
      );

      const friendshipDoc = await Friendship.findOne({
        $or: [
          { requester: currentUserId, recipient: userId },
          { requester: userId, recipient: currentUserId },
        ],
      });

      if (friendshipDoc) {
        isFriend = friendshipDoc.status === "accepted";
        hasPendingRequest =
          friendshipDoc.status === "pending" &&
          String(friendshipDoc.requester) === String(currentUserId);
        hasIncomingRequest =
          friendshipDoc.status === "pending" &&
          String(friendshipDoc.recipient) === String(currentUserId);
      }
    }

    return {
      EC: 0,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        coverPhoto: user.coverPhoto,
        bio: user.bio,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        phone: user.phone,
        address: user.address,
        followerCount,
        followingCount,
        friendCount,
        postsCount,
        isFollowing,
        isFriend,
        hasPendingRequest,
        hasIncomingRequest,
      },
    };
  } catch (error) {
    console.log(error);
    return { EC: 2, EM: "Có lỗi xảy ra khi lấy profile" };
  }
};

const updateProfileService = async (userId, updateData) => {
  try {
    const allowedFields = [
      "name",
      "phone",
      "address",
      "avatar",
      "coverPhoto",
      "bio",
      "gender",
      "dateOfBirth",
    ];
    const filteredData = {};

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });

    if (filteredData.phone !== undefined) {
      const normalizedPhone = normalizePhone(filteredData.phone);
      if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
        return { EC: 1, EM: "Số điện thoại không đúng định dạng." };
      }
      filteredData.phone = normalizedPhone;
    }

    if (filteredData.bio !== undefined) {
      const safeBio = sanitizeText(filteredData.bio);
      if (safeBio.length > MAX_BIO_CHARS) {
        return { EC: 1, EM: `Tiểu sử chỉ được tối đa ${MAX_BIO_CHARS} ký tự.` };
      }
      filteredData.bio = safeBio;
    }

    if (filteredData.name !== undefined) {
      filteredData.name = sanitizeText(filteredData.name);
    }

    if (filteredData.address !== undefined) {
      filteredData.address = sanitizeText(filteredData.address);
    }

    if (filteredData.avatar !== undefined) {
      filteredData.avatar = sanitizeText(filteredData.avatar);
    }

    if (filteredData.coverPhoto !== undefined) {
      filteredData.coverPhoto = sanitizeText(filteredData.coverPhoto);
    }

    if (filteredData.dateOfBirth !== undefined) {
      const rawDate = String(filteredData.dateOfBirth || "").trim();

      if (!rawDate) {
        filteredData.dateOfBirth = null;
      } else {
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(rawDate)) {
          return { EC: 1, EM: "Ngày sinh không hợp lệ." };
        }

        const [year, month, day] = rawDate.split("-").map(Number);
        const parsedDate = new Date(year, month - 1, day);
        if (
          parsedDate.getFullYear() !== year ||
          parsedDate.getMonth() + 1 !== month ||
          parsedDate.getDate() !== day
        ) {
          return { EC: 1, EM: "Ngày sinh không hợp lệ." };
        }

        if (rawDate > getLocalDateString()) {
          return { EC: 1, EM: "Ngày sinh không được ở trong tương lai." };
        }

        filteredData.dateOfBirth = parsedDate;
      }
    }

    const user = await User.findByIdAndUpdate(userId, filteredData, {
      new: true,
    }).select("-password");

    return {
      EC: 0,
      EM: "Cập nhật profile thành công",
      data: user,
    };
  } catch (error) {
    console.log(error);
    return { EC: 2, EM: "Có lỗi xảy ra khi cập nhật profile" };
  }
};

const uploadAvatarService = async (userId, filePath) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: filePath },
      { new: true },
    ).select("-password");

    return {
      EC: 0,
      EM: "Cập nhật avatar thành công",
      data: { avatar: user.avatar },
    };
  } catch (error) {
    console.log(error);
    return { EC: 2, EM: "Có lỗi xảy ra khi cập nhật avatar" };
  }
};

const uploadCoverService = async (userId, filePath) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { coverPhoto: filePath },
      { new: true },
    ).select("-password");

    return {
      EC: 0,
      EM: "Cập nhật ảnh bìa thành công",
      data: { coverPhoto: user.coverPhoto },
    };
  } catch (error) {
    console.log(error);
    return { EC: 2, EM: "Có lỗi xảy ra khi cập nhật ảnh bìa" };
  }
};

const getUserPostsService = async (
  userId,
  currentUserId,
  cursor,
  limit = 10,
) => {
  try {
    // Check if blocked
    if (currentUserId && String(userId) !== String(currentUserId)) {
      const isBlocked = await hasBlockBetween(userId, currentUserId);
      if (isBlocked) {
        return { EC: 1, EM: "Không thể xem bài viết này" };
      }
    }

    let query = { author: userId, group: null };

    // If viewing someone else's profile, filter by privacy
    if (!currentUserId || String(userId) !== String(currentUserId)) {
      // Check if friend
      const isFriend = await Friendship.findOne({
        $or: [
          { requester: currentUserId, recipient: userId, status: "accepted" },
          { requester: userId, recipient: currentUserId, status: "accepted" },
        ],
      });

      if (isFriend) {
        query.visibility = { $in: ["public", "friends"] };
      } else {
        query.visibility = "public";
      }
    }

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const posts = await Post.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limit + 1)
      .populate("author", "name avatar")
      .populate({
        path: "sharedPost",
        populate: [
          { path: "author", select: "name avatar" },
          { path: "group", select: "name avatar privacy" },
        ],
      });

    const hasNextPage = posts.length > limit;
    const paginatedPosts = posts.slice(0, limit);
    const nextCursor =
      paginatedPosts.length > 0
        ? paginatedPosts[paginatedPosts.length - 1].createdAt
        : null;

    return {
      EC: 0,
      data: {
        posts: paginatedPosts,
        nextCursor,
        hasNextPage,
      },
    };
  } catch (error) {
    console.log(error);
    return { EC: 2, EM: "Có lỗi xảy ra khi lấy bài viết" };
  }
};

const getUserFriendsService = async (userId, limit = 10, skip = 0) => {
  try {
    const friendships = await Friendship.find({
      $or: [
        { requester: userId, status: "accepted" },
        { recipient: userId, status: "accepted" },
      ],
    })
      .populate({
        path: "requester recipient",
        select: "name avatar email",
      })
      .limit(limit)
      .skip(skip);

    const friends = friendships.map((fs) => {
      return String(fs.requester._id) === String(userId)
        ? fs.recipient
        : fs.requester;
    });

    const total = await Friendship.countDocuments({
      $or: [
        { requester: userId, status: "accepted" },
        { recipient: userId, status: "accepted" },
      ],
    });

    return {
      EC: 0,
      data: { friends, total, limit, skip },
    };
  } catch (error) {
    console.log(error);
    return { EC: 2, EM: "Có lỗi xảy ra khi lấy danh sách bạn bè" };
  }
};

const getUserFollowersService = async (userId, limit = 10, skip = 0) => {
  try {
    const followers = await Follow.find({ following: userId })
      .populate("follower", "name avatar email")
      .limit(limit)
      .skip(skip);

    const followerUsers = followers.map((f) => f.follower);
    const total = await Follow.countDocuments({ following: userId });

    return {
      EC: 0,
      data: { followers: followerUsers, total, limit, skip },
    };
  } catch (error) {
    console.log(error);
    return { EC: 2, EM: "Có lỗi xảy ra khi lấy danh sách người theo dõi" };
  }
};

const getUserMediaService = async (
  userId,
  currentUserId,
  cursor,
  limit = 10,
) => {
  try {
    // Check if blocked
    if (currentUserId && String(userId) !== String(currentUserId)) {
      const isBlocked = await hasBlockBetween(userId, currentUserId);
      if (isBlocked) {
        return { EC: 1, EM: "Không thể xem media này" };
      }
    }

    let query = { author: userId, group: null, media: { $exists: true, $ne: [] } };

    if (!currentUserId || String(userId) !== String(currentUserId)) {
      const isFriend = await Friendship.findOne({
        $or: [
          { requester: currentUserId, recipient: userId, status: "accepted" },
          { requester: userId, recipient: currentUserId, status: "accepted" },
        ],
      });

      if (isFriend) {
        query.visibility = { $in: ["public", "friends"] };
      } else {
        query.visibility = "public";
      }
    }

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .select("media createdAt");

    const hasNextPage = posts.length > limit;
    const paginatedPosts = posts.slice(0, limit);
    const nextCursor =
      paginatedPosts.length > 0
        ? paginatedPosts[paginatedPosts.length - 1].createdAt
        : null;

    const media = paginatedPosts.flatMap((post) =>
      post.media
        .map((item) => normalizeMediaItem(item, post._id, post.createdAt))
        .filter(Boolean),
    );

    return {
      EC: 0,
      data: {
        media,
        nextCursor,
        hasNextPage,
      },
    };
  } catch (error) {
    console.log(error);
    return { EC: 2, EM: "Có lỗi xảy ra khi lấy media" };
  }
};
const getUserFollowingService = async (userId, limit = 10, skip = 0) => {
  try {
    const followings = await Follow.find({ follower: userId })
      .populate("following", "name avatar email")
      .limit(limit)
      .skip(skip);

    const followingUsers = followings.map((f) => f.following);
    const total = await Follow.countDocuments({ follower: userId });

    return {
      EC: 0,
      data: { following: followingUsers, total, limit, skip },
    };
  } catch (error) {
    console.log(error);
    return { EC: 2, EM: "Có lỗi xảy ra khi lấy danh sách đang theo dõi" };
  }
};

const getUserMediaAlbumsService = async (userId, currentUserId) => {
  try {
    if (currentUserId && String(userId) !== String(currentUserId)) {
      const isBlocked = await hasBlockBetween(userId, currentUserId);
      if (isBlocked) {
        return { EC: 1, EM: "Khong the xem album media nay" };
      }
    }

    let query = { author: userId, group: null, media: { $exists: true, $ne: [] } };

    if (!currentUserId || String(userId) !== String(currentUserId)) {
      const isFriend = await Friendship.findOne({
        $or: [
          { requester: currentUserId, recipient: userId, status: "accepted" },
          { requester: userId, recipient: currentUserId, status: "accepted" },
        ],
      });

      query.visibility = isFriend ? { $in: ["public", "friends"] } : "public";
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .select("media createdAt");

    const albumsByKey = new Map();

    posts.forEach((post) => {
      const date = new Date(post.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const title = `Thang ${date.getMonth() + 1}/${date.getFullYear()}`;
      const items = post.media
        .map((item) => normalizeMediaItem(item, post._id, post.createdAt))
        .filter(Boolean);

      if (!albumsByKey.has(key)) {
        albumsByKey.set(key, {
          key,
          title,
          count: 0,
          coverUrl: items[0]?.url || "",
          items: [],
        });
      }

      const album = albumsByKey.get(key);
      album.items.push(...items);
      album.count = album.items.length;
      if (!album.coverUrl && items[0]?.url) {
        album.coverUrl = items[0].url;
      }
    });

    return {
      EC: 0,
      data: [...albumsByKey.values()],
    };
  } catch (error) {
    console.log(error);
    return { EC: 2, EM: "Co loi xay ra khi lay album media" };
  }
};

module.exports = {
  getFullProfileService,
  updateProfileService,
  uploadAvatarService,
  uploadCoverService,
  getUserPostsService,
  getUserFriendsService,
  getUserFollowersService,
  getUserFollowingService,
  getUserMediaService,
  getUserMediaAlbumsService,
};
