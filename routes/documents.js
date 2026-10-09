// routes/documents.js
const fs = require('fs');
const os = require('os');
const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const StaffModule = require('../models/Staff');
const Staff = StaffModule.Staff || StaffModule.default || StaffModule;
const StaffDocument = require('../models/StaffDocument');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'pkr_secret_key';

// Maximum size of one uploaded document
const MAX_MB = 50;

// Education section has 5 fixed boxes. All other sections have no fixed boxes.
const EDU_DEFAULT_BOXES = [
  '10th Marksheet',
  '12th Marksheet',
  'UG Marksheet',
  'PG Marksheet',
  'PhD Certificate',
];

const MIME = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function extOf(name) {
  const i = String(name).lastIndexOf('.');
  return i === -1 ? '' : String(name).slice(i + 1).toLowerCase();
}

// ---- GridFS helpers (big files) --------------------------------------------
function getBucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'docfiles',
  });
}

function saveToGridFS(filePath, filename, mimeType) {
  return new Promise((resolve, reject) => {
    const up = getBucket().openUploadStream(filename, { contentType: mimeType });
    fs.createReadStream(filePath)
      .on('error', reject)
      .pipe(up)
      .on('error', reject)
      .on('finish', () => resolve(up.id));
  });
}

// ---- section helpers ------------------------------------------------------
// Allowed: education | course | research | pub_<id> | course_<id>
function normSection(v) {
  const s = String(v || '').trim();
  if (s === 'course') return 'course';
  if (s === 'research') return 'research';
  if (/^(pub|course)_[A-Za-z0-9]+$/.test(s)) return s;
  return 'education';
}

// Path of the box list inside the Staff document
function boxPath(section) {
  if (section === 'course') return 'courseBoxes';
  if (section === 'education') return 'documentBoxes';
  return 'sectionBoxes.' + section;
}

// Read the box list from a loaded Staff document
function boxesOf(staff, section) {
  if (!staff) return [];
  if (section === 'course') return staff.courseBoxes || [];
  if (section === 'education') return staff.documentBoxes || [];
  const all = staff.sectionBoxes || {};
  return Array.isArray(all[section]) ? all[section] : [];
}

function defaultsOf(section) {
  return section === 'education' ? EDU_DEFAULT_BOXES : [];
}

// old documents (before sections existed) have no "section" -> education
function sectionFilter(section) {
  return section === 'education'
    ? { $or: [{ section: 'education' }, { section: { $exists: false } }] }
    : { section };
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Please login again.' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
  }
}

function isOwner(req, staffId) {
  return req.user && req.user.role === 'STAFF' && String(req.user.id) === String(staffId);
}

function requireOwnerOfStaff(req, res, next) {
  if (isOwner(req, req.params.staffId)) return next();
  return res
    .status(403)
    .json({ success: false, message: 'You can change only your own documents.' });
}

// Files go to a temporary disk file first (low memory), then to GridFS
const upload = multer({
  storage: multer.diskStorage({ destination: os.tmpdir() }),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
});

