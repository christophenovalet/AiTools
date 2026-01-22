/**
 * Storage Adapter
 * Wraps localStorage with sync tracking and encryption support
 * Automatically queues changes for background sync
 */

import { encryptApiKey, decryptApiKey, isEncrypted } from './encryption';

// Keys that should be encrypted before sync
const ENCRYPTED_KEYS = [
  'claude-api-key',
  'claude-admin-api-key'
];

// Keys that should sync to cloud
const SYNC_KEYS = [
  'claude-api-key',
  'claude-admin-api-key',
  'textbuilder-tags',
  'textbuilder-ai-instructions',
  'textbuilder-templates',
  'textbuilder-projects',
  'textbuilder-menu-items',
  'chatbot-model-pricing',
  'keyboard-shortcuts'
];

// Keys that should stay local only (never sync)
const LOCAL_ONLY_KEYS = [
  'chatbot-model',
  'chatbot-context',
  'chatbot-messages',
  'auth_access_token',
  'auth_user',
  'last_sync_timestamp'
];

/**
 * Storage Adapter Class
 * Drop-in replacement for localStorage with sync support
 */
class StorageAdapter {
  constructor() {
    this.syncManager = null;
    this.user = null;
  }

  /**
   * Initialize with sync manager and user info
   */
  initialize(syncManager, user) {
    this.syncManager = syncManager;
    this.user = user;
  }

  /**
   * Check if a key should be synced
   */
  shouldSync(key) {
    return SYNC_KEYS.includes(key) && !LOCAL_ONLY_KEYS.includes(key);
  }

  /**
   * Check if a key should be encrypted
   */
  shouldEncrypt(key) {
    return ENCRYPTED_KEYS.includes(key);
  }

  /**
   * Get item from localStorage
   * Automatically decrypts if needed
   */
  async getItem(key) {
    const value = localStorage.getItem(key);

    if (!value) {
      return null;
    }

    try {
      const parsed = JSON.parse(value);

      // If encrypted and we have user email, decrypt
      if (isEncrypted(parsed) && this.user?.email) {
        const decrypted = await decryptApiKey(parsed, this.user.email);
        return decrypted;
      }

      // Return as-is if not encrypted
      return value;
    } catch (err) {
      // If parse fails, return raw string
      return value;
    }
  }

  /**
   * Set item in localStorage
   * Automatically encrypts if needed and queues for sync
   */
  async setItem(key, value) {
    // Store locally first (optimistic update)
    localStorage.setItem(key, value);

    // Queue for sync if applicable
    if (this.shouldSync(key) && this.syncManager) {
      try {
        let dataToSync = value;

        // Encrypt if needed
        if (this.shouldEncrypt(key) && this.user?.email) {
          const encrypted = await encryptApiKey(value, this.user.email);
          dataToSync = JSON.stringify(encrypted);
        }

        // Queue change for sync
        this.syncManager.queueChange(key, dataToSync, {
          encrypted: this.shouldEncrypt(key)
        });
      } catch (err) {
        console.error('Failed to queue sync:', err);
        // Don't throw - local storage update succeeded
      }
    }
  }

  /**
   * Remove item from localStorage
   * Queues deletion for sync
   */
  removeItem(key) {
    localStorage.removeItem(key);

    // Queue deletion for sync if applicable
    if (this.shouldSync(key) && this.syncManager) {
      this.syncManager.queueChange(key, null, { deleted: true });
    }
  }

  /**
   * Clear all items (careful!)
   */
  clear() {
    localStorage.clear();
  }

  /**
   * Get item without decryption (for internal use)
   */
  getItemRaw(key) {
    return localStorage.getItem(key);
  }

  /**
   * Set item without encryption/sync (for internal use)
   */
  setItemRaw(key, value) {
    localStorage.setItem(key, value);
  }

  /**
   * Check if key exists
   */
  has(key) {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Get all keys
   */
  keys() {
    return Object.keys(localStorage);
  }

  /**
   * Get number of items
   */
  get length() {
    return localStorage.length;
  }

  /**
   * Get key at index
   */
  key(index) {
    return localStorage.key(index);
  }
}

// Export singleton instance
export const storageAdapter = new StorageAdapter();

// Export for testing
export { StorageAdapter };

/**
 * Hook for React components
 */
import { useState, useEffect } from 'react';

export function useStorage(key, defaultValue = null) {
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadValue = async () => {
      try {
        const stored = await storageAdapter.getItem(key);
        if (stored !== null) {
          setValue(stored);
        }
      } catch (err) {
        console.error(`Failed to load ${key}:`, err);
      } finally {
        setLoading(false);
      }
    };

    loadValue();
  }, [key]);

  const updateValue = async (newValue) => {
    try {
      await storageAdapter.setItem(key, newValue);
      setValue(newValue);
    } catch (err) {
      console.error(`Failed to update ${key}:`, err);
      throw err;
    }
  };

  const removeValue = () => {
    storageAdapter.removeItem(key);
    setValue(defaultValue);
  };

  return [value, updateValue, removeValue, loading];
}
