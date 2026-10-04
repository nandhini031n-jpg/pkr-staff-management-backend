// server.js
// Install once:  npm install express mongoose cors dotenv bcryptjs jsonwebtoken

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check (the Flutter app calls /api/health)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', success: true });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
// Keep your other existing routes here, for example:
// app.use('/api/staff', require('./routes/staff'));
// app.use('/api/hod', require('./routes/hod'));
// app.use('/api/report', require('./routes/report'));

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

// Global error handler (shows real errors in Render logs)
app.use((err, req, res, next) => {
  console.error('UNHANDLED ERROR:', err);
  res.status(500).json({ success: false, message: 'Server error.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));