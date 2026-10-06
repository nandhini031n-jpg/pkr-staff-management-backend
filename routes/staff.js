// routes/staff.js
const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const StaffModule = require('../models/Staff');
const Staff = StaffModule.Staff || StaffModule.default || StaffModule;
const StaffDocument = require('../models/StaffDocument');

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
    return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
  }
}

// Only the staff member who owns this profile (HOD / ADMIN cannot edit)
function requireOwner(req, res, next) {
  if (req.user && req.user.role === 'STAFF' && String(req.user.id) === String(req.params.id)) {
    return next();
  }
  return res
    .status(403)
    .json({ success: false, message: 'You can edit only your own profile.' });
}

// ---------------------------------------------------------------------------
// Photo upload (memory -> MongoDB). Type is detected from the real bytes,
// so it works even if the phone sends a generic file type.
// ---------------------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.slice(0, 3).toString() === 'GIF') return 'image/gif';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

// ---------------------------------------------------------------------------
// GET /api/staff/list?department=PHYSICS&search=a
// ---------------------------------------------------------------------------
router.get('/list', requireAuth, async (req, res) => {
  try {
    const filter = { status: 'APPROVED' };

    const department = String(req.query.department || '').trim();
    if (department && department.toUpperCase() !== 'ALL DEPARTMENTS' && department.toUpperCase() !== 'ALL') {
      filter.department = new RegExp('^' + escapeRegex(department) + '$', 'i');
    }

    const search = String(req.query.search || '').trim();
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ staffName: rx }, { name: rx }];
    }

    const list = await Staff.find(filter)
      .select('-password -photoData')
      .sort({ name: 1 })
      .collation({ locale: 'en' });

    const staffList = list.map((s) => {
      const o = s.toObject();
      o.id = String(s._id);
      if (!o.staffName) o.staffName = o.name;
      return o;
    });

    res.json({ success: true, staffList });
  } catch (error) {
    console.error('Staff list error:', error);
    res.status(500).json({ success: false, message: 'Error loading staff list.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/staff/photo/:id   (public image)
// ---------------------------------------------------------------------------
router.get('/photo/:id', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id).select('+photoData photoContentType');
    if (!staff || !staff.photoData || !staff.photoData.length) {
      return res.status(404).json({ success: false, message: 'No photo.' });
    }
    res.set('Content-Type', staff.photoContentType || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(staff.photoData);
  } catch (error) {
    res.status(404).json({ success: false, message: 'No photo.' });
  }
});

// ---------------------------------------------------------------------------
// GET profile (any logged in user can view)
// ---------------------------------------------------------------------------
router.get('/profile/:id', requireAuth, async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id).select('-password -photoData');
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff profile not found.' });
    }
    const o = staff.toObject();
    o.id = String(staff._id);
    res.json({ success: true, staff: o });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching staff profile.' });
  }
});

// ---------------------------------------------------------------------------
// PUT profile (OWNER ONLY, whitelisted fields)
// ---------------------------------------------------------------------------
const EDITABLE_FIELDS = [
  'staffName',
  'designation',
  'qualification',
  'dateOfBirth',
  'yearsOfExperience',
  'specialization',
  'otherDetails',
  'mobile',
  'qualificationDetails',
  'researchData',
  'researchDocuments',
  'researchLinks',
];

router.put('/profile/:id', requireAuth, requireOwner, async (req, res) => {
  try {
    const update = {};
    EDITABLE_FIELDS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        update[key] = req.body[key];
      }
    });

    if (typeof update.staffName === 'string' && update.staffName.trim()) {
      update.staffName = update.staffName.trim();
      update.name = update.staffName;
    }

    const updated = await Staff.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    ).select('-password -photoData');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Staff profile not found.' });
    }

    const o = updated.toObject();
    o.id = String(updated._id);
    res.json({ success: true, message: 'Profile updated successfully.', staff: o });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Error saving profile.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE own account (OWNER ONLY) - also removes all uploaded documents
// ---------------------------------------------------------------------------
router.delete('/profile/:id', requireAuth, requireOwner, async (req, res) => {
  try {
    await StaffDocument.deleteMany({ staffId: req.params.id });
    await Staff.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Profile deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting profile.' });
  }
});

// ---------------------------------------------------------------------------
// POST photo (OWNER ONLY)
// ---------------------------------------------------------------------------
router.post('/profile/:id/photo', requireAuth, requireOwner, (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message:
          err.code === 'LIMIT_FILE_SIZE'
            ? 'Photo is too large (max 5 MB).'
            : err.message || 'Photo upload failed.',
      });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No photo provided.' });
      }

      const type = sniffImage(req.file.buffer);
      if (!type) {
        return res
          .status(400)
          .json({ success: false, message: 'Please choose a JPG or PNG photo.' });
      }

      const photoUrl = `/api/staff/photo/${req.params.id}?v=${Date.now()}`;
      await Staff.findByIdAndUpdate(req.params.id, {
        $set: {
          photoData: req.file.buffer,
          photoContentType: type,
          photoUrl,
        },
      });

      res.json({ success: true, photoUrl });
    } catch (error) {
      console.error('Photo save error:', error);
      res.status(500).json({ success: false, message: 'Failed to upload photo.' });
    }
  });
});

// ---------------------------------------------------------------------------
// DELETE photo (OWNER ONLY)
// ---------------------------------------------------------------------------
router.delete('/profile/:id/photo', requireAuth, requireOwner, async (req, res) => {
  try {
    await Staff.findByIdAndUpdate(req.params.id, {
      $set: { photoUrl: '', photoContentType: '' },
      $unset: { photoData: 1 },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove photo.' });
  }
});

module.exports = router;