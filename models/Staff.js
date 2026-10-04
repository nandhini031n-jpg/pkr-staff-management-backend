// models/Staff.js
const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    staffName: { type: String, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    mobile: { type: String, required: true },
    department: { type: String, required: true },
    staffId: { type: String, default: '' },
    designation: { type: String, default: 'Assistant Professor' },
    courses: { type: String, default: '' },
    qualification: { type: String, default: '' },
    dateOfBirth: { type: String, default: '' },
    yearsOfExperience: { type: String, default: '' },
    specialization: { type: String, default: '' },
    otherDetails: { type: String, default: '' },
    contactAddress: { type: String, default: '' },
    landline: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    educationList: { type: Array, default: [] },
    educationDocuments: { type: Array, default: [] },
    researchData: { type: Object, default: {} },
    researchDocuments: { type: Array, default: [] },
    researchLinks: { type: Array, default: [] },
    requestDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Staff || mongoose.model('Staff', staffSchema);