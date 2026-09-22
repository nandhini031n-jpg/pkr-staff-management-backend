require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Staff = require('./models/Staff');
const Education = require('./models/Education');
const Research = require('./models/Research');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const NETWORK_IP = '10.66.229.148';

const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb://127.0.0.1:27017/pkr_staff_management';

// =====================================================
// UPLOAD DIRECTORIES
// =====================================================

const educationUploadDirectory = path.join(
  __dirname,
  'uploads',
  'education'
);

const researchUploadDirectory = path.join(
  __dirname,
  'uploads',
  'research'
);

if (!fs.existsSync(educationUploadDirectory)) {
  fs.mkdirSync(educationUploadDirectory, {
    recursive: true,
  });
}

if (!fs.existsSync(researchUploadDirectory)) {
  fs.mkdirSync(researchUploadDirectory, {
    recursive: true,
  });
}

// =====================================================
// FILE STORAGE
// =====================================================

function createStorage(directory) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, directory);
    },
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname);

      const baseName = path
        .basename(file.originalname, extension)
        .replace(/[^a-zA-Z0-9-_]/g, '_');

      cb(
        null,
        `${Date.now()}-${baseName}${extension}`
      );
    },
  });
}

const educationUpload = multer({
  storage: createStorage(
    educationUploadDirectory
  ),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

const researchUpload = multer({
  storage: createStorage(
    researchUploadDirectory
  ),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

// =====================================================
// STATIC FILES
// =====================================================

app.use(
  '/uploads',
  express.static(
    path.join(__dirname, 'uploads')
  )
);

// =====================================================
// HELPER
// =====================================================

function deletePhysicalFile(
  fileUrl,
  uploadDirectory
) {
  if (!fileUrl) {
    return;
  }

  try {
    let filePath = fileUrl;

    if (
      fileUrl.startsWith('http://') ||
      fileUrl.startsWith('https://')
    ) {
      const parsedUrl = new URL(fileUrl);
      filePath = parsedUrl.pathname;
    }

    filePath = decodeURIComponent(filePath);

    const marker = '/uploads/';

    const markerIndex =
      filePath.indexOf(marker);

    if (markerIndex === -1) {
      return;
    }

    const relativePath =
      filePath.substring(
        markerIndex + marker.length
      );

    const fullPath = path.join(
      __dirname,
      'uploads',
      relativePath
    );

    const normalizedBase =
      path.resolve(
        uploadDirectory
      );

    const normalizedFile =
      path.resolve(fullPath);

    if (
      !normalizedFile.startsWith(
        normalizedBase
      )
    ) {
      return;
    }

    if (fs.existsSync(normalizedFile)) {
      fs.unlinkSync(normalizedFile);
    }
  } catch (error) {
    console.error(
      'DELETE PHYSICAL FILE ERROR:',
      error
    );
  }
}

// =====================================================
// MONGODB
// =====================================================

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(
      'MongoDB connected successfully!'
    );
  })
  .catch((error) => {
    console.error(
      'MongoDB connection error:',
      error
    );
  });

// =====================================================
// HOME
// =====================================================

app.get('/', (req, res) => {
  res.status(200).json({
    message:
      'PKR Staff Management API is running',
  });
});

// =====================================================
// STAFF
// =====================================================

app.get('/api/staff', async (req, res) => {
  try {
    const staff = await Staff.find().sort({
      createdAt: -1,
    });

    res.status(200).json(staff);
  } catch (error) {
    console.error(
      'GET STAFF ERROR:',
      error
    );

    res.status(500).json({
      message: 'Failed to get staff',
      error: error.message,
    });
  }
});

app.get('/api/staff/:id', async (req, res) => {
  try {
    const staff = await Staff.findById(
      req.params.id
    );

    if (!staff) {
      return res.status(404).json({
        message: 'Staff not found',
      });
    }

    res.status(200).json(staff);
  } catch (error) {
    console.error(
      'GET STAFF BY ID ERROR:',
      error
    );

    res.status(500).json({
      message: 'Failed to get staff',
      error: error.message,
    });
  }
});

app.post('/api/staff', async (req, res) => {
  try {
    const staff = new Staff(req.body);

    const savedStaff =
      await staff.save();

    res.status(201).json(savedStaff);
  } catch (error) {
    console.error(
      'ADD STAFF ERROR:',
      error
    );

    res.status(400).json({
      message: 'Failed to add staff',
      error: error.message,
    });
  }
});

app.put(
  '/api/staff/:id',
  async (req, res) => {
    try {
      const updatedStaff =
        await Staff.findByIdAndUpdate(
          req.params.id,
          req.body,
          {
            new: true,
            runValidators: true,
          }
        );

      if (!updatedStaff) {
        return res.status(404).json({
          message: 'Staff not found',
        });
      }

      res.status(200).json(
        updatedStaff
      );
    } catch (error) {
      console.error(
        'UPDATE STAFF ERROR:',
        error
      );

      res.status(400).json({
        message:
          'Failed to update staff',
        error: error.message,
      });
    }
  }
);

app.delete(
  '/api/staff/:id',
  async (req, res) => {
    try {
      const deletedStaff =
        await Staff.findByIdAndDelete(
          req.params.id
        );

      if (!deletedStaff) {
        return res.status(404).json({
          message: 'Staff not found',
        });
      }

      res.status(200).json({
        message:
          'Staff deleted successfully',
      });
    } catch (error) {
      console.error(
        'DELETE STAFF ERROR:',
        error
      );

      res.status(500).json({
        message:
          'Failed to delete staff',
        error: error.message,
      });
    }
  }
);

// =====================================================
// EDUCATION
// =====================================================

app.get(
  '/api/education/staff/:staffId',
  async (req, res) => {
    try {
      const education =
        await Education.find({
          staffId:
            req.params.staffId,
        }).sort({
          yearOfPassing: -1,
        });

      res.status(200).json(
        education
      );
    } catch (error) {
      console.error(
        'GET EDUCATION ERROR:',
        error
      );

      res.status(500).json({
        message:
          'Failed to get education',
        error: error.message,
      });
    }
  }
);

app.post(
  '/api/education',
  async (req, res) => {
    try {
      const education =
        new Education(req.body);

      const savedEducation =
        await education.save();

      res.status(201).json(
        savedEducation
      );
    } catch (error) {
      console.error(
        'ADD EDUCATION ERROR:',
        error
      );

      res.status(400).json({
        message:
          'Failed to add education',
        error: error.message,
      });
    }
  }
);

app.put(
  '/api/education/:id',
  async (req, res) => {
    try {
      const updatedEducation =
        await Education.findByIdAndUpdate(
          req.params.id,
          req.body,
          {
            new: true,
            runValidators: true,
          }
        );

      if (!updatedEducation) {
        return res.status(404).json({
          message:
            'Education not found',
        });
      }

      res.status(200).json(
        updatedEducation
      );
    } catch (error) {
      console.error(
        'UPDATE EDUCATION ERROR:',
        error
      );

      res.status(400).json({
        message:
          'Failed to update education',
        error: error.message,
      });
    }
  }
);

app.delete(
  '/api/education/:id',
  async (req, res) => {
    try {
      const deletedEducation =
        await Education.findByIdAndDelete(
          req.params.id
        );

      if (!deletedEducation) {
        return res.status(404).json({
          message:
            'Education not found',
        });
      }

      for (
        const document of (
          deletedEducation.documents || []
        )
      ) {
        deletePhysicalFile(
          document.fileUrl,
          educationUploadDirectory
        );
      }

      res.status(200).json({
        message:
          'Education deleted successfully',
      });
    } catch (error) {
      console.error(
        'DELETE EDUCATION ERROR:',
        error
      );

      res.status(500).json({
        message:
          'Failed to delete education',
        error: error.message,
      });
    }
  }
);

app.post(
  '/api/education/:educationId/documents',
  educationUpload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message:
            'No file uploaded',
        });
      }

      const education =
        await Education.findById(
          req.params.educationId
        );

      if (!education) {
        try {
          fs.unlinkSync(
            req.file.path
          );
        } catch (_) {}

        return res.status(404).json({
          message:
            'Education not found',
        });
      }

      const document = {
        name:
          req.body.name ||
          req.file.originalname,
        fileName:
          req.file.originalname,
        fileType:
          req.file.mimetype,
        fileUrl:
          `${req.protocol}://${req.get('host')}/uploads/education/${req.file.filename}`,
      };

      education.documents.push(
        document
      );

      const savedEducation =
        await education.save();

      const savedDocument =
        savedEducation.documents[
          savedEducation.documents.length - 1
        ];

      res.status(201).json({
        message:
          'Education document uploaded successfully',
        document:
          savedDocument,
      });
    } catch (error) {
      if (req.file) {
        try {
          if (
            fs.existsSync(
              req.file.path
            )
          ) {
            fs.unlinkSync(
              req.file.path
            );
          }
        } catch (_) {}
      }

      console.error(
        'UPLOAD EDUCATION DOCUMENT ERROR:',
        error
      );

      res.status(400).json({
        message:
          'Failed to upload education document',
        error: error.message,
      });
    }
  }
);

