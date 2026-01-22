import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, X, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'
import { tagsApi, instructionsApi } from '@/lib/api'
import tagsData from '@/data/tags.json'
import aiInstructionsData from '@/data/ai-instructions.json'
import { updateTagsCache } from './TagsOverlay'

export function TagsLibrary({ onInsertTag, onInsertInstruction }) {
  const [tags, setTags] = useState([])
  const [aiInstructions, setAiInstructions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [isAddingInstruction, setIsAddingInstruction] = useState(false)
  const [editingTagId, setEditingTagId] = useState(null)
  const [editingInstructionId, setEditingInstructionId] = useState(null)
  const [newTag, setNewTag] = useState({ name: '', description: '', action: '' })
  const [newInstruction, setNewInstruction] = useState({ name: '', description: '' })
  const [tagFilter, setTagFilter] = useState('')
  const [instructionFilter, setInstructionFilter] = useState('')

  // Load data from API on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [tagsResult, instructionsResult] = await Promise.all([
        tagsApi.list(),
        instructionsApi.list()
      ])

      // If no tags in database, seed with defaults
      let finalTags, finalInstructions
      if (tagsResult.length === 0) {
        await seedDefaultTags()
        finalTags = await tagsApi.list()
      } else {
        finalTags = tagsResult
      }

      // If no instructions in database, seed with defaults
      if (instructionsResult.length === 0) {
        await seedDefaultInstructions()
        finalInstructions = await instructionsApi.list()
      } else {
        finalInstructions = instructionsResult
      }

      setTags(finalTags)
      setAiInstructions(finalInstructions)
      // Update cache for TagsOverlay
      updateTagsCache(finalTags, finalInstructions)
    } catch (err) {
      console.error('Failed to load tags/instructions:', err)
      setError(err.message)
      // Fallback to JSON data if API fails
      setTags(tagsData)
      setAiInstructions(aiInstructionsData)
      updateTagsCache(tagsData, aiInstructionsData)
    } finally {
      setLoading(false)
    }
  }

  const seedDefaultTags = async () => {
    console.log('Seeding default tags (batch)...')
    try {
      const tagsToCreate = tagsData.map(tag => ({
        name: tag.name,
        description: tag.description || '',
        category: tag.category || 'general',
        action: tag.action || ''
      }))
      await tagsApi.batchCreate(tagsToCreate)
    } catch (err) {
      console.error('Failed to seed tags:', err)
    }
  }

  const seedDefaultInstructions = async () => {
    console.log('Seeding default AI instructions (batch)...')
    try {
      const instructionsToCreate = aiInstructionsData.map(inst => ({
        name: inst.name,
        description: inst.description || ''
      }))
      await instructionsApi.batchCreate(instructionsToCreate)
    } catch (err) {
      console.error('Failed to seed instructions:', err)
    }
  }

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

  const handleAddTag = async () => {
    if (newTag.name.trim()) {
      try {
        const created = await tagsApi.create({
          name: newTag.name.trim(),
          description: newTag.description.trim(),
          action: newTag.action.trim(),
          category: 'custom'
        })
        setTags([...tags, { ...created, isCustom: true }])
        setNewTag({ name: '', description: '', action: '' })
        setIsAddingTag(false)
      } catch (err) {
        console.error('Failed to create tag:', err)
        alert('Failed to create tag: ' + err.message)
      }
    }
  }

  const handleAddInstruction = async () => {
    if (newInstruction.name.trim()) {
      try {
        const created = await instructionsApi.create({
          name: newInstruction.name.trim(),
          description: newInstruction.description.trim()
        })
        setAiInstructions([...aiInstructions, { ...created, isCustom: true }])
        setNewInstruction({ name: '', description: '' })
        setIsAddingInstruction(false)
      } catch (err) {
        console.error('Failed to create instruction:', err)
        alert('Failed to create instruction: ' + err.message)
      }
    }
  }

  const handleEditTag = async (id, name, description, action) => {
    try {
      await tagsApi.update(id, {
        name: name.trim(),
        description: description.trim(),
        action: (action || '').trim()
      })
      setTags(tags.map(t =>
        t.id === id ? { ...t, name: name.trim(), description: description.trim(), action: (action || '').trim() } : t
      ))
      setEditingTagId(null)
    } catch (err) {
      console.error('Failed to update tag:', err)
      alert('Failed to update tag: ' + err.message)
    }
  }

  const handleEditInstruction = async (id, name, description) => {
    try {
      await instructionsApi.update(id, {
        name: name.trim(),
        description: description.trim()
      })
      setAiInstructions(aiInstructions.map(i =>
        i.id === id ? { ...i, name: name.trim(), description: description.trim() } : i
      ))
      setEditingInstructionId(null)
    } catch (err) {
      console.error('Failed to update instruction:', err)
      alert('Failed to update instruction: ' + err.message)
    }
  }

  const handleDeleteTag = async (id) => {
    try {
      await tagsApi.delete(id)
      setTags(tags.filter(t => t.id !== id))
    } catch (err) {
      console.error('Failed to delete tag:', err)
      alert('Failed to delete tag: ' + err.message)
    }
  }

  const handleDeleteInstruction = async (id) => {
    try {
      await instructionsApi.delete(id)
      setAiInstructions(aiInstructions.filter(i => i.id !== id))
    } catch (err) {
      console.error('Failed to delete instruction:', err)
      alert('Failed to delete instruction: ' + err.message)
    }
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
            {!isInstruction && (
              <input
                type="text"
                defaultValue={item.action || ''}
                id={`edit-action-${item.id}`}
                placeholder="Action (optional)"
                className="w-full bg-gray-800 text-gray-300 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-cyan-500"
              />
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const name = document.getElementById(`edit-name-${item.id}`).value
                  const desc = document.getElementById(`edit-desc-${item.id}`).value
                  const action = !isInstruction ? document.getElementById(`edit-action-${item.id}`).value : undefined
                  handleEdit(item.id, name, desc, action)
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
              onInsertTag && onInsertTag(item.name, item.action)
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
            {!isInstruction && item.action && (
              <div className="text-cyan-400/70 text-[10px] leading-tight mt-1 italic">
                Action: {item.action}
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
        {!isInstruction && (
          <input
            type="text"
            value={newItem.action || ''}
            onChange={(e) => setNewItem({ ...newItem, action: e.target.value })}
            placeholder="Action (optional)..."
            className="w-full bg-gray-800 text-gray-300 text-sm border border-gray-700 rounded px-2 py-1 outline-none focus:border-cyan-500"
          />
        )}
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
              setNewItem(isInstruction ? { name: '', description: '' } : { name: '', description: '', action: '' })
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

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#1a1a1a] rounded-lg border border-cyan-500/50 items-center justify-center">
        <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
        <span className="text-gray-400 text-sm mt-2">Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-[#1a1a1a] rounded-lg border border-red-500/50 items-center justify-center p-4">
        <span className="text-red-400 text-sm text-center">{error}</span>
        <Button onClick={loadData} size="sm" className="mt-2 bg-cyan-500 hover:bg-cyan-600">
          Retry
        </Button>
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
