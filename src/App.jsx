import React, { useState, useEffect } from 'react'
import { HomePage } from '@/pages/HomePage'
import { DiffToolPage } from '@/pages/DiffToolPage'
import { TextBuilderPage } from '@/pages/TextBuilderPage'
import { PromptFrameworkPage } from '@/pages/PromptFrameworkPage'
import { SettingsPage } from '@/pages/SettingsPage'
import LoginPage from '@/pages/LoginPage'
import InitialSyncWizard from '@/components/InitialSyncWizard'
import SyncStatusBadge from '@/components/SyncStatusBadge'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SyncProvider, useSyncManager } from '@/contexts/SyncContext'

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home')
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  const { syncManager } = useSyncManager()
  const [showMigrationWizard, setShowMigrationWizard] = useState(false)
  const [checkingMigration, setCheckingMigration] = useState(true)

  // Check if migration is needed on mount
  useEffect(() => {
    if (isAuthenticated) {
      const migrationComplete = localStorage.getItem('sync_migration_complete')
      if (!migrationComplete) {
        // Check if user has any existing data to migrate
        const hasData = localStorage.getItem('claude-api-key') ||
                       localStorage.getItem('textbuilder-projects') ||
                       localStorage.getItem('textbuilder-tags')

        setShowMigrationWizard(!!hasData)
      }
      setCheckingMigration(false)
    }
  }, [isAuthenticated])

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onSelectTool={(toolId) => setCurrentPage(toolId)} />
      case 'diff-tool':
        return <DiffToolPage onBackHome={() => setCurrentPage('home')} />
      case 'text-builder':
        return <TextBuilderPage onBackHome={() => setCurrentPage('home')} onOpenSettings={() => setCurrentPage('settings')} />
      case 'prompt-framework':
        return <PromptFrameworkPage onBackHome={() => setCurrentPage('home')} />
      case 'settings':
        return <SettingsPage onBackHome={() => setCurrentPage('home')} />
      default:
        return <HomePage onSelectTool={(toolId) => setCurrentPage(toolId)} />
    }
  }

  // Show loading state while checking auth
  if (authLoading || (isAuthenticated && checkingMigration)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Show migration wizard if needed
  if (showMigrationWizard) {
    return (
      <InitialSyncWizard
        syncManager={syncManager}
        userEmail={user?.email}
        onComplete={() => setShowMigrationWizard(false)}
        onSkip={() => setShowMigrationWizard(false)}
      />
    )
  }

  // Render main app with sync badge
  return (
    <div className="min-h-screen">
      {/* Sync Status Badge - Fixed position in top right */}
      {syncManager && (
        <div className="fixed top-4 right-4 z-50">
          <SyncStatusBadge syncManager={syncManager} />
        </div>
      )}

      {/* Main content */}
      {renderPage()}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <AppContent />
      </SyncProvider>
    </AuthProvider>
  )
}

export default App
