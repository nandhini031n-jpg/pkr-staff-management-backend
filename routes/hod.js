const express = require('express');
const Request = require('../models/Request');
const Staff = require('../models/Staff');

const router = express.Router();

// Get Pending Requests for Specific HOD Department or ALL Departments (Admin)
router.get('/requests', async (req, res) => {
  try {
    const { department } = req.query;
    const query = (!department || department.toUpperCase() === 'ALL')
      ? { status: 'PENDING' }
      : { department: department.toUpperCase(), status: 'PENDING' };

    const requests = await Request.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      department: department || 'ALL',
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

// Accept Staff Request
router.post('/requests/:id/accept', async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    request.status = 'APPROVED';
    await request.save();

    // Update Staff Account to APPROVED
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

// Reject Staff Request
router.post('/requests/:id/reject', async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    request.status = 'REJECTED';
    await request.save();

    await Staff.findByIdAndUpdate(request.staffId, { status: 'REJECTED' });

    res.json({
      success: true,
      message: 'Staff request rejected.',
    });
  } catch (error) {
    console.error('Reject Request Error:', error);
    res.status(500).json({ success: false, message: 'Error rejecting request.' });
  }
});

module.exports = router;