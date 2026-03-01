const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getInstance: getStorageAdapter } = require('./storage/storage-adapter');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

const USER_TTL_SECONDS = Number(process.env.USER_TTL_SECONDS || 30 * 24 * 60 * 60);
const PASSWORD_MIN_LENGTH = 8;

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function validatePasswordStrength(password) {
  const value = String(password || '');
  if (value.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  const hasLetter = /[A-Za-z]/.test(value);
  const hasNumber = /\d/.test(value);
  if (!hasLetter || !hasNumber) {
    throw new Error('Password must include letters and numbers');
  }
}

class AuthService {
  constructor() {
    this.storage = getStorageAdapter();
  }

  generateUserId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return `user_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  // 用户注册（密码加盐哈希）
  async register(username, password, email) {
    const trimmedUsername = String(username || '').trim();
    const normalizedUsername = normalizeUsername(trimmedUsername);

    if (!trimmedUsername) throw new Error('Username required');
    if (!password) throw new Error('Password required');

    validatePasswordStrength(password);

    const existing = await this.storage.getUserByUsername(normalizedUsername);
    if (existing) {
      throw new Error('Username already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = {
      id: this.generateUserId(),
      username: trimmedUsername,
      usernameNormalized: normalizedUsername,
      email: email ? String(email).trim() : null,
      passwordHash,
      createdAt: Date.now()
    };

    await this.storage.setUser(user.id, user, USER_TTL_SECONDS);
    return this.sanitizeUser(user);
  }

  // 用户登录
  async login(username, password) {
    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername) throw new Error('Username required');
    if (!password) throw new Error('Password required');

    const user = await this.storage.getUserByUsername(normalizedUsername);
    if (!user) throw new Error('User not found');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid password');

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '24h'
    });

    return { token, user: this.sanitizeUser(user) };
  }
}

module.exports = AuthService;
