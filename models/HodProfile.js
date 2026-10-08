// models/HodProfile.js
const mongoose = require('mongoose');

const hodProfileSchema = new mongoose.Schema(
  {
    // login email of the HOD who owns / created this profile
    ownerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    isOwn: { type: Boolean, default: false },

    name: { type: String, default: '' },
    email: { type: String, default: '' },
    mobile: { type: String, default: '' },
    department: { type: String, default: '' },
    dateOfBirth: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.HodProfile || mongoose.model('HodProfile', hodProfileSchema);