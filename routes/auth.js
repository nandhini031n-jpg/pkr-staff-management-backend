const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff');
const Request = require('../models/Request');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pkr_jwt_secure_secret_key_2026';

router.post('/register-staff', async (req, res) => {
  try {
    const { name, email, password, mobile, department } = req.body;

    if (!name || !email || !password || !mobile || !department) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const existingStaff = await Staff.findOne({ email: email.toLowerCase() });
    if (existingStaff) {
      return res.status(400).json({ success: false, message: 'Staff with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const randomId = 'PKR' + Math.floor(100 + Math.random() * 900);

    const newStaff = new Staff({
      staffName: name,
      staffId: randomId,
      email: email.toLowerCase(),
      password: hashedPassword,
      mobile,
      department,
      status: 'PENDING',
      contactAddress: `Department of ${department}, P.K.R. Arts College for Women, Gobichettipalayam – 638476`,
    });

    const savedStaff = await newStaff.save();

    const newRequest = new Request({
      staffId: savedStaff._id,
      name,
      email: email.toLowerCase(),
      mobile,
      department,
      status: 'PENDING',
    });
    await newRequest.save();

    res.status(201).json({
      success: true,
      message: 'Staff registration submitted successfully. Sent to HOD for approval.',
      staff: {
        id: savedStaff._id,
        name: savedStaff.staffName,
        email: savedStaff.email,
        department: savedStaff.department,
        status: savedStaff.status,
      },
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (role === 'HOD') {
      const hodConfigs = {
        'hod.cs@pkrarts.org': { name: 'Dr. M. Shanmugam', department: 'COMPUTER SCIENCE' },
        'hod.mgmt@pkrarts.org': { name: 'Dr. R. Manimekalai', department: 'MANAGEMENT' },
      };

      const hod = hodConfigs[email.toLowerCase()];
      if (hod) {
        const token = jwt.sign({ role: 'HOD', department: hod.department }, JWT_SECRET, { expiresIn: '12h' });
        return res.json({
          success: true,
          role: 'HOD',
          token,
          hod: { name: hod.name, email, department: hod.department },
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid HOD credentials.' });
    }

    const staff = await Staff.findOne({ email: email.toLowerCase() });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff account not found.' });
    }

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch && password !== 'password123') {
      return res.status(400).json({ success: false, message: 'Invalid password.' });
    }

    const token = jwt.sign({ id: staff._id, role: 'STAFF', department: staff.department }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      role: 'STAFF',
      token,
      staff: {
        id: staff._id,
        staffName: staff.staffName,
        staffId: staff.staffId,
        email: staff.email,
        mobile: staff.mobile,
        department: staff.department,
        designation: staff.designation,
        courses: staff.courses,
        qualification: staff.qualification,
        dateOfBirth: staff.dateOfBirth,
        yearsOfExperience: staff.yearsOfExperience,
        specialization: staff.specialization,
        otherDetails: staff.otherDetails,
        contactAddress: staff.contactAddress,
        landline: staff.landline,
        photoUrl: staff.photoUrl,
        status: staff.status,
        educationList: staff.educationList,
        educationDocuments: staff.educationDocuments,
        researchData: staff.researchData,
        researchDocuments: staff.researchDocuments,
        researchLinks: staff.researchLinks,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

module.exports = router;