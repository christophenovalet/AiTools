import React, { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Key, Eye, EyeOff, Save, Check, MessageSquare, Plus, Trash2, RotateCcw, DollarSign, Keyboard, AlertTriangle, Tags, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getMenuItems, getDefaultMenuItems, saveMenuItems, getModelPricing, getDefaultModelPricing, saveModelPricing } from '@/lib/claude-api'
import { getShortcuts, saveShortcuts, resetShortcuts, formatShortcut, parseKeyboardEvent, findConflicts, isValidShortcut, DEFAULT_SHORTCUTS } from '@/lib/keyboard-shortcuts'
import factoryTags from '@/data/tags.json'
import factoryInstructions from '@/data/ai-instructions.json'
import factoryTemplates from '@/data/templates.json'

const API_KEY_STORAGE_KEY = 'claude-api-key'
const TAGS_STORAGE_KEY = 'textbuilder-tags'
const AI_INSTRUCTIONS_STORAGE_KEY = 'textbuilder-ai-instructions'
const TEMPLATES_STORAGE_KEY = 'textbuilder-templates'

const MODEL_LABELS = {
  haiku: 'Haiku 4.5',
  sonnet: 'Sonnet 4.5',
  opus: 'Opus 4.5'
}

export function SettingsPage({ onBackHome }) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [menuItems, setMenuItems] = useState([])
  const [menuItemsSaved, setMenuItemsSaved] = useState(false)
  const [modelPricing, setModelPricing] = useState({})
  const [pricingSaved, setPricingSaved] = useState(false)
  const [shortcuts, setShortcuts] = useState({})
  const [shortcutsSaved, setShortcutsSaved] = useState(false)
  const [recordingShortcut, setRecordingShortcut] = useState(null)
  const [shortcutConflict, setShortcutConflict] = useState(null)
  const [tagsReset, setTagsReset] = useState(false)
  const [templatesReset, setTemplatesReset] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY)
    if (stored) {
      setApiKey(stored)
    }
    setMenuItems(getMenuItems())
    setModelPricing(getModelPricing())
    setShortcuts(getShortcuts())
  }, [])

  const handleSave = () => {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave()
    }
  }

  const handleSaveMenuItems = () => {
    saveMenuItems(menuItems)
    setMenuItemsSaved(true)
    setTimeout(() => setMenuItemsSaved(false), 2000)
  }

  const handleResetMenuItems = () => {
    const defaults = getDefaultMenuItems()
    setMenuItems(defaults)
    saveMenuItems(defaults)
  }

  const updateMenuItem = (index, field, value) => {
    const updated = [...menuItems]
    updated[index] = { ...updated[index], [field]: value }
    setMenuItems(updated)
  }

  const addMenuItem = () => {
    const newId = `custom-${Date.now()}`
    setMenuItems([...menuItems, { id: newId, label: 'New Prompt', template: '{selected_text}' }])
  }

  const deleteMenuItem = (index) => {
    setMenuItems(menuItems.filter((_, i) => i !== index))
  }

  const handleSavePricing = () => {
    saveModelPricing(modelPricing)
    setPricingSaved(true)
    setTimeout(() => setPricingSaved(false), 2000)
  }

  const handleResetPricing = () => {
    const defaults = getDefaultModelPricing()
    setModelPricing(defaults)
    saveModelPricing(defaults)
  }

  const updatePricing = (model, type, value) => {
    const numValue = parseFloat(value) || 0
    setModelPricing(prev => ({
      ...prev,
      [model]: {
        ...prev[model],
        [type]: numValue
      }
    }))
  }

  const handleSaveShortcuts = () => {
    saveShortcuts(shortcuts)
    setShortcutsSaved(true)
    setTimeout(() => setShortcutsSaved(false), 2000)
  }

  const handleResetShortcuts = () => {
    const defaults = resetShortcuts()
    setShortcuts(defaults)
    setShortcutConflict(null)
  }

  const handleResetTagsAndInstructions = () => {
    // Get current tags and instructions from localStorage
    const storedTags = localStorage.getItem(TAGS_STORAGE_KEY)
    const storedInstructions = localStorage.getItem(AI_INSTRUCTIONS_STORAGE_KEY)

    const currentTags = storedTags ? JSON.parse(storedTags) : []
    const currentInstructions = storedInstructions ? JSON.parse(storedInstructions) : []

    // Keep only custom tags (user-created)
    const customTags = currentTags.filter(tag => tag.custom === true)
    const customInstructions = currentInstructions.filter(inst => inst.custom === true)

    // Merge factory tags with custom tags (factory first, then custom)
    const mergedTags = [...factoryTags, ...customTags]
    const mergedInstructions = [...factoryInstructions, ...customInstructions]

    // Save to localStorage
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(mergedTags))
    localStorage.setItem(AI_INSTRUCTIONS_STORAGE_KEY, JSON.stringify(mergedInstructions))

    // Show success feedback
    setTagsReset(true)
    setTimeout(() => setTagsReset(false), 2000)
  }

  const handleResetTemplates = () => {
    // Get current templates from localStorage
    const storedTemplates = localStorage.getItem(TEMPLATES_STORAGE_KEY)
    const currentTemplates = storedTemplates ? JSON.parse(storedTemplates) : []

    // Keep only custom templates (user-created)
    const customTemplates = currentTemplates.filter(t => t.custom === true)

    // Merge factory templates with custom templates (factory first, then custom)
    const mergedTemplates = [...factoryTemplates, ...customTemplates]

    // Save to localStorage
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(mergedTemplates))

    // Show success feedback
    setTemplatesReset(true)
    setTimeout(() => setTemplatesReset(false), 2000)
  }

  const startRecording = (shortcutId) => {
    setRecordingShortcut(shortcutId)
    setShortcutConflict(null)
  }

  const cancelRecording = () => {
    setRecordingShortcut(null)
    setShortcutConflict(null)
  }

  const handleShortcutKeyDown = useCallback((e) => {
    if (!recordingShortcut) return

    // Ignore modifier-only keypresses
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return

    e.preventDefault()
    e.stopPropagation()

    const newShortcut = parseKeyboardEvent(e)

    // Validate the shortcut
    if (!isValidShortcut(newShortcut)) {
      setShortcutConflict({ type: 'invalid', message: 'Shortcut must include Ctrl, Alt, or Shift modifier' })
      return
    }

    // Check for conflicts
    const conflicts = findConflicts(shortcuts, newShortcut, recordingShortcut)
    if (conflicts.length > 0) {
      setShortcutConflict({
        type: 'conflict',
        message: `This shortcut is already used by "${conflicts[0].label}"`
      })
      return
    }

    // Update the shortcut
    const currentShortcut = shortcuts[recordingShortcut]
    setShortcuts(prev => ({
      ...prev,
      [recordingShortcut]: {
        ...currentShortcut,
        ...newShortcut
      }
    }))
    setRecordingShortcut(null)
    setShortcutConflict(null)
  }, [recordingShortcut, shortcuts])

  // Listen for keyboard events when recording
  useEffect(() => {
    if (recordingShortcut) {
      window.addEventListener('keydown', handleShortcutKeyDown)
      return () => window.removeEventListener('keydown', handleShortcutKeyDown)
    }
  }, [recordingShortcut, handleShortcutKeyDown])

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBackHome}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold text-gray-100">Settings</h1>
        </div>

        {/* API Key Card */}
        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-100">Claude API Key</CardTitle>
                <CardDescription className="text-gray-400">
                  Enter your Anthropic API key to use the AI chatbot
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="sk-ant-api03-..."
                className="w-full bg-[#0a0a0a] border border-[#333333] rounded-lg px-4 py-3 pr-12 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSave}
                disabled={!apiKey.trim()}
                className={`${saved ? 'bg-green-600 hover:bg-green-600' : 'bg-amber-600 hover:bg-amber-500'} text-white`}
              >
                {saved ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save API Key
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              Your API key is stored locally in your browser and never sent to any server other than Anthropic's API.
              Get your API key from{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-500 hover:text-amber-400 underline"
              >
                console.anthropic.com
              </a>
            </p>
          </CardContent>
        </Card>

        {/* AI Tools Prompts Card */}
        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-cyan-500" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl text-gray-100">AI Tools Prompts</CardTitle>
                <CardDescription className="text-gray-400">
                  Customize the selection toolbar prompts for the AI chatbot
                </CardDescription>
              </div>
              <Button
                onClick={handleResetMenuItems}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-300"
                title="Reset to defaults"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {menuItems.map((item, index) => (
              <div key={item.id} className="p-4 bg-[#0a0a0a] rounded-lg border border-[#333333] space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateMenuItem(index, 'label', e.target.value)}
                    placeholder="Button label..."
                    className="flex-1 bg-[#1a1a1a] border border-[#333333] rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 text-sm"
                  />
                  <Button
                    onClick={() => deleteMenuItem(index)}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <textarea
                  value={item.template}
                  onChange={(e) => updateMenuItem(index, 'template', e.target.value)}
                  placeholder="Prompt template... Use {selected_text} for the selected text."
                  rows={4}
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 text-sm font-mono resize-none"
                />
                <p className="text-xs text-gray-500">
                  Use <code className="px-1 py-0.5 bg-gray-800 rounded text-cyan-400">{'{selected_text}'}</code> to include the selected text.
                  Use <code className="px-1 py-0.5 bg-gray-800 rounded text-cyan-400">{'{tags_json}'}</code> to include available tags.
                </p>
              </div>
            ))}

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={addMenuItem}
                variant="ghost"
                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Prompt
              </Button>
              <div className="flex-1" />
              <Button
                onClick={handleSaveMenuItems}
                className={`${menuItemsSaved ? 'bg-green-600 hover:bg-green-600' : 'bg-cyan-600 hover:bg-cyan-500'} text-white`}
              >
                {menuItemsSaved ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Prompts
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Model Pricing Card */}
        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl text-gray-100">Model Pricing</CardTitle>
                <CardDescription className="text-gray-400">
                  Set pricing per million tokens for cost tracking
                </CardDescription>
              </div>
              <Button
                onClick={handleResetPricing}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-300"
                title="Reset to defaults"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {['haiku', 'sonnet', 'opus'].map((model) => (
              <div key={model} className="p-4 bg-[#0a0a0a] rounded-lg border border-[#333333]">
                <div className="text-sm font-medium text-gray-200 mb-3">{MODEL_LABELS[model]}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Input ($/M tokens)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={modelPricing[model]?.input ?? 0}
                      onChange={(e) => updatePricing(model, 'input', e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333333] rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Output ($/M tokens)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={modelPricing[model]?.output ?? 0}
                      onChange={(e) => updatePricing(model, 'output', e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333333] rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSavePricing}
                className={`${pricingSaved ? 'bg-green-600 hover:bg-green-600' : 'bg-emerald-600 hover:bg-emerald-500'} text-white`}
              >
                {pricingSaved ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Pricing
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              Check current pricing at{' '}
              <a
                href="https://www.anthropic.com/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-500 hover:text-emerald-400 underline"
              >
                anthropic.com/pricing
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts Card */}
        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Keyboard className="w-5 h-5 text-violet-500" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl text-gray-100">Keyboard Shortcuts</CardTitle>
                <CardDescription className="text-gray-400">
                  Customize keyboard shortcuts to avoid conflicts
                </CardDescription>
              </div>
              <Button
                onClick={handleResetShortcuts}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-300"
                title="Reset to defaults"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(shortcuts).map(([id, shortcut]) => (
              <div key={id} className="p-4 bg-[#0a0a0a] rounded-lg border border-[#333333]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-200">{shortcut.label}</div>
                    <div className="text-xs text-gray-500">{shortcut.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {recordingShortcut === id ? (
                      <>
                        <div className="px-3 py-1.5 bg-violet-500/20 border border-violet-500 rounded text-violet-300 text-sm animate-pulse">
                          Press keys...
                        </div>
                        <Button
                          onClick={cancelRecording}
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-gray-300"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <button
                        onClick={() => startRecording(id)}
                        className="px-3 py-1.5 bg-[#1a1a1a] border border-[#333333] rounded text-gray-200 text-sm font-mono hover:border-violet-500/50 hover:bg-violet-500/10 transition-colors"
                      >
                        {formatShortcut(shortcut)}
                      </button>
                    )}
                  </div>
                </div>
                {recordingShortcut === id && shortcutConflict && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    {shortcutConflict.message}
                  </div>
                )}
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveShortcuts}
                className={`${shortcutsSaved ? 'bg-green-600 hover:bg-green-600' : 'bg-violet-600 hover:bg-violet-500'} text-white`}
              >
                {shortcutsSaved ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Shortcuts
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              Click on a shortcut to record a new key combination. Shortcuts require at least one modifier key (Ctrl, Alt, or Shift).
            </p>
          </CardContent>
        </Card>

        {/* Tags & Instructions Reset Card */}
        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Tags className="w-5 h-5 text-cyan-500" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl text-gray-100">Tags & Instructions</CardTitle>
                <CardDescription className="text-gray-400">
                  Reset to factory defaults while keeping your custom tags
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#333333]">
              <div className="text-sm text-gray-300 mb-3">
                This will restore all factory tags and instructions while preserving any custom tags you've created.
              </div>
              <ul className="text-xs text-gray-500 space-y-1 mb-4">
                <li>• Factory tags will be restored to their original state</li>
                <li>• Your custom tags (marked with <span className="text-cyan-400">custom</span>) will be kept</li>
                <li>• Any edits to factory tags will be lost</li>
              </ul>
              <Button
                onClick={handleResetTagsAndInstructions}
                className={`${tagsReset ? 'bg-green-600 hover:bg-green-600' : 'bg-cyan-600 hover:bg-cyan-500'} text-white`}
              >
                {tagsReset ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Reset Complete
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Tags & Instructions
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Prompt Templates Reset Card */}
        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl text-gray-100">Prompt Templates</CardTitle>
                <CardDescription className="text-gray-400">
                  Reset to factory defaults while keeping your custom templates
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#333333]">
              <div className="text-sm text-gray-300 mb-3">
                This will restore all factory prompt templates while preserving any custom templates you've created.
              </div>
              <ul className="text-xs text-gray-500 space-y-1 mb-4">
                <li>• Factory templates will be restored to their original state</li>
                <li>• Your custom templates (marked with <span className="text-purple-400">custom</span>) will be kept</li>
                <li>• Any edits to factory templates will be lost</li>
              </ul>
              <Button
                onClick={handleResetTemplates}
                className={`${templatesReset ? 'bg-green-600 hover:bg-green-600' : 'bg-purple-600 hover:bg-purple-500'} text-white`}
              >
                {templatesReset ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Reset Complete
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Prompt Templates
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
