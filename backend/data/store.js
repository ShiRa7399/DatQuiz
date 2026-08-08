const fs = require('fs');
const path = require('path');
const { db } = require('../config/firebase');

const STORE_PATH = path.join(__dirname, 'store.json');
const BACKUP_PATH = path.join(__dirname, 'store.backup.json');

// Default initial state
const defaultState = {
  users: [
    {
      id: 'faculty_1',
      email: 'faculty@quizgenius.edu',
      password: 'password123',
      name: 'Dr. Sarah Jenkins',
      department: 'Computer Science & Engineering'
    }
  ],
  questionBanks: [],
  quizzes: [],
  submissions: []
};

function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      writeStore(defaultState);
      return defaultState;
    }
    const rawData = fs.readFileSync(STORE_PATH, 'utf8');
    try {
      return JSON.parse(rawData);
    } catch (parseErr) {
      console.warn('JSON parse error in store.json, attempting control-character cleanup:', parseErr.message);
      const cleaned = rawData.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
      const parsed = JSON.parse(cleaned);
      writeStore(parsed);
      return parsed;
    }
  } catch (err) {
    console.error('Failed to read store file:', err);
    if (fs.existsSync(BACKUP_PATH)) {
      try {
        const backupData = fs.readFileSync(BACKUP_PATH, 'utf8');
        return JSON.parse(backupData);
      } catch (bErr) {
        console.error('Backup read also failed:', bErr);
      }
    }
    return defaultState;
  }
}

function writeStore(data) {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(STORE_PATH, jsonString, 'utf8');
    fs.writeFileSync(BACKUP_PATH, jsonString, 'utf8');
    
    // Background sync to Firestore
    syncToFirestore(data).catch(err => console.error('Firestore sync error:', err.message));
  } catch (err) {
    console.error('Error writing store file:', err);
  }
}

async function syncToFirestore(data) {
  if (!db) return;
  try {
    const collections = ['quizzes', 'questionBanks', 'submissions', 'users'];
    for (const col of collections) {
      const items = data[col] || [];
      for (const item of items) {
        if (!item.id && !item.quizCode) continue;
        const docId = String(item.id || item.quizCode);
        await db.collection(col).doc(docId).set(item, { merge: true });
      }
    }
  } catch (err) {
    console.error('Failed syncing to Firestore:', err.message);
  }
}

async function syncFromFirestore() {
  if (!db) return;
  try {
    const collections = ['quizzes', 'questionBanks', 'submissions', 'users'];
    const cloudStore = readStore();
    let updated = false;

    for (const col of collections) {
      const snapshot = await db.collection(col).get();
      if (!snapshot.empty) {
        const cloudItems = snapshot.docs.map(doc => doc.data());
        cloudStore[col] = cloudItems;
        updated = true;
      }
    }

    if (updated) {
      const jsonString = JSON.stringify(cloudStore, null, 2);
      fs.writeFileSync(STORE_PATH, jsonString, 'utf8');
      console.log('✅ Synchronized store from Firestore Cloud!');
    }
  } catch (err) {
    console.warn('Firestore initial sync note:', err.message);
  }
}

// Initial Cloud Firestore sync
syncFromFirestore();

module.exports = {
  readStore,
  writeStore,
  syncFromFirestore,
  syncToFirestore
};
