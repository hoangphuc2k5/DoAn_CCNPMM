const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    content: {
      type: String,
      default: "",
      trim: true,
    },
    visibility: {
      type: String,
      enum: ["public", "friends", "private"],
      enum: ["public", "friends", "group"],
      default: "public",
    },
    approvalStatus: {
      type: String,
      enum: ["published", "pending", "rejected"],
      default: "published",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    hashtags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    sharedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post",
      default: null,
    },
    media: [
      {
        type: String,
      },
    ],
    isPinned: {
      type: Boolean,
      default: false,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "group",
      default: null,
    },
    media: [mongoose.Schema.Types.Mixed],
    stats: {
      reactions: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ group: 1, createdAt: -1 });
postSchema.index({ content: "text", hashtags: "text" });

const Post = mongoose.model("post", postSchema);

module.exports = Post;
