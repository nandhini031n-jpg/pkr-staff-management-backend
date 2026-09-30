const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const Education = require("../models/Education");
const Staff = require("../models/Staff");

const router = express.Router();

// =====================================================
// EDUCATION UPLOAD DIRECTORY
// =====================================================

const uploadDirectory = path.join(
  __dirname,
  "..",
  "uploads",
  "education"
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

// =====================================================
// MULTER STORAGE
// =====================================================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },

  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

    const uniqueName =
      Date.now() + "_" + safeName;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,

  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

// =====================================================
// HELPER - DELETE PHYSICAL FILE
// =====================================================

function deletePhysicalFile(fileUrl) {
  if (!fileUrl) {
    return;
  }

  let relativePath = fileUrl;

  if (relativePath.startsWith("/")) {
    relativePath = relativePath.substring(1);
  }

  const physicalPath = path.join(
    __dirname,
    "..",
    relativePath
  );

  if (fs.existsSync(physicalPath)) {
    try {
      fs.unlinkSync(physicalPath);
      console.log(
        "Deleted file:",
        physicalPath
      );
    } catch (error) {
      console.error(
        "Could not delete file:",
        error.message
      );
    }
  }
}

// =====================================================
// GET EDUCATION FOR ONE STAFF MEMBER
// GET /api/education/staff/:staffId
// =====================================================

router.get(
  "/staff/:staffId",
  async (req, res) => {
    try {
      const { staffId } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          staffId
        )
      ) {
        return res.status(400).json({
          message: "Invalid staff ID",
        });
      }

      const staff = await Staff.findById(
        staffId
      );

      if (!staff) {
        return res.status(404).json({
          message: "Staff not found",
        });
      }

      const educationList =
        await Education.find({
          staffId: staffId,
        }).sort({
          createdAt: 1,
        });

      res.status(200).json(
        educationList
      );
    } catch (error) {
      console.error(
        "GET STAFF EDUCATION ERROR:"
      );
      console.error(error);

      res.status(500).json({
        message: "Failed to load education",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET ONE EDUCATION
// GET /api/education/:id
// =====================================================

router.get(
  "/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          message: "Invalid education ID",
        });
      }

      const education =
        await Education.findById(id);

      if (!education) {
        return res.status(404).json({
          message: "Education not found",
        });
      }

      res.status(200).json(
        education
      );
    } catch (error) {
      console.error(
        "GET EDUCATION ERROR:"
      );
      console.error(error);

      res.status(500).json({
        message: "Failed to load education",
        error: error.message,
      });
    }
  }
);

// =====================================================
// ADD EDUCATION
// POST /api/education
// =====================================================

router.post(
  "/",
  async (req, res) => {
    try {
      const {
        staffId,
        qualification,
        degree,
        university,
        yearOfPassing,
        percentage,
        specialization,
        documents,
      } = req.body;

      // -------------------------------------------------
      // STAFF ID REQUIRED
      // -------------------------------------------------

      if (
        !staffId ||
        String(staffId).trim() === ""
      ) {
        return res.status(400).json({
          message: "Staff ID is required",
        });
      }

      // -------------------------------------------------
      // CHECK STAFF ID
      // -------------------------------------------------

      if (
        !mongoose.Types.ObjectId.isValid(
          staffId
        )
      ) {
        return res.status(400).json({
          message: "Invalid staff ID",
        });
      }

      const staff = await Staff.findById(
        staffId
      );

      if (!staff) {
        return res.status(404).json({
          message: "Staff not found",
        });
      }

      // -------------------------------------------------
      // CREATE EDUCATION
      // -------------------------------------------------

      const education =
        await Education.create({
          staffId: staff._id,
          qualification:
            qualification || "",
          degree: degree || "",
          university:
            university || "",
          yearOfPassing:
            yearOfPassing || "",
          percentage:
            percentage || "",
          specialization:
            specialization || "",
          documents:
            Array.isArray(documents)
              ? documents
              : [],
        });

      res.status(201).json(
        education
      );
    } catch (error) {
      console.error(
        "ADD EDUCATION ERROR:"
      );
      console.error(error);

      res.status(500).json({
        message:
          "Failed to add education",
        error: error.message,
      });
    }
  }
);

// =====================================================
// UPDATE EDUCATION
// PUT /api/education/:id
// =====================================================

router.put(
  "/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          message: "Invalid education ID",
        });
      }

      const education =
        await Education.findById(id);

      if (!education) {
        return res.status(404).json({
          message: "Education not found",
        });
      }

      const allowedFields = [
        "staffId",
        "qualification",
        "degree",
        "university",
        "yearOfPassing",
        "percentage",
        "specialization",
        "documents",
      ];

      const updateData = {};

      for (
        const field of allowedFields
      ) {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body,
            field
          )
        ) {
          updateData[field] =
            req.body[field];
        }
      }

      // -------------------------------------------------
      // STAFF ID VALIDATION
      // -------------------------------------------------

      if (
        Object.prototype.hasOwnProperty.call(
          updateData,
          "staffId"
        )
      ) {
        if (
          !mongoose.Types.ObjectId.isValid(
            updateData.staffId
          )
        ) {
          return res.status(400).json({
            message:
              "Invalid staff ID",
          });
        }

        const staff =
          await Staff.findById(
            updateData.staffId
          );

        if (!staff) {
          return res.status(404).json({
            message:
              "Staff not found",
          });
        }
      }

      // -------------------------------------------------
      // UPDATE
      // -------------------------------------------------

      const updatedEducation =
        await Education.findByIdAndUpdate(
          id,
          updateData,
          {
            new: true,
            runValidators: true,
          }
        );

      res.status(200).json(
        updatedEducation
      );
    } catch (error) {
      console.error(
        "UPDATE EDUCATION ERROR:"
      );
      console.error(error);

      res.status(500).json({
        message:
          "Failed to update education",
        error: error.message,
      });
    }
  }
);

