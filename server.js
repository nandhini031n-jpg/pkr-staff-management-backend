require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Staff = require('./models/Staff');
const Education = require('./models/Education');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const NETWORK_IP = '10.66.229.148';

const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb://127.0.0.1:27017/pkr_staff_management';

const uploadDirectory = path.join(
  __dirname,
  'uploads',
  'education'
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
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

const upload = multer({
  storage,

  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

app.use(
  '/uploads',
  express.static(
    path.join(__dirname, 'uploads')
  )
);

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

app.get('/', (req, res) => {
  res.status(200).json({
    message:
      'PKR Staff Management API is running',
  });
});

app.get('/api/staff', async (req, res) => {
  try {
    const staff =
      await Staff.find().sort({
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
    const staff =
      await Staff.findById(req.params.id);

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

app.put('/api/staff/:id', async (req, res) => {
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

    res.status(200).json(updatedStaff);
  } catch (error) {
    console.error(
      'UPDATE STAFF ERROR:',
      error
    );

    res.status(400).json({
      message: 'Failed to update staff',
      error: error.message,
    });
  }
});

app.delete('/api/staff/:id', async (req, res) => {
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
      message: 'Staff deleted successfully',
    });
  } catch (error) {
    console.error(
      'DELETE STAFF ERROR:',
      error
    );

    res.status(500).json({
      message: 'Failed to delete staff',
      error: error.message,
    });
  }
});

app.get(
  '/api/education/staff/:staffId',
  async (req, res) => {
    try {
      const education =
        await Education.find({
          staffId: req.params.staffId,
        }).sort({
          yearOfPassing: -1,
        });

      res.status(200).json(education);
    } catch (error) {
      console.error(
        'GET EDUCATION ERROR:',
        error
      );

      res.status(500).json({
        message: 'Failed to get education',
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

      res.status(201).json(savedEducation);
    } catch (error) {
      console.error(
        'ADD EDUCATION ERROR:',
        error
      );

      res.status(400).json({
        message: 'Failed to add education',
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
          message: 'Education not found',
        });
      }

      res.status(200).json(updatedEducation);
    } catch (error) {
      console.error(
        'UPDATE EDUCATION ERROR:',
        error
      );

      res.status(400).json({
        message: 'Failed to update education',
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
          message: 'Education not found',
        });
      }

      for (
        const document
        of (deletedEducation.documents || [])
      ) {
        deletePhysicalFile(
          document.fileUrl
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
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'No file uploaded',
        });
      }

      const education =
        await Education.findById(
          req.params.educationId
        );

      if (!education) {
        fs.unlinkSync(req.file.path);

        return res.status(404).json({
          message: 'Education not found',
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

        error:
          error.message,
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
          message: 'Education not found',
        });
      }

      const document =
        education.documents.id(
          req.params.documentId
        );

      if (!document) {
        return res.status(404).json({
          message: 'Document not found',
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

        error:
          error.message,
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
          message: 'Education not found',
        });
      }

      const document =
        education.documents.id(
          req.params.documentId
        );

      if (!document) {
        return res.status(404).json({
          message: 'Document not found',
        });
      }

      const fileUrl =
        document.fileUrl;

      education.documents.pull(
        req.params.documentId
      );

      await education.save();

      deletePhysicalFile(fileUrl);

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
        error:
          error.message,
      });
    }
  }
);

function deletePhysicalFile(fileUrl) {
  try {
    if (!fileUrl) return;

    const fileName =
      path.basename(fileUrl);

    const filePath =
      path.join(
        uploadDirectory,
        fileName
      );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(
      'FILE DELETE ERROR:',
      error
    );
  }
}

app.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      `Network access: http://${NETWORK_IP}:${PORT}`
    );
  }
);