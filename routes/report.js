const express = require('express');
const Staff = require('../models/Staff');

const router = express.Router();

router.get('/:staffId', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.staffId).select('-password');
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    res.json({
      institution: {
        name: 'P.K.R. ARTS COLLEGE FOR WOMEN',
        accreditation: 'Autonomous Institution - Accredited by NAAC with A Grade',
        location: 'GOBICHETTIPALAYAM – 638476, ERODE DISTRICT, TAMIL NADU',
        reportTitle: 'STAFF MANAGEMENT REPORT',
      },
      profile: {
        name: staff.staffName,
        staffId: staff.staffId,
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
        mobile: staff.mobile,
        email: staff.email,
        photoUrl: staff.photoUrl,
        status: staff.status,
      },
      education: {
        qualifications: staff.educationList,
        documents: staff.educationDocuments,
      },
      research: {
        summary: staff.researchData?.summary,
        metrics: {
          publications: staff.researchData?.publicationsCount || 0,
          books: staff.researchData?.booksCount || 0,
          conferences: staff.researchData?.conferenceCount || 0,
          projects: staff.researchData?.projectsCount || 0,
        },
        papers: staff.researchData?.papersList || [],
        books: staff.researchData?.booksList || [],
        projects: staff.researchData?.projectsList || [],
        documents: staff.researchDocuments || [],
        links: staff.researchLinks || [],
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Report Generation Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate report.' });
  }
});

module.exports = router;