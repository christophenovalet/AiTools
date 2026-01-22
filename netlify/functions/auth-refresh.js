/**
 * Token Refresh Handler
 * Refreshes access token using refresh token from httpOnly cookie
 */

import { getUserById } from './utils/supabase.js';
import {
  verifyToken,
  generateAccessToken,
  parseCookies
} from './utils/auth.js';
import {
  errorResponse,
  successResponse,
  corsResponse,
  handleError
} from './utils/errors.js';

export const handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse(origin);
  }

  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed', null, origin);
  }

  try {
    // Get refresh token from cookie
    const cookies = parseCookies(event.headers.cookie);
    const refreshToken = cookies.refresh_token;

    if (!refreshToken) {
      return errorResponse(401, 'No refresh token provided', null, origin);
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (error) {
      return errorResponse(401, 'Invalid or expired refresh token', null, origin);
    }

    if (decoded.type !== 'refresh') {
      return errorResponse(401, 'Invalid token type', null, origin);
    }

    // Verify user still exists
    const user = await getUserById(decoded.userId);

    if (!user) {
      return errorResponse(401, 'User not found', null, origin);
    }

    // Generate new access token
    const accessToken = generateAccessToken(user.id, user.email);

    // Return new access token
    return successResponse({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture_url
      }
    }, 200, {}, origin);
  } catch (error) {
    console.error('Refresh error:', error);
    return errorResponse(500, error.message || 'Token refresh failed', null, origin);
  }
};
