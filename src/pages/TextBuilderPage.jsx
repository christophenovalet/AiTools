import React, { useState, useRef, useEffect, useCallback } from 'react'
import { SourceColumn } from '@/components/SourceColumn'
import { OutputColumn } from '@/components/OutputColumn'
import { PromptTools } from '@/components/PromptTools'
import { PreviewColumn } from '@/components/PreviewColumn'
import { TagsOverlay } from '@/components/TagsOverlay'
import { SaveToProjectModal } from '@/components/SaveToProjectModal'
import { ProjectsModal } from '@/components/ProjectsModal'
import { ChatbotPanel } from '@/components/chatbot/ChatbotPanel'
import { SelectionToolbar } from '@/components/chatbot/SelectionToolbar'
import { Button } from '@/components/ui/button'
import { Plus, Home, X, Trash2, FolderOpen, Save, MessageSquare, Settings, GitCompare, RotateCcw, Check } from 'lucide-react'
import { getShortcut, matchesShortcut, formatShortcut } from '@/lib/keyboard-shortcuts'
import { CompareColumnsModal } from '@/components/CompareColumnsModal'
import { textsApi, isAuthenticated } from '@/lib/api'

// Helper to generate default title with date format: "New prompt Friday 0610"
const generateDefaultTitle = () => {
  const now = new Date()
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `New prompt ${dayName} ${month}${day}`
}

export function TextBuilderPage({ onBackHome, onOpenSettings }) {
  // Document title state
  const [documentTitle, setDocumentTitle] = useState(generateDefaultTitle)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitleValue, setEditingTitleValue] = useState('')
  const titleInputRef = useRef(null)

  // Track unsaved changes and last saved state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSavedState, setLastSavedState] = useState(null)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const pendingNavigationRef = useRef(null)

  const [columns, setColumns] = useState([
    {
      id: 1,
      title: 'Source 1',
      text: '',
      color: 'bg-blue-500/20 border-blue-500'
    }
  ])

  const [selectedBlocks, setSelectedBlocks] = useState([])
  const [nextId, setNextId] = useState(2)
  const [maximizedSourceId, setMaximizedSourceId] = useState(null)
  const [previewText, setPreviewText] = useState(null)
  const scrollerRef = useRef(null)
  const [focusedTextareaRef, setFocusedTextareaRef] = useState(null)
  const [showTagsOverlay, setShowTagsOverlay] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [contentToSave, setContentToSave] = useState('')
  const [showProjectsModal, setShowProjectsModal] = useState(false)
  const [lastSavedRef, setLastSavedRef] = useState(null) // { projectId, textId, title }
  const [expandedBlocksColumns, setExpandedBlocksColumns] = useState(new Set()) // Track which columns have blocks expanded

  // Compare columns state
  const [columnsSelectedForCompare, setColumnsSelectedForCompare] = useState(new Set())
  const [showCompareModal, setShowCompareModal] = useState(false)

  // Chatbot state
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)
  const [chatbotInput, setChatbotInput] = useState('')
  const [chatbotContextAddition, setChatbotContextAddition] = useState('')
  const [clearChatOnOpen, setClearChatOnOpen] = useState(false)
  const [selectionToolbar, setSelectionToolbar] = useState({
    visible: false,
    position: null,
    text: ''
  })
  const selectionToolbarRef = useRef(null)

  // Branch state (max 3 branches)
  const [branches, setBranches] = useState([])
  const MAX_BRANCHES = 3

  // Handle creating a new branch
  const handleCreateBranch = useCallback((messagesUpToPoint) => {
    if (branches.length >= MAX_BRANCHES) {
      alert(`Maximum of ${MAX_BRANCHES} branches allowed. Please close a branch first.`)
      return
    }
    const newBranch = {
      id: Date.now().toString(),
      messages: messagesUpToPoint.map(m => ({ ...m })) // Deep copy messages
    }
    setBranches(prev => [...prev, newBranch])
  }, [branches.length])

  // Handle closing a branch
  const handleCloseBranch = useCallback((branchId) => {
    setBranches(prev => prev.filter(b => b.id !== branchId))
  }, [])

  // Handle copying branch content to main context
  const handleCopyToMain = useCallback((content, branchId) => {
    // Wrap the content in context tags and add to chatbot input
    const wrappedContent = `<context>\n${content}\n</context>`
    setChatbotInput(prev => prev ? `${prev}\n\n${wrappedContent}` : wrappedContent)
    // Close the branch after copying
    handleCloseBranch(branchId)
  }, [handleCloseBranch])

  // Keyboard shortcut: Toggle tags overlay (customizable)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const quickTagsShortcut = getShortcut('quickTags')
      if (matchesShortcut(e, quickTagsShortcut)) {
        e.preventDefault()
        setShowTagsOverlay(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus title input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  // Track changes to mark document as dirty
  useEffect(() => {
    // Skip initial render
    const hasContent = columns.some(col => col.text.trim() !== '')
    if (hasContent) {
      setHasUnsavedChanges(true)
      // Save current state to localStorage for reload functionality (with timestamp)
      const currentState = {
        columns,
        selectedBlocks,
        documentTitle,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem('promptDesigner_lastState', JSON.stringify(currentState))
    }
  }, [columns, selectedBlocks, documentTitle])

  // Get last saved info for tooltip
  const getLastSavedInfo = useCallback(() => {
    const savedState = localStorage.getItem('promptDesigner_lastState')
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        const title = parsed.documentTitle || 'Untitled'
        const date = parsed.savedAt ? new Date(parsed.savedAt).toLocaleString() : 'Unknown'
        return `${title}\n${date}`
      } catch {
        return 'No saved state'
      }
    }
    return 'No saved state'
  }, [])

  // Browser beforeunload warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Handle text selection for toolbar
  const handleSelectionCheck = useCallback(() => {
    if (!focusedTextareaRef?.current) {
      setSelectionToolbar({ visible: false, position: null, text: '' })
      return
    }

    const editor = focusedTextareaRef.current
    const selection = editor.getSelection()

    if (selection.text && selection.text.length > 0) {
      const coords = editor.getSelectionCoords()
      if (coords) {
        setSelectionToolbar({
          visible: true,
          position: coords,
          text: selection.text
        })
      }
    } else {
      setSelectionToolbar({ visible: false, position: null, text: '' })
    }
  }, [focusedTextareaRef])

  // Listen for mouseup to check selection
  useEffect(() => {
    const handleMouseUp = (e) => {
      // Check selection if mouseup is inside a CodeMirror editor or if we have a focused editor
      if (e.target.closest('.cm-editor') || focusedTextareaRef?.current) {
        setTimeout(handleSelectionCheck, 10)
      }
    }
    const handleKeyUp = (e) => {
      // Check for shift+arrows or Ctrl+A (select all)
      if (e.shiftKey || (e.ctrlKey && e.key === 'a') || (e.metaKey && e.key === 'a')) {
        setTimeout(handleSelectionCheck, 10)
      }
    }
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleSelectionCheck, focusedTextareaRef])

  // Any key or click to close selection toolbar
  useEffect(() => {
    if (!selectionToolbar.visible) return
    const handleKeyDown = (e) => {
      // Don't close on modifier keys or selection shortcuts (Ctrl+A, Cmd+A)
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
        return
      }
      setSelectionToolbar({ visible: false, position: null, text: '' })
    }
    const handleMouseDown = (e) => {
      // Don't close if clicking inside the toolbar
      if (selectionToolbarRef.current?.contains(e.target)) {
        return
      }
      setSelectionToolbar({ visible: false, position: null, text: '' })
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleMouseDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleMouseDown)
    }
  }, [selectionToolbar.visible])

  // Handle toolbar action - clears conversation and opens with new prompt
  const handleToolbarAction = useCallback((formattedPrompt, contextAddition = '') => {
    setChatbotInput(formattedPrompt)
    setChatbotContextAddition(contextAddition)
    setClearChatOnOpen(true)
    setIsChatbotOpen(true)
    setSelectionToolbar({ visible: false, position: null, text: '' })
    // Clear the text selection to prevent toolbar from reappearing on mouseup
    window.getSelection()?.removeAllRanges()
  }, [])

  // Title editing handlers
  const startEditingTitle = useCallback(() => {
    setEditingTitleValue(documentTitle)
    setIsEditingTitle(true)
  }, [documentTitle])

  const saveTitle = useCallback(() => {
    const trimmedTitle = editingTitleValue.trim()
    if (trimmedTitle) {
      setDocumentTitle(trimmedTitle)
    }
    setIsEditingTitle(false)
  }, [editingTitleValue])

  const cancelEditingTitle = useCallback(() => {
    setIsEditingTitle(false)
    setEditingTitleValue('')
  }, [])

  const handleTitleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveTitle()
    } else if (e.key === 'Escape') {
      cancelEditingTitle()
    }
  }, [saveTitle, cancelEditingTitle])

  // Reload last edited state from localStorage
  const reloadLastState = useCallback(() => {
    const savedState = localStorage.getItem('promptDesigner_lastState')
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        if (parsed.columns) setColumns(parsed.columns)
        if (parsed.selectedBlocks) setSelectedBlocks(parsed.selectedBlocks)
        if (parsed.documentTitle) setDocumentTitle(parsed.documentTitle)
      } catch (err) {
        console.error('Failed to restore last state:', err)
      }
    }
  }, [])

  // Handle navigation with unsaved changes warning
  const handleNavigateHome = useCallback(() => {
    if (hasUnsavedChanges) {
      pendingNavigationRef.current = 'home'
      setShowUnsavedDialog(true)
    } else {
      onBackHome()
    }
  }, [hasUnsavedChanges, onBackHome])

  const confirmNavigation = useCallback(() => {
    setShowUnsavedDialog(false)
    if (pendingNavigationRef.current === 'home') {
      onBackHome()
    }
    pendingNavigationRef.current = null
  }, [onBackHome])

  const cancelNavigation = useCallback(() => {
    setShowUnsavedDialog(false)
    pendingNavigationRef.current = null
  }, [])

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
    if (columns.length > 1) {
      const columnToRemove = columns[index]
      const newColumns = columns.filter((_, i) => i !== index)
      setColumns(newColumns)

      // Remove selected blocks from this column
      setSelectedBlocks(selectedBlocks.filter(block => block.columnId !== columnToRemove.id))

      // Remove from expanded blocks columns
      setExpandedBlocksColumns(prev => {
        const next = new Set(prev)
        next.delete(columnToRemove.id)
        return next
      })
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

  const insertTag = (tagName, action) => {
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

    // Build the action element if action is provided
    const actionElement = action ? `\t<action>${action}</action>\n` : ''

    // Build the tag structure with proper formatting
    let newText
    let cursorOffset = null

    if (selectedText) {
      // Wrap selected text with indented tag structure
      const indentedContent = selectedText.split('\n').map(line => '\t' + line).join('\n')
      newText = `${isAtLineStart ? '' : '\n'}<${tagName}>\n${actionElement}${indentedContent}\n</${tagName}>${isAtLineEnd ? '' : '\n'}`
    } else {
      // Insert inline tag with cursor positioned inside (no line feeds)
      newText = `<${tagName}></${tagName}>`
      // Position cursor after the opening tag: < + tagName + >
      cursorOffset = 1 + tagName.length + 1
    }

    // Insert the new text using editor method
    editor.replaceSelection(newText, cursorOffset)
    editor.focus()
  }

  const insertInstruction = (name, description) => {
    if (!focusedTextareaRef?.current) return

    const editor = focusedTextareaRef.current
    const text = editor.getValue()
    const selection = editor.getSelection()
    const start = selection.start

    // Check if we're at the start of a line
    const beforeText = text.substring(0, start)
    const lastNewline = beforeText.lastIndexOf('\n')
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1
    const isAtLineStart = beforeText.substring(lineStart).trim() === ''

    // Check if we're at the end of a line
    const afterText = text.substring(selection.end)
    const nextNewline = afterText.indexOf('\n')
    const isAtLineEnd = (nextNewline === -1 ? afterText : afterText.substring(0, nextNewline)).trim() === ''

    // Build the instruction tag with description as content
    const indentedDescription = description.split('\n').map(line => '\t' + line).join('\n')
    const newText = `${isAtLineStart ? '' : '\n'}<${name}>\n${indentedDescription}\n</${name}>${isAtLineEnd ? '' : '\n'}`

    editor.replaceSelection(newText)
    editor.focus()
  }

  const insertTemplate = (title, text) => {
    if (!focusedTextareaRef?.current) return

    const editor = focusedTextareaRef.current
    const editorText = editor.getValue()
    const selection = editor.getSelection()
    const start = selection.start

    // Check if we're at the start of a line
    const beforeText = editorText.substring(0, start)
    const lastNewline = beforeText.lastIndexOf('\n')
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1
    const isAtLineStart = beforeText.substring(lineStart).trim() === ''

    // Check if we're at the end of a line
    const afterText = editorText.substring(selection.end)
    const nextNewline = afterText.indexOf('\n')
    const isAtLineEnd = (nextNewline === -1 ? afterText : afterText.substring(0, nextNewline)).trim() === ''

    // Convert title to tag name (remove spaces, use underscores)
    const tagName = title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')

    // Build the template tag with text as content
    const indentedText = text.split('\n').map(line => '\t' + line).join('\n')
    const newText = `${isAtLineStart ? '' : '\n'}<${tagName}>\n${indentedText}\n</${tagName}>${isAtLineEnd ? '' : '\n'}`

    editor.replaceSelection(newText)
    editor.focus()
  }

  const handleEditorFocus = (editorRef) => {
    setFocusedTextareaRef(editorRef)
  }

  // Toggle blocks expanded state for a column
  const toggleBlocksExpanded = useCallback((columnId) => {
    setExpandedBlocksColumns(prev => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }, [])

  // Toggle column selection for comparison
  const toggleCompareColumn = useCallback((columnId) => {
    setColumnsSelectedForCompare(prev => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }, [])

  // Get columns selected for comparison as array
  const getCompareColumns = useCallback(() => {
    return columns.filter(col => columnsSelectedForCompare.has(col.id))
  }, [columns, columnsSelectedForCompare])

  // Handle applying changes from compare modal back to columns
  const handleApplyCompareChanges = useCallback((updatedVersions) => {
    setColumns(prev => {
      const newColumns = [...prev]
      updatedVersions.forEach(updated => {
        const idx = newColumns.findIndex(col => col.id === updated.id)
        if (idx !== -1) {
          newColumns[idx] = { ...newColumns[idx], text: updated.text }
        }
      })
      return newColumns
    })
    setShowCompareModal(false)
  }, [])

  // Get the full workspace state for saving
  const getWorkspaceState = () => ({
    columns,
    selectedBlocks,
    nextId,
    previewText,
    expandedBlocksColumns: Array.from(expandedBlocksColumns) // Convert Set to array for JSON serialization
  })

  // Restore workspace state from a saved text
  const restoreWorkspaceState = (state) => {
    if (state.columns) setColumns(state.columns)
    if (state.selectedBlocks) setSelectedBlocks(state.selectedBlocks)
    if (state.nextId) setNextId(state.nextId)
    if (state.previewText !== undefined) setPreviewText(state.previewText)
    if (state.expandedBlocksColumns) setExpandedBlocksColumns(new Set(state.expandedBlocksColumns))
  }

  const handleSaveToProject = async () => {
    const workspaceState = getWorkspaceState()

    if (lastSavedRef) {
      // Overwrite existing save - call API directly
      if (isAuthenticated()) {
        try {
          await textsApi.update(lastSavedRef.textId, lastSavedRef.projectId, {
            state: workspaceState
          })
          console.log('Saved to cloud')
          setHasUnsavedChanges(false)
        } catch (err) {
          console.error('Failed to save to cloud:', err)
        }
      }
    } else {
      // First save - open modal
      setContentToSave(JSON.stringify(workspaceState))
      setShowSaveModal(true)
    }
  }

  const clearAll = () => {
    setColumns([{
      id: 1,
      title: 'Source 1',
      text: '',
      color: 'bg-blue-500/20 border-blue-500'
    }])
    setSelectedBlocks([])
    setNextId(2)
    setMaximizedSourceId(null)
    setPreviewText(null)
    setLastSavedRef(null) // Reset save reference
    setExpandedBlocksColumns(new Set()) // Reset expanded blocks
    setDocumentTitle(generateDefaultTitle()) // Reset to new default title
    setHasUnsavedChanges(false) // Reset unsaved changes
  }

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleNavigateHome}
              variant="ghost"
              className="text-gray-400 hover:text-gray-200"
            >
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
            <Button
              onClick={() => setShowProjectsModal(true)}
              variant="ghost"
              className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              Projects
            </Button>
            <Button
              onClick={onOpenSettings}
              variant="ghost"
              className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            {/* Editable Document Title */}
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editingTitleValue}
                    onChange={(e) => setEditingTitleValue(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    onBlur={saveTitle}
                    className="text-2xl font-bold bg-gray-800 text-gray-100 px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                  <Button
                    onClick={saveTitle}
                    variant="ghost"
                    size="sm"
                    className="text-green-400 hover:text-green-300 p-1"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <h1
                  onClick={startEditingTitle}
                  className="text-3xl font-bold text-gray-100 cursor-pointer hover:text-gray-300 transition-colors"
                  title="Click to edit title"
                >
                  {lastSavedRef?.title || documentTitle}
                </h1>
              )}
              {/* Reload last edited text button */}
              <Button
                onClick={reloadLastState}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-300 p-1"
                title={getLastSavedInfo()}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              {/* Unsaved changes indicator */}
              {hasUnsavedChanges && (
                <span className="text-xs text-yellow-500 ml-1">●</span>
              )}
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <Button
              onClick={() => setIsChatbotOpen(prev => !prev)}
              variant={isChatbotOpen ? "default" : "ghost"}
              className={isChatbotOpen
                ? "bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                : "text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              AI Chat
            </Button>
            <Button
              onClick={() => setShowCompareModal(true)}
              disabled={columnsSelectedForCompare.size < 2}
              variant="ghost"
              className={columnsSelectedForCompare.size >= 2
                ? "text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                : "text-gray-500"}
            >
              <GitCompare className="mr-2 h-4 w-4" />
              Compare {columnsSelectedForCompare.size > 0 && `(${columnsSelectedForCompare.size})`}
            </Button>
            <Button
              onClick={handleSaveToProject}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
            >
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button
              onClick={clearAll}
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
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
              onInsertTag={insertTag}
              onInsertInstruction={insertInstruction}
              onInsertTemplate={insertTemplate}
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
                    blocksExpanded={expandedBlocksColumns.has(maximizedSourceId)}
                    onToggleBlocksExpanded={toggleBlocksExpanded}
                    isSelectedForCompare={columnsSelectedForCompare.has(maximizedSourceId)}
                    onToggleCompare={toggleCompareColumn}
                  />
                </div>
              </div>
            ) : (
              <div className={`grid gap-4 h-full min-h-0 ${
                columns.length === 1 ? 'grid-cols-1' :
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
                      canRemove={columns.length > 1}
                      selectedBlocks={selectedBlocks}
                      onMaximize={(id) => setMaximizedSourceId(id)}
                      isMaximized={false}
                      onEditorFocus={handleEditorFocus}
                      blocksExpanded={expandedBlocksColumns.has(column.id)}
                      onToggleBlocksExpanded={toggleBlocksExpanded}
                      isSelectedForCompare={columnsSelectedForCompare.has(column.id)}
                      onToggleCompare={toggleCompareColumn}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Output Column - Right side (only show when at least one block section is expanded) */}
          {expandedBlocksColumns.size > 0 && (
            <div className="h-full min-h-0 w-[360px] flex-shrink-0">
              <OutputColumn
                selectedBlocks={selectedBlocks}
                onClear={clearOutput}
                onReorder={reorderSelectedBlocks}
                onAddBlock={addBlockFromDrop}
                onOpenPreview={openPreview}
              />
            </div>
          )}

          {/* Preview Column - After Output */}
          {previewText !== null && (
            <div className="h-full min-h-0 w-[420px] flex-shrink-0">
              <PreviewColumn text={previewText} onClose={closePreview} />
            </div>
          )}
        </div>

        <div className="text-center text-sm text-gray-500 flex-shrink-0">
          <p>Paste text in columns • Use double line breaks to create blocks • Select blocks to assemble your document • <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400 text-xs">{formatShortcut(getShortcut('quickTags'))}</kbd> for quick tags</p>
        </div>
      </div>

      {/* Tags Overlay */}
      {showTagsOverlay && (
        <TagsOverlay
          onClose={() => setShowTagsOverlay(false)}
          onInsertTag={insertTag}
          onInsertInstruction={insertInstruction}
        />
      )}

      {/* Save to Project Modal */}
      <SaveToProjectModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        workspaceState={getWorkspaceState()}
        initialTitle={documentTitle}
        onSave={(projectId, text) => {
          setLastSavedRef({ projectId, textId: text.id, title: text.title })
          setDocumentTitle(text.title) // Update document title to match saved title
          setHasUnsavedChanges(false)
        }}
      />

      {/* Projects Modal */}
      <ProjectsModal
        isOpen={showProjectsModal}
        onClose={() => setShowProjectsModal(false)}
        onLoadWorkspace={(projectId, text) => {
          if (text.state) {
            restoreWorkspaceState(text.state)
            setLastSavedRef({ projectId, textId: text.id, title: text.title })
            setDocumentTitle(text.title) // Update document title to match loaded text
            setHasUnsavedChanges(false) // Reset since we just loaded
          }
        }}
      />

      {/* Compare Columns Modal */}
      <CompareColumnsModal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        columns={getCompareColumns()}
        onApplyChanges={handleApplyCompareChanges}
      />

      {/* Selection Toolbar */}
      {selectionToolbar.visible && (
        <SelectionToolbar
          ref={selectionToolbarRef}
          position={selectionToolbar.position}
          selectedText={selectionToolbar.text}
          onAction={handleToolbarAction}
        />
      )}

      {/* Main Chatbot Panel */}
      <ChatbotPanel
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        initialInput={chatbotInput}
        onInputChange={setChatbotInput}
        initialContextAddition={chatbotContextAddition}
        onContextAdditionHandled={() => setChatbotContextAddition('')}
        onOpenSettings={onOpenSettings}
        onBranch={handleCreateBranch}
        clearOnOpen={clearChatOnOpen}
        onClearOnOpenHandled={() => setClearChatOnOpen(false)}
      />

      {/* Branch Panels */}
      {branches.map((branch, index) => (
        <ChatbotPanel
          key={branch.id}
          isOpen={true}
          onClose={() => handleCloseBranch(branch.id)}
          isBranch={true}
          branchId={branch.id}
          branchIndex={index}
          initialMessages={branch.messages}
          onCopyToMain={handleCopyToMain}
          onOpenSettings={onOpenSettings}
        />
      ))}

      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-xl font-bold text-gray-100 mb-3">Unsaved Changes</h2>
            <p className="text-gray-400 mb-6">
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={cancelNavigation}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleSaveToProject()
                  cancelNavigation()
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button
                onClick={confirmNavigation}
                variant="ghost"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Leave without saving
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
