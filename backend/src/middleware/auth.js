const jwt = require('jsonwebtoken');

const getTokenFromRequest = (req) => {
  if (req.cookies) {
    if (req.cookies.access_token) {
      return req.cookies.access_token;
    }
    if (req.cookies.jwt) {
      return req.cookies.jwt;
    }
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
};

const requireAuth = (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.tokenType && decoded.tokenType !== 'access') {
      return res.status(401).json({ message: 'Invalid access token' });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      phone: decoded.phone,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = requireAuth;
