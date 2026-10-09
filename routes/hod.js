// routes/hod.js
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const StaffModule = require('../models/Staff');
const Staff = StaffModule.Staff || StaffModule.default || StaffModule;
const HodProfile = require('../models/HodProfile');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'pkr_secret_key';

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    return res
      .status(401)
      .json({ success: false, message: 'Session expired. Please login again.' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user && req.user.role === role) return next();
    return res.status(403).json({
      success: false,
      message: role === 'HOD' ? 'Only the HOD can do this.' : 'Not allowed.',
    });
  };
}

function clean(v, max = 120) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

// ---------------------------------------------------------------------------
// GET /api/hod/requests?department=COMPUTER SCIENCE     (HOD only)
// Returns only PENDING staff requests of that department
// ---------------------------------------------------------------------------
router.get('/requests', requireAuth, requireRole('HOD'), async (req, res) => {
  try {
    const department = String(req.query.department || '').trim();

    const filter = { status: 'PENDING' };
    if (department) {
      filter.department = new RegExp('^' + escapeRegex(department) + '$', 'i');
    }

    const list = await Staff.find(filter).sort({ createdAt: -1 });

    const requests = list.map((s) => ({
      id: String(s._id),
      _id: String(s._id),
      name: s.name || s.staffName || '',
      email: s.email,
      mobile: s.mobile,
      department: s.department,
      status: s.status,
      requestDate: s.requestDate || '',
    }));

    return res.json({ success: true, requests });
  } catch (err) {
    console.error('HOD Requests Error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Could not load requests.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/hod/requests/:id/accept                     (HOD only)
// ---------------------------------------------------------------------------
router.post('/requests/:id/accept', requireAuth, requireRole('HOD'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid request id.' });
    }

    // welcomePending = true -> staff sees the welcome message ONE time
    const staff = await Staff.findByIdAndUpdate(
      id,
      { status: 'APPROVED', welcomePending: true },
      { new: true }
    );
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    return res.json({
      success: true,
      message: staff.name + ' approved. Staff can now log in.',
    });
  } catch (err) {
    console.error('Accept Error:', err);
    return res.status(500).json({ success: false, message: 'Could not approve request.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/hod/requests/:id/reject                     (HOD only)
// ---------------------------------------------------------------------------
router.post('/requests/:id/reject', requireAuth, requireRole('HOD'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid request id.' });
    }

    const staff = await Staff.findByIdAndUpdate(
      id,
      { status: 'REJECTED', welcomePending: false },
      { new: true }
    );
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    return res.json({ success: true, message: staff.name + ' rejected.' });
  } catch (err) {
    console.error('Reject Error:', err);
    return res.status(500).json({ success: false, message: 'Could not reject request.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/hod/profiles        (ADMIN only) -> list of ALL HOD profiles
// ---------------------------------------------------------------------------
router.get('/profiles', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const list = await HodProfile.find({}).sort({ department: 1, name: 1 });

    const profiles = list.map((p) => ({
      id: String(p._id),
      name: p.name,
      email: p.email,
      mobile: p.mobile,
      department: p.department,
      dateOfBirth: p.dateOfBirth,
      isOwn: p.isOwn,
      ownerEmail: p.ownerEmail,
    }));

    return res.json({ success: true, profiles });
  } catch (err) {
    console.error('HOD profiles list error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Could not load HOD profiles.' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/hod/profiles/sync   (HOD only)
// ---------------------------------------------------------------------------
router.put('/profiles/sync', requireAuth, requireRole('HOD'), async (req, res) => {
  try {
    const ownerEmail = clean(req.body.ownerEmail).toLowerCase();
    if (!ownerEmail) {
      return res.status(400).json({ success: false, message: 'ownerEmail is required.' });
    }

    const incoming = Array.isArray(req.body.profiles) ? req.body.profiles : [];

    const docs = incoming.slice(0, 50).map((p) => ({
      ownerEmail,
      isOwn: p && p.isOwn === true,
      name: clean(p && p.name),
      email: clean(p && p.email),
      mobile: clean(p && p.mobile, 30),
      department: clean(p && p.department).toUpperCase(),
      dateOfBirth: clean(p && p.dateOfBirth, 20),
    }));

    await HodProfile.deleteMany({ ownerEmail });
    if (docs.length) await HodProfile.insertMany(docs);

    return res.json({ success: true, count: docs.length });
  } catch (err) {
    console.error('HOD profiles sync error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Could not save HOD profiles.' });
  }
});

module.exports = router;