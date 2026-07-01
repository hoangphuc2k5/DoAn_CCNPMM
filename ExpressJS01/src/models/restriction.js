const mongoose = require("mongoose");

const restrictionSchema = new mongoose.Schema(
  {
    restrictor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    restricted: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true }
);

restrictionSchema.index({ restrictor: 1, restricted: 1 }, { unique: true });

const Restriction = mongoose.model("restriction", restrictionSchema);

module.exports = Restriction;
