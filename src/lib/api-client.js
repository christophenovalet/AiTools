/**
 * API Client
 * Centralized client for making authenticated API requests
 */

import { API_BASE_URL } from '../config/auth';

export class APIClient {
  constructor(authenticatedFetch) {
    this.authenticatedFetch = authenticatedFetch;
  }

  /**
   * Get all user data (full sync)
   */
  async syncAll() {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/sync-all`, {
      method: 'GET'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Sync failed');
    }

    return response.json();
  }

  /**
   * Upload batch of changes
   */
  async syncBatch(changes) {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/sync-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ changes })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Batch sync failed');
    }

    return response.json();
  }

  /**
   * Get specific setting
   */
  async getSetting(key) {
    const response = await this.authenticatedFetch(
      `${API_BASE_URL}/sync-settings/${encodeURIComponent(key)}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.json();
      throw new Error(error.error || 'Failed to get setting');
    }

    return response.json();
  }

  /**
   * Update specific setting
   */
  async setSetting(key, value, encrypted = false, encryptionMetadata = null) {
    const response = await this.authenticatedFetch(
      `${API_BASE_URL}/sync-settings/${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          value,
          encrypted,
          encryption_metadata: encryptionMetadata
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to set setting');
    }

    return response.json();
  }

  /**
   * Get all tags
   */
  async getTags() {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/sync-tags`, {
      method: 'GET'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get tags');
    }

    return response.json();
  }

  /**
   * Get all projects
   */
  async getProjects() {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/sync-projects`, {
      method: 'GET'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get projects');
    }

    return response.json();
  }

  /**
   * Create/update project
   */
  async saveProject(project) {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/sync-projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ project })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save project');
    }

    return response.json();
  }

  /**
   * Delete project
   */
  async deleteProject(projectId) {
    const response = await this.authenticatedFetch(
      `${API_BASE_URL}/sync-projects/${projectId}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete project');
    }

    return response.json();
  }
}
