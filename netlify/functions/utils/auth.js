/**
 * Authentication utilities for JWT token management
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ACCESS_EXPIRY = '15m'; // 15 minutes
const JWT_REFRESH_EXPIRY = '7d'; // 7 days

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable');
}

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(userId, email) {
  return jwt.sign(
    {
      userId,
      email,
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRY }
  );
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(userId, email) {
  return jwt.sign(
    {
      userId,
      email,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRY }
  );
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
}

/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(headers) {
  const authHeader = headers.authorization || headers.Authorization;

  if (!authHeader) {
    throw new Error('No authorization header');
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new Error('Invalid authorization header format');
  }

  return parts[1];
}

/**
 * Middleware to verify access token and extract user info
 */
export function requireAuth(headers) {
  try {
    const token = extractBearerToken(headers);
    const decoded = verifyToken(token);

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return {
      userId: decoded.userId,
      email: decoded.email
    };
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Parse cookies from Cookie header
 */
export function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, value] = cookie.trim().split('=');
    cookies[name] = decodeURIComponent(value);
    return cookies;
  }, {});
}

/**
 * Create httpOnly cookie string
 */
export function createCookie(name, value, maxAge) {
  const options = [
    `${name}=${encodeURIComponent(value)}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${maxAge}`
  ];

  return options.join('; ');
}

/**
 * Create cookie deletion string
 */
export function deleteCookie(name) {
  return `${name}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}
