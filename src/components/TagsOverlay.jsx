import React, { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import tagsData from '@/data/tags.json'
import aiInstructionsData from '@/data/ai-instructions.json'

const TAGS_STORAGE_KEY = 'textbuilder-tags'
const AI_INSTRUCTIONS_STORAGE_KEY = 'textbuilder-ai-instructions'

export function TagsOverlay({ onClose, onInsertTag, onInsertInstruction }) {
  const [filter, setFilter] = useState('')
  const filterRef = useRef(null)
  const overlayRef = useRef(null)

  const tags = (() => {
    const stored = localStorage.getItem(TAGS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : tagsData
  })()

  const aiInstructions = (() => {
    const stored = localStorage.getItem(AI_INSTRUCTIONS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : aiInstructionsData
  })()

  const filteredTags = tags
    .filter(tag =>
      tag.name.toLowerCase().includes(filter.toLowerCase()) ||
      (tag.description && tag.description.toLowerCase().includes(filter.toLowerCase()))
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  const filteredInstructions = aiInstructions
    .filter(inst =>
      inst.name.toLowerCase().includes(filter.toLowerCase()) ||
      (inst.description && inst.description.toLowerCase().includes(filter.toLowerCase()))
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  // Focus filter on mount
  useEffect(() => {
    filterRef.current?.focus()
  }, [])

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Handle click outside
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      onClose()
    }
  }

  const handleTagClick = (tag) => {
    onInsertTag(tag.name)
    onClose()
  }

  const handleInstructionClick = (inst) => {
    onInsertInstruction(inst.name, inst.description)
    onClose()
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-[95vw] max-h-[95vh] bg-[#1a1a1a] rounded-xl border border-gray-700 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-[#0a0a0a]">
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <span className="text-cyan-400">🏷️</span> Quick Insert
          </h2>
          <div className="flex items-center gap-4">
            <input
              ref={filterRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter tags and instructions..."
              className="w-64 bg-[#1a1a1a] text-gray-100 text-sm border border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-cyan-500"
            />
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              <span className="text-sm">ESC</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* XML Tags Section */}
          {filteredTags.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-cyan-400 mb-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-cyan-500/30" />
                <span>XML Tags ({filteredTags.length})</span>
                <div className="flex-1 h-px bg-cyan-500/30" />
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagClick(tag)}
                    className="p-4 bg-[#0a0a0a] rounded-xl border-2 border-gray-700 hover:border-cyan-500 hover:bg-cyan-500/5 transition-all text-left group min-h-[100px]"
                  >
                    <div className="inline-block px-3 py-1 bg-cyan-500 text-black font-bold text-sm rounded-full uppercase mb-3">
                      {tag.name}
                    </div>
                    {tag.description && (
                      <div className="text-gray-400 text-sm leading-relaxed line-clamp-3 group-hover:text-gray-300">
                        {tag.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Instructions Section */}
          {filteredInstructions.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-orange-400 mb-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-orange-500/30" />
                <span>AI Instructions ({filteredInstructions.length})</span>
                <div className="flex-1 h-px bg-orange-500/30" />
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {filteredInstructions.map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => handleInstructionClick(inst)}
                    className="p-4 bg-[#0a0a0a] rounded-xl border-2 border-gray-700 hover:border-orange-500 hover:bg-orange-500/5 transition-all text-left group min-h-[100px]"
                  >
                    <div className="inline-block px-3 py-1 bg-orange-500 text-black font-bold text-sm rounded-full uppercase mb-3">
                      {inst.name}
                    </div>
                    {inst.description && (
                      <div className="text-gray-400 text-sm leading-relaxed line-clamp-3 group-hover:text-gray-300">
                        {inst.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredTags.length === 0 && filteredInstructions.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              No tags or instructions match "{filter}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 bg-[#0a0a0a] text-center">
          <span className="text-xs text-gray-500">
            Click a card to insert • Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  )
}
