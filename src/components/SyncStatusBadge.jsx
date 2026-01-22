/**
 * Sync Status Badge
 * Displays current sync status in the header
 * Shows: Synced, Syncing, Offline, or Error states
 */

import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, AlertCircle, Loader2, Check } from 'lucide-react';
import { SYNC_STATUS } from '../lib/sync-manager';

export default function SyncStatusBadge({ syncManager }) {
  const [syncState, setSyncState] = useState({
    status: SYNC_STATUS.IDLE,
    queueSize: 0,
    error: null
  });

  useEffect(() => {
    if (!syncManager) return;

    // Subscribe to sync status updates
    const unsubscribe = syncManager.addListener((state) => {
      setSyncState(state);
    });

    // Get initial stats
    syncManager.getStats().then(stats => {
      setSyncState(prev => ({
        ...prev,
        queueSize: stats.queueSize,
        status: stats.status
      }));
    });

    return unsubscribe;
  }, [syncManager]);

  const handleClick = () => {
    if (syncState.status === SYNC_STATUS.ERROR) {
      // Retry sync on error
      syncManager?.triggerSync();
    }
  };

  const getBadgeColor = () => {
    switch (syncState.status) {
      case SYNC_STATUS.SYNCED:
        return 'bg-green-100 text-green-700 border-green-200';
      case SYNC_STATUS.SYNCING:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case SYNC_STATUS.OFFLINE:
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case SYNC_STATUS.ERROR:
        return 'bg-red-100 text-red-700 border-red-200 cursor-pointer hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getIcon = () => {
    switch (syncState.status) {
      case SYNC_STATUS.SYNCED:
        return <Check className="w-3.5 h-3.5" />;
      case SYNC_STATUS.SYNCING:
        return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
      case SYNC_STATUS.OFFLINE:
        return <CloudOff className="w-3.5 h-3.5" />;
      case SYNC_STATUS.ERROR:
        return <AlertCircle className="w-3.5 h-3.5" />;
      default:
        return <Cloud className="w-3.5 h-3.5" />;
    }
  };

  const getLabel = () => {
    switch (syncState.status) {
      case SYNC_STATUS.SYNCED:
        return 'Synced';
      case SYNC_STATUS.SYNCING:
        return 'Syncing...';
      case SYNC_STATUS.OFFLINE:
        return syncState.queueSize > 0
          ? `Offline (${syncState.queueSize} pending)`
          : 'Offline';
      case SYNC_STATUS.ERROR:
        return 'Sync Failed';
      default:
        return 'Idle';
    }
  };

  const getTooltip = () => {
    switch (syncState.status) {
      case SYNC_STATUS.SYNCED:
        return 'All changes synced to cloud';
      case SYNC_STATUS.SYNCING:
        return `Syncing ${syncState.queueSize} changes...`;
      case SYNC_STATUS.OFFLINE:
        return syncState.queueSize > 0
          ? `${syncState.queueSize} changes will sync when online`
          : 'You are offline';
      case SYNC_STATUS.ERROR:
        return `Sync error: ${syncState.error || 'Unknown error'}. Click to retry.`;
      default:
        return 'Sync status';
    }
  };

  if (!syncManager) {
    return null;
  }

  return (
    <div className="relative group">
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${getBadgeColor()}`}
        title={getTooltip()}
      >
        {getIcon()}
        <span>{getLabel()}</span>
      </button>

      {/* Tooltip */}
      <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <p>{getTooltip()}</p>

        {syncState.status === SYNC_STATUS.ERROR && (
          <p className="mt-2 text-gray-300">Click to retry sync</p>
        )}

        {syncState.queueSize > 0 && (
          <p className="mt-2 text-gray-300">
            {syncState.queueSize} change{syncState.queueSize !== 1 ? 's' : ''} in queue
          </p>
        )}
      </div>
    </div>
  );
}