app.put(
  '/api/education/:educationId/documents/:documentId',
  async (req, res) => {
    try {
      const education =
        await Education.findById(
          req.params.educationId
        );

      if (!education) {
        return res.status(404).json({
          message:
            'Education not found',
        });
      }

      const document =
        education.documents.id(
          req.params.documentId
        );

      if (!document) {
        return res.status(404).json({
          message:
            'Document not found',
        });
      }

      document.name =
        req.body.name?.trim() ||
        document.name;

      await education.save();

      res.status(200).json({
        message:
          'Document updated successfully',
        document,
      });
    } catch (error) {
      console.error(
        'UPDATE DOCUMENT ERROR:',
        error
      );

      res.status(400).json({
        message:
          'Failed to update document',
        error: error.message,
      });
    }
  }
);

app.delete(
  '/api/education/:educationId/documents/:documentId',
  async (req, res) => {
    try {
      const education =
        await Education.findById(
          req.params.educationId
        );

      if (!education) {
        return res.status(404).json({
          message:
            'Education not found',
        });
      }

      const document =
        education.documents.id(
          req.params.documentId
        );

      if (!document) {
        return res.status(404).json({
          message:
            'Document not found',
        });
      }

      const fileUrl =
        document.fileUrl;

      education.documents.pull(
        req.params.documentId
      );

      await education.save();

      deletePhysicalFile(
        fileUrl,
        educationUploadDirectory
      );

      res.status(200).json({
        message:
          'Document deleted successfully',
      });
    } catch (error) {
      console.error(
        'DELETE DOCUMENT ERROR:',
        error
      );

      res.status(500).json({
        message:
          'Failed to delete document',
        error: error.message,
      });
    }
  }
);

