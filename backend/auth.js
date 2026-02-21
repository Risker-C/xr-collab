const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

const JWT_EXPIRES = '24h';

function generateToken(userId, username) {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function authMiddleware(socket, next) {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) return next(new Error('Authentication required'));
  
  const decoded = verifyToken(token);
  if (!decoded) return next(new Error('Invalid token'));
  
  socket.userId = decoded.userId;
  socket.username = decoded.username;
  next();
}

function requireHttpAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const decoded = token ? verifyToken(token) : null;
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = decoded;
  next();
}

module.exports = { generateToken, verifyToken, authMiddleware, requireHttpAuth, JWT_SECRET };