// =====================================================
// DELETE EDUCATION
// DELETE /api/education/:id
// =====================================================

router.delete(
  "/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          message: "Invalid education ID",
        });
      }

      const education =
        await Education.findById(id);

      if (!education) {
        return res.status(404).json({
          message: "Education not found",
        });
      }

      // -------------------------------------------------
      // DELETE ALL PHYSICAL DOCUMENT FILES
      // -------------------------------------------------

      if (
        Array.isArray(
          education.documents
        )
      ) {
        for (
          const document of
            education.documents
        ) {
          deletePhysicalFile(
            document.fileUrl
          );
        }
      }

      // -------------------------------------------------
      // DELETE EDUCATION RECORD
      // -------------------------------------------------

      await Education.findByIdAndDelete(
        id
      );

      res.status(200).json({
        message:
          "Education deleted successfully",
        id: id,
      });
    } catch (error) {
      console.error(
        "DELETE EDUCATION ERROR:"
      );
      console.error(error);

      res.status(500).json({
        message:
          "Failed to delete education",
        error: error.message,
      });
    }
  }
);

// =====================================================
// UPLOAD EDUCATION DOCUMENT
//
// POST
// /api/education/:educationId/documents
// =====================================================

router.post(
  "/:educationId/documents",
  upload.single("file"),
  async (req, res) => {
    try {
      const { educationId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          educationId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid education ID",
        });
      }

      const education =
        await Education.findById(
          educationId
        );

      if (!education) {
        return res.status(404).json({
          message:
            "Education not found",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message:
            "No document selected",
        });
      }

      const fileUrl =
        "/uploads/education/" +
        req.file.filename;

      const document = {
        name:
          req.body.name ||
          req.file.originalname,

        fileName:
          req.file.originalname,

        fileUrl: fileUrl,

        fileType:
          req.file.mimetype,

        fileSize:
          req.file.size,
      };

      education.documents.push(
        document
      );

      await education.save();

      const savedDocument =
        education.documents[
          education.documents.length - 1
        ];

      res.status(201).json({
        message:
          "Education document uploaded successfully",

        document:
          savedDocument,
      });
    } catch (error) {
      console.error(
        "UPLOAD EDUCATION DOCUMENT ERROR:"
      );
      console.error(error);

      // Delete uploaded file when database
      // operation fails.
      if (req.file) {
        try {
          fs.unlinkSync(
            req.file.path
          );
        } catch (_) {
          // Ignore cleanup error.
        }
      }

      res.status(500).json({
        message:
          "Failed to upload education document",
        error: error.message,
      });
    }
  }
);

// =====================================================
// RENAME EDUCATION DOCUMENT
//
// PUT
// /api/education/:educationId/documents/:documentId
// =====================================================

router.put(
  "/:educationId/documents/:documentId",
  async (req, res) => {
    try {
      const {
        educationId,
        documentId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          educationId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid education ID",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          documentId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid document ID",
        });
      }

      const education =
        await Education.findById(
          educationId
        );

      if (!education) {
        return res.status(404).json({
          message:
            "Education not found",
        });
      }

      const document =
        education.documents.id(
          documentId
        );

      if (!document) {
        return res.status(404).json({
          message:
            "Document not found",
        });
      }

      const name =
        req.body.name;

      if (
        !name ||
        String(name).trim() === ""
      ) {
        return res.status(400).json({
          message:
            "Document name is required",
        });
      }

      document.name =
        String(name).trim();

      await education.save();

      res.status(200).json({
        message:
          "Document renamed successfully",

        document:
          document,
      });
    } catch (error) {
      console.error(
        "RENAME EDUCATION DOCUMENT ERROR:"
      );
      console.error(error);

      res.status(500).json({
        message:
          "Failed to rename document",
        error: error.message,
      });
    }
  }
);

// =====================================================
// DELETE EDUCATION DOCUMENT
//
// DELETE
// /api/education/:educationId/documents/:documentId
// =====================================================

router.delete(
  "/:educationId/documents/:documentId",
  async (req, res) => {
    try {
      const {
        educationId,
        documentId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          educationId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid education ID",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          documentId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid document ID",
        });
      }

      const education =
        await Education.findById(
          educationId
        );

      if (!education) {
        return res.status(404).json({
          message:
            "Education not found",
        });
      }

      const document =
        education.documents.id(
          documentId
        );

      if (!document) {
        return res.status(404).json({
          message:
            "Document not found",
        });
      }

      const fileUrl =
        document.fileUrl;

      education.documents.pull(
        documentId
      );

      await education.save();

      // Delete physical file after
      // database update succeeds.
      deletePhysicalFile(fileUrl);

      res.status(200).json({
        message:
          "Education document deleted successfully",
        id: documentId,
      });
    } catch (error) {
      console.error(
        "DELETE EDUCATION DOCUMENT ERROR:"
      );
      console.error(error);

      res.status(500).json({
        message:
          "Failed to delete document",
        error: error.message,
      });
    }
  }
);

module.exports = router;