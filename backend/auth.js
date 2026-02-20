const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const JWT_EXPIRES = '24h';

function generateToken(userId, username) {
  return jwt.sign({ userId, username, iat: Date.now() }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
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

module.exports = { generateToken, verifyToken, authMiddleware, JWT_SECRET };
