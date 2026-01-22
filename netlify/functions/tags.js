/**
 * Tags REST API
 * GET    /tags        - List all tags
 * POST   /tags        - Create a tag (or batch create if body is array)
 * PUT    /tags/:id    - Update a tag
 * DELETE /tags/:id    - Delete a tag
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

  try {
    // Authenticate user
    const { userId } = requireAuth(event.headers);

    // Parse tag ID from path if present
    // Path: /.netlify/functions/tags/123 → parts: ['.netlify', 'functions', 'tags', '123']
    const pathParts = event.path.split('/').filter(Boolean);
    const tagId = pathParts.length > 3 ? pathParts[3] : null;

    switch (event.httpMethod) {
      case 'GET':
        return await listTags(userId, origin);

      case 'POST': {
        const body = JSON.parse(event.body);
        // Support batch create if body is an array
        if (Array.isArray(body)) {
          return await batchCreateTags(userId, body, origin);
        }
        return await createTag(userId, body, origin);
      }

      case 'PUT':
        if (!tagId) {
          return errorResponse(400, 'Tag ID required', null, origin);
        }
        return await updateTag(userId, tagId, JSON.parse(event.body), origin);

      case 'DELETE':
        if (!tagId) {
          return errorResponse(400, 'Tag ID required', null, origin);
        }
        return await deleteTag(userId, tagId, origin);

      default:
        return errorResponse(405, 'Method not allowed', null, origin);
    }
  } catch (error) {
    console.error('Tags API error:', error);
    const isAuthError = error.message?.includes('Authentication failed') ||
                        error.message?.includes('Token expired') ||
                        error.message?.includes('Invalid token');
    const statusCode = isAuthError ? 401 : 500;
    return errorResponse(statusCode, error.message || 'Request failed', null, origin);
  }
};

/**
 * List all tags for user
 */
async function listTags(userId, origin) {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', userId)
    .order('tag_id', { ascending: true });

  if (error) throw error;

  // Transform to frontend format
  const tags = (data || []).map(t => ({
    id: t.tag_id,
    name: t.name,
    description: t.description,
    category: t.category,
    isCustom: t.is_custom,
    action: t.action
  }));

  return successResponse({ tags }, 200, {}, origin);
}

/**
 * Create a new tag
 */
async function createTag(userId, body, origin) {
  const { name, description = '', category = 'custom', action = '' } = body;

  if (!name?.trim()) {
    return errorResponse(400, 'Tag name required', null, origin);
  }

  const tagId = Date.now();

  const { data, error } = await supabase
    .from('tags')
    .insert({
      user_id: userId,
      tag_id: tagId,
      name: name.trim(),
      description: description.trim(),
      category,
      is_custom: true,
      action
    })
    .select()
    .single();

  if (error) throw error;

  const tag = {
    id: data.tag_id,
    name: data.name,
    description: data.description,
    category: data.category,
    isCustom: data.is_custom,
    action: data.action
  };

  return successResponse({ tag }, 201, {}, origin);
}

/**
 * Batch create multiple tags at once
 */
async function batchCreateTags(userId, tagsArray, origin) {
  if (!tagsArray.length) {
    return successResponse({ tags: [] }, 201, {}, origin);
  }

  const now = Date.now();
  const rows = tagsArray.map((tag, index) => ({
    user_id: userId,
    tag_id: now + index,
    name: tag.name?.trim() || '',
    description: (tag.description || '').trim(),
    category: tag.category || 'custom',
    is_custom: true,
    action: tag.action || ''
  })).filter(row => row.name); // Filter out empty names

  const { data, error } = await supabase
    .from('tags')
    .insert(rows)
    .select();

  if (error) throw error;

  const tags = (data || []).map(t => ({
    id: t.tag_id,
    name: t.name,
    description: t.description,
    category: t.category,
    isCustom: t.is_custom,
    action: t.action
  }));

  return successResponse({ tags }, 201, {}, origin);
}

/**
 * Update a tag
 */
async function updateTag(userId, tagId, body, origin) {
  const { name, description, category, action } = body;

  const updates = {};

  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (category !== undefined) updates.category = category;
  if (action !== undefined) updates.action = action;

  const { data, error } = await supabase
    .from('tags')
    .update(updates)
    .eq('user_id', userId)
    .eq('tag_id', tagId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse(404, 'Tag not found', null, origin);
    }
    throw error;
  }

  const tag = {
    id: data.tag_id,
    name: data.name,
    description: data.description,
    category: data.category,
    isCustom: data.is_custom,
    action: data.action
  };

  return successResponse({ tag }, 200, {}, origin);
}

/**
 * Delete a tag
 */
async function deleteTag(userId, tagId, origin) {
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('user_id', userId)
    .eq('tag_id', tagId);

  if (error) throw error;

  return successResponse({ success: true }, 200, {}, origin);
}
