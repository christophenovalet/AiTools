import React, { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Key, Eye, EyeOff, Save, Check, MessageSquare, Plus, Trash2, RotateCcw, DollarSign, Keyboard, AlertTriangle, Shield, BarChart3, User, LogOut, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getMenuItems, getDefaultMenuItems, saveMenuItems, getModelPricing, getDefaultModelPricing, saveModelPricing, getAdminApiKey, saveAdminApiKey, saveApiKey } from '@/lib/claude-api'
import { getShortcuts, saveShortcuts, resetShortcuts, formatShortcut, parseKeyboardEvent, findConflicts, isValidShortcut, DEFAULT_SHORTCUTS } from '@/lib/keyboard-shortcuts'
import { useAuth } from '@/contexts/AuthContext'
import { settingsApi } from '@/lib/api'

const API_KEY_STORAGE_KEY = 'claude-api-key'

const MODEL_LABELS = {
  haiku: 'Haiku 4.5',
  sonnet: 'Sonnet 4.5',
  opus: 'Opus 4.5'
}

export function SettingsPage({ onBackHome, onOpenCosts }) {
  // Auth hook
  const { user, signOut } = useAuth()

  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [adminApiKey, setAdminApiKey] = useState('')
  const [showAdminKey, setShowAdminKey] = useState(false)
  const [adminSaved, setAdminSaved] = useState(false)
  const [menuItems, setMenuItems] = useState([])
  const [menuItemsSaved, setMenuItemsSaved] = useState(false)
  const [modelPricing, setModelPricing] = useState({})
  const [pricingSaved, setPricingSaved] = useState(false)
  const [shortcuts, setShortcuts] = useState({})
  const [shortcutsSaved, setShortcutsSaved] = useState(false)
  const [recordingShortcut, setRecordingShortcut] = useState(null)
  const [shortcutConflict, setShortcutConflict] = useState(null)
  const [cloudResetLoading, setCloudResetLoading] = useState(false)
  const [cloudResetDone, setCloudResetDone] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY)
    if (stored) {
      setApiKey(stored)
    }
    setAdminApiKey(getAdminApiKey())
    setMenuItems(getMenuItems())
    setModelPricing(getModelPricing())
    setShortcuts(getShortcuts())
  }, [])

  const handleSave = async () => {
    // Use the async version that handles encryption and sync
    await saveApiKey(apiKey.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave()
    }
  }

  const handleSaveAdminKey = () => {
    saveAdminApiKey(adminApiKey)
    setAdminSaved(true)
    setTimeout(() => setAdminSaved(false), 2000)
  }

  const handleAdminKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveAdminKey()
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

  const handleResetToDefaults = async () => {
    if (cloudResetLoading) return

    setCloudResetLoading(true)
    try {
      await settingsApi.resetToDefaults()
      setCloudResetDone(true)
      // Reload the page after a short delay to reseed data
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err) {
      console.error('Failed to reset to defaults:', err)
      alert('Failed to reset: ' + err.message)
      setCloudResetLoading(false)
    }
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

        {/* Account Card */}
        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-100">Account</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your account
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Info */}
            {user && (
              <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-100">{user.name}</p>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>
                <Button
                  onClick={signOut}
                  variant="outline"
                  size="sm"
                  className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}

          </CardContent>
        </Card>

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

        {/* Admin API Key Card */}
        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-100">Admin API Key</CardTitle>
                <CardDescription className="text-gray-400">
                  Required for viewing organization cost reports
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <input
                type={showAdminKey ? 'text' : 'password'}
                value={adminApiKey}
                onChange={(e) => setAdminApiKey(e.target.value)}
                onKeyDown={handleAdminKeyDown}
                placeholder="sk-ant-admin01-..."
                className="w-full bg-[#0a0a0a] border border-[#333333] rounded-lg px-4 py-3 pr-12 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowAdminKey(!showAdminKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showAdminKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveAdminKey}
                disabled={!adminApiKey.trim()}
                className={`${adminSaved ? 'bg-green-600 hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-500'} text-white`}
              >
                {adminSaved ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Admin Key
                  </>
                )}
              </Button>
              {adminApiKey.trim() && (
                <Button
                  onClick={onOpenCosts}
                  variant="ghost"
                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Cost Report
                </Button>
              )}
            </div>

            <p className="text-xs text-gray-500">
              Admin API keys are separate from regular API keys. Get yours from{' '}
              <a
                href="https://console.anthropic.com/settings/admin-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-400 underline"
              >
                console.anthropic.com/settings/admin-keys
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

        {/* Reset to Defaults Card */}
        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl text-gray-100">Reset to Defaults</CardTitle>
                <CardDescription className="text-gray-400">
                  Reset all tags, instructions, and templates to factory defaults
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-[#0a0a0a] rounded-lg border border-red-500/20">
              <div className="text-sm text-gray-300 mb-3">
                This will delete all your current tags, AI instructions, and templates from the cloud and restore them to factory defaults.
              </div>
              <ul className="text-xs text-gray-500 space-y-1 mb-4">
                <li>• All tags will be reset to factory defaults</li>
                <li>• All AI instructions will be reset to factory defaults</li>
                <li>• All templates will be reset to factory defaults</li>
                <li className="text-red-400">• Custom items you created will be deleted</li>
              </ul>
              <Button
                onClick={handleResetToDefaults}
                disabled={cloudResetLoading || cloudResetDone}
                className={`${cloudResetDone ? 'bg-green-600 hover:bg-green-600' : 'bg-red-600 hover:bg-red-500'} text-white`}
              >
                {cloudResetDone ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Reset Complete - Reloading...
                  </>
                ) : cloudResetLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset All to Defaults
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
