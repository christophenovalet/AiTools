/**
 * AI Instructions REST API
 * GET    /instructions        - List all instructions
 * POST   /instructions        - Create an instruction
 * PUT    /instructions/:id    - Update an instruction
 * DELETE /instructions/:id    - Delete an instruction
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

    // Parse instruction ID from path if present
    // Path: /.netlify/functions/instructions/123 → parts: ['.netlify', 'functions', 'instructions', '123']
    const pathParts = event.path.split('/').filter(Boolean);
    const instructionId = pathParts.length > 3 ? pathParts[3] : null;

    switch (event.httpMethod) {
      case 'GET':
        return await listInstructions(userId, origin);

      case 'POST':
        return await createInstruction(userId, JSON.parse(event.body), origin);

      case 'PUT':
        if (!instructionId) {
          return errorResponse(400, 'Instruction ID required', null, origin);
        }
        return await updateInstruction(userId, instructionId, JSON.parse(event.body), origin);

      case 'DELETE':
        if (!instructionId) {
          return errorResponse(400, 'Instruction ID required', null, origin);
        }
        return await deleteInstruction(userId, instructionId, origin);

      default:
        return errorResponse(405, 'Method not allowed', null, origin);
    }
  } catch (error) {
    console.error('Instructions API error:', error);
    const isAuthError = error.message?.includes('Authentication failed') ||
                        error.message?.includes('Token expired') ||
                        error.message?.includes('Invalid token');
    const statusCode = isAuthError ? 401 : 500;
    return errorResponse(statusCode, error.message || 'Request failed', null, origin);
  }
};

/**
 * List all instructions for user
 */
async function listInstructions(userId, origin) {
  const { data, error } = await supabase
    .from('ai_instructions')
    .select('*')
    .eq('user_id', userId)
    .order('instruction_id', { ascending: true });

  if (error) throw error;

  // Transform to frontend format
  const instructions = (data || []).map(i => ({
    id: i.instruction_id,
    name: i.name,
    description: i.description,
    isCustom: i.is_custom
  }));

  return successResponse({ instructions }, 200, {}, origin);
}

/**
 * Create a new instruction
 */
async function createInstruction(userId, body, origin) {
  const { name, description = '' } = body;

  if (!name?.trim()) {
    return errorResponse(400, 'Instruction name required', null, origin);
  }

  const instructionId = Date.now();

  const { data, error } = await supabase
    .from('ai_instructions')
    .insert({
      user_id: userId,
      instruction_id: instructionId,
      name: name.trim(),
      description: description.trim(),
      is_custom: true
    })
    .select()
    .single();

  if (error) throw error;

  const instruction = {
    id: data.instruction_id,
    name: data.name,
    description: data.description,
    isCustom: data.is_custom
  };

  return successResponse({ instruction }, 201, {}, origin);
}

/**
 * Update an instruction
 */
async function updateInstruction(userId, instructionId, body, origin) {
  const { name, description } = body;

  const updates = {};

  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;

  const { data, error } = await supabase
    .from('ai_instructions')
    .update(updates)
    .eq('user_id', userId)
    .eq('instruction_id', instructionId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse(404, 'Instruction not found', null, origin);
    }
    throw error;
  }

  const instruction = {
    id: data.instruction_id,
    name: data.name,
    description: data.description,
    isCustom: data.is_custom
  };

  return successResponse({ instruction }, 200, {}, origin);
}

/**
 * Delete an instruction
 */
async function deleteInstruction(userId, instructionId, origin) {
  const { error } = await supabase
    .from('ai_instructions')
    .delete()
    .eq('user_id', userId)
    .eq('instruction_id', instructionId);

  if (error) throw error;

  return successResponse({ success: true }, 200, {}, origin);
}
