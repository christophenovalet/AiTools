/**
 * Logout Handler
 * Clears refresh token cookie and invalidates session
 */

import { requireAuth, deleteCookie } from './utils/auth.js';
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
    // Verify user is authenticated
    const { userId } = requireAuth(event.headers);

    // Clear refresh token cookie
    const clearCookie = deleteCookie('refresh_token');

    // Return success
    return successResponse(
      {
        success: true,
        message: 'Logged out successfully'
      },
      200,
      {
        'Set-Cookie': clearCookie
      },
      origin
    );
  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse(500, error.message || 'Logout failed', null, origin);
  }
};
