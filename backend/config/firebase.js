const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const serviceAccount = require('./serviceAccountKey.json');

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

// Optional settings for Firestore timestamp handling
db.settings({ ignoreUndefinedProperties: true });

console.log('🔥 Firebase Admin SDK initialized for project: datquiz-88e31');

module.exports = {
  db
};
