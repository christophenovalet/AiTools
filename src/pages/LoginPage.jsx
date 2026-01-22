/**
 * Login Page
 * Displays Google Sign-In button and app information
 */

import React from 'react';
import GoogleSignIn from '../components/GoogleSignIn';
import { Shield, Cloud, Zap } from 'lucide-react';

export default function LoginPage() {
  // Auth redirect is handled by App.jsx
  const handleSignInSuccess = () => {
    // App.jsx will detect auth change and show main content
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Tools
          </h1>
          <p className="text-gray-600">
            Sign in to access your workspace
          </p>
        </div>

        {/* Sign-In Button */}
        <div className="flex justify-center mb-8">
          <GoogleSignIn onSuccess={handleSignInSuccess} />
        </div>

        {/* Features */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Cloud className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                Cloud Sync
              </h3>
              <p className="text-xs text-gray-600">
                Your data syncs automatically across all devices
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                Offline First
              </h3>
              <p className="text-xs text-gray-600">
                Work offline, sync when you're back online
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                End-to-End Encrypted
              </h3>
              <p className="text-xs text-gray-600">
                API keys are encrypted before leaving your device
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our terms and privacy policy.
            <br />
            Your API keys are encrypted and never stored in plain text.
          </p>
        </div>
      </div>
    </div>
  );
}
