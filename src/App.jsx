import React, { useState } from 'react'
import { HomePage } from '@/pages/HomePage'
import { DiffToolPage } from '@/pages/DiffToolPage'
import { TextBuilderPage } from '@/pages/TextBuilderPage'

function App() {
  const [currentPage, setCurrentPage] = useState('home')

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onSelectTool={(toolId) => setCurrentPage(toolId)} />
      case 'diff-tool':
        return <DiffToolPage onBackHome={() => setCurrentPage('home')} />
      case 'text-builder':
        return <TextBuilderPage onBackHome={() => setCurrentPage('home')} />
      default:
        return <HomePage onSelectTool={(toolId) => setCurrentPage(toolId)} />
    }
  }

  return renderPage()
}

export default App
