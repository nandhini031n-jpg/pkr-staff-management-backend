const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    name: { 
      type: String, 
      required: true 
    },
    email: { 
      type: String, 
      required: true 
    },
    mobile: { 
      type: String, 
      required: true 
    },
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
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    requestDate: { 
      type: String, 
      default: () => new Date().toISOString().split('T')[0] 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Request', RequestSchema);