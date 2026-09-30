const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Research = require("./models/Research");
const Staff = require("./models/Staff");

const router = express.Router();

// ============================================================
// RESEARCH UPLOAD DIRECTORY
// ============================================================

const uploadDirectory = path.join(
  __dirname,
  "uploads",
  "research"
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

// ============================================================
// MULTER STORAGE
// ============================================================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },

  filename: function (req, file, cb) {
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    const uniqueName =
      Date.now() +
      "_" +
      Math.round(Math.random() * 1000000) +
      "_" +
      safeName;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,

  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

// ============================================================
// SECTION NAME CONVERSION
// ============================================================

function normalizeSection(section) {
  if (!section) {
    return null;
  }

  const value = String(section).trim();

  const map = {
    researchProfile: "researchProfile",

    journal: "journalPublications",
    journalPublications: "journalPublications",

    international: "internationalConferences",
    internationalConferences: "internationalConferences",

    national: "nationalConferences",
    nationalConferences: "nationalConferences",

    book: "bookPublications",
    bookPublications: "bookPublications",

    chapter: "bookChapterPublications",
    bookChapter: "bookChapterPublications",
    bookChapterPublications: "bookChapterPublications",

    course: "additionalCourses",
    additionalCourses: "additionalCourses",

    guest: "guestInvitations",
    guestInvitations: "guestInvitations",
  };

  return map[value] || null;
}

// ============================================================
// GET RESEARCH BY STAFF ID
// ============================================================

router.get("/staff/:staffId", async (req, res) => {
  try {
    const { staffId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({
        message: "Invalid staff ID",
      });
    }

    const staff = await Staff.findById(staffId);

    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    let research = await Research.findOne({
      staff: staffId,
    });

    // Automatically create Research profile
    // if this staff member does not have one.
    if (!research) {
      research = await Research.create({
        staff: staffId,
      });
    }

    return res.json(research);
  } catch (error) {
    console.error("Get research error:", error);

    return res.status(500).json({
      message: "Failed to get research",
      error: error.message,
    });
  }
});

// ============================================================
// CREATE RESEARCH
// ============================================================

router.post("/", async (req, res) => {
  try {
    const { staffId } = req.body;

    if (!staffId) {
      return res.status(400).json({
        message: "staffId is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({
        message: "Invalid staff ID",
      });
    }

    const staff = await Staff.findById(staffId);

    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    let research = await Research.findOne({
      staff: staffId,
    });

    if (research) {
      return res.json(research);
    }

    research = await Research.create({
      staff: staffId,
    });

    return res.status(201).json(research);
  } catch (error) {
    console.error("Create research error:", error);

    return res.status(500).json({
      message: "Failed to create research",
      error: error.message,
    });
  }
});

// ============================================================
// UPDATE RESEARCH
// ============================================================

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid research ID",
      });
    }

    // Do not allow these fields to be changed accidentally.
    const updateData = {
      researchProfile: req.body.researchProfile,
      journalPublications: req.body.journalPublications,
      internationalConferences:
        req.body.internationalConferences,
      nationalConferences:
        req.body.nationalConferences,
      bookPublications:
        req.body.bookPublications,
      bookChapterPublications:
        req.body.bookChapterPublications,
      additionalCourses:
        req.body.additionalCourses,
      guestInvitations:
        req.body.guestInvitations,
    };

    // Remove undefined properties.
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const research = await Research.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!research) {
      return res.status(404).json({
        message: "Research record not found",
      });
    }

    return res.json(research);
  } catch (error) {
    console.error("Update research error:", error);

    return res.status(500).json({
      message: "Failed to update research",
      error: error.message,
    });
  }
});

// ============================================================
// DELETE RESEARCH
// ============================================================

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid research ID",
      });
    }

    const research = await Research.findById(id);

    if (!research) {
      return res.status(404).json({
        message: "Research record not found",
      });
    }

    // Delete uploaded physical files.
    deleteFilesFromResearch(research);

    await Research.findByIdAndDelete(id);

    return res.json({
      message: "Research deleted successfully",
    });
  } catch (error) {
    console.error("Delete research error:", error);

    return res.status(500).json({
      message: "Failed to delete research",
      error: error.message,
    });
  }
});

// ============================================================
// HELPER — DELETE PHYSICAL FILE
// ============================================================

function deletePhysicalFile(fileUrl) {
  try {
    if (!fileUrl) {
      return;
    }

    const fileName = path.basename(fileUrl);

    const filePath = path.join(
      uploadDirectory,
      fileName
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);

      console.log(
        "Deleted research file:",
        fileName
      );
    }
  } catch (error) {
    console.error(
      "Failed to delete physical file:",
      error.message
    );
  }
}

// ============================================================
// HELPER — DELETE ALL FILES FROM RESEARCH
// ============================================================

