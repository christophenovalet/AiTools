/**
 * Projects REST API
 * GET    /projects        - List all projects
 * POST   /projects        - Create a project
 * GET    /projects/:id    - Get a project
 * PUT    /projects/:id    - Update a project
 * DELETE /projects/:id    - Delete a project
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

    // Parse project ID from path if present
    // Path: /.netlify/functions/projects/123 → parts: ['.netlify', 'functions', 'projects', '123']
    const pathParts = event.path.split('/').filter(Boolean);
    const projectId = pathParts.length > 3 ? pathParts[3] : null;

    switch (event.httpMethod) {
      case 'GET':
        if (projectId) {
          return await getProject(userId, projectId, origin);
        }
        return await listProjects(userId, origin);

      case 'POST':
        return await createProject(userId, JSON.parse(event.body), origin);

      case 'PUT':
        if (!projectId) {
          return errorResponse(400, 'Project ID required', null, origin);
        }
        return await updateProject(userId, projectId, JSON.parse(event.body), origin);

      case 'DELETE':
        if (!projectId) {
          return errorResponse(400, 'Project ID required', null, origin);
        }
        return await deleteProject(userId, projectId, origin);

      default:
        return errorResponse(405, 'Method not allowed', null, origin);
    }
  } catch (error) {
    console.error('Projects API error:', error);
    const isAuthError = error.message?.includes('Authentication failed') ||
                        error.message?.includes('Token expired') ||
                        error.message?.includes('Invalid token');
    const statusCode = isAuthError ? 401 : 500;
    return errorResponse(statusCode, error.message || 'Request failed', null, origin);
  }
};

/**
 * List all projects for user
 */
async function listProjects(userId, origin) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  // Transform from DB format to frontend format
  const projects = (data || []).map(transformProjectFromDB);

  return successResponse({ projects }, 200, {}, origin);
}

/**
 * Get a single project
 */
async function getProject(userId, projectId, origin) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse(404, 'Project not found', null, origin);
    }
    throw error;
  }

  return successResponse({ project: transformProjectFromDB(data) }, 200, {}, origin);
}

/**
 * Create a new project
 */
async function createProject(userId, body, origin) {
  const { name, color = 'purple' } = body;

  if (!name?.trim()) {
    return errorResponse(400, 'Project name required', null, origin);
  }

  const projectId = Date.now();

  const projectData = {
    id: projectId,
    name: name.trim(),
    color,
    texts: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      project_id: projectId,
      name: name.trim(),
      color,
      data: projectData
    })
    .select()
    .single();

  if (error) throw error;

  return successResponse({ project: transformProjectFromDB(data) }, 201, {}, origin);
}

/**
 * Update a project
 */
async function updateProject(userId, projectId, body, origin) {
  const { name, color, data: projectData } = body;

  // Build update object
  const updates = {};

  if (name !== undefined) updates.name = name;
  if (color !== undefined) updates.color = color;
  if (projectData !== undefined) {
    // Ensure updatedAt is set in the data
    updates.data = {
      ...projectData,
      updatedAt: Date.now()
    };
  }

  // Only update if there's something to update
  if (Object.keys(updates).length === 0) {
    return errorResponse(400, 'No fields to update', null, origin);
  }

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse(404, 'Project not found', null, origin);
    }
    throw error;
  }

  return successResponse({ project: transformProjectFromDB(data) }, 200, {}, origin);
}

/**
 * Delete a project
 */
async function deleteProject(userId, projectId, origin) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId);

  if (error) throw error;

  return successResponse({ success: true }, 200, {}, origin);
}

/**
 * Transform project from DB format to frontend format
 */
function transformProjectFromDB(dbProject) {
  if (!dbProject) return null;

  // If data field exists and has the full structure, use it
  if (dbProject.data && typeof dbProject.data === 'object') {
    return {
      ...dbProject.data,
      id: dbProject.project_id || dbProject.data.id,
      name: dbProject.name || dbProject.data.name,
      color: dbProject.color || dbProject.data.color,
      texts: dbProject.data.texts || []
    };
  }

  // Fallback: construct from flat fields
  return {
    id: dbProject.project_id,
    name: dbProject.name,
    color: dbProject.color,
    texts: [],
    createdAt: new Date(dbProject.created_at).getTime(),
    updatedAt: new Date(dbProject.updated_at).getTime()
  };
}
