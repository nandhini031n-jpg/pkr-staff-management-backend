const mongoose = require('mongoose');

const EducationSchema = new mongoose.Schema({
  course: String,
  major: String,
  boardUniversity: String,
  subject: String,
  yearOfPass: String,
  percentageOrGrade: String,
});

const DocumentSchema = new mongoose.Schema({
  name: String,
  type: String,
  size: String,
  uploadDate: String,
  url: String,
  category: {
    type: String,
    enum: ['EDUCATION', 'RESEARCH'],
  },
});

const ResearchLinkSchema = new mongoose.Schema({
  title: String,
  url: String,
  type: String,
});

const StaffSchema = new mongoose.Schema(
  {
    staffName: { type: String, required: true },
    staffId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    mobile: { type: String, required: true },
    department: {
      type: String,
      required: true,
      enum: [
        'COMPUTER SCIENCE',
        'MANAGEMENT',
        'MATHEMATICS',
        'ENGLISH',
        'COMMERCE',
        'PHYSICS',
        'CHEMISTRY',
        'TAMIL',
      ],
    },
    designation: { type: String, default: 'Assistant Professor' },
    courses: { type: String, default: '' },
    qualification: { type: String, default: '' },
    dateOfBirth: { type: String, default: '' },
    yearsOfExperience: { type: String, default: '' },
    specialization: { type: String, default: '' },
    otherDetails: { type: String, default: '' },
    contactAddress: { type: String, default: '' },
    landline: { type: String, default: '04285-222128' },
    photoUrl: { type: String, default: null },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    educationList: [EducationSchema],
    educationDocuments: [DocumentSchema],
    researchData: {
      summary: { type: String, default: '' },
      publicationsCount: { type: Number, default: 0 },
      booksCount: { type: Number, default: 0 },
      conferenceCount: { type: Number, default: 0 },
      projectsCount: { type: Number, default: 0 },
      papersList: [String],
      booksList: [String],
      projectsList: [String],
    },
    researchDocuments: [DocumentSchema],
    researchLinks: [ResearchLinkSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Staff', StaffSchema);