const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const Research = require('./models/Research');
const Staff = require('./models/Staff');

const router = express.Router();

const uploadDirectory = path.join(
  __dirname,
  'uploads',
  'research'
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },

  filename: function (req, file, cb) {
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    const uniqueName =
      Date.now() + '_' + safeName;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
});

router.get('/staff/:staffId', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.staffId);

    if (!staff) {
      return res.status(404).json({
        message: 'Staff not found',
      });
    }

    let research = await Research.findOne({
      staffId: req.params.staffId,
    });

    if (!research) {
      research = await Research.create({
        staffId: req.params.staffId,
      });
    }

    res.json(research);
  } catch (error) {
    console.error('Get research error:', error);

    res.status(500).json({
      message: 'Failed to get research',
      error: error.message,
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const staff = await Staff.findById(req.body.staffId);

    if (!staff) {
      return res.status(404).json({
        message: 'Staff not found',
      });
    }

    let research = await Research.findOne({
      staffId: req.body.staffId,
    });

    if (research) {
      return res.json(research);
    }

    research = await Research.create({
      staffId: req.body.staffId,
    });

    res.status(201).json(research);
  } catch (error) {
    console.error('Create research error:', error);

    res.status(500).json({
      message: 'Failed to create research',
      error: error.message,
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const research = await Research.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!research) {
      return res.status(404).json({
        message: 'Research record not found',
      });
    }

    res.json(research);
  } catch (error) {
    console.error('Update research error:', error);

    res.status(500).json({
      message: 'Failed to update research',
      error: error.message,
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const research = await Research.findByIdAndDelete(
      req.params.id
    );

    if (!research) {
      return res.status(404).json({
        message: 'Research record not found',
      });
    }

    res.json({
      message: 'Research deleted successfully',
    });
  } catch (error) {
    console.error('Delete research error:', error);

    res.status(500).json({
      message: 'Failed to delete research',
      error: error.message,
    });
  }
});

router.post(
  '/:researchId/documents',
  upload.single('document'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'No document selected',
        });
      }

      const research = await Research.findById(
        req.params.researchId
      );

      if (!research) {
        return res.status(404).json({
          message: 'Research record not found',
        });
      }

      const fileUrl =
        '/uploads/research/' +
        req.file.filename;

      const document = {
        name:
          req.body.name ||
          req.file.originalname,

        fileName:
          req.file.originalname,

        fileType:
          req.file.mimetype,

        fileUrl: fileUrl,
      };

      res.status(201).json(document);
    } catch (error) {
      console.error('Research upload error:', error);

      res.status(500).json({
        message: 'Research document upload failed',
        error: error.message,
      });
    }
  }
);

module.exports = router;