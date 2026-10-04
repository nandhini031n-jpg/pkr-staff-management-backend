// routes/auth.js
// Install once:  npm install express mongoose bcryptjs jsonwebtoken

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const router = express.Router();

// ---------------------------------------------------------------------------
// Staff model (if you already have models/Staff.js, keep yours and make sure
// staffId and designation are NOT required)
// ---------------------------------------------------------------------------
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

const Staff = mongoose.models.Staff || mongoose.model('Staff', staffSchema);

// ---------------------------------------------------------------------------
// POST /api/auth/register-staff
// ---------------------------------------------------------------------------
router.post('/register-staff', async (req, res) => {
  try {
    console.log('REGISTER BODY:', { ...req.body, password: '***' });

    const { name, email, password, mobile, department } = req.body;

    if (!name || !email || !password || !mobile || !department) {
      return res
        .status(400)
        .json({ success: false, message: 'All fields are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const existing = await Staff.findOne({ email: cleanEmail });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: 'This email is already registered.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const staffId = 'PKR-' + Date.now();

    const staff = await Staff.create({
      name: String(name).trim(),
      staffName: String(name).trim(),
      email: cleanEmail,
      password: hashed,
      mobile: String(mobile).trim(),
      department: String(department).toUpperCase(),
      staffId,
      status: 'PENDING',
    });

    return res.status(201).json({
      success: true,
      message: 'Registration submitted. Waiting for HOD approval.',
      staffId: staff.staffId,
    });
  } catch (err) {
    // This line shows the REAL reason in Render -> Logs
    console.error('REGISTER ERROR:', err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate value: ' + JSON.stringify(err.keyValue),
      });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res
      .status(500)
      .json({ success: false, message: 'Server error during registration.' });
  }
});

module.exports = router;