const mongoose = require('mongoose');

// Schema for Staff Registration Requests routed to Department HODs
const RequestSchema = new mongoose.Schema(
  {
    // Reference to the Staff account created in Staff collection
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    // Staff applicant details
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    // Department routing for HOD filter
    department: {
      type: String,
      required: true,
      enum: [
        'COMPUTER SCIENCE',
        'MANAGEMENT',
        'MATHEMATICS',
        'ENGLISH',
        'COMMERCE',
        'PHYSICS',
        'CHEMISTRY',
        'TAMIL',
      ],
    },
    // Approval status managed by HOD (ACCEPT / REJECT)
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    // Registration submission date
    requestDate: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
  },
  {
    timestamps: true, // Automatically creates and updates createdAt & updatedAt
  }
);

module.exports = mongoose.model('Request', RequestSchema);