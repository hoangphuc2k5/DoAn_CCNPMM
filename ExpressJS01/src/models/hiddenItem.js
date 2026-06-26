const mongoose = require("mongoose");

const hiddenItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    targetType: {
      type: String,
      enum: ["post", "comment"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true },
);

hiddenItemSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });

const HiddenItem = mongoose.model("hiddenItem", hiddenItemSchema);

module.exports = HiddenItem;
