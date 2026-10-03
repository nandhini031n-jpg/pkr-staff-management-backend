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
// 1. Environment & Dynamic Port Detection:
//    - Render sets process.env.PORT (typically 10000).
//    - Local dev defaults to 5000 with auto-fallback to 5001, 5002...
// =========================================================================
const isRender = Boolean(process.env.RENDER || process.env.PORT === '10000');
const TARGET_PORT = parseInt(process.env.PORT || '5000', 10);

// Ensure uploads folder exists for photos and PDF files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Global Cross-Origin & Request Parsing
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// =========================================================================
// 2. Root Welcome Route (Fixes "Cannot GET /" in the browser)
// =========================================================================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PKR Staff Management Backend</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          background: #0f172a; 
          color: #f8fafc; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          min-height: 100vh; 
          margin: 0; 
          text-align: center; 
          padding: 20px; 
        }
        .card { 
          background: #1e293b; 
          padding: 40px; 
          border-radius: 16px; 
          border: 1px solid #334155; 
          max-width: 600px; 
          box-shadow: 0 10px 25px rgba(0,0,0,0.5); 
        }
        h1 { color: #38bdf8; font-size: 22px; margin-bottom: 6px; }
        h2 { color: #94a3b8; font-size: 15px; margin-top: 0; font-weight: 500; }
        .badge { 
          display: inline-block; 
          background: #10b981; 
          color: #fff; 
          padding: 6px 16px; 
          border-radius: 20px; 
          font-weight: 600; 
          font-size: 14px; 
          margin: 18px 0; 
        }
        p { color: #cbd5e1; font-size: 14px; line-height: 1.6; }
        a { 
          display: inline-block;
          margin-top: 10px;
          color: #38bdf8; 
          text-decoration: none; 
          font-weight: 600;
          padding: 8px 16px;
          border: 1px solid #38bdf8;
          border-radius: 8px;
          transition: 0.2s;
        }
        a:hover { background: #38bdf8; color: #0f172a; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>P.K.R. ARTS COLLEGE FOR WOMEN</h1>
        <h2>Gobichettipalayam – 638476</h2>
        <div class="badge">● BACKEND IS LIVE & CONNECTED</div>
        <p>The Staff Management REST API is actively listening and running on Render Cloud.</p>
        <p><a href="/api/health">Check API Health Status (/api/health)</a></p>
      </div>
    </body>
    </html>
  `);
});

// =========================================================================
// 3. API Routes
// =========================================================================
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/report', reportRoutes);

// Health Check with Environment & Database Status
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
// 4. Server Starter with Dynamic Port Fallback
// =========================================================================
function startServer(port, attempt = 1) {
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
        console.error(`Fatal: Assigned Render port ${port} is occupied.`);
        process.exit(1);
      } else if (attempt <= 10) {
        const nextPort = port + 1;
        console.log(`[INFO] Automatically falling back to dynamic port: ${nextPort} (Attempt ${attempt + 1})...`);
        startServer(nextPort, attempt + 1);
      } else {
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