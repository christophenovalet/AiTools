/**
 * Sync Manager
 * Orchestrates offline-first synchronization between localStorage and cloud
 * Handles online/offline detection, conflict resolution, and automatic sync
 */

import { syncQueue } from './sync-queue';
import { APIClient } from './api-client';

export const SYNC_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  OFFLINE: 'offline',
  ERROR: 'error'
};

export class SyncManager {
  constructor(authenticatedFetch, user) {
    this.apiClient = new APIClient(authenticatedFetch);
    this.user = user;
    this.status = SYNC_STATUS.IDLE;
    this.listeners = [];
    this.syncing = false;
    this.syncInterval = null;
    this.retryTimeout = null;

    // Initialize queue
    syncQueue.initialize().then(() => {
      this.checkQueueSize();
    });

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Check initial online status
    if (navigator.onLine) {
      this.updateStatus(SYNC_STATUS.IDLE);
      this.startPeriodicSync();
    } else {
      this.updateStatus(SYNC_STATUS.OFFLINE);
    }
  }

  /**
   * Add status change listener
   */
  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Update sync status and notify listeners
   */
  updateStatus(status, details = {}) {
    this.status = status;

    for (const listener of this.listeners) {
      listener({ status, ...details });
    }
  }

  /**
   * Queue change for sync
   */
  async queueChange(key, value, metadata = {}) {
    await syncQueue.enqueue(key, value, metadata);

    // Trigger sync if online
    if (navigator.onLine) {
      this.scheduleSyncSoon();
    } else {
      this.checkQueueSize();
    }
  }

  /**
   * Check queue size and update status
   */
  async checkQueueSize() {
    const size = await syncQueue.size();
    this.updateStatus(this.status, { queueSize: size });
  }

  /**
   * Handle coming online
   */
  handleOnline() {
    console.log('Network: Online');
    this.updateStatus(SYNC_STATUS.IDLE);
    this.startPeriodicSync();
    this.scheduleSyncSoon();
  }

  /**
   * Handle going offline
   */
  handleOffline() {
    console.log('Network: Offline');
    this.updateStatus(SYNC_STATUS.OFFLINE);
    this.stopPeriodicSync();
  }

