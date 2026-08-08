const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Optional settings for Firestore timestamp handling
db.settings({ ignoreUndefinedProperties: true });

console.log('🔥 Firebase Admin SDK initialized for project: datquiz-88e31');

module.exports = {
  admin,
  db
};
