import React, { useState, useEffect } from 'react'
import { HomePage } from '@/pages/HomePage'
import { DiffToolPage } from '@/pages/DiffToolPage'
import { TextBuilderPage } from '@/pages/TextBuilderPage'
import { PromptFrameworkPage } from '@/pages/PromptFrameworkPage'
import { SettingsPage } from '@/pages/SettingsPage'
import LoginPage from '@/pages/LoginPage'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

const LAST_PAGE_KEY = 'aitools-last-page'

function AppContent() {
  const [currentPage, setCurrentPage] = useState(() => {
    // Load last used page from localStorage
    const saved = localStorage.getItem(LAST_PAGE_KEY)
    return saved || 'home'
  })
  const { isAuthenticated, loading: authLoading } = useAuth()

  // Save current page to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(LAST_PAGE_KEY, currentPage)
  }, [currentPage])

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
  if (authLoading) {
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

  // Render main app
  return (
    <div className="min-h-screen">
      {renderPage()}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