// =====================================================
// RESEARCH
// =====================================================

// GET OR CREATE RESEARCH
app.get(
  '/api/research/staff/:staffId',
  async (req, res) => {
    try {
      const { staffId } = req.params;

      const staff =
        await Staff.findById(staffId);

      if (!staff) {
        return res.status(404).json({
          message:
            'Staff not found',
        });
      }

      let research =
        await Research.findOne({
          staffId,
        });

      if (!research) {
        research =
          await Research.create({
            staffId,
            researchProfile: {
              researchArea: '',
              researchInterests: '',
              cvDocument: null,
              googleScholarLink: '',
              orcidLink: '',
            },
            journalPublications: [],
            internationalConferences: [],
            nationalConferences: [],
            bookPublications: [],
            bookChapterPublications: [],
            additionalCourses: [],
            guestInvitations: [],
          });
      }

      return res.status(200).json(
        research
      );
    } catch (error) {
      console.error(
        'GET RESEARCH ERROR:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to load research',
        error: error.message,
      });
    }
  }
);

// CREATE RESEARCH
app.post(
  '/api/research',
  async (req, res) => {
    try {
      const { staffId } =
        req.body;

      if (!staffId) {
        return res.status(400).json({
          message:
            'staffId is required',
        });
      }

      const staff =
        await Staff.findById(
          staffId
        );

      if (!staff) {
        return res.status(404).json({
          message:
            'Staff not found',
        });
      }

      let research =
        await Research.findOne({
          staffId,
        });

      if (!research) {
        research =
          await Research.create({
            staffId,
          });
      }

      return res.status(201).json(
        research
      );
    } catch (error) {
      console.error(
        'CREATE RESEARCH ERROR:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to create research',
        error: error.message,
      });
    }
  }
);

