const mongoose = require("mongoose");

// =====================================================
// EDUCATION DOCUMENT SCHEMA
// =====================================================

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
      trim: true,
    },

    fileName: {
      type: String,
      default: "",
      trim: true,
    },

    fileUrl: {
      type: String,
      default: "",
      trim: true,
    },

    fileType: {
      type: String,
      default: "",
      trim: true,
    },

    fileSize: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: true,
  }
);

// =====================================================
// EDUCATION SCHEMA
// =====================================================

const educationSchema = new mongoose.Schema(
  {
    // -------------------------------------------------
    // CONNECTION TO STAFF
    // One Staff -> Multiple Education records
    // -------------------------------------------------

    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },

    // -------------------------------------------------
    // EDUCATION DETAILS
    // -------------------------------------------------

    qualification: {
      type: String,
      default: "",
      trim: true,
    },

    degree: {
      type: String,
      default: "",
      trim: true,
    },

    university: {
      type: String,
      default: "",
      trim: true,
    },

    yearOfPassing: {
      type: String,
      default: "",
      trim: true,
    },

    percentage: {
      type: String,
      default: "",
      trim: true,
    },

    specialization: {
      type: String,
      default: "",
      trim: true,
    },

    // -------------------------------------------------
    // SUPPORTING DOCUMENTS
    // -------------------------------------------------

    documents: {
      type: [documentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// =====================================================
// MODEL EXPORT
// =====================================================

module.exports =
  mongoose.models.Education ||
  mongoose.model("Education", educationSchema);