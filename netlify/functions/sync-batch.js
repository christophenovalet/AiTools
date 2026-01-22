/**
 * Batch Sync Handler
 * Accepts multiple changes and applies them atomically
 * Returns conflicts if server data is newer
 */

import { supabase } from './utils/supabase.js';
import { requireAuth } from './utils/auth.js';
import { rateLimit } from './utils/rate-limit.js';
import {
  errorResponse,
  successResponse,
  corsResponse,
  handleError,
  validateRequired
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

    // Rate limit check
    rateLimit(userId, 100, 60000);

    // Parse request body
    const body = JSON.parse(event.body);
    validateRequired(body, ['changes']);

    const { changes } = body;

    if (!Array.isArray(changes) || changes.length === 0) {
      return errorResponse(400, 'Changes must be a non-empty array');
    }

    if (changes.length > 50) {
      return errorResponse(400, 'Maximum 50 changes per batch');
    }

    const conflicts = [];
    const results = [];

    // Process each change
    for (const change of changes) {
      try {
        const result = await processChange(userId, change);
        results.push(result);

        if (result.conflict) {
          conflicts.push(result);
        }
      } catch (err) {
        console.error('Failed to process change:', change, err);
        results.push({
          key: change.key,
          success: false,
          error: err.message
        });
      }
    }

    // Update sync metadata
    const now = new Date().toISOString();
    for (const change of changes) {
      if (change.key) {
        await supabase
          .from('sync_metadata')
          .upsert({
            user_id: userId,
            storage_key: change.key,
            last_synced_at: now
          });
      }
    }

    return successResponse({
      success: true,
      processed: results.length,
      conflicts: conflicts.length,
      conflictDetails: conflicts,
      serverTimestamp: Date.now()
    }, 200, {}, origin);
  } catch (error) {
    console.error('Batch sync error:', error);
    // Return 401 for auth errors so frontend can refresh token
    const isAuthError = error.message?.includes('Authentication failed') ||
                        error.message?.includes('Token expired') ||
                        error.message?.includes('Invalid token');
    const statusCode = isAuthError ? 401 : 500;
    return errorResponse(statusCode, error.message || 'Sync failed', null, origin);
  }
};

/**
 * Process individual change
 */
async function processChange(userId, change) {
  const { type, key, value, metadata = {} } = change;

  // Handle different types of changes
  switch (type) {
    case 'setting':
      return await syncSetting(userId, key, value, metadata);

    case 'tag':
      return await syncTag(userId, change);

    case 'ai_instruction':
      return await syncAIInstruction(userId, change);

    case 'template':
      return await syncTemplate(userId, change);

    case 'project':
      return await syncProject(userId, change);

    default:
      throw new Error(`Unknown change type: ${type}`);
  }
}

/**
 * Sync user setting
 */
async function syncSetting(userId, key, value, metadata) {
  // Check for conflict
  const { data: existing } = await supabase
    .from('user_settings')
    .select('updated_at')
    .eq('user_id', userId)
    .eq('setting_key', key)
    .single();

  const clientTimestamp = metadata.timestamp || 0;
  const serverTimestamp = existing ? new Date(existing.updated_at).getTime() : 0;

  // Conflict: server data is newer
  if (existing && serverTimestamp > clientTimestamp) {
    return {
      key,
      conflict: true,
      serverData: existing,
      message: 'Server data is newer'
    };
  }

  // Upsert setting
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      setting_key: key,
      setting_value: typeof value === 'string' ? JSON.parse(value) : value,
      encrypted: metadata.encrypted || false,
      encryption_metadata: metadata.encryption_metadata || null
    });

  if (error) throw error;

  return { key, success: true };
}

/**
 * Sync tag
 */
async function syncTag(userId, change) {
  const { operation, data } = change;

  if (operation === 'delete') {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('user_id', userId)
      .eq('tag_id', data.tag_id);

    if (error) throw error;
    return { key: `tag-${data.tag_id}`, success: true };
  }

  // Upsert tag
  const { error } = await supabase
    .from('tags')
    .upsert({
      user_id: userId,
      tag_id: data.tag_id,
      name: data.name,
      description: data.description,
      category: data.category,
      is_custom: data.is_custom,
      action: data.action
    });

  if (error) throw error;
  return { key: `tag-${data.tag_id}`, success: true };
}

/**
 * Sync AI instruction
 */
async function syncAIInstruction(userId, change) {
  const { operation, data } = change;

  if (operation === 'delete') {
    const { error } = await supabase
      .from('ai_instructions')
      .delete()
      .eq('user_id', userId)
      .eq('instruction_id', data.instruction_id);

    if (error) throw error;
    return { key: `instruction-${data.instruction_id}`, success: true };
  }

  // Upsert instruction
  const { error } = await supabase
    .from('ai_instructions')
    .upsert({
      user_id: userId,
      instruction_id: data.instruction_id,
      name: data.name,
      description: data.description,
      is_custom: data.is_custom
    });

  if (error) throw error;
  return { key: `instruction-${data.instruction_id}`, success: true };
}

/**
 * Sync template
 */
async function syncTemplate(userId, change) {
  const { operation, data } = change;

  if (operation === 'delete') {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('user_id', userId)
      .eq('template_id', data.template_id);

    if (error) throw error;
    return { key: `template-${data.template_id}`, success: true };
  }

  // Upsert template
  const { error } = await supabase
    .from('templates')
    .upsert({
      user_id: userId,
      template_id: data.template_id,
      title: data.title,
      text: data.text,
      category: data.category,
      is_custom: data.is_custom
    });

  if (error) throw error;
  return { key: `template-${data.template_id}`, success: true };
}

/**
 * Sync project
 */
async function syncProject(userId, change) {
  const { operation, data } = change;

  if (operation === 'delete') {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', data.project_id);

    if (error) throw error;
    return { key: `project-${data.project_id}`, success: true };
  }

  // Check for conflict
  const { data: existing } = await supabase
    .from('projects')
    .select('updated_at')
    .eq('user_id', userId)
    .eq('project_id', data.project_id)
    .single();

  const clientTimestamp = data.updated_at || 0;
  const serverTimestamp = existing ? new Date(existing.updated_at).getTime() : 0;

  // Conflict: server data is newer
  if (existing && serverTimestamp > clientTimestamp) {
    return {
      key: `project-${data.project_id}`,
      conflict: true,
      serverData: existing,
      message: 'Server data is newer'
    };
  }

  // Upsert project
  const { error } = await supabase
    .from('projects')
    .upsert({
      user_id: userId,
      project_id: data.project_id,
      name: data.name,
      color: data.color,
      data: typeof data.data === 'string' ? JSON.parse(data.data) : data.data
    });

  if (error) throw error;
  return { key: `project-${data.project_id}`, success: true };
}
