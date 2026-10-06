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

const DEFAULT_BOXES = ['10th Marksheet', '12th Marksheet', 'UG Marksheet', 'PG Marksheet'];

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
  return (
    req.user && req.user.role === 'STAFF' && String(req.user.id) === String(staffId)
  );
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
// GET /api/documents/staff/:staffId  -> boxes + document list (no file data)
// ---------------------------------------------------------------------------
router.get('/staff/:staffId', requireAuth, async (req, res) => {
  try {
    const id = req.params.staffId;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.json({ success: true, boxes: [], documents: [] });
    }

    const staff = await Staff.findById(id).select('documentBoxes');
    const docs = await StaffDocument.find({ staffId: id })
      .select('-fileData')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      boxes: (staff && staff.documentBoxes) || [],
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
// POST /api/documents/staff/:staffId   (OWNER) multipart: file + box
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
        box,
        name,
        mimeType,
        size: req.file.size,
        fileData: req.file.buffer,
      });

      // remember custom boxes
      if (!DEFAULT_BOXES.includes(box)) {
        await Staff.findByIdAndUpdate(req.params.staffId, {
          $addToSet: { documentBoxes: box },
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
// POST /api/documents/staff/:staffId/box   (OWNER) body: { name }
// ---------------------------------------------------------------------------
router.post('/staff/:staffId/box', requireAuth, requireOwnerOfStaff, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name || name.length > 40) {
      return res
        .status(400)
        .json({ success: false, message: 'Enter a box name (max 40 letters).' });
    }
    if (DEFAULT_BOXES.some((b) => b.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'That box already exists.' });
    }

    const current = await Staff.findById(req.params.staffId).select('documentBoxes');
    const exists = ((current && current.documentBoxes) || []).some(
      (b) => b.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      return res.status(400).json({ success: false, message: 'That box already exists.' });
    }

    const staff = await Staff.findByIdAndUpdate(
      req.params.staffId,
      { $addToSet: { documentBoxes: name } },
      { new: true }
    ).select('documentBoxes');

    res.json({ success: true, boxes: (staff && staff.documentBoxes) || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not add box.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/documents/staff/:staffId/box/:name   (OWNER) + its documents
// ---------------------------------------------------------------------------
router.delete('/staff/:staffId/box/:name', requireAuth, requireOwnerOfStaff, async (req, res) => {
  try {
    const name = String(req.params.name || '').trim();
    if (DEFAULT_BOXES.includes(name)) {
      return res
        .status(400)
        .json({ success: false, message: 'Default boxes cannot be deleted.' });
    }
    await StaffDocument.deleteMany({ staffId: req.params.staffId, box: name });
    await Staff.findByIdAndUpdate(req.params.staffId, { $pull: { documentBoxes: name } });
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