// UPDATE RESEARCH
app.put(
  '/api/research/:id',
  async (req, res) => {
    try {
      const research =
        await Research.findById(
          req.params.id
        );

      if (!research) {
        return res.status(404).json({
          message:
            'Research record not found',
        });
      }

      const fields = [
        'researchProfile',
        'journalPublications',
        'internationalConferences',
        'nationalConferences',
        'bookPublications',
        'bookChapterPublications',
        'additionalCourses',
        'guestInvitations',
      ];

      for (const field of fields) {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body,
            field
          )
        ) {
          research[field] =
            req.body[field];
        }
      }

      await research.save();

      return res.status(200).json(
        research
      );
    } catch (error) {
      console.error(
        'UPDATE RESEARCH ERROR:',
        error
      );

      return res.status(400).json({
        message:
          'Failed to update research',
        error: error.message,
      });
    }
  }
);

// DELETE RESEARCH
app.delete(
  '/api/research/:id',
  async (req, res) => {
    try {
      const research =
        await Research.findById(
          req.params.id
        );

      if (!research) {
        return res.status(404).json({
          message:
            'Research record not found',
        });
      }

      const documents = [];

      if (
        research.researchProfile &&
        research.researchProfile.cvDocument
      ) {
        documents.push(
          research.researchProfile
            .cvDocument
        );
      }

      const sections = [
        'journalPublications',
        'internationalConferences',
        'nationalConferences',
        'bookPublications',
        'bookChapterPublications',
        'additionalCourses',
      ];

      for (const section of sections) {
        for (
          const item of (
            research[section] || []
          )
        ) {
          if (item.document) {
            documents.push(
              item.document
            );
          }
        }
      }

      for (
        const item of (
          research.guestInvitations ||
          []
        )
      ) {
        if (
          item.invitationDocument
        ) {
          documents.push(
            item.invitationDocument
          );
        }
      }

      await Research.findByIdAndDelete(
        req.params.id
      );

      for (
        const document of documents
      ) {
        deletePhysicalFile(
          document.fileUrl,
          researchUploadDirectory
        );
      }

      return res.status(200).json({
        message:
          'Research deleted successfully',
      });
    } catch (error) {
      console.error(
        'DELETE RESEARCH ERROR:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to delete research',
        error: error.message,
      });
    }
  }
);

// =====================================================
// RESEARCH DOCUMENT UPLOAD / REPLACE
// =====================================================

app.post(
  '/api/research/:researchId/documents',
  researchUpload.single('document'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message:
            'No document selected',
        });
      }

      const research =
        await Research.findById(
          req.params.researchId
        );

      if (!research) {
        try {
          fs.unlinkSync(
            req.file.path
          );
        } catch (_) {}

        return res.status(404).json({
          message:
            'Research record not found',
        });
      }

      const section =
        req.body.section || '';

      const itemId =
        req.body.itemId || '';

      const field =
        req.body.field || '';

      const document = {
        name:
          req.body.name?.trim() ||
          req.file.originalname,
        fileName:
          req.file.originalname,
        fileType:
          req.file.mimetype,
        fileUrl:
          `${req.protocol}://${req.get('host')}/uploads/research/${req.file.filename}`,
      };

      let oldDocument = null;

      // -------------------------------------------------
      // RESEARCH PROFILE CV
      // -------------------------------------------------

      if (
        section === 'researchProfile'
      ) {
        if (
          field &&
          field !== 'cvDocument'
        ) {
          throw new Error(
            'Invalid research profile document field'
          );
        }

        oldDocument =
          research.researchProfile
            ?.cvDocument || null;

        research.researchProfile.cvDocument =
          document;
      }

      // -------------------------------------------------
      // GUEST INVITATION
      // -------------------------------------------------

      else if (
        section === 'guestInvitations'
      ) {
        if (!itemId) {
          throw new Error(
            'Guest invitation itemId is required'
          );
        }

        const item =
          research.guestInvitations.id(
            itemId
          );

        if (!item) {
          return res.status(404).json({
            message:
              'Guest invitation not found',
          });
        }

        oldDocument =
          item.invitationDocument ||
          null;

        item.invitationDocument =
          document;
      }

      // -------------------------------------------------
      // ALL OTHER RESEARCH SECTIONS
      // -------------------------------------------------

      else {
        const allowedSections = [
          'journalPublications',
          'internationalConferences',
          'nationalConferences',
          'bookPublications',
          'bookChapterPublications',
          'additionalCourses',
        ];

        if (
          !allowedSections.includes(
            section
          )
        ) {
          throw new Error(
            'Invalid Research document section'
          );
        }

        if (!itemId) {
          throw new Error(
            'Research itemId is required'
          );
        }

        const item =
          research[section].id(
            itemId
          );

        if (!item) {
          return res.status(404).json({
            message:
              'Research record not found',
          });
        }

        oldDocument =
          item.document || null;

        item.document =
          document;
      }

      await research.save();

      // Delete previous physical file
      // after successful replacement.
      if (oldDocument) {
        deletePhysicalFile(
          oldDocument.fileUrl,
          researchUploadDirectory
        );
      }

      return res.status(200).json({
        message:
          'Research document uploaded successfully',
        research,
        document,
      });
    } catch (error) {
      if (req.file) {
        try {
          if (
            fs.existsSync(
              req.file.path
            )
          ) {
            fs.unlinkSync(
              req.file.path
            );
          }
        } catch (_) {}
      }

      console.error(
        'UPLOAD RESEARCH DOCUMENT ERROR:',
        error
      );

      return res.status(400).json({
        message:
          'Failed to upload Research document',
        error: error.message,
      });
    }
  }
);

