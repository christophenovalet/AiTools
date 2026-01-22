/**
 * Sync Queue Manager
 * Uses IndexedDB to store pending sync operations
 * Survives page refreshes and provides durable queue
 */

import { openDB } from 'idb';

const DB_NAME = 'ai-tools-sync';
const DB_VERSION = 1;
const STORE_NAME = 'sync_queue';

/**
 * Initialize IndexedDB
 */
async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true
        });

        // Index by timestamp for ordering
        store.createIndex('timestamp', 'timestamp');

        // Index by key for deduplication
        store.createIndex('key', 'key');
      }
    }
  });
}

/**
 * Sync Queue Class
 */
export class SyncQueue {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize the queue
   */
  async initialize() {
    this.db = await initDB();
  }

  /**
   * Add item to queue
   */
  async enqueue(key, value, metadata = {}) {
    if (!this.db) {
      await this.initialize();
    }

    const item = {
      key,
      value,
      metadata: {
        ...metadata,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      attempts: 0,
      lastAttempt: null
    };

    // Check if item with same key exists (deduplication)
    const existing = await this.findByKey(key);

    if (existing) {
      // Update existing item instead of creating duplicate
      item.id = existing.id;
      item.attempts = existing.attempts;
      await this.db.put(STORE_NAME, item);
    } else {
      // Add new item
      await this.db.add(STORE_NAME, item);
    }

    return item;
  }

  /**
   * Get next batch of items to sync
   */
  async getBatch(limit = 10) {
    if (!this.db) {
      await this.initialize();
    }

    const tx = this.db.transaction(STORE_NAME, 'readonly');
    const index = tx.store.index('timestamp');

    const items = [];
    let cursor = await index.openCursor();

    while (cursor && items.length < limit) {
      items.push(cursor.value);
      cursor = await cursor.continue();
    }

    await tx.done;

    return items;
  }

  /**
   * Find item by key
   */
  async findByKey(key) {
    if (!this.db) {
      await this.initialize();
    }

    const tx = this.db.transaction(STORE_NAME, 'readonly');
    const index = tx.store.index('key');
    const item = await index.get(key);
    await tx.done;

    return item;
  }

  /**
   * Remove item from queue
   */
  async remove(id) {
    if (!this.db) {
      await this.initialize();
    }

    await this.db.delete(STORE_NAME, id);
  }

  /**
   * Remove multiple items
   */
  async removeBatch(ids) {
    if (!this.db) {
      await this.initialize();
    }

    const tx = this.db.transaction(STORE_NAME, 'readwrite');

    for (const id of ids) {
      await tx.store.delete(id);
    }

    await tx.done;
  }

  /**
   * Update item (e.g., increment attempts)
   */
  async update(id, updates) {
    if (!this.db) {
      await this.initialize();
    }

    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    const item = await tx.store.get(id);

    if (item) {
      Object.assign(item, updates);
      await tx.store.put(item);
    }

    await tx.done;
  }

  /**
   * Increment attempt count
   */
  async incrementAttempts(id) {
    if (!this.db) {
      await this.initialize();
    }

    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    const item = await tx.store.get(id);

    if (item) {
      item.attempts += 1;
      item.lastAttempt = Date.now();
      await tx.store.put(item);
    }

    await tx.done;
  }

  /**
   * Get queue size
   */
  async size() {
    if (!this.db) {
      await this.initialize();
    }

    const tx = this.db.transaction(STORE_NAME, 'readonly');
    const count = await tx.store.count();
    await tx.done;

    return count;
  }

  /**
   * Get all items (for debugging)
   */
  async getAll() {
    if (!this.db) {
      await this.initialize();
    }

    return this.db.getAll(STORE_NAME);
  }

  /**
   * Clear entire queue (careful!)
   */
  async clear() {
    if (!this.db) {
      await this.initialize();
    }

    await this.db.clear(STORE_NAME);
  }

  /**
   * Get failed items (attempts > threshold)
   */
  async getFailedItems(maxAttempts = 3) {
    if (!this.db) {
      await this.initialize();
    }

    const allItems = await this.getAll();
    return allItems.filter(item => item.attempts >= maxAttempts);
  }

  /**
   * Remove failed items
   */
  async removeFailedItems(maxAttempts = 3) {
    if (!this.db) {
      await this.initialize();
    }

    const failedItems = await this.getFailedItems(maxAttempts);
    await this.removeBatch(failedItems.map(item => item.id));

    return failedItems.length;
  }
}

// Export singleton instance
export const syncQueue = new SyncQueue();
