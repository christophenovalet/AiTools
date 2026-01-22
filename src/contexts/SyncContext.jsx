/**
 * Sync Context
 * Provides sync manager and sync state to all components
 * Initializes storage adapter with user context
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { SyncManager, SYNC_STATUS } from '../lib/sync-manager';
import { storageAdapter } from '../lib/storage-adapter';

const SyncContext = createContext(null);

export function useSyncManager() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncManager must be used within SyncProvider');
  }
  return context;
}

export function SyncProvider({ children }) {
  const { user, authenticatedFetch, isAuthenticated } = useAuth();
  const [syncManager, setSyncManager] = useState(null);
  const [syncState, setSyncState] = useState({
    status: SYNC_STATUS.IDLE,
    queueSize: 0,
    error: null,
    lastSync: null
  });

  // Initialize sync manager when user authenticates
  useEffect(() => {
    if (isAuthenticated && user && authenticatedFetch) {
      console.log('Initializing sync manager for user:', user.email);

      // Create sync manager
      const manager = new SyncManager(authenticatedFetch, user);

      // Initialize storage adapter with sync manager and user
      storageAdapter.initialize(manager, user);

      // Subscribe to sync status updates
      const unsubscribe = manager.addListener((state) => {
        setSyncState(state);
      });

      // Get initial stats
      manager.getStats().then(stats => {
        setSyncState(prev => ({
          ...prev,
          queueSize: stats.queueSize,
          status: stats.status,
          lastSync: stats.lastSync
        }));
      });

      setSyncManager(manager);

      // Auto-sync on startup if migration is complete
      const migrationComplete = localStorage.getItem('sync_migration_complete');
      if (migrationComplete && navigator.onLine) {
        // Small delay to ensure auth is fully initialized
        setTimeout(async () => {
          console.log('Auto-syncing from cloud on startup...');
          try {
            await manager.performInitialSync();
            console.log('Startup sync complete');
            // Dispatch event so components can refresh their data
            window.dispatchEvent(new CustomEvent('sync-complete'));
          } catch (err) {
            console.warn('Startup sync failed (will use local data):', err.message);
            // Don't show error to user - local data still works
            // They can manually refresh if needed
          }
        }, 500);
      }

      // Cleanup on unmount or user change
      return () => {
        console.log('Cleaning up sync manager');
        unsubscribe();
        manager.destroy();
      };
    } else {
      // User logged out, clear sync manager
      setSyncManager(null);
      setSyncState({
        status: SYNC_STATUS.IDLE,
        queueSize: 0,
        error: null,
        lastSync: null
      });
    }
  }, [isAuthenticated, user, authenticatedFetch]);

  const value = {
    syncManager,
    syncState,
    isReady: !!syncManager
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}
