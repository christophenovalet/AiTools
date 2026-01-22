/**
 * Sync All Data Handler
 * Returns all user data for initial sync or full refresh
 */

import { supabase } from './utils/supabase.js';
import { requireAuth } from './utils/auth.js';
import { rateLimit } from './utils/rate-limit.js';
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

  if (event.httpMethod !== 'GET') {
    return errorResponse(405, 'Method not allowed', null, origin);
  }

  try {
    // Authenticate user
    const { userId } = requireAuth(event.headers);

    // Rate limit check
    rateLimit(userId, 100, 60000); // 100 req/min

    // Fetch all user data in parallel
    const [
      settingsResult,
      tagsResult,
      instructionsResult,
      templatesResult,
      projectsResult,
      syncMetaResult
    ] = await Promise.all([
      supabase.from('user_settings').select('*').eq('user_id', userId),
      supabase.from('tags').select('*').eq('user_id', userId),
      supabase.from('ai_instructions').select('*').eq('user_id', userId),
      supabase.from('templates').select('*').eq('user_id', userId),
      supabase.from('projects').select('*').eq('user_id', userId),
      supabase.from('sync_metadata').select('*').eq('user_id', userId)
    ]);

    // Check for errors
    if (settingsResult.error) throw settingsResult.error;
    if (tagsResult.error) throw tagsResult.error;
    if (instructionsResult.error) throw instructionsResult.error;
    if (templatesResult.error) throw templatesResult.error;
    if (projectsResult.error) throw projectsResult.error;
    if (syncMetaResult.error) throw syncMetaResult.error;

    // Transform settings into key-value map
    const settings = {};
    for (const setting of settingsResult.data || []) {
      settings[setting.setting_key] = {
        value: setting.setting_value,
        encrypted: setting.encrypted,
        encryption_metadata: setting.encryption_metadata,
        updated_at: setting.updated_at
      };
    }

    // Find latest sync timestamp
    const lastSyncedAt = syncMetaResult.data?.length > 0
      ? Math.max(...syncMetaResult.data.map(m => new Date(m.last_synced_at).getTime()))
      : null;

    // Return all data
    return successResponse({
      settings,
      tags: tagsResult.data || [],
      aiInstructions: instructionsResult.data || [],
      templates: templatesResult.data || [],
      projects: projectsResult.data || [],
      lastSyncedAt,
      serverTimestamp: Date.now()
    }, 200, {}, origin);
  } catch (error) {
    console.error('Sync all error:', error);
    // Return 401 for auth errors so frontend can refresh token
    const isAuthError = error.message?.includes('Authentication failed') ||
                        error.message?.includes('Token expired') ||
                        error.message?.includes('Invalid token');
    const statusCode = isAuthError ? 401 : 500;
    return errorResponse(statusCode, error.message || 'Sync failed', null, origin);
  }
};
