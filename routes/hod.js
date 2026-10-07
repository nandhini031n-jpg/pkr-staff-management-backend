// routes/hod.js
const express = require('express');
const mongoose = require('mongoose');

const StaffModule = require('../models/Staff');
const Staff = StaffModule.Staff || StaffModule.default || StaffModule;

const router = express.Router();

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/hod/requests?department=COMPUTER SCIENCE
router.get('/requests', async (req, res) => {
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

// POST /api/hod/requests/:id/accept
router.post('/requests/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid request id.' });
    }

    const staff = await Staff.findByIdAndUpdate(
      id,
      { status: 'APPROVED' },
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

// POST /api/hod/requests/:id/reject
router.post('/requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid request id.' });
    }

    const staff = await Staff.findByIdAndUpdate(
      id,
      { status: 'REJECTED' },
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

module.exports = router;