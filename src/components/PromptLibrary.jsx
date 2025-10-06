import React, { useState } from 'react'
import { Plus, Copy, Trash2, Edit2, Check, X } from 'lucide-react'
import { Button } from './ui/button'

const DEFAULT_PROMPTS = [
  {
    id: 1,
    title: 'Synthesis',
    text: 'Please synthesize all the above blocks into a coherent document for a masterclass.'
  },
  {
    id: 2,
    title: 'Summary',
    text: 'Please provide a concise summary of the key points from the blocks above.'
  },
  {
    id: 3,
    title: 'Structure',
    text: 'Please organize these blocks into a logical structure with clear sections and transitions.'
  },
  {
    id: 4,
    title: 'Improve',
    text: 'Please improve the clarity and flow of the above content while maintaining the core message.'
  }
]

export function PromptLibrary({ selectedPrompt, onSelectPrompt }) {
  const [prompts, setPrompts] = useState(DEFAULT_PROMPTS)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [newPrompt, setNewPrompt] = useState({ title: '', text: '' })

  const handleAddPrompt = () => {
    if (newPrompt.title.trim() && newPrompt.text.trim()) {
      setPrompts([...prompts, {
        id: Date.now(),
        title: newPrompt.title,
        text: newPrompt.text
      }])
      setNewPrompt({ title: '', text: '' })
      setIsAdding(false)
    }
  }

  const handleEditPrompt = (id, title, text) => {
    setPrompts(prompts.map(p =>
      p.id === id ? { ...p, title, text } : p
    ))
    setEditingId(null)
  }

  const handleDeletePrompt = (id) => {
    setPrompts(prompts.filter(p => p.id !== id))
    if (selectedPrompt && prompts.find(p => p.id === id)?.text === selectedPrompt) {
      onSelectPrompt(null)
    }
  }

  const handleCopyPrompt = (text) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] rounded-lg border border-purple-500/50 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-[#0a0a0a]">
        <h3 className="text-gray-100 font-semibold text-sm">💡 Prompt Library</h3>
        <Button
          onClick={() => setIsAdding(!isAdding)}
          variant="ghost"
          size="sm"
          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isAdding && (
          <div className="p-3 bg-[#0a0a0a] rounded-lg border border-purple-500/30 space-y-2">
            <input
              type="text"
              value={newPrompt.title}
              onChange={(e) => setNewPrompt({ ...newPrompt, title: e.target.value })}
              placeholder="Prompt title..."
              className="w-full bg-gray-800 text-gray-100 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-purple-500"
            />
            <textarea
              value={newPrompt.text}
              onChange={(e) => setNewPrompt({ ...newPrompt, text: e.target.value })}
              placeholder="Prompt text..."
              className="w-full bg-gray-800 text-gray-300 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-purple-500 resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleAddPrompt}
                size="sm"
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
              >
                <Check className="w-3 h-3 mr-1" />
                Add
              </Button>
              <Button
                onClick={() => {
                  setIsAdding(false)
                  setNewPrompt({ title: '', text: '' })
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

        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selectedPrompt === prompt.text
                ? 'bg-purple-500/20 border-purple-500'
                : 'bg-[#0a0a0a] border-gray-700 hover:border-gray-500'
            }`}
          >
            {editingId === prompt.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  defaultValue={prompt.title}
                  id={`edit-title-${prompt.id}`}
                  className="w-full bg-gray-800 text-gray-100 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-purple-500"
                />
                <textarea
                  defaultValue={prompt.text}
                  id={`edit-text-${prompt.id}`}
                  className="w-full bg-gray-800 text-gray-300 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-purple-500 resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const title = document.getElementById(`edit-title-${prompt.id}`).value
                      const text = document.getElementById(`edit-text-${prompt.id}`).value
                      handleEditPrompt(prompt.id, title, text)
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
                  onClick={() => onSelectPrompt(selectedPrompt === prompt.text ? null : prompt.text)}
                  className="mb-2"
                >
                  <div className="text-purple-400 font-semibold text-xs mb-1">
                    {prompt.title}
                  </div>
                  <div className="text-gray-300 text-xs">
                    {prompt.text}
                  </div>
                </div>
                <div className="flex gap-1 mt-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopyPrompt(prompt.text)
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
                      setEditingId(prompt.id)
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
                      handleDeletePrompt(prompt.id)
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
        ))}
      </div>

      <div className="p-3 border-t border-gray-700 bg-[#0a0a0a]">
        <div className="text-xs text-gray-500 text-center">
          Click a prompt to add it to output
        </div>
      </div>
    </div>
  )
}
