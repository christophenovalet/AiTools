/**
 * Simple in-memory rate limiting for Netlify Functions
 * Note: This is per-instance, not global. For production, use Redis or similar.
 */

const rateLimits = new Map();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimits.entries()) {
    if (now - data.resetAt > 0) {
      rateLimits.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check rate limit for a user
 * @param {string} userId - User ID
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} - { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(userId, maxRequests = 100, windowMs = 60000) {
  const key = `${userId}:${Math.floor(Date.now() / windowMs)}`;
  const now = Date.now();

  if (!rateLimits.has(key)) {
    rateLimits.set(key, {
      count: 1,
      resetAt: now + windowMs
    });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs
    };
  }

  const data = rateLimits.get(key);

  if (data.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: data.resetAt
    };
  }

  data.count++;
  rateLimits.set(key, data);

  return {
    allowed: true,
    remaining: maxRequests - data.count,
    resetAt: data.resetAt
  };
}

/**
 * Rate limit middleware
 */
export function rateLimit(userId, maxRequests = 100, windowMs = 60000) {
  const result = checkRateLimit(userId, maxRequests, windowMs);

  if (!result.allowed) {
    const error = new Error('Rate limit exceeded');
    error.statusCode = 429;
    error.resetAt = result.resetAt;
    throw error;
  }

  return result;
}