function deleteFilesFromResearch(research) {
  try {
    // Research profile CV
    if (
      research.researchProfile &&
      research.researchProfile.cvDocument &&
      research.researchProfile.cvDocument.fileUrl
    ) {
      deletePhysicalFile(
        research.researchProfile.cvDocument.fileUrl
      );
    }

    const arraySections = [
      "journalPublications",
      "internationalConferences",
      "nationalConferences",
      "bookPublications",
      "bookChapterPublications",
      "additionalCourses",
      "guestInvitations",
    ];

    for (const section of arraySections) {
      const items = research[section];

      if (!Array.isArray(items)) {
        continue;
      }

      for (const item of items) {
        if (!item) {
          continue;
        }

        const possibleDocuments = [
          item.document,
          item.invitationDocument,
          item.cvDocument,
        ];

        for (const document of possibleDocuments) {
          if (
            document &&
            document.fileUrl
          ) {
            deletePhysicalFile(
              document.fileUrl
            );
          }
        }
      }
    }
  } catch (error) {
    console.error(
      "Delete research files error:",
      error.message
    );
  }
}

// ============================================================
// UPLOAD / CHANGE DOCUMENT
// ============================================================

router.post(
  "/:researchId/documents",
  upload.single("document"),
  async (req, res) => {
    try {
      const { researchId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(researchId)) {
        if (req.file) {
          deletePhysicalFile(
            "/uploads/research/" +
              req.file.filename
          );
        }

        return res.status(400).json({
          message: "Invalid research ID",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "No document selected",
        });
      }

      const research =
        await Research.findById(researchId);

      if (!research) {
        deletePhysicalFile(
          "/uploads/research/" +
            req.file.filename
        );

        return res.status(404).json({
          message: "Research record not found",
        });
      }

      const section =
        normalizeSection(req.body.section);

      if (!section) {
        deletePhysicalFile(
          "/uploads/research/" +
            req.file.filename
        );

        return res.status(400).json({
          message:
            "Invalid research document section",
        });
      }

      const fileUrl =
        "/uploads/research/" +
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

      // ======================================================
      // PROFILE → CV
      // ======================================================

      if (section === "researchProfile") {
        if (!research.researchProfile) {
          research.researchProfile = {};
        }

        // Delete old CV physical file.
        if (
          research.researchProfile.cvDocument &&
          research.researchProfile.cvDocument.fileUrl
        ) {
          deletePhysicalFile(
            research.researchProfile
              .cvDocument
              .fileUrl
          );
        }

        research.researchProfile.cvDocument =
          document;

        await research.save();

        return res.status(201).json({
          message:
            "CV document uploaded successfully",

          name: document.name,
          fileName: document.fileName,
          fileUrl: document.fileUrl,
          fileType: document.fileType,
          fileSize: document.fileSize,

          research: research,
        });
      }

      // ======================================================
      // ARRAY SECTIONS
      // ======================================================

      if (!Array.isArray(research[section])) {
        research[section] = [];
      }

      const itemId = req.body.itemId;

      let itemIndex = -1;

      if (itemId) {
        itemIndex = research[section].findIndex(
          (item) => {
            if (!item) {
              return false;
            }

            const currentId =
              item._id ||
              item.id;

            return (
              currentId &&
              String(currentId) ===
                String(itemId)
            );
          }
        );
      }

      // ======================================================
      // DOCUMENT FIELD
      // ======================================================

      let documentField =
        req.body.field || "document";

      if (
        section === "guestInvitations" &&
        !req.body.field
      ) {
        documentField =
          "invitationDocument";
      }

      // ======================================================
      // EXISTING ITEM
      // ======================================================

      if (itemIndex !== -1) {
        const item =
          research[section][itemIndex];

        // Delete old document.
        if (
          item[documentField] &&
          item[documentField].fileUrl
        ) {
          deletePhysicalFile(
            item[documentField].fileUrl
          );
        }

        item[documentField] =
          document;

        await research.save();

        return res.status(201).json({
          message:
            "Document uploaded successfully",

          name: document.name,
          fileName: document.fileName,
          fileUrl: document.fileUrl,
          fileType: document.fileType,
          fileSize: document.fileSize,

          research: research,
        });
      }

      // ======================================================
      // NO ITEM ID
      //
      // Create a new item containing the document.
      // ======================================================

      const newItem = {};

      newItem[documentField] =
        document;

      research[section].push(
        newItem
      );

      await research.save();

      return res.status(201).json({
        message:
          "Document uploaded successfully",

        name: document.name,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
        fileType: document.fileType,
        fileSize: document.fileSize,

        research: research,
      });
    } catch (error) {
      console.error(
        "Research document upload error:",
        error
      );

      if (req.file) {
        deletePhysicalFile(
          "/uploads/research/" +
            req.file.filename
        );
      }

      return res.status(500).json({
        message:
          "Research document upload failed",

        error: error.message,
      });
    }
  }
);

