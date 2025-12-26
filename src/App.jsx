import React, { useState } from 'react'
import { HomePage } from '@/pages/HomePage'
import { DiffToolPage } from '@/pages/DiffToolPage'
import { TextBuilderPage } from '@/pages/TextBuilderPage'
import { PromptFrameworkPage } from '@/pages/PromptFrameworkPage'
import { SettingsPage } from '@/pages/SettingsPage'

function App() {
  const [currentPage, setCurrentPage] = useState('home')

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

  return renderPage()
}

export default App
