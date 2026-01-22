/**
 * Google OAuth Authentication Handler
 * Verifies Google ID token and creates/updates user
 * Returns JWT access and refresh tokens
 */

import { OAuth2Client } from 'google-auth-library';
import { getOrCreateUser } from './utils/supabase.js';
import {
  generateAccessToken,
  generateRefreshToken,
  createCookie
} from './utils/auth.js';
import {
  errorResponse,
  successResponse,
  corsResponse,
  handleError,
  validateRequired
} from './utils/errors.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
    const body = JSON.parse(event.body);

    // Validate required fields
    validateRequired(body, ['idToken']);

    const { idToken } = body;

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return errorResponse(401, 'Invalid Google token');
    }

    // Extract user info from Google profile
    const googleProfile = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };

    // Get or create user in database
    const user = await getOrCreateUser(googleProfile);

    // Generate JWT tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Create refresh token cookie (httpOnly, secure)
    const refreshCookie = createCookie('refresh_token', refreshToken, 60 * 60 * 24 * 7); // 7 days

    // Return success response with tokens
    return successResponse(
      {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture_url
        }
      },
      200,
      {
        'Set-Cookie': refreshCookie
      },
      origin
    );
  } catch (error) {
    console.error('Auth error:', error);
    return errorResponse(500, error.message || 'Authentication failed', null, origin);
  }
};
