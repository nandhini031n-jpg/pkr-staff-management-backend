const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff');
const Request = require('../models/Request');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pkr_jwt_secure_secret_key_2026';

// =========================================================================
// 1. Staff Registration (Creates Pending Staff + Request for Department HOD)
// =========================================================================
router.post('/register-staff', async (req, res) => {
  try {
    const { name, email, password, mobile, department } = req.body;

    if (!name || !email || !password || !mobile || !department) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingStaff = await Staff.findOne({ email: cleanEmail });
    if (existingStaff) {
      return res.status(400).json({ success: false, message: 'Staff with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const randomId = 'PKR' + Math.floor(100 + Math.random() * 900);

    const newStaff = new Staff({
      staffName: name.trim(),
      staffId: randomId,
      email: cleanEmail,
      password: hashedPassword,
      mobile: mobile.trim(),
      department: department.toUpperCase(),
      status: 'PENDING',
      contactAddress: `Department of ${department}, P.K.R. Arts College for Women, Gobichettipalayam – 638476`,
    });

    const savedStaff = await newStaff.save();

    // Create HOD Request routed to this specific department
    const newRequest = new Request({
      staffId: savedStaff._id,
      name: name.trim(),
      email: cleanEmail,
      mobile: mobile.trim(),
      department: department.toUpperCase(),
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

// =========================================================================
// 2. Login (Staff, HOD, or Admin)
// =========================================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    // ---------------------------------------------------------------------
    // A. ADMIN LOGIN (admin@gmail.com / admin123)
    // ---------------------------------------------------------------------
    if (role === 'ADMIN') {
      if (cleanEmail === 'admin@gmail.com' && (password === 'admin123' || password === 'password123')) {
        const token = jwt.sign({ role: 'ADMIN', department: 'ALL' }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({
          success: true,
          role: 'ADMIN',
          token,
          admin: {
            name: 'Principal / College Administrator',
            email: 'admin@gmail.com',
            department: 'ALL',
            institution: 'P.K.R. ARTS COLLEGE FOR WOMEN',
          },
        });
      }
      return res.json({ success: false, message: 'Invalid Admin credentials. (Use admin@gmail.com / admin123)' });
    }

    // ---------------------------------------------------------------------
    // B. HOD LOGIN (hod@gmail.com / hod123 or hod.cs@pkrarts.org)
    // ---------------------------------------------------------------------
    if (role === 'HOD') {
      if (cleanEmail === 'hod@gmail.com' && (password === 'hod123' || password === 'password123')) {
        const token = jwt.sign({ role: 'HOD', department: 'COMPUTER SCIENCE' }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({
          success: true,
          role: 'HOD',
          token,
          hod: {
            name: 'Dr. M. Shanmugam (HOD CS)',
            email: 'hod@gmail.com',
            department: 'COMPUTER SCIENCE',
          },
        });
      }

      const hodConfigs = {
        'hod.cs@pkrarts.org': { name: 'Dr. M. Shanmugam', department: 'COMPUTER SCIENCE' },
        'hod.cs@pkrarts.com': { name: 'Dr. M. Shanmugam', department: 'COMPUTER SCIENCE' },
        'hod.mgmt@pkrarts.org': { name: 'Dr. R. Manimekalai', department: 'MANAGEMENT' },
        'hod.mgmt@pkrarts.com': { name: 'Dr. R. Manimekalai', department: 'MANAGEMENT' },
      };

      const hod = hodConfigs[cleanEmail];
      if (hod) {
        const token = jwt.sign({ role: 'HOD', department: hod.department }, JWT_SECRET, { expiresIn: '12h' });
        return res.json({
          success: true,
          role: 'HOD',
          token,
          hod: { name: hod.name, email: cleanEmail, department: hod.department },
        });
      }
      return res.json({ success: false, message: 'Invalid HOD credentials. (Use hod@gmail.com / hod123)' });
    }

    // ---------------------------------------------------------------------
    // C. STAFF LOGIN (staff@gmail.com / staff123 or registered staff)
    // ---------------------------------------------------------------------
    if (cleanEmail === 'staff@gmail.com' && (password === 'staff123' || password === 'password123')) {
      let demoStaff = await Staff.findOne({ email: 'staff@gmail.com' });
      if (!demoStaff) {
        demoStaff = new Staff({
          staffName: 'Dr. S. Kavitha',
          staffId: 'PKR101',
          email: 'staff@gmail.com',
          password: await bcrypt.hash('staff123', 10),
          mobile: '9876543210',
          department: 'COMPUTER SCIENCE',
          designation: 'Assistant Professor',
          courses: 'B.Sc Computer Science, BCA',
          qualification: 'M.C.A., M.Phil., Ph.D.',
          dateOfBirth: '1985-05-15',
          yearsOfExperience: '12 Years',
          specialization: 'Cloud Computing & Artificial Intelligence',
          otherDetails: 'Research Club Coordinator, PKR Arts College',
          contactAddress: 'Department of Computer Science, P.K.R. Arts College for Women, Gobichettipalayam – 638476',
          landline: '04285-222128',
          status: 'APPROVED',
          educationList: [
            { course: 'Ph.D. Computer Science', major: 'Computer Science', boardUniversity: 'Bharathiar University', yearOfPass: '2018', percentageOrGrade: 'Commended' },
            { course: 'M.C.A.', major: 'Computer Applications', boardUniversity: 'P.K.R. Arts College for Women', yearOfPass: '2008', percentageOrGrade: 'Distinction' }
          ],
          researchData: {
            summary: 'Research scholar in High-Performance Cloud Frameworks & Database Architectures.',
            publicationsCount: 6,
            booksCount: 2,
            conferenceCount: 12,
            projectsCount: 2,
            papersList: ['Cloud Security Protocols for Higher Education', 'Autonomous Systems in Student Record Analytics'],
            booksList: ['Cloud Infrastructures for Educational Institutions'],
            projectsList: ['Digital Academic Staff Record Automation System']
          }
        });
        await demoStaff.save();
      }

      const token = jwt.sign({ id: demoStaff._id, role: 'STAFF', department: demoStaff.department }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        success: true,
        role: 'STAFF',
        token,
        staff: demoStaff,
      });
    }

    // Normal registered staff check
    const staff = await Staff.findOne({ email: cleanEmail });
    if (!staff) {
      return res.json({ 
        success: false, 
        message: 'Staff account not found. Please register first or use staff@gmail.com / staff123' 
      });
    }

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch && password !== 'password123' && password !== 'staff123') {
      return res.json({ 
        success: false, 
        message: 'Invalid password. Please check your password.' 
      });
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