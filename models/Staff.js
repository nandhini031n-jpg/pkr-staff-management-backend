const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    staffId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    designation: {
      type: String,
      default: "",
    },

    department: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
      trim: true,
    },

    phone: {
      type: String,
      default: "",
    },

    gender: {
      type: String,
      default: "",
    },

    dateOfBirth: {
      type: String,
      default: "",
    },

    dateOfJoining: {
      type: String,
      default: "",
    },

    qualification: {
      type: String,
      default: "",
    },

    specialization: {
      type: String,
      default: "",
    },

    profileImage: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    address: {
      type: String,
      default: "",
    },

    profile: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Staff ||
  mongoose.model("Staff", staffSchema);