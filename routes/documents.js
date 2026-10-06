// routes/documents.js
const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const StaffModule = require('../models/Staff');
const Staff = StaffModule.Staff || StaffModule.default || StaffModule;
const StaffDocument = require('../models/StaffDocument');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'pkr_secret_key';

// Education section has 4 fixed boxes. Course section has no fixed boxes.
const EDU_DEFAULT_BOXES = ['10th Marksheet', '12th Marksheet', 'UG Marksheet', 'PG Marksheet'];

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

// ---- section helpers ------------------------------------------------------
function normSection(v) {
  return String(v || '').toLowerCase() === 'course' ? 'course' : 'education';
}
function boxField(section) {
  return section === 'course' ? 'courseBoxes' : 'documentBoxes';
}
function defaultsOf(section) {
  return section === 'course' ? [] : EDU_DEFAULT_BOXES;
}
// old documents (before sections existed) have no "section" -> education
function sectionFilter(section) {
  return section === 'course'
    ? { section: 'course' }
    : { $or: [{ section: 'education' }, { section: { $exists: false } }] };
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ---------------------------------------------------------------------------
// GET /api/documents/staff/:staffId?section=education|course
// ---------------------------------------------------------------------------
router.get('/staff/:staffId', requireAuth, async (req, res) => {
  try {
    const id = req.params.staffId;
    const section = normSection(req.query.section);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.json({ success: true, boxes: [], documents: [] });
    }

    const staff = await Staff.findById(id).select('documentBoxes courseBoxes');
    const docs = await StaffDocument.find({ staffId: id, ...sectionFilter(section) })
      .select('-fileData')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      section,
      boxes: (staff && staff[boxField(section)]) || [],
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
            ? 'File is too large (max 10 MB).'
            : err.message || 'Upload failed.',
      });
    }
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

      await StaffDocument.create({
        staffId: req.params.staffId,
        section,
        box,
        name,
        mimeType,
        size: req.file.size,
        fileData: req.file.buffer,
      });

      if (!defaultsOf(section).includes(box)) {
        await Staff.findByIdAndUpdate(req.params.staffId, {
          $addToSet: { [boxField(section)]: box },
        });
      }

      res.status(201).json({ success: true });
    } catch (error) {
      console.error('Upload document error:', error);
      res.status(500).json({ success: false, message: 'Failed to save document.' });
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

    const field = boxField(section);
    const current = await Staff.findById(req.params.staffId).select(field);
    const exists = ((current && current[field]) || []).some(
      (b) => b.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      return res.status(400).json({ success: false, message: 'That box already exists.' });
    }

    const staff = await Staff.findByIdAndUpdate(
      req.params.staffId,
      { $addToSet: { [field]: name } },
      { new: true }
    ).select(field);

    res.json({ success: true, boxes: (staff && staff[field]) || [] });
  } catch (error) {
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
      $pull: { [boxField(section)]: name },
    });
    res.json({ success: true });
  } catch (error) {
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
    if (!doc || !doc.fileData) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }
    res.set('Content-Type', doc.mimeType || 'application/octet-stream');
    res.set(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(doc.name)}`
    );
    res.send(doc.fileData);
  } catch (error) {
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