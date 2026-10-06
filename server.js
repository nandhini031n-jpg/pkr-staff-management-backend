// server.js
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', success: true });
});

function mountRoute(urlPath, filePath) {
  const fullPath = path.join(__dirname, filePath + '.js');
  if (fs.existsSync(fullPath)) {
    app.use(urlPath, require('./' + filePath));
    console.log('Route loaded: ' + urlPath + '  ->  ' + filePath + '.js');
  } else {
    console.log('Route skipped (file not found): ' + filePath + '.js');
  }
}

mountRoute('/api/auth', 'routes/auth');
mountRoute('/api/hod', 'routes/hod');
mountRoute('/api/staff', 'routes/staff');
mountRoute('/api/documents', 'routes/documents');
mountRoute('/api/report', 'routes/report');

const MONGO_URL =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  process.env.DATABASE_URL ||
  process.env.DB_URL;

if (!MONGO_URL) {
  console.error('No MongoDB variable found. Add MONGO_URI in Render -> Environment.');
}

mongoose
  .connect(MONGO_URL)
  .then(() => console.log('MongoDB Atlas Connected: ' + mongoose.connection.name))
  .catch((err) => console.error('MongoDB error:', err));

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found: ' + req.originalUrl });
});

app.use((err, req, res, next) => {
  console.error('UNHANDLED ERROR:', err);
  res.status(500).json({ success: false, message: 'Server error.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('Backend listening on: http://0.0.0.0:' + PORT);
});