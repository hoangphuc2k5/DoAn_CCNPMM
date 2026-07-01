const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    type: {
      type: String,
      enum: [
        "post_mention",
        "comment_mention",
        "post_reaction",
        "post_comment",
        "comment_reply",
        "post_share",
        "follow",
        "friend_request",
        "friend_accept",
        "new_message",
        "report_received",
      ],
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post",
      default: null,
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      default: null,
    },
    metadata: {
      type: Object,
      default: {},
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model("notification", notificationSchema);

module.exports = Notification;
