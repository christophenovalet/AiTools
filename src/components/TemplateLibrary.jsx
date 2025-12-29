import React, { useState, useEffect } from 'react'
import { Plus, Copy, Trash2, Edit2, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from './ui/button'
import factoryTemplates from '@/data/templates.json'

const TEMPLATES_STORAGE_KEY = 'textbuilder-templates'

// Load templates from localStorage or use factory defaults
const loadTemplates = () => {
  const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY)
  if (stored) {
    return JSON.parse(stored)
  }
  return factoryTemplates
}

// Save templates to localStorage
const saveTemplates = (templates) => {
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates))
}

export function TemplateLibrary({ onInsertTemplate }) {
  const [templates, setTemplates] = useState(loadTemplates)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [newTemplate, setNewTemplate] = useState({ title: '', text: '' })
  const [activeFilter, setActiveFilter] = useState('all') // all | template | framework | principle | tone
  const [searchFilter, setSearchFilter] = useState('')
  const [expandedIds, setExpandedIds] = useState(new Set())

  // Save to localStorage whenever templates change
  useEffect(() => {
    saveTemplates(templates)
  }, [templates])

  const filteredTemplates = templates
    .filter(t => activeFilter === 'all' ? true : ((t.category ?? 'template') === activeFilter))
    .filter(t =>
      t.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.text.toLowerCase().includes(searchFilter.toLowerCase())
    )

  const handleAddTemplate = () => {
    if (newTemplate.title.trim() && newTemplate.text.trim()) {
      setTemplates([...templates, {
        id: Date.now(),
        title: newTemplate.title,
        text: newTemplate.text,
        category: 'template',
        custom: true
      }])
      setNewTemplate({ title: '', text: '' })
      setIsAdding(false)
    }
  }

  const handleEditTemplate = (id, title, text) => {
    setTemplates(templates.map(t =>
      t.id === id ? { ...t, title, text } : t
    ))
    setEditingId(null)
  }

  const handleDeleteTemplate = (id) => {
    setTemplates(templates.filter(t => t.id !== id))
  }

  const handleCopyTemplate = (text) => {
    navigator.clipboard.writeText(text)
  }

  const toggleExpanded = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Check if text needs truncation (more than 3 lines)
  const needsTruncation = (text) => {
    const lines = text.split('\n')
    return lines.length > 3
  }

  // Get truncated text (first 3 lines)
  const getTruncatedText = (text) => {
    const lines = text.split('\n')
    return lines.slice(0, 3).join('\n')
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] rounded-lg border border-purple-500/50 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-[#0a0a0a]">
        <h3 className="text-gray-100 font-semibold text-sm">Template Library</h3>
        <Button
          onClick={() => setIsAdding(!isAdding)}
          variant="ghost"
          size="sm"
          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Search filter */}
      <div className="px-3 pt-2">
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Filter templates..."
          className="w-full bg-[#0a0a0a] text-gray-100 text-xs border border-gray-700 rounded px-2 py-1.5 outline-none focus:border-purple-500"
        />
      </div>

      {/* Category filter - Fixed section */}
      <div className="px-3 py-2 border-b border-gray-700">
        <div className="text-xs text-gray-400 mb-1.5">Category:</div>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            variant={activeFilter === 'all' ? 'default' : 'ghost'}
            className={activeFilter === 'all' ? 'bg-purple-600 text-white h-7 px-2 text-xs' : 'text-gray-300 h-7 px-2 text-xs'}
            onClick={() => setActiveFilter('all')}
          >
            All
          </Button>
          <Button
            variant={activeFilter === 'template' ? 'default' : 'ghost'}
            className={activeFilter === 'template' ? 'bg-purple-600 text-white h-7 px-2 text-xs' : 'text-gray-300 h-7 px-2 text-xs'}
            onClick={() => setActiveFilter('template')}
          >
            Templates
          </Button>
          <Button
            variant={activeFilter === 'framework' ? 'default' : 'ghost'}
            className={activeFilter === 'framework' ? 'bg-purple-600 text-white h-7 px-2 text-xs' : 'text-gray-300 h-7 px-2 text-xs'}
            onClick={() => setActiveFilter('framework')}
          >
            Frameworks
          </Button>
          <Button
            variant={activeFilter === 'principle' ? 'default' : 'ghost'}
            className={activeFilter === 'principle' ? 'bg-purple-600 text-white h-7 px-2 text-xs' : 'text-gray-300 h-7 px-2 text-xs'}
            onClick={() => setActiveFilter('principle')}
          >
            Principles
          </Button>
          <Button
            variant={activeFilter === 'tone' ? 'default' : 'ghost'}
            className={activeFilter === 'tone' ? 'bg-purple-600 text-white h-7 px-2 text-xs col-span-2' : 'text-gray-300 h-7 px-2 text-xs col-span-2'}
            onClick={() => setActiveFilter('tone')}
          >
            Tone
          </Button>
        </div>
      </div>

      {/* Scrollable cards section */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isAdding && (
          <div className="p-3 bg-[#0a0a0a] rounded-lg border border-purple-500/30 space-y-2">
            <input
              type="text"
              value={newTemplate.title}
              onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
              placeholder="Template title..."
              className="w-full bg-gray-800 text-gray-100 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-purple-500"
            />
            <textarea
              value={newTemplate.text}
              onChange={(e) => setNewTemplate({ ...newTemplate, text: e.target.value })}
              placeholder="Template text..."
              className="w-full bg-gray-800 text-gray-300 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-purple-500 resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleAddTemplate}
                size="sm"
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
              >
                <Check className="w-3 h-3 mr-1" />
                Add
              </Button>
              <Button
                onClick={() => {
                  setIsAdding(false)
                  setNewTemplate({ title: '', text: '' })
                }}
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {filteredTemplates.map((template) => {
          const isExpanded = expandedIds.has(template.id)
          const showTruncated = needsTruncation(template.text) && !isExpanded

          return (
          <div
            key={template.id}
            className="p-3 rounded-lg border-2 cursor-pointer transition-all bg-[#0a0a0a] border-gray-700 hover:border-purple-500"
          >
            {editingId === template.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  defaultValue={template.title}
                  id={`edit-title-${template.id}`}
                  className="w-full bg-gray-800 text-gray-100 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-purple-500"
                />
                <textarea
                  defaultValue={template.text}
                  id={`edit-text-${template.id}`}
                  className="w-full bg-gray-800 text-gray-300 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-purple-500 resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const title = document.getElementById(`edit-title-${template.id}`).value
                      const text = document.getElementById(`edit-text-${template.id}`).value
                      handleEditTemplate(template.id, title, text)
                    }}
                    size="sm"
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    onClick={() => setEditingId(null)}
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-gray-300"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div
                  onClick={() => onInsertTemplate && onInsertTemplate(template.title, template.text)}
                  className="mb-2"
                >
                  <div className="text-purple-400 font-semibold text-xs mb-1">
                    {template.title}
                  </div>
                  <div className="text-gray-300 text-xs whitespace-pre-wrap">
                    {showTruncated ? getTruncatedText(template.text) : template.text}
                  </div>
                  {needsTruncation(template.text) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpanded(template.id)
                      }}
                      className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-[10px] mt-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          Show more
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="flex gap-1 mt-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopyTemplate(template.text)
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-gray-300 h-6 px-2"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingId(template.id)
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-gray-300 h-6 px-2"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteTemplate(template.id)
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-400 h-6 px-2"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </>
            )}
          </div>
          )
        })}
      </div>

      <div className="p-3 border-t border-gray-700 bg-[#0a0a0a]">
        <div className="text-xs text-gray-500 text-center">
          Click to insert template
        </div>
      </div>
    </div>
  )
}
