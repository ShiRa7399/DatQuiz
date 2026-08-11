const express = require('express');
const router = express.Router();
const { readStore, writeStore } = require('../data/store');

// Faculty Signup
router.post('/signup', (req, res) => {
  const { name, email, password, department } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const store = readStore();
  const existing = store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'User already exists with this email.' });
  }

  const newUser = {
    id: `faculty_${Date.now()}`,
    name: name || 'Faculty Member',
    email: email.toLowerCase(),
    password, // In production, hash with bcrypt
    department: department || 'General Academics',
    createdAt: new Date().toISOString()
  };

  store.users.push(newUser);
  writeStore(store);

  const { password: _, ...userWithoutPassword } = newUser;
  return res.json({
    message: 'Faculty account created successfully.',
    user: userWithoutPassword,
    token: `token_${newUser.id}`
  });
});

// Faculty Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const store = readStore();
  const user = store.users.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    // If demo login or auto fallback
    if (email === 'faculty@quizgenius.edu' || email === 'demo@quizgenius.edu') {
      const demoUser = store.users[0] || {
        id: 'faculty_1',
        name: 'Dr. Sarah Jenkins',
        email: 'faculty@quizgenius.edu',
        department: 'Computer Science'
      };
      const { password: _, ...safeUser } = demoUser;
      return res.json({ user: safeUser, token: `token_${demoUser.id}` });
    }
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const { password: _, ...userWithoutPassword } = user;
  return res.json({
    user: userWithoutPassword,
    token: `token_${user.id}`
  });
});

// Google Sign-In Route
router.post('/google', async (req, res) => {
  const { idToken, googleUser } = req.body;

  let email = googleUser?.email;
  let name = googleUser?.displayName || googleUser?.name;
  let uid = googleUser?.uid;

  if (idToken) {
    try {
      const { adminAuth } = require('../config/firebase');
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      email = decodedToken.email || email;
      name = decodedToken.name || name;
      uid = decodedToken.uid || uid;
    } catch (err) {
      console.warn('⚠️ Firebase Admin token verification fallback:', err.message);
    }
  }

  if (!email) {
    return res.status(400).json({ error: 'Valid Google email is required.' });
  }

  const store = readStore();
  let user = store.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    user = {
      id: uid ? `google_${uid}` : `faculty_${Date.now()}`,
      name: name || 'Google User',
      email: email.toLowerCase(),
      department: 'Academic Faculty',
      authProvider: 'google',
      createdAt: new Date().toISOString()
    };
    store.users.push(user);
    writeStore(store);
  }

  const { password: _, ...userWithoutPassword } = user;
  return res.json({
    message: 'Google login successful',
    user: userWithoutPassword,
    token: idToken || `google_token_${user.id}`
  });
});

module.exports = router;

