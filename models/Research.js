const mongoose = require('mongoose');

const researchDocumentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: '',
    },
    fileName: {
      type: String,
      required: true,
      default: '',
    },
    fileType: {
      type: String,
      default: '',
    },
    fileUrl: {
      type: String,
      required: true,
      default: '',
    },
  },
  {
    _id: true,
  }
);

const linkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: '',
    },
    url: {
      type: String,
      default: '',
    },
  },
  {
    _id: true,
  }
);

const journalPublicationSchema = new mongoose.Schema(
  {
    articleTitle: {
      type: String,
      default: '',
    },
    authors: {
      type: String,
      default: '',
    },
    journal: {
      type: String,
      default: '',
    },
    index: {
      type: String,
      default: '',
    },
    publicationYear: {
      type: String,
      default: '',
    },
    doi: {
      type: String,
      default: '',
    },
    document: {
      type: researchDocumentSchema,
      default: null,
    },
    link: {
      type: linkSchema,
      default: null,
    },
  },
  {
    _id: true,
  }
);

const conferenceSchema = new mongoose.Schema(
  {
    conferenceName: {
      type: String,
      default: '',
    },
    paperTitle: {
      type: String,
      default: '',
    },
    date: {
      type: String,
      default: '',
    },
    venue: {
      type: String,
      default: '',
    },
    document: {
      type: researchDocumentSchema,
      default: null,
    },
    link: {
      type: linkSchema,
      default: null,
    },
  },
  {
    _id: true,
  }
);

const bookPublicationSchema = new mongoose.Schema(
  {
    bookTitle: {
      type: String,
      default: '',
    },
    author: {
      type: String,
      default: '',
    },
    publisher: {
      type: String,
      default: '',
    },
    isbn: {
      type: String,
      default: '',
    },
    document: {
      type: researchDocumentSchema,
      default: null,
    },
    link: {
      type: linkSchema,
      default: null,
    },
  },
  {
    _id: true,
  }
);

const bookChapterSchema = new mongoose.Schema(
  {
    chapterTitle: {
      type: String,
      default: '',
    },
    book: {
      type: String,
      default: '',
    },
    author: {
      type: String,
      default: '',
    },
    document: {
      type: researchDocumentSchema,
      default: null,
    },
    link: {
      type: linkSchema,
      default: null,
    },
  },
  {
    _id: true,
  }
);

const additionalCourseSchema = new mongoose.Schema(
  {
    course: {
      type: String,
      default: '',
    },
    institution: {
      type: String,
      default: '',
    },
    duration: {
      type: String,
      default: '',
    },
    result: {
      type: String,
      default: '',
    },
    document: {
      type: researchDocumentSchema,
      default: null,
    },
    link: {
      type: linkSchema,
      default: null,
    },
  },
  {
    _id: true,
  }
);

const guestInvitationSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      default: '',
    },
    invitedAs: {
      type: String,
      default: '',
    },
    institutionOrganizer: {
      type: String,
      default: '',
    },
    invitationDocument: {
      type: researchDocumentSchema,
      default: null,
    },
    eventLink: {
      type: linkSchema,
      default: null,
    },
  },
  {
    _id: true,
  }
);

const researchSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      unique: true,
      index: true,
    },

    researchProfile: {
      researchArea: {
        type: String,
        default: '',
      },
      researchInterests: {
        type: String,
        default: '',
      },
      cvDocument: {
        type: researchDocumentSchema,
        default: null,
      },
      googleScholarLink: {
        type: String,
        default: '',
      },
      orcidLink: {
        type: String,
        default: '',
      },
    },

    journalPublications: {
      type: [journalPublicationSchema],
      default: [],
    },

    internationalConferences: {
      type: [conferenceSchema],
      default: [],
    },

    nationalConferences: {
      type: [conferenceSchema],
      default: [],
    },

    bookPublications: {
      type: [bookPublicationSchema],
      default: [],
    },

    bookChapterPublications: {
      type: [bookChapterSchema],
      default: [],
    },

    additionalCourses: {
      type: [additionalCourseSchema],
      default: [],
    },

    guestInvitations: {
      type: [guestInvitationSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Research', researchSchema);