const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { message: 'Access denied. No token provided.', code: 'NO_TOKEN' }
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: { message: 'Token expired.', code: 'TOKEN_EXPIRED' }
      });
    }
    return res.status(401).json({
      error: { message: 'Invalid token.', code: 'INVALID_TOKEN' }
    });
  }
};

module.exports = auth;
