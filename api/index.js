const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Initialize Firebase Admin (must be before routes)
require('../backend/config/firebaseAdmin');

const requestLogger = require('../backend/middleware/requestLogger');
const registrationRouter = require('../backend/routes/registration');
const otpRouter = require('../backend/routes/otp');

dotenv.config();

const app = express();
const MONGODB_URI = process.env.MONGODB_URI;

// Core middleware
app.use(cors({
  origin: true, // Allow all origins in Vercel (or specify your domain)
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// Database connection (optimized for serverless)
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    const db = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    cachedDb = db;
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

// Initialize database connection
connectToDatabase().catch(console.error);

// Routes
app.use('/api/otp', otpRouter);
app.use('/api/register', registrationRouter);

// Health endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint
app.get('/api/debug/db-info', async (_req, res) => {
  try {
    const Registration = require('../backend/models/Registration');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const registrationCount = await Registration.countDocuments();
    const sampleDocs = await Registration.find().limit(5).lean();
    
    res.json({
      database: db.databaseName,
      connectionState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      collections: collections.map(c => c.name),
      registrationCollection: 'registrations',
      registrationCount: registrationCount,
      sampleDocuments: sampleDocs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export the Express app as a serverless function
module.exports = app;

