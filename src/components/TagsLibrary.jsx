import React, { useState, useEffect } from 'react'
import { Plus, Copy, Trash2, Edit2, Check, X } from 'lucide-react'
import { Button } from './ui/button'

const STORAGE_KEY = 'textbuilder-tags'

const defaultTags = [
  { id: 1, name: 'context', description: 'Provide background information' },
  { id: 2, name: 'task', description: 'Define the main task' },
  { id: 3, name: 'example', description: 'Show examples' },
  { id: 4, name: 'constraints', description: 'Set limitations or rules' },
  { id: 5, name: 'output', description: 'Specify desired output format' },
]

export function TagsLibrary({ onInsertTag }) {
  const [tags, setTags] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : defaultTags
  })
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [newTag, setNewTag] = useState({ name: '', description: '' })

  // Save to localStorage whenever tags change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags))
  }, [tags])

  const handleAddTag = () => {
    if (newTag.name.trim()) {
      setTags([...tags, {
        id: Date.now(),
        name: newTag.name.trim(),
        description: newTag.description.trim()
      }])
      setNewTag({ name: '', description: '' })
      setIsAdding(false)
    }
  }

  const handleEditTag = (id, name, description) => {
    setTags(tags.map(t =>
      t.id === id ? { ...t, name: name.trim(), description: description.trim() } : t
    ))
    setEditingId(null)
  }

  const handleDeleteTag = (id) => {
    setTags(tags.filter(t => t.id !== id))
  }

  const handleCopyTag = (name) => {
    navigator.clipboard.writeText(`<${name}></${name}>`)
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] rounded-lg border border-cyan-500/50 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-[#0a0a0a]">
        <h3 className="text-gray-100 font-semibold text-sm">🏷️ XML Tags</h3>
        <Button
          onClick={() => setIsAdding(!isAdding)}
          variant="ghost"
          size="sm"
          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isAdding && (
          <div className="p-3 bg-[#0a0a0a] rounded-lg border border-cyan-500/30 space-y-2">
            <input
              type="text"
              value={newTag.name}
              onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
              placeholder="Tag name (e.g., context, task)..."
              className="w-full bg-gray-800 text-gray-100 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-cyan-500"
            />
            <textarea
              value={newTag.description}
              onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
              placeholder="Description (optional)..."
              className="w-full bg-gray-800 text-gray-300 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-cyan-500 resize-none"
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleAddTag}
                size="sm"
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                <Check className="w-3 h-3 mr-1" />
                Add
              </Button>
              <Button
                onClick={() => {
                  setIsAdding(false)
                  setNewTag({ name: '', description: '' })
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

        {tags.map((tag) => {
          return (
            <div
              key={tag.id}
              className="p-3 rounded-lg border-2 cursor-pointer transition-all bg-[#0a0a0a] border-gray-700 hover:border-cyan-500"
            >
              {editingId === tag.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    defaultValue={tag.name}
                    id={`edit-name-${tag.id}`}
                    className="w-full bg-gray-800 text-gray-100 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-cyan-500"
                  />
                  <textarea
                    defaultValue={tag.description}
                    id={`edit-desc-${tag.id}`}
                    className="w-full bg-gray-800 text-gray-300 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-cyan-500 resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const name = document.getElementById(`edit-name-${tag.id}`).value
                        const desc = document.getElementById(`edit-desc-${tag.id}`).value
                        handleEditTag(tag.id, name, desc)
                      }}
                      size="sm"
                      className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
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
                    onClick={() => onInsertTag && onInsertTag(tag.name)}
                    className="mb-2"
                  >
                    <div className="text-cyan-400 font-mono font-semibold text-xs mb-1">
                      &lt;{tag.name}&gt;&lt;/{tag.name}&gt;
                    </div>
                    {tag.description && (
                      <div className="text-gray-400 text-xs">
                        {tag.description}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 mt-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyTag(tag.name)
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
                        setEditingId(tag.id)
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
                        handleDeleteTag(tag.id)
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
          Click a tag to wrap selected text
        </div>
      </div>
    </div>
  )
}
