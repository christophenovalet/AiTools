/**
 * Texts REST API
 * POST   /texts                - Create a text in a project
 * PUT    /texts/:textId        - Update a text
 * DELETE /texts/:textId        - Delete a text
 * POST   /texts/:textId/move   - Move text to another project
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

    // Parse path: /.netlify/functions/texts or /texts/:textId or /texts/:textId/move
    // Path: /.netlify/functions/texts/123/move → parts: ['.netlify', 'functions', 'texts', '123', 'move']
    const pathParts = event.path.split('/').filter(Boolean);
    const textId = pathParts.length > 3 ? pathParts[3] : null;
    const action = pathParts.length > 4 ? pathParts[4] : null;

    switch (event.httpMethod) {
      case 'POST':
        if (textId && action === 'move') {
          return await moveText(userId, textId, JSON.parse(event.body), origin);
        }
        return await createText(userId, JSON.parse(event.body), origin);

      case 'PUT':
        if (!textId) {
          return errorResponse(400, 'Text ID required', null, origin);
        }
        return await updateText(userId, textId, JSON.parse(event.body), origin);

      case 'DELETE':
        if (!textId) {
          return errorResponse(400, 'Text ID required', null, origin);
        }
        return await deleteText(userId, textId, JSON.parse(event.body || '{}'), origin);

      default:
        return errorResponse(405, 'Method not allowed', null, origin);
    }
  } catch (error) {
    console.error('Texts API error:', error);
    const isAuthError = error.message?.includes('Authentication failed') ||
                        error.message?.includes('Token expired') ||
                        error.message?.includes('Invalid token');
    const statusCode = isAuthError ? 401 : 500;
    return errorResponse(statusCode, error.message || 'Request failed', null, origin);
  }
};

/**
 * Create a new text in a project
 */
async function createText(userId, body, origin) {
  const { projectId, title, state, description = '', tags = [], isFavorite = false } = body;

  if (!projectId) {
    return errorResponse(400, 'Project ID required', null, origin);
  }
  if (!title?.trim()) {
    return errorResponse(400, 'Title required', null, origin);
  }

  // Get the project
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return errorResponse(404, 'Project not found', null, origin);
    }
    throw fetchError;
  }

  // Create new text
  const newText = {
    id: Date.now(),
    title: title.trim(),
    state: state || null,
    description: description.trim(),
    tags: Array.isArray(tags) ? tags : [],
    isFavorite,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  // Add text to project's texts array
  const projectData = project.data || { texts: [] };
  const updatedTexts = [...(projectData.texts || []), newText];
  const updatedData = {
    ...projectData,
    id: project.project_id,
    name: project.name,
    color: project.color,
    texts: updatedTexts,
    updatedAt: Date.now()
  };

  // Update project
  const { data: updatedProject, error: updateError } = await supabase
    .from('projects')
    .update({ data: updatedData })
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (updateError) throw updateError;

  return successResponse({
    text: newText,
    project: transformProjectFromDB(updatedProject)
  }, 201, {}, origin);
}

/**
 * Update a text
 */
async function updateText(userId, textId, body, origin) {
  const { projectId, title, state, description, tags, isFavorite } = body;

  if (!projectId) {
    return errorResponse(400, 'Project ID required', null, origin);
  }

  // Get the project
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return errorResponse(404, 'Project not found', null, origin);
    }
    throw fetchError;
  }

  // Find and update the text
  const projectData = project.data || { texts: [] };
  const textIdNum = parseInt(textId, 10);
  let foundText = null;

  const updatedTexts = (projectData.texts || []).map(text => {
    if (text.id === textIdNum) {
      foundText = {
        ...text,
        ...(title !== undefined && { title }),
        ...(state !== undefined && { state }),
        ...(description !== undefined && { description }),
        ...(tags !== undefined && { tags }),
        ...(isFavorite !== undefined && { isFavorite }),
        updatedAt: Date.now()
      };
      return foundText;
    }
    return text;
  });

  if (!foundText) {
    return errorResponse(404, 'Text not found', null, origin);
  }

  // Update project
  const updatedData = {
    ...projectData,
    texts: updatedTexts,
    updatedAt: Date.now()
  };

  const { data: updatedProject, error: updateError } = await supabase
    .from('projects')
    .update({ data: updatedData })
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (updateError) throw updateError;

  return successResponse({
    text: foundText,
    project: transformProjectFromDB(updatedProject)
  }, 200, {}, origin);
}

