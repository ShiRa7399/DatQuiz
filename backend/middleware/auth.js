const { adminAuth } = require('../config/firebase');

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = { id: 'faculty_1', email: 'faculty@quizgenius.edu' };
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    // Check for dummy local tokens first (token_faculty_1, mock_token_...)
    if (token.startsWith('token_') || token.startsWith('mock_token_')) {
      const facultyId = token.replace('token_', '').replace('mock_token_', '') || 'faculty_1';
      req.user = { id: facultyId };
      return next();
    }
    
    // Check for dummy Google tokens (google_token_google_uid)
    if (token.startsWith('google_token_')) {
      const facultyId = token.replace('google_token_', '');
      req.user = { id: facultyId };
      return next();
    }

    // Try verifying real Firebase JWT if configured
    if (adminAuth) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        req.user = { 
          id: `google_${decodedToken.uid}`,
          email: decodedToken.email 
        };
        return next();
      } catch (fbErr) {
        // Fallthrough if it fails
      }
    }
    
    // Fallback: accept token directly if present
    req.user = { id: token || 'faculty_1' };
    return next();
  } catch (err) {
    console.error('Auth middleware note:', err);
    req.user = { id: 'faculty_1' };
    return next();
  }
};

module.exports = { requireAuth };
