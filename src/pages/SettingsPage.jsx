import React, { useState, useEffect } from 'react'
import { ArrowLeft, Key, Eye, EyeOff, Save, Check, MessageSquare, Plus, Trash2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getMenuItems, getDefaultMenuItems, saveMenuItems } from '@/lib/claude-api'

const API_KEY_STORAGE_KEY = 'claude-api-key'

export function SettingsPage({ onBackHome }) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [menuItems, setMenuItems] = useState([])
  const [menuItemsSaved, setMenuItemsSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY)
    if (stored) {
      setApiKey(stored)
    }
    setMenuItems(getMenuItems())
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
      </div>
    </div>
  )
}