/**
 * Delete a text
 */
async function deleteText(userId, textId, body, origin) {
  const { projectId } = body;

  if (!projectId) {
    return errorResponse(400, 'Project ID required', null, origin);
  }

  // Get the project
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return errorResponse(404, 'Project not found', null, origin);
    }
    throw fetchError;
  }

  // Remove the text
  const projectData = project.data || { texts: [] };
  const textIdNum = parseInt(textId, 10);
  const updatedTexts = (projectData.texts || []).filter(text => text.id !== textIdNum);

  // Update project
  const updatedData = {
    ...projectData,
    texts: updatedTexts,
    updatedAt: Date.now()
  };

  const { data: updatedProject, error: updateError } = await supabase
    .from('projects')
    .update({ data: updatedData })
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (updateError) throw updateError;

  return successResponse({
    success: true,
    project: transformProjectFromDB(updatedProject)
  }, 200, {}, origin);
}

/**
 * Move a text from one project to another
 */
async function moveText(userId, textId, body, origin) {
  const { fromProjectId, toProjectId } = body;

  if (!fromProjectId || !toProjectId) {
    return errorResponse(400, 'Both fromProjectId and toProjectId required', null, origin);
  }

  if (fromProjectId === toProjectId) {
    return errorResponse(400, 'Cannot move to same project', null, origin);
  }

  // Get both projects
  const { data: projects, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .in('project_id', [fromProjectId, toProjectId]);

  if (fetchError) throw fetchError;

  const fromProject = projects.find(p => p.project_id === fromProjectId);
  const toProject = projects.find(p => p.project_id === toProjectId);

  if (!fromProject) {
    return errorResponse(404, 'Source project not found', null, origin);
  }
  if (!toProject) {
    return errorResponse(404, 'Target project not found', null, origin);
  }

  // Find the text to move
  const fromData = fromProject.data || { texts: [] };
  const textIdNum = parseInt(textId, 10);
  const textToMove = (fromData.texts || []).find(t => t.id === textIdNum);

  if (!textToMove) {
    return errorResponse(404, 'Text not found', null, origin);
  }

  // Update the text's timestamp
  const movedText = {
    ...textToMove,
    updatedAt: Date.now()
  };

  // Remove from source project
  const updatedFromData = {
    ...fromData,
    texts: (fromData.texts || []).filter(t => t.id !== textIdNum),
    updatedAt: Date.now()
  };

  // Add to target project
  const toData = toProject.data || { texts: [] };
  const updatedToData = {
    ...toData,
    texts: [...(toData.texts || []), movedText],
    updatedAt: Date.now()
  };

  // Update both projects
  const [fromResult, toResult] = await Promise.all([
    supabase
      .from('projects')
      .update({ data: updatedFromData })
      .eq('user_id', userId)
      .eq('project_id', fromProjectId)
      .select()
      .single(),
    supabase
      .from('projects')
      .update({ data: updatedToData })
      .eq('user_id', userId)
      .eq('project_id', toProjectId)
      .select()
      .single()
  ]);

  if (fromResult.error) throw fromResult.error;
  if (toResult.error) throw toResult.error;

  return successResponse({
    success: true,
    text: movedText,
    fromProject: transformProjectFromDB(fromResult.data),
    toProject: transformProjectFromDB(toResult.data)
  }, 200, {}, origin);
}

/**
 * Transform project from DB format to frontend format
 */
function transformProjectFromDB(dbProject) {
  if (!dbProject) return null;

  if (dbProject.data && typeof dbProject.data === 'object') {
    return {
      ...dbProject.data,
      id: dbProject.project_id || dbProject.data.id,
      name: dbProject.name || dbProject.data.name,
      color: dbProject.color || dbProject.data.color,
      texts: dbProject.data.texts || []
    };
  }

  return {
    id: dbProject.project_id,
    name: dbProject.name,
    color: dbProject.color,
    texts: [],
    createdAt: new Date(dbProject.created_at).getTime(),
    updatedAt: new Date(dbProject.updated_at).getTime()
  };
}