  /**
   * Start periodic sync (every 30 seconds)
   */
  startPeriodicSync() {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      this.processQueue();
    }, 30000); // 30 seconds
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Schedule sync soon (debounced)
   */
  scheduleSyncSoon() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.retryTimeout = setTimeout(() => {
      this.processQueue();
    }, 1000); // 1 second
  }

  /**
   * Process sync queue
   */
  async processQueue() {
    if (this.syncing || !navigator.onLine) {
      return;
    }

    const queueSize = await syncQueue.size();

    if (queueSize === 0) {
      this.updateStatus(SYNC_STATUS.SYNCED, { queueSize: 0 });
      return;
    }

    this.syncing = true;
    this.updateStatus(SYNC_STATUS.SYNCING, { queueSize });

    try {
      // Get batch of items to sync
      const batch = await syncQueue.getBatch(10);

      if (batch.length === 0) {
        this.syncing = false;
        this.updateStatus(SYNC_STATUS.SYNCED, { queueSize: 0 });
        return;
      }

      // Transform queue items to API format
      const changes = batch.map(item => ({
        type: this.inferChangeType(item.key),
        key: item.key,
        value: item.value,
        metadata: item.metadata,
        operation: item.metadata?.deleted ? 'delete' : 'upsert'
      }));

      // Send batch to server
      const response = await this.apiClient.syncBatch(changes);

      // Remove successfully synced items
      const successfulIds = batch
        .filter((_, index) => !response.conflictDetails?.[index]?.conflict)
        .map(item => item.id);

      await syncQueue.removeBatch(successfulIds);

      // Handle conflicts
      if (response.conflicts > 0) {
        this.handleConflicts(response.conflictDetails);
      }

      // Update last sync timestamp
      localStorage.setItem('last_sync_timestamp', Date.now().toString());

      // Check if more items in queue
      const remainingSize = await syncQueue.size();

      if (remainingSize > 0) {
        // Schedule next batch
        this.scheduleSyncSoon();
      } else {
        this.updateStatus(SYNC_STATUS.SYNCED, { queueSize: 0 });
      }
    } catch (error) {
      console.error('Sync error:', error);

      // Increment attempt count for failed items
      const batch = await syncQueue.getBatch(10);
      for (const item of batch) {
        await syncQueue.incrementAttempts(item.id);
      }

      this.updateStatus(SYNC_STATUS.ERROR, {
        error: error.message,
        queueSize: await syncQueue.size()
      });

      // Retry with exponential backoff
      this.scheduleRetry();
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Schedule retry with exponential backoff
   */
  scheduleRetry() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    // Retry after 5 seconds
    this.retryTimeout = setTimeout(() => {
      this.processQueue();
    }, 5000);
  }

  /**
   * Handle sync conflicts (last-write-wins)
   */
  handleConflicts(conflicts) {
    for (const conflict of conflicts) {
      console.warn('Sync conflict:', conflict.key, conflict.message);

      // Notify user via status update
      this.updateStatus(SYNC_STATUS.SYNCED, {
        conflict: true,
        conflictKey: conflict.key,
        message: `Conflict in ${conflict.key}: Server version kept`
      });

      // Update localStorage with server data
      if (conflict.serverData) {
        localStorage.setItem(conflict.key, JSON.stringify(conflict.serverData));
      }
    }
  }

  /**
   * Perform initial sync (download all data from server)
   */
  async performInitialSync() {
    this.updateStatus(SYNC_STATUS.SYNCING, { initialSync: true });

    try {
      const data = await this.apiClient.syncAll();

      // Import settings
      for (const [key, setting] of Object.entries(data.settings || {})) {
        localStorage.setItem(key, JSON.stringify(setting.value));
      }

      // Import tags
      if (data.tags?.length > 0) {
        localStorage.setItem('textbuilder-tags', JSON.stringify(data.tags));
      }

      // Import AI instructions
      if (data.aiInstructions?.length > 0) {
        localStorage.setItem('textbuilder-ai-instructions', JSON.stringify(data.aiInstructions));
      }

      // Import templates
      if (data.templates?.length > 0) {
        localStorage.setItem('textbuilder-templates', JSON.stringify(data.templates));
      }

      // Import projects
      if (data.projects?.length > 0) {
        localStorage.setItem('textbuilder-projects', JSON.stringify(data.projects));
      }

      // Update last sync timestamp
      localStorage.setItem('last_sync_timestamp', data.serverTimestamp.toString());

      this.updateStatus(SYNC_STATUS.SYNCED, {
        initialSync: true,
        itemsImported: Object.keys(data.settings || {}).length +
                      (data.tags?.length || 0) +
                      (data.aiInstructions?.length || 0) +
                      (data.templates?.length || 0) +
                      (data.projects?.length || 0)
      });

      return data;
    } catch (error) {
      console.error('Initial sync failed:', error);
      this.updateStatus(SYNC_STATUS.ERROR, {
        error: error.message,
        initialSync: true
      });
      throw error;
    }
  }

  /**
   * Infer change type from key
   */
  inferChangeType(key) {
    if (key.startsWith('tag-')) return 'tag';
    if (key.startsWith('instruction-')) return 'ai_instruction';
    if (key.startsWith('template-')) return 'template';
    if (key.startsWith('project-')) return 'project';
    return 'setting';
  }

  /**
   * Manually trigger sync
   */
  async triggerSync() {
    if (this.syncing) {
      return;
    }

    await this.processQueue();
  }

  /**
   * Get sync statistics
   */
  async getStats() {
    const queueSize = await syncQueue.size();
    const failedItems = await syncQueue.getFailedItems();
    const lastSyncTimestamp = localStorage.getItem('last_sync_timestamp');

    return {
      queueSize,
      failedItems: failedItems.length,
      lastSync: lastSyncTimestamp ? new Date(parseInt(lastSyncTimestamp)) : null,
      status: this.status,
      online: navigator.onLine
    };
  }

  /**
   * Clear failed items from queue
   */
  async clearFailedItems() {
    const removed = await syncQueue.removeFailedItems();
    await this.checkQueueSize();
    return removed;
  }

  /**
   * Destroy sync manager
   */
  destroy() {
    this.stopPeriodicSync();
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}
