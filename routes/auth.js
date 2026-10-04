// routes/auth.js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const router = express.Router();

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

// If your project already has a "Staff" model, this reuses it
const Staff = mongoose.models.Staff || mongoose.model('Staff', staffSchema);

router.post('/register-staff', async (req, res) => {
  try {
    console.log('REGISTER BODY:', { ...req.body, password: '***' });
    console.log('DB STATE (1 = connected):', mongoose.connection.readyState);

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

    const staff = await Staff.create({
      name: String(name).trim(),
      staffName: String(name).trim(),
      email: cleanEmail,
      password: hashed,
      mobile: String(mobile).trim(),
      department: String(department).toUpperCase(),
      staffId: 'PKR-' + Date.now(),
      status: 'PENDING',
    });

    return res.status(201).json({
      success: true,
      message: 'Registration submitted. Waiting for HOD approval.',
      staffId: staff.staffId,
    });
  } catch (err) {
    console.error('REGISTER ERROR:', err);

    // TEMPORARY DEBUG: sends the real reason to the app screen.
    // Remove "DEBUG:" part after the problem is fixed.
    return res.status(500).json({
      success: false,
      message: 'DEBUG: ' + (err.name || 'Error') + ' - ' + (err.message || String(err)),
    });
  }
});

module.exports = router;