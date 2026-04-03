const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes (we'll add these soon)
const feedbackRoutes = require('./routes/feedback.routes');
const authRoutes = require('./routes/auth.routes');

app.use('/api/feedback', feedbackRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'FeedPulse API is running!' });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(process.env.PORT || 4000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 4000}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });