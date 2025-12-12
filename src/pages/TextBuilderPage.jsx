import React, { useState, useRef } from 'react'
import { SourceColumn } from '@/components/SourceColumn'
import { OutputColumn } from '@/components/OutputColumn'
import { PromptTools } from '@/components/PromptTools'
import { PreviewColumn } from '@/components/PreviewColumn'
import { Button } from '@/components/ui/button'
import { Plus, Home, X } from 'lucide-react'

export function TextBuilderPage({ onBackHome }) {
  const [columns, setColumns] = useState([
    {
      id: 1,
      title: 'Source 1',
      text: '',
      color: 'bg-blue-500/20 border-blue-500'
    },
    {
      id: 2,
      title: 'Source 2',
      text: '',
      color: 'bg-green-500/20 border-green-500'
    },
    {
      id: 3,
      title: 'Source 3',
      text: '',
      color: 'bg-yellow-500/20 border-yellow-500'
    }
  ])

  const [selectedBlocks, setSelectedBlocks] = useState([])
  const [nextId, setNextId] = useState(4)
  const [maximizedSourceId, setMaximizedSourceId] = useState(null)
  const [previewText, setPreviewText] = useState(null)
  const scrollerRef = useRef(null)
  const [focusedTextareaRef, setFocusedTextareaRef] = useState(null)

  const updateColumn = (index, updatedColumn) => {
    const newColumns = [...columns]
    newColumns[index] = updatedColumn
    setColumns(newColumns)
  }

  const addColumn = () => {
    if (columns.length < 5) {
      const colors = [
        'bg-blue-500/20 border-blue-500',
        'bg-green-500/20 border-green-500',
        'bg-yellow-500/20 border-yellow-500',
        'bg-red-500/20 border-red-500',
        'bg-orange-500/20 border-orange-500'
      ]
      setColumns([
        ...columns,
        {
          id: nextId,
          title: `Source ${nextId}`,
          text: '',
          color: colors[(nextId - 1) % colors.length]
        }
      ])
      setNextId(nextId + 1)
    }
  }

  const removeColumn = (index) => {
    if (columns.length > 2) {
      const columnToRemove = columns[index]
      const newColumns = columns.filter((_, i) => i !== index)
      setColumns(newColumns)

      // Remove selected blocks from this column
      setSelectedBlocks(selectedBlocks.filter(block => block.columnId !== columnToRemove.id))
    }
  }

  const toggleBlock = (block) => {
    const isSelected = selectedBlocks.some(sb => sb.id === block.id)
    if (isSelected) {
      setSelectedBlocks(selectedBlocks.filter(sb => sb.id !== block.id))
    } else {
      setSelectedBlocks([...selectedBlocks, block])
    }
  }

  const addBlockFromDrop = (block, atIndex = null) => {
    const isAlreadySelected = selectedBlocks.some(sb => sb.id === block.id)
    if (!isAlreadySelected) {
      if (atIndex !== null && atIndex >= 0) {
        const newBlocks = [...selectedBlocks]
        newBlocks.splice(atIndex + 1, 0, block)
        setSelectedBlocks(newBlocks)
      } else {
        setSelectedBlocks([...selectedBlocks, block])
      }
    }
  }

  const clearOutput = () => {
    setSelectedBlocks([])
  }

  const reorderSelectedBlocks = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return
    setSelectedBlocks(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  const openPreview = (text) => {
    setPreviewText(text)
    // auto-scroll slightly to the right to reveal the preview column while keeping output visible
    requestAnimationFrame(() => {
      const el = scrollerRef.current
      if (el) {
        const delta = 420 + 16 // preview width + gap-4
        el.scrollTo({ left: el.scrollLeft + delta, behavior: 'smooth' })
      }
    })
  }

  const closePreview = () => {
    setPreviewText(null)
    // auto-scroll slightly left to re-center content
    requestAnimationFrame(() => {
      const el = scrollerRef.current
      if (el) {
        const delta = 420 + 16
        const target = Math.max(0, el.scrollLeft - delta)
        el.scrollTo({ left: target, behavior: 'smooth' })
      }
    })
  }

  const insertTag = (tagName) => {
    if (!focusedTextareaRef?.current) return

    const editor = focusedTextareaRef.current
    const selection = editor.getSelection()
    const text = editor.getValue()
    const start = selection.start
    const end = selection.end
    const selectedText = selection.text

    // Check if we're at the start of a line
    const beforeText = text.substring(0, start)
    const lastNewline = beforeText.lastIndexOf('\n')
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1
    const isAtLineStart = beforeText.substring(lineStart).trim() === ''

    // Check if we're at the end of a line
    const afterText = text.substring(end)
    const nextNewline = afterText.indexOf('\n')
    const isAtLineEnd = (nextNewline === -1 ? afterText : afterText.substring(0, nextNewline)).trim() === ''

    // Build the tag structure with proper formatting
    let newText

    if (selectedText) {
      // Wrap selected text with indented tag structure
      const indentedContent = selectedText.split('\n').map(line => '\t' + line).join('\n')
      newText = `${isAtLineStart ? '' : '\n'}<${tagName}>\n${indentedContent}\n</${tagName}>${isAtLineEnd ? '' : '\n'}`
    } else {
      // Insert empty tag structure with cursor positioned in indented area
      newText = `${isAtLineStart ? '' : '\n'}<${tagName}>\n\t\n</${tagName}>${isAtLineEnd ? '' : '\n'}`
    }

    // Insert the new text using editor method
    editor.replaceSelection(newText)
    editor.focus()
  }

  const handleEditorFocus = (editorRef) => {
    setFocusedTextareaRef(editorRef)
  }

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button
              onClick={onBackHome}
              variant="ghost"
              className="text-gray-400 hover:text-gray-200"
            >
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
            <h1 className="text-3xl font-bold text-gray-100">TextBuilder</h1>
          </div>

          <div className="flex gap-3 items-center">
            {columns.length < 5 && (
              <Button
                onClick={addColumn}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Column
              </Button>
            )}
          </div>
        </div>

        <div ref={scrollerRef} className="flex gap-4 flex-1 min-h-0 overflow-x-auto pb-1">
          {/* Prompt Tools - Left side */}
          <div className="h-full min-h-0 w-[280px] flex-shrink-0">
            <PromptTools
              selectedBlocks={selectedBlocks}
              onToggleBlock={toggleBlock}
              onInsertTag={insertTag}
            />
          </div>

          {/* Source Columns - Middle */}
          <div className="h-full min-h-0 flex-1 min-w-0">
            {maximizedSourceId ? (
              <div className="relative h-full min-h-0">
                <Button
                  onClick={() => setMaximizedSourceId(null)}
                  variant="ghost"
                  className="absolute top-2 right-2 z-20 text-gray-300 hover:text-white hover:bg-gray-700/40"
                >
                  <X className="mr-2 h-4 w-4" />
                  Close
                </Button>
                <div className="h-full min-h-0">
                  <SourceColumn
                    key={maximizedSourceId}
                    column={columns.find(c => c.id === maximizedSourceId) || columns[0]}
                    onUpdateText={(updated) => {
                      const idx = columns.findIndex(c => c.id === maximizedSourceId)
                      if (idx !== -1) updateColumn(idx, updated)
                    }}
                    onToggleBlock={toggleBlock}
                    onRemove={() => {}}
                    canRemove={false}
                    selectedBlocks={selectedBlocks}
                    onMaximize={(id) => setMaximizedSourceId(id)}
                    isMaximized={true}
                    onEditorFocus={handleEditorFocus}
                  />
                </div>
              </div>
            ) : (
              <div className={`grid gap-4 h-full min-h-0 ${
                columns.length === 2 ? 'grid-cols-2' :
                columns.length === 3 ? 'grid-cols-3' :
                columns.length === 4 ? 'grid-cols-4' :
                'grid-cols-5'
              }`}>
                {columns.map((column, index) => (
                  <div className="h-full min-h-0" key={column.id}>
                    <SourceColumn
                      column={column}
                      onUpdateText={(updated) => updateColumn(index, updated)}
                      onToggleBlock={toggleBlock}
                      onRemove={() => removeColumn(index)}
                      canRemove={columns.length > 2}
                      selectedBlocks={selectedBlocks}
                      onMaximize={(id) => setMaximizedSourceId(id)}
                      isMaximized={false}
                      onEditorFocus={handleEditorFocus}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Output Column - Right side */}
          <div className="h-full min-h-0 w-[360px] flex-shrink-0">
            <OutputColumn
              selectedBlocks={selectedBlocks}
              onClear={clearOutput}
              onReorder={reorderSelectedBlocks}
              onAddBlock={addBlockFromDrop}
              onOpenPreview={openPreview}
            />
          </div>

          {/* Preview Column - After Output */}
          {previewText !== null && (
            <div className="h-full min-h-0 w-[420px] flex-shrink-0">
              <PreviewColumn text={previewText} onClose={closePreview} />
            </div>
          )}
        </div>

        <div className="text-center text-sm text-gray-500 flex-shrink-0">
          <p>Paste text in columns • Use double line breaks to create blocks • Select blocks to assemble your document • Add a prompt from the library</p>
        </div>
      </div>
    </div>
  )
}
