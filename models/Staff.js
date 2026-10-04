const express = require('express');
const multer = require('multer');
const path = require('path');
const Staff = require('../models/Staff');

const router = express.Router();

// Multer Storage Configuration for Safe Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// 1. Get Staff Profile by ID
router.get('/profile/:id', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id).select('-password');
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff profile not found.' });
    }
    res.json({ success: true, staff });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching staff profile.' });
  }
});

// 2. Update Staff Profile (Fields, Education, Research, Links)
router.put('/profile/:id', async (req, res) => {
  try {
    const staffId = req.params.id;
    const updateData = req.body;
    delete updateData.password; // Prevent accidental password change

    const updated = await Staff.findByIdAndUpdate(staffId, updateData, { new: true }).select('-password');
    res.json({ success: true, message: 'Profile updated successfully.', staff: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error saving profile.' });
  }
});

// 3. Upload Profile Photo
router.post('/profile/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo provided.' });
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    await Staff.findByIdAndUpdate(req.params.id, { photoUrl });

    res.json({ success: true, photoUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to upload photo.' });
  }
});

// 4. Search and List Staff by Department and/or Name Query (Real-time search)
router.get('/list', async (req, res) => {
  try {
    const { department, search } = req.query;
    let query = {};
    if (department && department.toUpperCase() !== 'ALL' && department.toUpperCase() !== 'ALL DEPARTMENTS') {
      query.department = department.toUpperCase();
    }
    if (search && search.trim().length > 0) {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [{ staffName: reg }, { staffId: reg }, { email: reg }];
    }
    const staffList = await Staff.find(query).select('-password').sort({ staffName: 1 });
    res.json({ success: true, count: staffList.length, staffList });
  } catch (error) {
    console.error('Search Staff Error:', error);
    res.status(500).json({ success: false, message: 'Error searching staff.' });
  }
});

module.exports = router;