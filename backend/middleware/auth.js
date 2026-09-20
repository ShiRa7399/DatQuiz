const { adminAuth } = require('../config/firebase');

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Check for dummy local tokens first (token_faculty_1)
    if (token.startsWith('token_')) {
      const facultyId = token.replace('token_', '');
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
        // Fallthrough if it fails, meaning it's an invalid token
      }
    }
    
    return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
};

module.exports = { requireAuth };
