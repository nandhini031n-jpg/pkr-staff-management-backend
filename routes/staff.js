const express = require('express');
const multer = require('multer');
const Staff = require('../models/Staff');

const router = express.Router();

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
  limits: { fileSize: 10 * 1024 * 1024 },
});

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

router.put('/profile/:id', async (req, res) => {
  try {
    const staffId = req.params.id;
    const updateData = req.body;
    delete updateData.password;

    const updated = await Staff.findByIdAndUpdate(staffId, updateData, { new: true }).select('-password');
    res.json({ success: true, message: 'Profile updated successfully.', staff: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error saving profile.' });
  }
});

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

module.exports = router;