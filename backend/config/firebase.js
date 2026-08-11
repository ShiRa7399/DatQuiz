const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');

let serviceAccount;
try {
  if (process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID || 'datquiz-88e31',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@datquiz-88e31.iam.gserviceaccount.com',
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  } else {
    serviceAccount = require('./serviceAccountKey.json');
  }
} catch (error) {
  console.warn("⚠️  Service account key not found or invalid. Falling back to default app.");
}

if (!getApps().length) {
  initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : undefined
  });
}

const db = getFirestore();
const adminAuth = getAuth();

// Optional settings for Firestore timestamp handling
db.settings({ ignoreUndefinedProperties: true });

console.log('🔥 Firebase Admin SDK initialized for project: datquiz-88e31');

module.exports = {
  db,
  adminAuth
};

