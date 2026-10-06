// models/StaffDocument.js
const mongoose = require('mongoose');

const staffDocumentSchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    box: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    mimeType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 },
    fileData: { type: Buffer, select: false },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.StaffDocument || mongoose.model('StaffDocument', staffDocumentSchema);