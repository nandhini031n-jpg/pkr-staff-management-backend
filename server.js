const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const authRoutes = require('./routes/auth');
const staffRoutes = require('./routes/staff');
const hodRoutes = require('./routes/hod');
const reportRoutes = require('./routes/report');

const app = express();

// =========================================================================
// 1. Cross-Environment Port Detection:
//    - Render sets process.env.PORT (typically 10000).
//    - Local dev defaults to 5000 with auto-fallback to 5001, 5002...
// =========================================================================
const isRender = Boolean(process.env.RENDER || process.env.PORT === '10000');
const TARGET_PORT = parseInt(process.env.PORT || '5000', 10);

// Ensure uploads folder exists for photos and PDFs
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Global Cross-Origin & Request Parsing (Allows Mobile, Web, Emulator)
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/report', reportRoutes);

// Health Check with Environment & Active Port Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    institution: 'P.K.R. ARTS COLLEGE FOR WOMEN',
    location: 'GOBICHETTIPALAYAM – 638476',
    environment: isRender ? 'Render Cloud Production' : 'Local Development',
    configuredPort: TARGET_PORT,
    activePort: req.socket.localPort,
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
    timestamp: new Date().toISOString(),
  });
});

// MongoDB Atlas Connection URI
const MONGODB_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb+srv://pkr-user_31:successN1@pkrstaffdb.em8xlfw.mongodb.net/PKRStaffDB?retryWrites=true&w=majority';

// =========================================================================
// 2. Resilient Server Starter with Dynamic Port Fallback
// =========================================================================
function startServer(port, attempt = 1) {
  // Binding to '0.0.0.0' allows external phone, USB reverse, and LAN connections
  const server = app.listen(port, '0.0.0.0', () => {
    const actualPort = server.address().port;
    console.log('====================================================');
    console.log('  P.K.R. ARTS COLLEGE FOR WOMEN, GOBICHETTIPALAYAM');
    console.log('  MongoDB Atlas Connected: PKRStaffDB');
    console.log(`  Environment: ${isRender ? 'Render Cloud (PORT 10000)' : 'Local Development'}`);
    console.log(`  Backend listening on: http://0.0.0.0:${actualPort}`);
    console.log('====================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[WARN] Port ${port} is currently in use.`);

      if (isRender && process.env.PORT) {
        // In cloud environments like Render, the assigned port cannot change
        console.error(`Fatal: Assigned Render port ${port} is occupied.`);
        process.exit(1);
      } else if (attempt <= 10) {
        // In local development: automatically try next sequential port
        const nextPort = port + 1;
        console.log(`[INFO] Automatically falling back to dynamic port: ${nextPort} (Attempt ${attempt + 1})...`);
        startServer(nextPort, attempt + 1);
      } else {
        // If many ports are busy, bind to any available system port (0)
        console.log('[INFO] Sequential ports busy. Requesting open dynamic OS port...');
        startServer(0, attempt + 1);
      }
    } else {
      console.error('Server execution error:', err);
    }
  });
}

// Connect to MongoDB Atlas and trigger server startup
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    startServer(TARGET_PORT);
  })
  .catch((err) => {
    console.error('MongoDB Atlas Connection Error:', err);
  });