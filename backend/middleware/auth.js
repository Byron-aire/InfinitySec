const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ message: 'Session revoked' });
    }
    // If this token carries a jti, verify it still exists in the sessions array
    if (decoded.jti && !user.sessions.some(s => s.jti === decoded.jti)) {
      return res.status(401).json({ message: 'Session revoked' });
    }
    req.user = user;
    req.jti  = decoded.jti || null;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
