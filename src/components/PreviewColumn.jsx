import React, { useState } from 'react'
import { X, Copy } from 'lucide-react'
import { Button } from './ui/button'

export function PreviewColumn({ text, onClose }) {
  const [localText, setLocalText] = useState(text || '')
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(localText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] rounded-lg border-2 border-blue-500/50 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-[#0a0a0a]">
        <h3 className="text-gray-100 font-semibold text-sm">🔎 Preview</h3>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-gray-200 hover:bg-gray-700/40"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 p-3">
        <textarea
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          className="w-full h-full resize-none bg-black/40 border border-[#333333] text-gray-200 font-mono text-sm rounded p-3 outline-none focus:ring-2 focus:ring-blue-600"
          placeholder="Preview..."
        />
      </div>

      <div className="p-3 border-t border-gray-700 bg-[#0a0a0a]">
        <Button
          onClick={handleCopy}
          className="w-full bg-white hover:bg-gray-100 text-black font-semibold border border-gray-300 rounded-full"
        >
          <Copy className="mr-2 h-4 w-4" />
          {copied ? 'Copied!' : 'Copy Preview'}
        </Button>
      </div>
    </div>
  )
}