// ============================================================
// DELETE DOCUMENT
// ============================================================

router.delete(
  "/:researchId/documents",
  async (req, res) => {
    try {
      const { researchId } =
        req.params;

      const {
        section,
        itemId,
        field,
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          researchId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid research ID",
        });
      }

      const research =
        await Research.findById(
          researchId
        );

      if (!research) {
        return res.status(404).json({
          message:
            "Research record not found",
        });
      }

      const normalizedSection =
        normalizeSection(section);

      if (!normalizedSection) {
        return res.status(400).json({
          message:
            "Invalid research section",
        });
      }

      // ======================================================
      // PROFILE CV
      // ======================================================

      if (
        normalizedSection ===
        "researchProfile"
      ) {
        if (
          research.researchProfile &&
          research.researchProfile
            .cvDocument
        ) {
          const document =
            research.researchProfile
              .cvDocument;

          if (document.fileUrl) {
            deletePhysicalFile(
              document.fileUrl
            );
          }

          research.researchProfile
            .cvDocument = null;
        }

        await research.save();

        return res.json({
          message:
            "CV document deleted successfully",

          research: research,
        });
      }

      // ======================================================
      // ARRAY DOCUMENT
      // ======================================================

      if (
        !Array.isArray(
          research[normalizedSection]
        )
      ) {
        return res.status(400).json({
          message:
            "Research section is invalid",
        });
      }

      let itemIndex = -1;

      if (itemId) {
        itemIndex =
          research[
            normalizedSection
          ].findIndex((item) => {
            if (!item) {
              return false;
            }

            const currentId =
              item._id ||
              item.id;

            return (
              currentId &&
              String(currentId) ===
                String(itemId)
            );
          });
      }

      if (itemIndex === -1) {
        return res.status(404).json({
          message:
            "Research item not found",
        });
      }

      const item =
        research[
          normalizedSection
        ][itemIndex];

      let documentField =
        field || "document";

      if (
        normalizedSection ===
          "guestInvitations" &&
        !field
      ) {
        documentField =
          "invitationDocument";
      }

      const document =
        item[documentField];

      if (
        document &&
        document.fileUrl
      ) {
        deletePhysicalFile(
          document.fileUrl
        );
      }

      item[documentField] =
        null;

      await research.save();

      return res.json({
        message:
          "Document deleted successfully",

        research: research,
      });
    } catch (error) {
      console.error(
        "Delete research document error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to delete research document",

        error: error.message,
      });
    }
  }
);

// ============================================================
// RENAME DOCUMENT
// ============================================================

router.patch(
  "/:researchId/documents/name",
  async (req, res) => {
    try {
      const { researchId } =
        req.params;

      const {
        section,
        itemId,
        field,
        name,
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          researchId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid research ID",
        });
      }

      if (!name || !String(name).trim()) {
        return res.status(400).json({
          message:
            "Document name is required",
        });
      }

      const research =
        await Research.findById(
          researchId
        );

      if (!research) {
        return res.status(404).json({
          message:
            "Research record not found",
        });
      }

      const normalizedSection =
        normalizeSection(section);

      if (!normalizedSection) {
        return res.status(400).json({
          message:
            "Invalid research section",
        });
      }

      // ======================================================
      // PROFILE CV
      // ======================================================

      if (
        normalizedSection ===
        "researchProfile"
      ) {
        if (
          !research.researchProfile ||
          !research.researchProfile
            .cvDocument
        ) {
          return res.status(404).json({
            message:
              "CV document not found",
          });
        }

        research.researchProfile
          .cvDocument.name =
          String(name).trim();

        await research.save();

        return res.json({
          message:
            "Document renamed successfully",

          document:
            research.researchProfile
              .cvDocument,

          research: research,
        });
      }

      // ======================================================
      // ARRAY DOCUMENT
      // ======================================================

      if (
        !Array.isArray(
          research[normalizedSection]
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid research section",
        });
      }

      const itemIndex =
        research[
          normalizedSection
        ].findIndex((item) => {
          if (!item) {
            return false;
          }

          const currentId =
            item._id ||
            item.id;

          return (
            currentId &&
            String(currentId) ===
              String(itemId)
          );
        });

      if (itemIndex === -1) {
        return res.status(404).json({
          message:
            "Research item not found",
        });
      }

      const item =
        research[
          normalizedSection
        ][itemIndex];

      let documentField =
        field || "document";

      if (
        normalizedSection ===
          "guestInvitations" &&
        !field
      ) {
        documentField =
          "invitationDocument";
      }

      if (
        !item[documentField]
      ) {
        return res.status(404).json({
          message:
            "Document not found",
        });
      }

      item[documentField].name =
        String(name).trim();

      await research.save();

      return res.json({
        message:
          "Document renamed successfully",

        document:
          item[documentField],

        research: research,
      });
    } catch (error) {
      console.error(
        "Rename research document error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to rename research document",

        error: error.message,
      });
    }
  }
);

