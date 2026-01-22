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

  const startMigration = async () => {
    try {
      setError(null);
      setStep('upload');
      setProgress(10);

      // Step 1: Build properly formatted changes
      console.log('Building migration data...');
      const changes = await buildChanges();

      setItemsFound(changes.length);
      setProgress(25);

      if (changes.length === 0) {
        // No data to migrate, just download from server
        setStep('download');
        setProgress(50);

        await syncManager.performInitialSync();

        setProgress(100);
        setStep('complete');
        markMigrationComplete();
        setTimeout(() => onComplete(), 1500);
        return;
      }

      // Step 2: Upload existing data to server
      console.log(`Uploading ${changes.length} items to cloud...`);

      // Upload in batches of 10
      const batchSize = 10;
      let uploaded = 0;

      for (let i = 0; i < changes.length; i += batchSize) {
        const batch = changes.slice(i, i + batchSize);

        await syncManager.apiClient.syncBatch(batch);

        uploaded += batch.length;
        setItemsSynced(uploaded);
        setProgress(25 + (uploaded / changes.length) * 25); // 25-50%
      }

      setProgress(50);

      // Step 3: Download and merge server data
      setStep('download');
      console.log('Downloading server data...');

      await syncManager.performInitialSync();

      setProgress(100);

      // Mark migration complete
      markMigrationComplete();

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
