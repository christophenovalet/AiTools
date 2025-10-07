import React, { useState } from 'react'
import { Copy, Send, Trash2 } from 'lucide-react'
import { Button } from './ui/button'

export function OutputColumn({ selectedBlocks, onClear, onReorder, onAddBlock, onOpenPreview }) {
  const [copied, setCopied] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState(-1)
  const [isDropZoneActive, setIsDropZoneActive] = useState(false)
  const [dropTargetIndex, setDropTargetIndex] = useState(-1)

  const assembledText = selectedBlocks.map((block, index) => {
    return `[Block ${index + 1}]\n${block.text}`
  }).join('\n\n')

  const finalText = assembledText

  const handleCopy = () => {
    navigator.clipboard.writeText(finalText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDropFromSource = (e, atIndex = null) => {
    e.preventDefault()
    setIsDropZoneActive(false)
    setDropTargetIndex(-1)
    try {
      const blockData = e.dataTransfer.getData('application/json')
      if (blockData) {
        const block = JSON.parse(blockData)
        onAddBlock && onAddBlock(block, atIndex)
      }
    } catch (error) {
      console.error('Error parsing dropped block:', error)
    }
  }

  const handleDragOverFromSource = (e) => {
    e.preventDefault()
    const hasBlockData = e.dataTransfer.types.includes('application/json')
    if (hasBlockData) {
      setIsDropZoneActive(true)
    }
  }

  const handleDragLeaveFromSource = () => {
    setIsDropZoneActive(false)
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

      <div
        className="flex-1 overflow-y-auto p-3"
        onDrop={(e) => handleDropFromSource(e, dropTargetIndex >= 0 ? dropTargetIndex : null)}
        onDragOver={handleDragOverFromSource}
        onDragLeave={handleDragLeaveFromSource}
      >
        {selectedBlocks.length === 0 ? (
          <div className={`flex items-center justify-center h-full text-sm text-center transition-all ${
            isDropZoneActive
              ? 'text-blue-400 border-2 border-dashed border-blue-500 rounded-lg bg-blue-500/10'
              : 'text-gray-500'
          }`}>
            {isDropZoneActive ? 'Drop block here to add it' : 'Select blocks from the columns to build your document'}
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
                  const hasBlockData = e.dataTransfer.types.includes('application/json')
                  if (hasBlockData) {
                    setDropTargetIndex(index)
                  } else {
                    setDragOverIndex(index)
                  }
                }}
                onDragLeave={() => {
                  setDragOverIndex(-1)
                  setDropTargetIndex(-1)
                }}
                onDragEnd={() => {
                  setDragOverIndex(-1)
                  setDropTargetIndex(-1)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const blockData = e.dataTransfer.getData('application/json')
                  if (blockData) {
                    handleDropFromSource(e, index)
                  } else {
                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
                    setDragOverIndex(-1)
                    if (!Number.isNaN(fromIndex) && fromIndex !== index && onReorder) {
                      onReorder(fromIndex, index)
                    }
                  }
                }}
                className={`p-3 rounded-lg border-2 ${
                  dragOverIndex === index ? 'border-blue-500 bg-[#0a0a0a]' :
                  dropTargetIndex === index ? 'border-green-500 bg-[#0a0a0a]' :
                  block.color ? `${block.color}` : 'bg-[#0a0a0a] border-gray-700'
                } cursor-move`}
                title="Drag to reorder"
              >
                <div className="text-xs text-gray-500 mb-2 font-semibold">
                  {block.columnTitle} {block.blockNumber > 0 && `/ Block ${block.blockNumber}`}
                </div>
                <div className="text-gray-300 text-sm whitespace-pre-wrap">
                  {block.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedBlocks.length > 0 && (
        <div className="p-3 border-t border-gray-700 bg-[#0a0a0a] space-y-2">
          <Button
            onClick={() => onOpenPreview && onOpenPreview(finalText)}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold border border-gray-600 rounded-full"
          >
            Edit Preview
          </Button>
          <Button
            onClick={handleCopy}
            className="w-full bg-white hover:bg-gray-100 text-black font-semibold border border-gray-300 rounded-full"
          >
            <Copy className="mr-2 h-4 w-4" />
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
        </div>
      )}
    </div>
  )
}
