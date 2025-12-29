import React, { useRef } from 'react'
import { TextBlock } from './TextBlock'
import { Trash2, Maximize2, ChevronDown, ChevronUp, GitCompare } from 'lucide-react'
import { Button } from './ui/button'
import XmlEditor from './XmlEditor'

export function SourceColumn({ column, onUpdateText, onToggleBlock, onRemove, canRemove, selectedBlocks, onMaximize, isMaximized, onEditorFocus, blocksExpanded, onToggleBlocksExpanded, isSelectedForCompare, onToggleCompare }) {
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
        <div className="flex items-center gap-2 flex-1">
          {onToggleCompare && (
            <button
              onClick={() => onToggleCompare(column.id)}
              className={`flex items-center justify-center w-5 h-5 rounded border transition-colors ${
                isSelectedForCompare
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'border-gray-600 text-gray-500 hover:border-orange-400 hover:text-orange-400'
              }`}
              title="Select for comparison"
            >
              <GitCompare className="w-3 h-3" />
            </button>
          )}
          <input
            type="text"
            value={column.title}
            onChange={(e) => onUpdateText({ ...column, title: e.target.value })}
            className="bg-transparent text-gray-100 font-semibold text-sm border-none outline-none flex-1"
            placeholder="Column title"
          />
        </div>
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
      <div className={`p-3 ${isMaximized || !blocksExpanded ? 'flex-1 min-h-0' : 'flex-shrink-0'}`}>
        <div className="relative group h-full">
          <XmlEditor
            ref={editorRef}
            value={column.text}
            onChange={(value) => onUpdateText({ ...column, text: value })}
            onFocus={() => onEditorFocus && onEditorFocus(editorRef)}
            placeholder="Paste your XML/text here..."
            minHeight={isMaximized || !blocksExpanded ? '100%' : '150px'}
            maxHeight={isMaximized || !blocksExpanded ? '100%' : '500px'}
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

      {/* Blocks toggle bar */}
      {blocks.length > 0 && (
        <button
          onClick={() => onToggleBlocksExpanded && onToggleBlocksExpanded(column.id)}
          className="flex items-center justify-between px-3 py-2 border-t border-gray-700 bg-[#0a0a0a] hover:bg-[#1a1a1a] transition-colors flex-shrink-0 w-full text-left"
        >
          <span className="text-xs text-gray-500 font-semibold">
            {blocks.length} block{blocks.length > 1 ? 's' : ''} detected
          </span>
          {blocksExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          )}
        </button>
      )}

      {/* Blocks area - Scrollable (collapsible) */}
      {blocks.length > 0 && blocksExpanded && (
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
          <div className="space-y-2 pt-2">
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