// ---------------------------------------------------------------------------
// GET /api/documents/staff/:staffId?section=education|course|research|pub_xxx|course_xxx
// ---------------------------------------------------------------------------
router.get('/staff/:staffId', requireAuth, async (req, res) => {
  try {
    const id = req.params.staffId;
    const section = normSection(req.query.section);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.json({ success: true, boxes: [], documents: [] });
    }

    const staff = await Staff.findById(id).select('documentBoxes courseBoxes sectionBoxes');
    const docs = await StaffDocument.find({ staffId: id, ...sectionFilter(section) })
      .select('-fileData')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      section,
      boxes: boxesOf(staff, section),
      documents: docs.map((d) => ({
        id: String(d._id),
        box: d.box,
        name: d.name,
        size: d.size,
        mimeType: d.mimeType,
        uploadDate: d.createdAt,
      })),
    });
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({ success: false, message: 'Could not load documents.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/documents/staff/:staffId   (OWNER) multipart: file + box + section
// ---------------------------------------------------------------------------
router.post('/staff/:staffId', requireAuth, requireOwnerOfStaff, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message:
          err.code === 'LIMIT_FILE_SIZE'
            ? 'File is too large (max ' + MAX_MB + ' MB).'
            : err.message || 'Upload failed.',
      });
    }

    const tempPath = req.file ? req.file.path : null;
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided.' });
      }

      const section = normSection(req.body.section);
      const box = String(req.body.box || '').trim();
      if (!box) {
        return res.status(400).json({ success: false, message: 'Box name is required.' });
      }

      const name = req.file.originalname || 'document';
      const mimeType = MIME[extOf(name)];
      if (!mimeType) {
        return res.status(400).json({
          success: false,
          message: 'Only PDF, JPG, PNG, DOC and DOCX files are allowed.',
        });
      }

      const fileId = await saveToGridFS(tempPath, name, mimeType);

      await StaffDocument.create({
        staffId: req.params.staffId,
        section,
        box,
        name,
        mimeType,
        size: req.file.size,
        fileId,
      });

      if (!defaultsOf(section).includes(box)) {
        await Staff.findByIdAndUpdate(req.params.staffId, {
          $addToSet: { [boxPath(section)]: box },
        });
      }

      res.status(201).json({ success: true });
    } catch (error) {
      console.error('Upload document error:', error);
      res.status(500).json({ success: false, message: 'Failed to save document.' });
    } finally {
      if (tempPath) fs.unlink(tempPath, () => {});
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/documents/staff/:staffId/box   (OWNER) body: { name, section }
// ---------------------------------------------------------------------------
router.post('/staff/:staffId/box', requireAuth, requireOwnerOfStaff, async (req, res) => {
  try {
    const section = normSection(req.body.section);
    const name = String(req.body.name || '').trim();
    if (!name || name.length > 40) {
      return res
        .status(400)
        .json({ success: false, message: 'Enter a box name (max 40 letters).' });
    }
    if (defaultsOf(section).some((b) => b.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'That box already exists.' });
    }

    const current = await Staff.findById(req.params.staffId).select(
      'documentBoxes courseBoxes sectionBoxes'
    );
    const exists = boxesOf(current, section).some(
      (b) => String(b).toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      return res.status(400).json({ success: false, message: 'That box already exists.' });
    }

    const staff = await Staff.findByIdAndUpdate(
      req.params.staffId,
      { $addToSet: { [boxPath(section)]: name } },
      { new: true }
    ).select('documentBoxes courseBoxes sectionBoxes');

    res.json({ success: true, boxes: boxesOf(staff, section) });
  } catch (error) {
    console.error('Add box error:', error);
    res.status(500).json({ success: false, message: 'Could not add box.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/documents/staff/:staffId/box/:name?section=...  (OWNER)
// ---------------------------------------------------------------------------
router.delete('/staff/:staffId/box/:name', requireAuth, requireOwnerOfStaff, async (req, res) => {
  try {
    const section = normSection(req.query.section);
    const name = String(req.params.name || '').trim();
    if (defaultsOf(section).includes(name)) {
      return res
        .status(400)
        .json({ success: false, message: 'Default boxes cannot be deleted.' });
    }
    await StaffDocument.deleteMany({
      staffId: req.params.staffId,
      box: name,
      ...sectionFilter(section),
    });
    await Staff.findByIdAndUpdate(req.params.staffId, {
      $pull: { [boxPath(section)]: name },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete box error:', error);
    res.status(500).json({ success: false, message: 'Could not delete box.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/documents/file/:docId   (any logged in user: open / share / print)
// ---------------------------------------------------------------------------
router.get('/file/:docId', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.docId)) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }
    const doc = await StaffDocument.findById(req.params.docId).select('+fileData');
    if (!doc) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    // New documents: stream from GridFS
    if (doc.fileId) {
      res.set('Content-Type', doc.mimeType || 'application/octet-stream');
      res.set(
        'Content-Disposition',
        `inline; filename*=UTF-8''${encodeURIComponent(doc.name)}`
      );
      const stream = getBucket().openDownloadStream(doc.fileId);
      stream.on('error', () => {
        if (!res.headersSent) {
          res.status(404).json({ success: false, message: 'File not found.' });
        } else {
          res.end();
        }
      });
      stream.pipe(res);
      return;
    }

    // Old documents: stored directly in the document
    if (!doc.fileData || !doc.fileData.length) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }
    res.set('Content-Type', doc.mimeType || 'application/octet-stream');
    res.set(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(doc.name)}`
    );
    res.send(doc.fileData);
  } catch (error) {
    console.error('Read file error:', error);
    res.status(500).json({ success: false, message: 'Could not read file.' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/documents/:docId   (OWNER) rename
// ---------------------------------------------------------------------------
router.put('/:docId', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.docId)) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }
    const doc = await StaffDocument.findById(req.params.docId).select('-fileData');
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }
    if (!isOwner(req, doc.staffId)) {
      return res
        .status(403)
        .json({ success: false, message: 'You can change only your own documents.' });
    }

    const name = String(req.body.name || '').trim();
    if (!name || name.length > 120) {
      return res.status(400).json({ success: false, message: 'Enter a valid name.' });
    }

    doc.name = name;
    await doc.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not rename document.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/documents/:docId   (OWNER)
// ---------------------------------------------------------------------------
router.delete('/:docId', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.docId)) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }
    const doc = await StaffDocument.findById(req.params.docId).select('-fileData');
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }
    if (!isOwner(req, doc.staffId)) {
      return res
        .status(403)
        .json({ success: false, message: 'You can change only your own documents.' });
    }
    await StaffDocument.findByIdAndDelete(req.params.docId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not delete document.' });
  }
});

module.exports = router;