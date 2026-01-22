/**
 * Initial Sync Wizard
 * Handles first-time data migration from localStorage to cloud
 * Shows progress and handles errors gracefully
 */

import React, { useState } from 'react';
import { Upload, Download, Check, AlertCircle } from 'lucide-react';
import { encryptApiKey } from '../lib/encryption.js';

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

// Keys that contain arrays of items that need to be split
const ARRAY_KEYS = {
  'textbuilder-tags': 'tag',
  'textbuilder-ai-instructions': 'ai_instruction',
  'textbuilder-templates': 'template',
  'textbuilder-projects': 'project'
};

// Keys that should be encrypted before upload
const ENCRYPTED_KEYS = ['claude-api-key', 'claude-admin-api-key'];

export default function InitialSyncWizard({ syncManager, userEmail, onComplete, onSkip }) {
  const [step, setStep] = useState('intro'); // intro, upload, download, complete, error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [itemsFound, setItemsFound] = useState(0);
  const [itemsSynced, setItemsSynced] = useState(0);

  /**
   * Build properly formatted changes for sync-batch API
   */
  const buildChanges = async () => {
    const changes = [];

    for (const key of SYNC_KEYS) {
      const rawValue = localStorage.getItem(key);
      if (!rawValue || rawValue === 'null' || rawValue === '[]' || rawValue === '{}') {
        continue;
      }

      // Handle array data (tags, instructions, templates, projects)
      if (ARRAY_KEYS[key]) {
        try {
          const items = JSON.parse(rawValue);
          if (Array.isArray(items) && items.length > 0) {
            const type = ARRAY_KEYS[key];

            for (const item of items) {
              changes.push(formatArrayItem(type, item));
            }
          }
        } catch (e) {
          console.error(`Failed to parse ${key}:`, e);
        }
        continue;
      }

      // Handle encrypted settings (API keys)
      if (ENCRYPTED_KEYS.includes(key)) {
        try {
          const plainValue = rawValue;
          if (plainValue && userEmail) {
            const encryptedData = await encryptApiKey(plainValue, userEmail);
            changes.push({
              type: 'setting',
              key,
              value: JSON.stringify(encryptedData),
              metadata: {
                encrypted: true,
                encryption_metadata: { salt: encryptedData.salt, iv: encryptedData.iv },
                timestamp: Date.now()
              }
            });
          }
        } catch (e) {
          console.error(`Failed to encrypt ${key}:`, e);
        }
        continue;
      }

      // Handle regular settings
      changes.push({
        type: 'setting',
        key,
        value: rawValue,
        metadata: {
          encrypted: false,
          timestamp: Date.now()
        }
      });
    }

    return changes;
  };

  /**
   * Format array item (tag, instruction, template, project) for sync-batch
   */
  const formatArrayItem = (type, item) => {
    switch (type) {
      case 'tag':
        return {
          type: 'tag',
          key: `tag-${item.id}`,
          operation: 'upsert',
          data: {
            tag_id: item.id,
            name: item.name,
            description: item.description || '',
            category: item.category || null,
            is_custom: item.isCustom || false,
            action: item.action || null
          }
        };

      case 'ai_instruction':
        return {
          type: 'ai_instruction',
          key: `instruction-${item.id}`,
          operation: 'upsert',
          data: {
            instruction_id: item.id,
            name: item.name,
            description: item.description || '',
            is_custom: item.isCustom || false
          }
        };

      case 'template':
        return {
          type: 'template',
          key: `template-${item.id}`,
          operation: 'upsert',
          data: {
            template_id: item.id,
            title: item.title,
            text: item.text,
            category: item.category || null,
            is_custom: item.isCustom || false
          }
        };

      case 'project':
        return {
          type: 'project',
          key: `project-${item.id}`,
          operation: 'upsert',
          data: {
            project_id: item.id,
            name: item.name,
            color: item.color || null,
            data: item, // Store full project object
            updated_at: item.updatedAt || Date.now()
          }
        };

      default:
        return null;
    }
  };

  /**
   * Merge local and server arrays by ID, keeping newer items
   */
  const mergeArrays = (localItems, serverItems, idField = 'id') => {
    const merged = new Map();

    // Add server items first
    for (const item of serverItems) {
      const id = item[idField] || item.id;
      merged.set(id, item);
    }

    // Merge local items (local wins if newer or server doesn't have it)
    for (const item of localItems) {
      const id = item[idField] || item.id;
      const serverItem = merged.get(id);

      if (!serverItem) {
        // Server doesn't have this item, add it
        merged.set(id, item);
      } else {
        // Both have it - keep the newer one
        const localTime = item.updatedAt || item.createdAt || 0;
        const serverTime = serverItem.updated_at ? new Date(serverItem.updated_at).getTime() : 0;

        if (localTime > serverTime) {
          merged.set(id, item);
        }
      }
    }

    return Array.from(merged.values());
  };

  const startMigration = async () => {
    try {
      setError(null);
      setStep('download');
      setProgress(10);

      // Step 1: Download server data first
      console.log('Downloading server data for merge...');
      let serverData = { tags: [], aiInstructions: [], templates: [], projects: [], settings: {} };

      try {
        serverData = await syncManager.apiClient.syncAll();
        console.log('Server data received:', {
          tags: serverData.tags?.length || 0,
          instructions: serverData.aiInstructions?.length || 0,
          templates: serverData.templates?.length || 0,
          projects: serverData.projects?.length || 0
        });
      } catch (err) {
        console.log('No server data yet or error fetching:', err.message);
      }

      setProgress(25);
      setStep('upload');

      // Step 2: Get local data
      const localTags = JSON.parse(localStorage.getItem('textbuilder-tags') || '[]');
      const localInstructions = JSON.parse(localStorage.getItem('textbuilder-ai-instructions') || '[]');
      const localTemplates = JSON.parse(localStorage.getItem('textbuilder-templates') || '[]');
      const localProjects = JSON.parse(localStorage.getItem('textbuilder-projects') || '[]');

      // Transform server data to frontend format for comparison
      const serverTags = (serverData.tags || []).map(t => ({
        id: t.tag_id || t.id,
        name: t.name,
        description: t.description || '',
        category: t.category,
        isCustom: t.is_custom,
        action: t.action
      }));

      const serverInstructions = (serverData.aiInstructions || []).map(i => ({
        id: i.instruction_id || i.id,
        name: i.name,
        description: i.description || '',
        isCustom: i.is_custom
      }));

      const serverTemplates = (serverData.templates || []).map(t => ({
        id: t.template_id || t.id,
        title: t.title,
        text: t.text,
        category: t.category,
        isCustom: t.is_custom
      }));

      const serverProjects = (serverData.projects || []).map(p => {
        if (p.data && typeof p.data === 'object') {
          return { ...p.data, id: p.project_id || p.data.id };
        }
        return { ...p, id: p.project_id || p.id, texts: p.texts || [] };
      });

      // Step 3: Merge local and server data
      console.log('Merging data...');
      const mergedTags = mergeArrays(localTags, serverTags);
      const mergedInstructions = mergeArrays(localInstructions, serverInstructions);
      const mergedTemplates = mergeArrays(localTemplates, serverTemplates);
      const mergedProjects = mergeArrays(localProjects, serverProjects);

      console.log('Merge results:', {
        tags: `${localTags.length} local + ${serverTags.length} server = ${mergedTags.length} merged`,
        instructions: `${localInstructions.length} local + ${serverInstructions.length} server = ${mergedInstructions.length} merged`,
        templates: `${localTemplates.length} local + ${serverTemplates.length} server = ${mergedTemplates.length} merged`,
        projects: `${localProjects.length} local + ${serverProjects.length} server = ${mergedProjects.length} merged`
      });

      setProgress(40);

      // Step 4: Save merged data to localStorage
      localStorage.setItem('textbuilder-tags', JSON.stringify(mergedTags));
      localStorage.setItem('textbuilder-ai-instructions', JSON.stringify(mergedInstructions));
      localStorage.setItem('textbuilder-templates', JSON.stringify(mergedTemplates));
      localStorage.setItem('textbuilder-projects', JSON.stringify(mergedProjects));

      setProgress(50);

      // Step 5: Build changes from merged data and upload
      const changes = await buildChanges();
      setItemsFound(changes.length);

      if (changes.length > 0) {
        console.log(`Uploading ${changes.length} merged items to cloud...`);

        const batchSize = 10;
        let uploaded = 0;

        for (let i = 0; i < changes.length; i += batchSize) {
          const batch = changes.slice(i, i + batchSize);
          await syncManager.apiClient.syncBatch(batch);
          uploaded += batch.length;
          setItemsSynced(uploaded);
          setProgress(50 + (uploaded / changes.length) * 40); // 50-90%
        }
      }

      setProgress(100);

      // Mark migration complete
      markMigrationComplete();
      localStorage.setItem('last_sync_timestamp', Date.now().toString());

      setStep('complete');
      setTimeout(() => onComplete(), 1500);
    } catch (err) {
      console.error('Migration failed:', err);
      setError(err.message || 'Migration failed. Please try again.');
      setStep('error');
    }
  };

  const markMigrationComplete = () => {
    localStorage.setItem('sync_migration_complete', 'true');
    localStorage.setItem('sync_migration_date', new Date().toISOString());
  };

  const handleSkip = () => {
    markMigrationComplete();
    onSkip();
  };

  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            All Set!
          </h2>
          <p className="text-gray-600">
            Your data is now synced to the cloud and will automatically sync across all your devices.
          </p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Migration Failed
          </h2>
          <p className="text-gray-600 mb-4 text-center">
            {error}
          </p>
          <div className="flex gap-3">
            <button
              onClick={startMigration}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Skip for Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Enable Cloud Sync
        </h2>
        <p className="text-gray-600 mb-6">
          {step === 'intro' && (
            <>
              Sync your data to the cloud and access it from any device. Your API keys will be encrypted before upload.
            </>
          )}
          {step === 'upload' && (
            <>
              Uploading your data to the cloud...
            </>
          )}
          {step === 'download' && (
            <>
              Syncing with the cloud...
            </>
          )}
        </p>

        {/* Progress indicator */}
        {step !== 'intro' && (
          <div className="mb-6">
            {step === 'upload' && (
              <div className="flex items-center gap-3 mb-4 text-blue-600">
                <Upload className="w-5 h-5 animate-pulse" />
                <span className="text-sm">
                  {itemsSynced > 0 ? (
                    <>Uploaded {itemsSynced} of {itemsFound} items</>
                  ) : (
                    <>Scanning your data...</>
                  )}
                </span>
              </div>
            )}

            {step === 'download' && (
              <div className="flex items-center gap-3 mb-4 text-blue-600">
                <Download className="w-5 h-5 animate-pulse" />
                <span className="text-sm">Downloading from cloud...</span>
              </div>
            )}

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}

        {/* Action buttons */}
        {step === 'intro' && (
          <div className="space-y-3">
            <button
              onClick={startMigration}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Enable Cloud Sync
            </button>
            <button
              onClick={handleSkip}
              className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Skip for Now
            </button>
          </div>
        )}

        {/* Info boxes */}
        {step === 'intro' && (
          <div className="mt-6 pt-6 border-t space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Encrypted API Keys
                </p>
                <p className="text-xs text-gray-600">
                  Your API keys are encrypted before leaving your device
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Offline-First
                </p>
                <p className="text-xs text-gray-600">
                  Works offline, syncs automatically when online
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Multi-Device
                </p>
                <p className="text-xs text-gray-600">
                  Access your data from any device
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
