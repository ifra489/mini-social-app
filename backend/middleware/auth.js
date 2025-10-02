const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

function auth(required = true) {
  return function authenticate(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      if (!required) return next();
      return res.status(401).json({ message: 'Authentication required' });
    }

    try {
      const payload = jwt.verify(token, jwtSecret);
      req.user = payload;
      return next();
    } catch (err) {
      if (!required) return next();
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
}

module.exports = auth;


