const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    targetType: {
      type: String,
      enum: ["post", "user", "comment"],
      required: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["open", "reviewing", "resolved", "rejected"],
      default: "open",
    },
  },
  { timestamps: true },
);

reportSchema.index({ reporter: 1, targetType: 1, targetId: 1 });

const Report = mongoose.model("report", reportSchema);

module.exports = Report;
