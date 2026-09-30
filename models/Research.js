const mongoose = require("mongoose");

// ============================================================
// DOCUMENT SCHEMA
// ============================================================

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
    },

    fileName: {
      type: String,
      default: "",
    },

    fileUrl: {
      type: String,
      default: "",
    },

    fileType: {
      type: String,
      default: "",
    },

    fileSize: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: true,
  }
);

// ============================================================
// RESEARCH SCHEMA
// ============================================================

const researchSchema = new mongoose.Schema(
  {
    // ----------------------------------------------------------
    // STAFF CONNECTION
    // ----------------------------------------------------------

    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      unique: true,
    },

    // ----------------------------------------------------------
    // RESEARCH PROFILE
    // ----------------------------------------------------------

    researchProfile: {
      researchArea: {
        type: String,
        default: "",
      },

      researchInterests: {
        type: String,
        default: "",
      },

      googleScholarLink: {
        type: String,
        default: "",
      },

      orcidLink: {
        type: String,
        default: "",
      },

      cvDocument: {
        type: documentSchema,
        default: null,
      },
    },

    // ----------------------------------------------------------
    // JOURNAL PUBLICATIONS
    // ----------------------------------------------------------

    journalPublications: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    // ----------------------------------------------------------
    // INTERNATIONAL CONFERENCES
    // ----------------------------------------------------------

    internationalConferences: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    // ----------------------------------------------------------
    // NATIONAL CONFERENCES
    // ----------------------------------------------------------

    nationalConferences: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    // ----------------------------------------------------------
    // BOOK PUBLICATIONS
    // ----------------------------------------------------------

    bookPublications: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    // ----------------------------------------------------------
    // BOOK CHAPTER PUBLICATIONS
    // ----------------------------------------------------------

    bookChapterPublications: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    // ----------------------------------------------------------
    // ADDITIONAL COURSES
    // ----------------------------------------------------------

    additionalCourses: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    // ----------------------------------------------------------
    // GUEST INVITATIONS
    // ----------------------------------------------------------

    guestInvitations: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// EXPORT
// ============================================================

module.exports =
  mongoose.models.Research ||
  mongoose.model("Research", researchSchema);