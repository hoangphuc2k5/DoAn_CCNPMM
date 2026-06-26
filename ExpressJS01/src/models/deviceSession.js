const mongoose = require("mongoose");

const deviceSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

deviceSessionSchema.index({ user: 1, createdAt: -1 });
deviceSessionSchema.index({ user: 1, deviceId: 1 }, { unique: true });

module.exports = mongoose.model("device_session", deviceSessionSchema);
