const mongoose = require("mongoose");
const Block = require("../models/block");
const Post = require("../models/post");
const User = require("../models/user");
const Group = require("../models/group");

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const escapeRegex = (string) => {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
};

const getBlockedUserIds = async (userId) => {
  const blocks = await Block.find({
    $or: [{ blocker: userId }, { blocked: userId }],
  });
  return blocks.map((item) =>
    String(item.blocker) === String(userId) ? String(item.blocked) : String(item.blocker),
  );
};

const search = async (userId, keyword = "") => {
  const q = keyword.trim();
  if (!q) {
    return {
      EC: 0,
      data: { posts: [], users: [], groups: [], hashtags: [] },
    };
  }

  const blockedUserIds = await getBlockedUserIds(userId);
  const normalized = q.replace(/^#/, "").replace(/^@/, "");
  const pattern = new RegExp(escapeRegex(normalized), "i");

  const [posts, users, groups, hashtagsAggregate] = await Promise.all([
    // 1. Search posts
    Post.find({
      author: { $nin: blockedUserIds.map(toObjectId) },
      $or: [
        { content: pattern },
        { hashtags: pattern },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("author", "name email avatar"),

    // 2. Search users
    User.find({
      _id: { $nin: [...blockedUserIds, String(userId)].map(toObjectId) },
      $or: [{ name: pattern }, { email: pattern }],
    })
      .select("-password")
      .limit(10),

    // 3. Search groups
    Group.find({
      $or: [{ name: pattern }, { description: pattern }],
    })
      .limit(10),

    // 4. Search hashtags
    Post.aggregate([
      { $unwind: "$hashtags" },
      { $match: { hashtags: pattern } },
      { $group: { _id: "$hashtags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const hashtags = hashtagsAggregate.map((item) => ({
    name: `#${item._id}`,
    count: item.count,
  }));

  return {
    EC: 0,
    data: {
      posts,
      users,
      groups,
      hashtags,
    },
  };
};

module.exports = {
  search,
};
