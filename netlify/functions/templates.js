/**
 * Templates REST API
 * GET    /templates        - List all templates
 * POST   /templates        - Create a template
 * PUT    /templates/:id    - Update a template
 * DELETE /templates/:id    - Delete a template
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

    // Parse template ID from path if present
    // Path: /.netlify/functions/templates/123 → parts: ['.netlify', 'functions', 'templates', '123']
    const pathParts = event.path.split('/').filter(Boolean);
    const templateId = pathParts.length > 3 ? pathParts[3] : null;

    switch (event.httpMethod) {
      case 'GET':
        return await listTemplates(userId, origin);

      case 'POST':
        return await createTemplate(userId, JSON.parse(event.body), origin);

      case 'PUT':
        if (!templateId) {
          return errorResponse(400, 'Template ID required', null, origin);
        }
        return await updateTemplate(userId, templateId, JSON.parse(event.body), origin);

      case 'DELETE':
        if (!templateId) {
          return errorResponse(400, 'Template ID required', null, origin);
        }
        return await deleteTemplate(userId, templateId, origin);

      default:
        return errorResponse(405, 'Method not allowed', null, origin);
    }
  } catch (error) {
    console.error('Templates API error:', error);
    const isAuthError = error.message?.includes('Authentication failed') ||
                        error.message?.includes('Token expired') ||
                        error.message?.includes('Invalid token');
    const statusCode = isAuthError ? 401 : 500;
    return errorResponse(statusCode, error.message || 'Request failed', null, origin);
  }
};

/**
 * List all templates for user
 */
async function listTemplates(userId, origin) {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('user_id', userId)
    .order('template_id', { ascending: true });

  if (error) throw error;

  // Transform to frontend format
  const templates = (data || []).map(t => ({
    id: t.template_id,
    title: t.title,
    text: t.text,
    category: t.category,
    isCustom: t.is_custom
  }));

  return successResponse({ templates }, 200, {}, origin);
}

/**
 * Create a new template
 */
async function createTemplate(userId, body, origin) {
  const { title, text, category = 'custom' } = body;

  if (!title?.trim()) {
    return errorResponse(400, 'Template title required', null, origin);
  }
  if (!text?.trim()) {
    return errorResponse(400, 'Template text required', null, origin);
  }

  const templateId = Date.now();

  const { data, error } = await supabase
    .from('templates')
    .insert({
      user_id: userId,
      template_id: templateId,
      title: title.trim(),
      text: text.trim(),
      category,
      is_custom: true
    })
    .select()
    .single();

  if (error) throw error;

  const template = {
    id: data.template_id,
    title: data.title,
    text: data.text,
    category: data.category,
    isCustom: data.is_custom
  };

  return successResponse({ template }, 201, {}, origin);
}

/**
 * Update a template
 */
async function updateTemplate(userId, templateId, body, origin) {
  const { title, text, category } = body;

  const updates = {};

  if (title !== undefined) updates.title = title;
  if (text !== undefined) updates.text = text;
  if (category !== undefined) updates.category = category;

  const { data, error } = await supabase
    .from('templates')
    .update(updates)
    .eq('user_id', userId)
    .eq('template_id', templateId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse(404, 'Template not found', null, origin);
    }
    throw error;
  }

  const template = {
    id: data.template_id,
    title: data.title,
    text: data.text,
    category: data.category,
    isCustom: data.is_custom
  };

  return successResponse({ template }, 200, {}, origin);
}

/**
 * Delete a template
 */
async function deleteTemplate(userId, templateId, origin) {
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('user_id', userId)
    .eq('template_id', templateId);

  if (error) throw error;

  return successResponse({ success: true }, 200, {}, origin);
}
