const express = require('express');
const Request = require('../models/Request');
const Staff = require('../models/Staff');

const router = express.Router();

router.get('/requests', async (req, res) => {
  try {
    const { department } = req.query;
    if (!department) {
      return res.status(400).json({ success: false, message: 'Department is required.' });
    }

    const requests = await Request.find({ department: department.toUpperCase(), status: 'PENDING' }).sort({ createdAt: -1 });

    res.json({
      success: true,
      department,
      requests: requests.map((r) => ({
        id: r._id,
        staffId: r.staffId,
        name: r.name,
        email: r.email,
        mobile: r.mobile,
        department: r.department,
        status: r.status,
        requestDate: r.requestDate,
      })),
    });
  } catch (error) {
    console.error('HOD Requests Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch HOD requests.' });
  }
});

router.post('/requests/:id/accept', async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    request.status = 'APPROVED';
    await request.save();

    await Staff.findByIdAndUpdate(request.staffId, { status: 'APPROVED' });

    res.json({
      success: true,
      message: 'Staff request accepted! Staff account is now approved for portal access.',
    });
  } catch (error) {
    console.error('Accept Request Error:', error);
    res.status(500).json({ success: false, message: 'Error approving request.' });
  }
});

module.exports = router;