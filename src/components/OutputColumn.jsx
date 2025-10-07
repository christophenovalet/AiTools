import React, { useState } from 'react'
import { Copy, Send, Trash2 } from 'lucide-react'
import { Button } from './ui/button'

export function OutputColumn({ selectedBlocks, selectedPrompt, onClear, onReorder }) {
  const [copied, setCopied] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState(-1)

  const assembledText = selectedBlocks.map((block, index) => {
    return `[Block ${index + 1}]\n${block.text}`
  }).join('\n\n')

  const finalText = assembledText + (selectedPrompt ? `\n\n---\n\n${selectedPrompt}` : '')

  const handleCopy = () => {
    navigator.clipboard.writeText(finalText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] rounded-lg border-2 border-green-500/50 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-[#0a0a0a]">
        <h3 className="text-gray-100 font-semibold text-sm">
          📝 Assembled Output ({selectedBlocks.length} block{selectedBlocks.length !== 1 ? 's' : ''})
        </h3>
        {selectedBlocks.length > 0 && (
          <Button
            onClick={onClear}
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {selectedBlocks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm text-center">
            Select blocks from the columns to build your document
          </div>
        ) : (
          <div className="space-y-3">
            {selectedBlocks.map((block, index) => (
              <div
                key={block.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', String(index))
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverIndex(index)
                }}
                onDragLeave={() => setDragOverIndex(-1)}
                onDragEnd={() => setDragOverIndex(-1)}
                onDrop={(e) => {
                  e.preventDefault()
                  const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
                  setDragOverIndex(-1)
                  if (!Number.isNaN(fromIndex) && fromIndex !== index && onReorder) {
                    onReorder(fromIndex, index)
                  }
                }}
                className={`p-3 bg-[#0a0a0a] rounded-lg border ${dragOverIndex === index ? 'border-blue-500' : 'border-gray-700'} cursor-move`}
                title="Drag to reorder"
              >
                <div className="text-xs text-gray-500 mb-2 font-semibold">
                  {block.columnTitle} / Block {block.blockNumber}
                </div>
                <div className="text-gray-300 text-sm whitespace-pre-wrap">
                  {block.text}
                </div>
              </div>
            ))}

            {selectedPrompt && (
              <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <div className="text-xs text-purple-400 mb-2 font-semibold">
                  📌 Prompt
                </div>
                <div className="text-gray-300 text-sm whitespace-pre-wrap">
                  {selectedPrompt}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedBlocks.length > 0 && (
        <div className="p-3 border-t border-gray-700 bg-[#0a0a0a] space-y-2">
          <Button
            onClick={handleCopy}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold"
          >
            <Copy className="mr-2 h-4 w-4" />
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
        </div>
      )}
    </div>
  )
}
