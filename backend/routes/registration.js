const express = require('express');
const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const { checkValidationToken } = require('../utils/otpStore');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for registration endpoint
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { message: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', registrationLimiter, async (req, res) => {
  const { name, phone, email, validationToken } = req.body || {};

  // Input validation and sanitization
  if (typeof name !== 'string' || typeof phone !== 'string' || typeof email !== 'string') {
    return res.status(400).json({ message: 'Invalid input format.' });
  }

  if (!name || !phone || !email) {
    return res.status(400).json({ message: 'Name, phone, and email are required.' });
  }

  // Check if OTP validation token is provided and valid
  if (!validationToken) {
    return res.status(400).json({ 
      message: 'OTP validation required. Please verify your OTP first.' 
    });
  }

  if (!checkValidationToken(validationToken)) {
    return res.status(400).json({ 
      message: 'Invalid or expired OTP validation. Please verify your OTP again.' 
    });
  }

  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB connection not ready. State:', mongoose.connection.readyState);
      return res.status(503).json({ 
        message: 'Database connection unavailable. Please try again later.' 
      });
    }

    // Sanitize inputs
    const sanitizedName = name.trim().substring(0, 100);
    const sanitizedPhone = phone.trim();
    const sanitizedEmail = email.trim().toLowerCase().substring(0, 100);

    // Check if phone number already exists
    const existingByPhone = await Registration.findOne({ phone: sanitizedPhone });
    if (existingByPhone) {
      return res.status(409).json({ 
        message: 'This phone number is already registered. Please use a different phone number.' 
      });
    }

    // Check if email already exists
    const existingByEmail = await Registration.findOne({ email: sanitizedEmail });
    if (existingByEmail) {
      return res.status(409).json({ 
        message: 'This email address is already registered. Please use a different email address.' 
      });
    }

    // Create new registration if both phone and email are unique
    const db = mongoose.connection.db;
    const collectionName = Registration.collection.name;
    const databaseName = db.databaseName;
    
    console.log('📝 Creating registration:');
    console.log('   - Database Name:', databaseName);
    console.log('   - Collection Name:', collectionName);
    console.log('   - Full Collection Path:', `${databaseName}.${collectionName}`);
    console.log('   - Data:', { name: sanitizedName, phone: sanitizedPhone, email: sanitizedEmail });
    console.log('   - MongoDB Connection State:', mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected');
    
    // Create the registration document
    const registration = await Registration.create({ 
      name: sanitizedName, 
      phone: sanitizedPhone, 
      email: sanitizedEmail 
    });
    
    console.log('✅ Registration saved successfully!');
    console.log('   - Document ID:', registration._id);
    console.log('   - Document Object:', JSON.stringify(registration.toObject(), null, 2));
    
    // Verify the document was actually saved by querying the collection directly
    const verifyDoc = await Registration.findById(registration._id);
    if (verifyDoc) {
      console.log('✅ Verification: Document confirmed in database');
      console.log('   - Verified Document:', JSON.stringify(verifyDoc.toObject(), null, 2));
    } else {
      console.error('❌ WARNING: Document not found after save!');
    }
    
    // Additional verification: Check collection directly
    const collection = db.collection(collectionName);
    const directQuery = await collection.findOne({ _id: registration._id });
    if (directQuery) {
      console.log('✅ Direct Collection Query: Document found');
      console.log('   - Direct Query Result:', JSON.stringify(directQuery, null, 2));
    } else {
      console.error('❌ WARNING: Document not found via direct collection query!');
    }
    
    // Count total documents in collection
    const totalCount = await Registration.countDocuments();
    console.log(`📊 Total registrations in collection: ${totalCount}`);
    
    return res.status(201).json({
      message: 'Registration successful.',
      data: {
        id: registration._id,
        name: registration.name,
        phone: registration.phone,
        email: registration.email,
      },
    });
  } catch (error) {
    // Log technical error details to console (for debugging)
    console.error('❌ Registration error (technical):', {
      code: error.code,
      message: error.message,
      name: error.name,
      stack: error.stack
    });

    // Check for MongoDB connection errors
    if (error.name === 'MongoServerError' || error.name === 'MongoNetworkError') {
      console.error('MongoDB error detected:', error.message);
      return res.status(503).json({ 
        message: 'Database error. Please try again later.' 
      });
    }

    // Fallback for any other duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This participant is already registered.' });
    }

    return res.status(500).json({ message: 'Failed to submit registration. Please try again.' });
  }
});

module.exports = router;

