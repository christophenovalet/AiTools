/**
 * Reset to Defaults API
 * POST /reset-defaults - Delete all user's tags, instructions, templates
 */

import { supabase } from './utils/supabase.js';
import { requireAuth } from './utils/auth.js';
import {
  errorResponse,
  successResponse,
  corsResponse
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
    // Authenticate user
    const { userId } = requireAuth(event.headers);

    // Delete all tags for this user
    const { error: tagsError } = await supabase
      .from('tags')
      .delete()
      .eq('user_id', userId);

    if (tagsError) {
      console.error('Failed to delete tags:', tagsError);
    }

    // Delete all AI instructions for this user
    const { error: instructionsError } = await supabase
      .from('ai_instructions')
      .delete()
      .eq('user_id', userId);

    if (instructionsError) {
      console.error('Failed to delete instructions:', instructionsError);
    }

    // Delete all templates for this user
    const { error: templatesError } = await supabase
      .from('templates')
      .delete()
      .eq('user_id', userId);

    if (templatesError) {
      console.error('Failed to delete templates:', templatesError);
    }

    return successResponse({
      success: true,
      message: 'All tags, instructions, and templates deleted. Refresh to reseed defaults.'
    }, 200, {}, origin);

  } catch (error) {
    console.error('Reset defaults error:', error);
    const isAuthError = error.message?.includes('Authentication failed') ||
                        error.message?.includes('Token expired') ||
                        error.message?.includes('Invalid token');
    const statusCode = isAuthError ? 401 : 500;
    return errorResponse(statusCode, error.message || 'Reset failed', null, origin);
  }
};
