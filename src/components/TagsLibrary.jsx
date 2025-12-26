import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { Button } from './ui/button'
import tagsData from '@/data/tags.json'
import aiInstructionsData from '@/data/ai-instructions.json'

const TAGS_STORAGE_KEY = 'textbuilder-tags'
const AI_INSTRUCTIONS_STORAGE_KEY = 'textbuilder-ai-instructions'

export function TagsLibrary({ onInsertTag, onInsertInstruction }) {
  const [tags, setTags] = useState(() => {
    const stored = localStorage.getItem(TAGS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : tagsData
  })
  const [aiInstructions, setAiInstructions] = useState(() => {
    const stored = localStorage.getItem(AI_INSTRUCTIONS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : aiInstructionsData
  })
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [isAddingInstruction, setIsAddingInstruction] = useState(false)
  const [editingTagId, setEditingTagId] = useState(null)
  const [editingInstructionId, setEditingInstructionId] = useState(null)
  const [newTag, setNewTag] = useState({ name: '', description: '' })
  const [newInstruction, setNewInstruction] = useState({ name: '', description: '' })
  const [tagFilter, setTagFilter] = useState('')
  const [instructionFilter, setInstructionFilter] = useState('')

  // Sort alphabetically and filter
  const filteredTags = tags
    .filter(tag =>
      tag.name.toLowerCase().includes(tagFilter.toLowerCase()) ||
      (tag.description && tag.description.toLowerCase().includes(tagFilter.toLowerCase()))
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  const filteredInstructions = aiInstructions
    .filter(inst =>
      inst.name.toLowerCase().includes(instructionFilter.toLowerCase()) ||
      (inst.description && inst.description.toLowerCase().includes(instructionFilter.toLowerCase()))
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags))
  }, [tags])

  useEffect(() => {
    localStorage.setItem(AI_INSTRUCTIONS_STORAGE_KEY, JSON.stringify(aiInstructions))
  }, [aiInstructions])

  const handleAddTag = () => {
    if (newTag.name.trim()) {
      setTags([...tags, {
        id: Date.now(),
        name: newTag.name.trim(),
        description: newTag.description.trim()
      }])
      setNewTag({ name: '', description: '' })
      setIsAddingTag(false)
    }
  }

  const handleAddInstruction = () => {
    if (newInstruction.name.trim()) {
      setAiInstructions([...aiInstructions, {
        id: Date.now(),
        name: newInstruction.name.trim(),
        description: newInstruction.description.trim()
      }])
      setNewInstruction({ name: '', description: '' })
      setIsAddingInstruction(false)
    }
  }

  const handleEditTag = (id, name, description) => {
    setTags(tags.map(t =>
      t.id === id ? { ...t, name: name.trim(), description: description.trim() } : t
    ))
    setEditingTagId(null)
  }

  const handleEditInstruction = (id, name, description) => {
    setAiInstructions(aiInstructions.map(i =>
      i.id === id ? { ...i, name: name.trim(), description: description.trim() } : i
    ))
    setEditingInstructionId(null)
  }

  const handleDeleteTag = (id) => {
    setTags(tags.filter(t => t.id !== id))
  }

  const handleDeleteInstruction = (id) => {
    setAiInstructions(aiInstructions.filter(i => i.id !== id))
  }

  const renderItem = (item, isInstruction = false) => {
    const isEditing = isInstruction ? editingInstructionId === item.id : editingTagId === item.id
    const setEditing = isInstruction ? setEditingInstructionId : setEditingTagId
    const handleEdit = isInstruction ? handleEditInstruction : handleEditTag
    const handleDelete = isInstruction ? handleDeleteInstruction : handleDeleteTag
    const pillColor = isInstruction ? 'bg-orange-500' : 'bg-cyan-500'
    const borderColor = isInstruction ? 'hover:border-orange-500' : 'hover:border-cyan-500'
    const buttonColor = isInstruction ? 'bg-orange-500 hover:bg-orange-600' : 'bg-cyan-500 hover:bg-cyan-600'

    return (
      <div
        key={item.id}
        className={`p-2 rounded-lg border-2 cursor-pointer transition-all bg-[#0a0a0a] border-gray-700 ${borderColor}`}
      >
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              defaultValue={item.name}
              id={`edit-name-${item.id}`}
              className="w-full bg-gray-800 text-gray-100 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-cyan-500"
            />
            <textarea
              defaultValue={item.description}
              id={`edit-desc-${item.id}`}
              className="w-full bg-gray-800 text-gray-300 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-cyan-500 resize-none"
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const name = document.getElementById(`edit-name-${item.id}`).value
                  const desc = document.getElementById(`edit-desc-${item.id}`).value
                  handleEdit(item.id, name, desc)
                }}
                size="sm"
                className={`flex-1 ${buttonColor} text-white`}
              >
                <Check className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button
                onClick={() => setEditing(null)}
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div onClick={() => {
            if (isInstruction) {
              onInsertInstruction && onInsertInstruction(item.name, item.description)
            } else {
              onInsertTag && onInsertTag(item.name)
            }
          }}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className={`inline-block px-2 py-0.5 ${pillColor} text-black font-bold text-[10px] rounded-full uppercase`}>
                {item.name}
              </div>
              <div className="flex gap-0.5 flex-shrink-0">
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditing(item.id)
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-gray-300 h-5 w-5 p-0"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(item.id)
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-400 h-5 w-5 p-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            {item.description && (
              <div className="text-gray-400 text-[11px] leading-tight">
                {item.description}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderAddForm = (isInstruction = false) => {
    const newItem = isInstruction ? newInstruction : newTag
    const setNewItem = isInstruction ? setNewInstruction : setNewTag
    const handleAdd = isInstruction ? handleAddInstruction : handleAddTag
    const setIsAdding = isInstruction ? setIsAddingInstruction : setIsAddingTag
    const borderColor = isInstruction ? 'border-orange-500/30' : 'border-cyan-500/30'
    const buttonColor = isInstruction ? 'bg-orange-500 hover:bg-orange-600' : 'bg-cyan-500 hover:bg-cyan-600'

    return (
      <div className={`p-3 bg-[#0a0a0a] rounded-lg border ${borderColor} space-y-2`}>
        <input
          type="text"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          placeholder={isInstruction ? "Instruction name..." : "Tag name..."}
          className="w-full bg-gray-800 text-gray-100 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-cyan-500"
        />
        <textarea
          value={newItem.description}
          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
          placeholder="Description..."
          className="w-full bg-gray-800 text-gray-300 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-cyan-500 resize-none"
          rows={2}
        />
        <div className="flex gap-2">
          <Button
            onClick={handleAdd}
            size="sm"
            className={`flex-1 ${buttonColor} text-white`}
          >
            <Check className="w-3 h-3 mr-1" />
            Add
          </Button>
          <Button
            onClick={() => {
              setIsAdding(false)
              setNewItem({ name: '', description: '' })
            }}
            size="sm"
            variant="ghost"
            className="text-gray-400 hover:text-gray-300"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] rounded-lg border border-cyan-500/50 overflow-hidden">
      {/* Tags Section - 2/3 height */}
      <div className="flex-[2] min-h-0 flex flex-col border-b border-gray-700">
        <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-[#0a0a0a]">
          <h3 className="text-gray-100 font-semibold text-sm">XML Tags</h3>
          <Button
            onClick={() => setIsAddingTag(!isAddingTag)}
            variant="ghost"
            size="sm"
            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="px-3 pt-2">
          <input
            type="text"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="Filter tags..."
            className="w-full bg-[#0a0a0a] text-gray-100 text-xs border border-gray-700 rounded px-2 py-1.5 outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {isAddingTag && renderAddForm(false)}
          {filteredTags.map((tag) => renderItem(tag, false))}
        </div>

        <div className="p-2 border-t border-gray-700 bg-[#0a0a0a]">
          <div className="text-[10px] text-gray-500 text-center">
            Click to wrap selected text
          </div>
        </div>
      </div>

      {/* AI Instructions Section - 1/3 height */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-[#0a0a0a]">
          <h3 className="text-gray-100 font-semibold text-sm">AI Instructions</h3>
          <Button
            onClick={() => setIsAddingInstruction(!isAddingInstruction)}
            variant="ghost"
            size="sm"
            className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="px-3 pt-2">
          <input
            type="text"
            value={instructionFilter}
            onChange={(e) => setInstructionFilter(e.target.value)}
            placeholder="Filter instructions..."
            className="w-full bg-[#0a0a0a] text-gray-100 text-xs border border-gray-700 rounded px-2 py-1.5 outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {isAddingInstruction && renderAddForm(true)}
          {filteredInstructions.map((inst) => renderItem(inst, true))}
        </div>

        <div className="p-2 border-t border-gray-700 bg-[#0a0a0a]">
          <div className="text-[10px] text-gray-500 text-center">
            Click to insert tag with description
          </div>
        </div>
      </div>
    </div>
  )
}
