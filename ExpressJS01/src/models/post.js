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
      enum: ["public", "friends"],
      default: "public",
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
