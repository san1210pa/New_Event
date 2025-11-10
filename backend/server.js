const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Initialize Firebase Admin (must be before routes)
require('./config/firebaseAdmin');

const requestLogger = require('./middleware/requestLogger');
const registrationRouter = require('./routes/registration');
const otpRouter = require('./routes/otp');
const Registration = require('./models/Registration');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/malwa_event';

// Security middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] // Replace with your actual domain
    : ['http://localhost:3000', 'http://localhost:4000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// Routes
app.use('/api/otp', otpRouter);
app.use('/api/register', registrationRouter);

// Serve static frontend (index.html and assets) from project root
const staticRoot = path.resolve(__dirname, '..');
app.use(express.static(staticRoot));
app.get('/', (_req, res) => {
  res.sendFile(path.join(staticRoot, 'index.html'));
});

// Health endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint to check database info
app.get('/api/debug/db-info', async (_req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const registrationCount = await Registration.countDocuments();
    
    // Get sample documents
    const sampleDocs = await Registration.find().limit(5).lean();
    
    res.json({
      database: db.databaseName,
      connectionState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      collections: collections.map(c => c.name),
      registrationCollection: 'registrations',
      registrationCount: registrationCount,
      sampleDocuments: sampleDocs,
      connectionUri: MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
      instructions: {
        checkInCompass: `In MongoDB Compass, connect to: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`,
        databaseName: db.databaseName,
        collectionName: 'registrations',
        fullPath: `${db.databaseName}.registrations`
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Database connection and server start
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    const db = mongoose.connection.db;
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database Name: ${db.databaseName}`);
    console.log(`🔗 Connection URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials in logs
    console.log(`📦 Collections will be created in: ${db.databaseName}`);
    console.log(`📋 Registration model uses collection: registrations (Mongoose pluralizes 'Registration' -> 'registrations')`);
    
    // Connection event handlers
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ Mongoose disconnected from MongoDB');
    });
    
    app.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  });

