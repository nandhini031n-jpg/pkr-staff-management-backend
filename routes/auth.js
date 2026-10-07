// routes/auth.js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const StaffModule = require('../models/Staff');
const Staff = StaffModule.Staff || StaffModule.default || StaffModule;

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'pkr_secret_key';

// FIXED LOGIN ACCOUNTS (HOD and ADMIN only)
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const HOD_EMAIL = (process.env.HOD_EMAIL || 'hod@gmail.com').toLowerCase();
const HOD_PASSWORD = process.env.HOD_PASSWORD || 'hod123';

// Demo emails that must NEVER open the STAFF login
const BLOCKED_STAFF_EMAILS = [
  'staff@gmail.com',
  'staff@pkr.com',
  'test@gmail.com',
  'demo@gmail.com',
];

// Works with hashed passwords (bcrypt) and plain-text passwords
async function passwordMatches(entered, saved) {
  if (!saved) return false;
  if (String(saved).startsWith('$2')) {
    return bcrypt.compare(entered, saved);
  }
  return entered === saved;
}

// Looks for extra HOD / ADMIN accounts saved in MongoDB (optional)
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

// POST /api/auth/register-staff
router.post('/register-staff', async (req, res) => {
  try {
    const { name, email, password, mobile, department } = req.body;

    if (!name || !email || !password || !mobile || !department) {
      return res
        .status(400)
        .json({ success: false, message: 'All fields are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    if (
      cleanEmail === ADMIN_EMAIL ||
      cleanEmail === HOD_EMAIL ||
      BLOCKED_STAFF_EMAILS.includes(cleanEmail)
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'This email cannot be used. Use your own email.' });
    }

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

// POST /api/auth/login   (role: STAFF, HOD or ADMIN)
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

    // ------------------------- ADMIN LOGIN -------------------------
    if (role === 'ADMIN') {
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const token = jwt.sign({ id: 'admin', role: 'ADMIN' }, JWT_SECRET, {
          expiresIn: '7d',
        });
        return res.json({
          success: true,
          token,
          admin: { name: 'Admin', email: ADMIN_EMAIL },
        });
      }

      const admin = await findManager(['admins', 'admin'], email);
      if (admin && (await passwordMatches(password, admin.password))) {
        const token = jwt.sign({ id: admin._id, role: 'ADMIN' }, JWT_SECRET, {
          expiresIn: '7d',
        });
        return res.json({
          success: true,
          token,
          admin: { name: admin.name || 'Admin', email: admin.email },
        });
      }

      return res
        .status(401)
        .json({ success: false, message: 'Invalid admin email or password.' });
    }

    // -------------------------- HOD LOGIN --------------------------
    if (role === 'HOD') {
      if (email === HOD_EMAIL && password === HOD_PASSWORD) {
        const token = jwt.sign({ id: 'hod', role: 'HOD' }, JWT_SECRET, {
          expiresIn: '7d',
        });
        return res.json({
          success: true,
          token,
          hod: {
            name: 'HOD',
            email: HOD_EMAIL,
            department: 'COMPUTER SCIENCE',
          },
        });
      }

      const hod = await findManager(['hods', 'hod'], email);
      if (hod && (await passwordMatches(password, hod.password))) {
        const token = jwt.sign({ id: hod._id, role: 'HOD' }, JWT_SECRET, {
          expiresIn: '7d',
        });
        return res.json({
          success: true,
          token,
          hod: {
            name: hod.name || 'HOD',
            email: hod.email,
            department: hod.department || 'COMPUTER SCIENCE',
          },
        });
      }

      return res
        .status(401)
        .json({ success: false, message: 'Invalid HOD email or password.' });
    }

    // ------------------------- STAFF LOGIN -------------------------
    if (
      BLOCKED_STAFF_EMAILS.includes(email) ||
      email === ADMIN_EMAIL ||
      email === HOD_EMAIL
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please register as new staff first.',
      });
    }

    const staff = await Staff.findOne({ email });
    if (!staff || !(await passwordMatches(password, staff.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please register as new staff first.',
      });
    }

    const status = String(staff.status || 'PENDING').toUpperCase();

    // Correct email + password, but HOD has not accepted (or rejected).
    // NO token is given. The app shows the request status.
    if (status !== 'APPROVED') {
      return res.json({
        success: true,
        staff: {
          id: String(staff._id),
          name: staff.name,
          email: staff.email,
          department: staff.department,
          status,
        },
      });
    }

    // HOD accepted. Is this the FIRST login after acceptance?
    const firstLogin = staff.welcomePending === true;
    if (firstLogin) {
      // clear the flag so the welcome message is shown only ONE time
      await Staff.findByIdAndUpdate(staff._id, { $set: { welcomePending: false } });
    }

    const token = jwt.sign({ id: staff._id, role: 'STAFF' }, JWT_SECRET, {
      expiresIn: '7d',
    });

    const staffData = staff.toObject();
    delete staffData.password;
    delete staffData.photoData;
    delete staffData.welcomePending;
    staffData.id = String(staff._id);
    staffData.status = status;

    return res.json({ success: true, token, firstLogin, staff: staffData });
  } catch (err) {
    console.error('Login Error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error during login.' });
  }
});

module.exports = router;