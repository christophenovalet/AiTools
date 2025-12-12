import React, { useRef } from 'react'
import { TextBlock } from './TextBlock'
import { Trash2, Maximize2 } from 'lucide-react'
import { Button } from './ui/button'
import XmlEditor from './XmlEditor'

export function SourceColumn({ column, onUpdateText, onToggleBlock, onRemove, canRemove, selectedBlocks, onMaximize, isMaximized, onEditorFocus }) {
  const editorRef = useRef(null)

  const parseTextIntoBlocks = (text) => {
    if (!text.trim()) return []

    // Split by double line breaks to create blocks
    const blocks = text.split('\n\n').filter(block => block.trim())
    return blocks.map((block, index) => ({
      id: `${column.id}-${index}`,
      text: block.trim(),
      columnId: column.id,
      columnTitle: column.title,
      blockNumber: index + 1,
      color: column.color
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

      {/* XML Editor */}
      <div className={`p-3 ${isMaximized ? 'flex-1 min-h-0' : 'flex-shrink-0'}`}>
        <div className="relative group h-full">
          <XmlEditor
            ref={editorRef}
            value={column.text}
            onChange={(value) => onUpdateText({ ...column, text: value })}
            onFocus={() => onEditorFocus && onEditorFocus(editorRef)}
            placeholder="Paste your XML/text here..."
            height={isMaximized ? '100%' : '150px'}
            showToolbar={true}
          />
          {!isMaximized && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onMaximize && onMaximize(column.id)}
              className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-white hover:bg-gray-700/40"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          )}
        </div>
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