// ============================================================
// ALSO SUPPORT PUT FOR RENAME
// ============================================================

router.put(
  "/:researchId/documents/name",
  async (req, res) => {
    try {
      const {
        researchId,
      } = req.params;

      const {
        section,
        itemId,
        field,
        name,
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          researchId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid research ID",
        });
      }

      if (!name || !String(name).trim()) {
        return res.status(400).json({
          message:
            "Document name is required",
        });
      }

      const research =
        await Research.findById(
          researchId
        );

      if (!research) {
        return res.status(404).json({
          message:
            "Research record not found",
        });
      }

      const normalizedSection =
        normalizeSection(section);

      if (!normalizedSection) {
        return res.status(400).json({
          message:
            "Invalid research section",
        });
      }

      if (
        normalizedSection ===
        "researchProfile"
      ) {
        if (
          !research.researchProfile ||
          !research.researchProfile
            .cvDocument
        ) {
          return res.status(404).json({
            message:
              "CV document not found",
          });
        }

        research.researchProfile
          .cvDocument.name =
          String(name).trim();

        await research.save();

        return res.json({
          message:
            "Document renamed successfully",

          document:
            research.researchProfile
              .cvDocument,

          research: research,
        });
      }

      if (
        !Array.isArray(
          research[normalizedSection]
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid research section",
        });
      }

      const itemIndex =
        research[
          normalizedSection
        ].findIndex((item) => {
          if (!item) {
            return false;
          }

          const currentId =
            item._id ||
            item.id;

          return (
            currentId &&
            String(currentId) ===
              String(itemId)
          );
        });

      if (itemIndex === -1) {
        return res.status(404).json({
          message:
            "Research item not found",
        });
      }

      const item =
        research[
          normalizedSection
        ][itemIndex];

      let documentField =
        field || "document";

      if (
        normalizedSection ===
          "guestInvitations" &&
        !field
      ) {
        documentField =
          "invitationDocument";
      }

      if (
        !item[documentField]
      ) {
        return res.status(404).json({
          message:
            "Document not found",
        });
      }

      item[documentField].name =
        String(name).trim();

      await research.save();

      return res.json({
        message:
          "Document renamed successfully",

        document:
          item[documentField],

        research: research,
      });
    } catch (error) {
      console.error(
        "Rename research document error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to rename research document",

        error: error.message,
      });
    }
  }
);

// ============================================================
// GET ONE DOCUMENT
// ============================================================

router.get(
  "/:researchId/documents",
  async (req, res) => {
    try {
      const {
        researchId,
      } = req.params;

      const {
        section,
        itemId,
        field,
      } = req.query;

      if (
        !mongoose.Types.ObjectId.isValid(
          researchId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid research ID",
        });
      }

      const research =
        await Research.findById(
          researchId
        );

      if (!research) {
        return res.status(404).json({
          message:
            "Research record not found",
        });
      }

      const normalizedSection =
        normalizeSection(section);

      if (!normalizedSection) {
        return res.status(400).json({
          message:
            "Invalid research section",
        });
      }

      if (
        normalizedSection ===
        "researchProfile"
      ) {
        const document =
          research.researchProfile &&
          research.researchProfile
            .cvDocument;

        if (!document) {
          return res.status(404).json({
            message:
              "Document not found",
          });
        }

        return res.json(document);
      }

      const items =
        research[
          normalizedSection
        ];

      if (!Array.isArray(items)) {
        return res.status(404).json({
          message:
            "Research section not found",
        });
      }

      const item =
        items.find((currentItem) => {
          if (!currentItem) {
            return false;
          }

          const currentId =
            currentItem._id ||
            currentItem.id;

          return (
            currentId &&
            String(currentId) ===
              String(itemId)
          );
        });

      if (!item) {
        return res.status(404).json({
          message:
            "Research item not found",
        });
      }

      let documentField =
        field || "document";

      if (
        normalizedSection ===
          "guestInvitations" &&
        !field
      ) {
        documentField =
          "invitationDocument";
      }

      const document =
        item[documentField];

      if (!document) {
        return res.status(404).json({
          message:
            "Document not found",
        });
      }

      return res.json(document);
    } catch (error) {
      console.error(
        "Get research document error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get research document",

        error: error.message,
      });
    }
  }
);

// ============================================================
// FINAL EXPORT
// ============================================================

module.exports = router;