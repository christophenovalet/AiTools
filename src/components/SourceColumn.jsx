import React from 'react'
import { TextBlock } from './TextBlock'
import { Trash2, Plus } from 'lucide-react'
import { Button } from './ui/button'

export function SourceColumn({ column, onUpdateText, onToggleBlock, onRemove, canRemove, selectedBlocks }) {
  const parseTextIntoBlocks = (text) => {
    if (!text.trim()) return []

    // Split by double line breaks to create blocks
    const blocks = text.split('\n\n').filter(block => block.trim())
    return blocks.map((block, index) => ({
      id: `${column.id}-${index}`,
      text: block.trim(),
      columnId: column.id
    }))
  }

  const blocks = parseTextIntoBlocks(column.text)

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#1a1a1a] rounded-lg border border-gray-700 overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-[#0a0a0a] flex-shrink-0">
        <input
          type="text"
          value={column.title}
          onChange={(e) => onUpdateText({ ...column, title: e.target.value })}
          className="bg-transparent text-gray-100 font-semibold text-sm border-none outline-none flex-1"
          placeholder="Column title"
        />
        {canRemove && (
          <Button
            onClick={onRemove}
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Textarea - Fixed */}
      <div className="p-3 flex-shrink-0">
        <textarea
          value={column.text}
          onChange={(e) => onUpdateText({ ...column, text: e.target.value })}
          placeholder="Paste your text here. Use double line breaks to create separate blocks."
          className="w-full h-24 bg-[#0a0a0a] text-gray-300 border border-gray-700 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-gray-500"
        />
      </div>

      {/* Blocks area - Scrollable */}
      {blocks.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
          <div className="space-y-2">
            <div className="text-xs text-gray-500 font-semibold mb-2">
              {blocks.length} block{blocks.length > 1 ? 's' : ''} detected
            </div>
            {blocks.map((block) => (
              <TextBlock
                key={block.id}
                block={block}
                isSelected={selectedBlocks.some(sb => sb.id === block.id)}
                onToggle={() => onToggleBlock(block)}
                columnColor={column.color}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
