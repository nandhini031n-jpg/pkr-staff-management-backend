require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

const PORT = Number(process.env.PORT || 5000);

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());

app.use(
  express.json({
    limit: "20mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "20mb",
  })
);

// =====================================================
// UPLOADS
// =====================================================

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

// =====================================================
// STAFF ROUTES
// =====================================================

const staffRoutes = require("./routes/staff");

app.use(
  "/api/staff",
  staffRoutes
);

// =====================================================
// EDUCATION ROUTES
// =====================================================

const educationRoutes = require("./routes/education");

app.use(
  "/api/education",
  educationRoutes
);

// =====================================================
// RESEARCH ROUTES
// =====================================================

const researchRoutes = require("./researchRoutes");

app.use(
  "/api/research",
  researchRoutes
);

// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
  res.json({
    message: "PKR Staff Management API is running",
  });
});

// =====================================================
// HEALTH
// =====================================================

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "PKR backend is healthy",
  });
});

// =====================================================
// 404
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    message: "API route not found",
    path: req.originalUrl,
  });
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:");
  console.error(err);

  res.status(500).json({
    message:
      err.message ||
      "Internal server error",
  });
});

// =====================================================
// MONGODB + SERVER START
// =====================================================

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing in .env file"
      );
    }

    console.log(
      "Connecting to MongoDB..."
    );

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "MongoDB connected successfully!"
    );

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `PKR server running on port ${PORT}`
        );

        console.log(
          `Local: http://localhost:${PORT}`
        );

        console.log(
          `Staff API: http://localhost:${PORT}/api/staff`
        );

        console.log(
          `Education API: http://localhost:${PORT}/api/education`
        );

        console.log(
          `Research API: http://localhost:${PORT}/api/research`
        );
      }
    );
  } catch (error) {
    console.error(
      "Server startup failed:"
    );

    console.error(error);

    process.exit(1);
  }
}

startServer();