// routes/auth.js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const StaffModule = require('../models/Staff');
const Staff = StaffModule.Staff || StaffModule.default || StaffModule;

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'pkr_secret_key';

// Works with hashed passwords (bcrypt) and plain-text passwords
async function passwordMatches(entered, saved) {
  if (!saved) return false;
  if (String(saved).startsWith('$2')) {
    return bcrypt.compare(entered, saved);
  }
  return entered === saved;
}

// Find HOD / ADMIN account in your existing collections
async function findManager(collectionNames, email) {
  for (const colName of collectionNames) {
    try {
      const doc = await mongoose.connection.db
        .collection(colName)
        .findOne({ email: email });
      if (doc) return doc;
    } catch (_) {}
  }
  return null;
}

// ---------------------------------------------------------------------------
// POST /api/auth/register-staff
// ---------------------------------------------------------------------------
router.post('/register-staff', async (req, res) => {
  try {
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
    console.error('Registration Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration.',
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login   (role: STAFF, HOD or ADMIN)
// ---------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = String(req.body.role || 'STAFF').toUpperCase();

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Email and password are required.' });
    }

    if (role === 'ADMIN') {
      const admin = await findManager(['admins', 'admin'], email);
      if (!admin || !(await passwordMatches(password, admin.password))) {
        return res
          .status(401)
          .json({ success: false, message: 'Invalid admin credentials.' });
      }
      const token = jwt.sign({ id: admin._id, role: 'ADMIN' }, JWT_SECRET, {
        expiresIn: '7d',
      });
      return res.json({
        success: true,
        token,
        admin: { name: admin.name || 'Admin', email: admin.email },
      });
    }

    if (role === 'HOD') {
      const hod = await findManager(['hods', 'hod'], email);
      if (!hod || !(await passwordMatches(password, hod.password))) {
        return res
          .status(401)
          .json({ success: false, message: 'Invalid HOD credentials.' });
      }
      const token = jwt.sign({ id: hod._id, role: 'HOD' }, JWT_SECRET, {
        expiresIn: '7d',
      });
      return res.json({
        success: true,
        token,
        hod: {
          name: hod.name || 'Head of Department',
          email: hod.email,
          department: hod.department || 'COMPUTER SCIENCE',
        },
      });
    }

    // STAFF
    const staff = await Staff.findOne({ email });
    if (!staff || !(await passwordMatches(password, staff.password))) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: staff._id, role: 'STAFF' }, JWT_SECRET, {
      expiresIn: '7d',
    });

    const staffData = staff.toObject();
    delete staffData.password;
    staffData.id = String(staff._id);

    return res.json({ success: true, token, staff: staffData });
  } catch (err) {
    console.error('Login Error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error during login.' });
  }
});

module.exports = router;