// =====================================================
// RESEARCH DOCUMENT DELETE
// =====================================================

app.delete(
  '/api/research/:researchId/documents',
  async (req, res) => {
    try {
      const research =
        await Research.findById(
          req.params.researchId
        );

      if (!research) {
        return res.status(404).json({
          message:
            'Research record not found',
        });
      }

      const section =
        req.body.section || '';

      const itemId =
        req.body.itemId || '';

      let documentToDelete = null;

      // -------------------------------------------------
      // RESEARCH PROFILE CV
      // -------------------------------------------------

      if (
        section === 'researchProfile'
      ) {
        documentToDelete =
          research.researchProfile
            ?.cvDocument || null;

        research.researchProfile.cvDocument =
          null;
      }

      // -------------------------------------------------
      // GUEST INVITATION
      // -------------------------------------------------

      else if (
        section === 'guestInvitations'
      ) {
        const item =
          research.guestInvitations.id(
            itemId
          );

        if (!item) {
          return res.status(404).json({
            message:
              'Guest invitation not found',
          });
        }

        documentToDelete =
          item.invitationDocument ||
          null;

        item.invitationDocument =
          null;
      }

      // -------------------------------------------------
      // OTHER RESEARCH SECTIONS
      // -------------------------------------------------

      else {
        const allowedSections = [
          'journalPublications',
          'internationalConferences',
          'nationalConferences',
          'bookPublications',
          'bookChapterPublications',
          'additionalCourses',
        ];

        if (
          !allowedSections.includes(
            section
          )
        ) {
          return res.status(400).json({
            message:
              'Invalid Research document section',
          });
        }

        const item =
          research[section].id(
            itemId
          );

        if (!item) {
          return res.status(404).json({
            message:
              'Research record not found',
          });
        }

        documentToDelete =
          item.document || null;

        item.document = null;
      }

      await research.save();

      if (documentToDelete) {
        deletePhysicalFile(
          documentToDelete.fileUrl,
          researchUploadDirectory
        );
      }

      return res.status(200).json({
        message:
          'Research document deleted successfully',
        research,
      });
    } catch (error) {
      console.error(
        'DELETE RESEARCH DOCUMENT ERROR:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to delete Research document',
        error: error.message,
      });
    }
  }
);

// =====================================================
// ERROR HANDLER
// =====================================================

app.use(
  (error, req, res, next) => {
    console.error(
      'UNHANDLED SERVER ERROR:',
      error
    );

    if (
      error instanceof multer.MulterError
    ) {
      return res.status(400).json({
        message:
          'File upload error',
        error: error.message,
      });
    }

    return res.status(500).json({
      message:
        'Internal server error',
      error: error.message,
    });
  }
);

// =====================================================
// START SERVER
// =====================================================

app.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `PKR Staff Management API running on port ${PORT}`
    );

    console.log(
      `Local: http://localhost:${PORT}`
    );

    console.log(
      `Network: http://${NETWORK_IP}:${PORT}`
    );

    console.log(
      `Research API: /api/research/staff/:staffId`
    );
  }
);