const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
// For Vercel deployment, use service account from environment variable
// For local development, use service account JSON file or environment variable

let firebaseAdmin = null;

// Firebase config removed - credentials should be in environment variables only

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Service account from environment variable (for Vercel)
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    // Service account from individual environment variables
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  } else {
    // Try to load service account JSON file (for local development)
    const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Try to use default credentials (for local development with gcloud)
      firebaseAdmin = admin.initializeApp();
    }
  }
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Firebase Admin initialization error:', error.message);
  // In production, throw the error to prevent app from starting without Firebase
  if (process.env.NODE_ENV === 'production') {
    throw error;
  }
}

module.exports = firebaseAdmin;

