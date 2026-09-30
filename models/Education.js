const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    fileName: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    fileType: { type: String, default: "" },
    fileSize: { type: Number, default: 0 }
  },
  { _id: true }
);

const educationSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      unique: true
    },
    records: { type: [mongoose.Schema.Types.Mixed], default: [] },
    documents: { type: [documentSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Education", educationSchema);