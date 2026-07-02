const mongoose = require("mongoose");

const callSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "conversation",
      required: true,
      index: true,
    },
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    callee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
      },
    ],
    type: {
      type: String,
      enum: ["audio", "video"],
      default: "audio",
      required: true,
    },
    status: {
      type: String,
      enum: ["ringing", "active", "ended", "missed", "declined", "canceled"],
      default: "ringing",
      index: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    answeredAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    endedReason: {
      type: String,
      enum: ["completed", "declined", "missed", "canceled", "hangup", "busy", "failed"],
      default: null,
    },
    roomId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const Call = mongoose.model("call", callSchema);

module.exports = Call;
