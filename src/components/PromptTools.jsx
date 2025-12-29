import React, { useState } from 'react'
import { TagsLibrary } from './TagsLibrary'
import { TemplateLibrary } from './TemplateLibrary'
import { Button } from './ui/button'

export function PromptTools({ onInsertTag, onInsertInstruction, onInsertTemplate }) {
  const [activeTab, setActiveTab] = useState('tags') // 'tags' | 'templates'

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] rounded-lg border border-gray-700 overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700 bg-[#0a0a0a]">
        <button
          onClick={() => setActiveTab('tags')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'tags'
              ? 'text-cyan-400 bg-[#1a1a1a]'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
          }`}
        >
          Tags
          {activeTab === 'tags' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'templates'
              ? 'text-purple-400 bg-[#1a1a1a]'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
          }`}
        >
          Templates
          {activeTab === 'templates' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'tags' ? (
          <TagsLibrary
            onInsertTag={onInsertTag}
            onInsertInstruction={onInsertInstruction}
          />
        ) : (
          <TemplateLibrary
            onInsertTemplate={onInsertTemplate}
          />
        )}
      </div>
    </div>
  )
}
