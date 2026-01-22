/**
 * Sync Status Badge
 * Displays current sync status in the header
 * Shows: Synced, Syncing, Offline, or Error states
 * Click to refresh from cloud
 */

import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, AlertCircle, Loader2, Check, RefreshCw } from 'lucide-react';
import { SYNC_STATUS } from '../lib/sync-manager';

export default function SyncStatusBadge({ syncManager }) {
  const [syncState, setSyncState] = useState({
    status: SYNC_STATUS.IDLE,
    queueSize: 0,
    error: null
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowMenu(false);
    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (syncState.status === SYNC_STATUS.ERROR) {
      // Retry sync on error
      syncManager?.triggerSync();
    } else {
      setShowMenu(!showMenu);
    }
  };

  const handleRefreshFromCloud = async (e) => {
    e.stopPropagation();
    if (isRefreshing || !syncManager) return;

    setIsRefreshing(true);
    setShowMenu(false);

    try {
      // Perform full sync from server
      await syncManager.performInitialSync();
      // Reload the page to reflect new data
      window.location.reload();
    } catch (error) {
      console.error('Refresh failed:', error);
      alert('Failed to refresh from cloud: ' + error.message);
    } finally {
      setIsRefreshing(false);
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
    <div className="relative">
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${getBadgeColor()}`}
        title={getTooltip()}
      >
        {isRefreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : getIcon()}
        <span>{isRefreshing ? 'Refreshing...' : getLabel()}</span>
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <button
            onClick={handleRefreshFromCloud}
            disabled={isRefreshing}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh from Cloud</span>
          </button>
          <div className="border-t border-gray-100 my-1" />
          <div className="px-4 py-2 text-xs text-gray-500">
            {getTooltip()}
            {syncState.queueSize > 0 && (
              <p className="mt-1">
                {syncState.queueSize} change{syncState.queueSize !== 1 ? 's' : ''} pending
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
