/**
 * Cloud-Native API Client
 * Direct API calls to backend - no localStorage sync
 */

const API_BASE = import.meta.env.PROD
  ? '/.netlify/functions'
  : 'http://localhost:8888/.netlify/functions';

/**
 * Get auth token from localStorage
 */
function getToken() {
  return localStorage.getItem('auth_access_token');
}

/**
 * Make authenticated API request with auto token refresh
 */
async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  // If 401, try to refresh token
  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      // Retry with new token
      return apiRequest(endpoint, options);
    }
    // Refresh failed, clear auth and reload to show login
    localStorage.removeItem('auth_access_token');
    localStorage.removeItem('user');
    window.location.reload();
    throw new Error('Session expired');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'API request failed');
  }

  return data;
}

/**
 * Refresh auth token
 */
async function refreshToken() {
  try {
    const response = await fetch(`${API_BASE}/auth-refresh`, {
      method: 'POST',
      credentials: 'include', // Include httpOnly cookie
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('auth_access_token', data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ============ Projects API ============

export const projectsApi = {
  /**
   * Get all projects
   */
  async list() {
    const data = await apiRequest('/projects');
    return data.projects;
  },

  /**
   * Get a single project
   */
  async get(projectId) {
    const data = await apiRequest(`/projects/${projectId}`);
    return data.project;
  },

  /**
   * Create a new project
   */
  async create(name, color = 'purple') {
    const data = await apiRequest('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
    return data.project;
  },

  /**
   * Update a project (name, color, or full data)
   */
  async update(projectId, updates) {
    const data = await apiRequest(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.project;
  },

  /**
   * Delete a project
   */
  async delete(projectId) {
    await apiRequest(`/projects/${projectId}`, {
      method: 'DELETE',
    });
    return true;
  },
};

// ============ Texts API ============

export const textsApi = {
  /**
   * Create a new text in a project
   */
  async create(projectId, { title, state, description, tags, isFavorite }) {
    const data = await apiRequest('/texts', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        title,
        state,
        description,
        tags,
        isFavorite,
      }),
    });
    return { text: data.text, project: data.project };
  },

  /**
   * Update a text
   */
  async update(textId, projectId, updates) {
    const data = await apiRequest(`/texts/${textId}`, {
      method: 'PUT',
      body: JSON.stringify({ projectId, ...updates }),
    });
    return { text: data.text, project: data.project };
  },

  /**
   * Delete a text
   */
  async delete(textId, projectId) {
    const data = await apiRequest(`/texts/${textId}`, {
      method: 'DELETE',
      body: JSON.stringify({ projectId }),
    });
    return data.project;
  },

  /**
   * Move a text from one project to another
   */
  async move(textId, fromProjectId, toProjectId) {
    const data = await apiRequest(`/texts/${textId}/move`, {
      method: 'POST',
      body: JSON.stringify({ fromProjectId, toProjectId }),
    });
    return {
      text: data.text,
      fromProject: data.fromProject,
      toProject: data.toProject,
    };
  },
};

// ============ Tags API ============

export const tagsApi = {
  /**
   * Get all tags
   */
  async list() {
    const data = await apiRequest('/tags');
    return data.tags;
  },

  /**
   * Create a new tag
   */
  async create({ name, description, category, action }) {
    const data = await apiRequest('/tags', {
      method: 'POST',
      body: JSON.stringify({ name, description, category, action }),
    });
    return data.tag;
  },

  /**
   * Batch create multiple tags at once
   */
  async batchCreate(tagsArray) {
    const data = await apiRequest('/tags', {
      method: 'POST',
      body: JSON.stringify(tagsArray),
    });
    return data.tags;
  },

  /**
   * Update a tag
   */
  async update(tagId, updates) {
    const data = await apiRequest(`/tags/${tagId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.tag;
  },

  /**
   * Delete a tag
   */
  async delete(tagId) {
    await apiRequest(`/tags/${tagId}`, {
      method: 'DELETE',
    });
    return true;
  },
};

// ============ AI Instructions API ============

export const instructionsApi = {
  /**
   * Get all instructions
   */
  async list() {
    const data = await apiRequest('/instructions');
    return data.instructions;
  },

  /**
   * Create a new instruction
   */
  async create({ name, description }) {
    const data = await apiRequest('/instructions', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
    return data.instruction;
  },

  /**
   * Batch create multiple instructions at once
   */
  async batchCreate(instructionsArray) {
    const data = await apiRequest('/instructions', {
      method: 'POST',
      body: JSON.stringify(instructionsArray),
    });
    return data.instructions;
  },

  /**
   * Update an instruction
   */
  async update(instructionId, updates) {
    const data = await apiRequest(`/instructions/${instructionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.instruction;
  },

  /**
   * Delete an instruction
   */
  async delete(instructionId) {
    await apiRequest(`/instructions/${instructionId}`, {
      method: 'DELETE',
    });
    return true;
  },
};

// ============ Templates API ============

export const templatesApi = {
  /**
   * Get all templates
   */
  async list() {
    const data = await apiRequest('/templates');
    return data.templates;
  },

  /**
   * Create a new template
   */
  async create({ title, text, category }) {
    const data = await apiRequest('/templates', {
      method: 'POST',
      body: JSON.stringify({ title, text, category }),
    });
    return data.template;
  },

  /**
   * Update a template
   */
  async update(templateId, updates) {
    const data = await apiRequest(`/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.template;
  },

  /**
   * Delete a template
   */
  async delete(templateId) {
    await apiRequest(`/templates/${templateId}`, {
      method: 'DELETE',
    });
    return true;
  },
};

// ============ Settings API ============

export const settingsApi = {
  /**
   * Reset tags, instructions, templates to defaults
   * Deletes all user data, then components will reseed on next load
   */
  async resetToDefaults() {
    const data = await apiRequest('/reset-defaults', {
      method: 'POST',
    });
    return data;
  },
};

// ============ Auth Helper ============

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem('auth_access_token');
  localStorage.removeItem('user');
  window.location.reload();
}
