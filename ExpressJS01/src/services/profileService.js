const mongoose = require("mongoose");
const User = require("../models/user");
const Block = require("../models/block");
const Follow = require("../models/follow");
const Friendship = require("../models/friendship");
const Post = require("../models/post");

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

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
    const postsCount = await Post.countDocuments({ author: userId });

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

    let query = { author: userId };

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
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate("author", "name avatar");

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

    let query = { author: userId, media: { $exists: true, $ne: [] } };

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
      post.media.map((url) => ({ url, postId: post._id })),
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
};
