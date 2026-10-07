// models/StaffDocument.js
const mongoose = require('mongoose');

const staffDocumentSchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    // 'education', 'course', 'research' or 'pub_<id>' / 'pub_topic<name>'
    section: { type: String, default: 'education' },
    box: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    mimeType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 },

    // Old small documents are stored directly in fileData.
    // New documents (up to 50 MB) are stored in GridFS and referenced by fileId.
    fileData: { type: Buffer, select: false },
    fileId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

// ---- remove GridFS files automatically when documents are deleted ----------
async function removeGridFiles(docs) {
  if (!docs || !docs.length) return;
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'docfiles',
  });
  for (const d of docs) {
    if (d.fileId) {
      try {
        await bucket.delete(d.fileId);
      } catch (_) {}
    }
  }
}

staffDocumentSchema.pre('deleteMany', async function () {
  const docs = await this.model.find(this.getFilter()).select('fileId');
  await removeGridFiles(docs);
});

staffDocumentSchema.pre('findOneAndDelete', async function () {
  const docs = await this.model.find(this.getFilter()).select('fileId');
  await removeGridFiles(docs);
});

module.exports =
  mongoose.models.StaffDocument || mongoose.model('StaffDocument', staffDocumentSchema);