import React, { useState, useRef, useEffect, useCallback } from 'react'
import { X, Minus, Maximize2, GripHorizontal, Trash2, ChevronRight, Key, GitBranch, ArrowUpToLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatbotMessage } from './ChatbotMessage'
import { ChatbotInput } from './ChatbotInput'
import { sendMessage, getModels, getDefaultModel, hasApiKey, getModelPricing } from '@/lib/claude-api'
import { getShortcut, matchesShortcut, formatShortcut } from '@/lib/keyboard-shortcuts'

const MODEL_ORDER = ['haiku', 'sonnet', 'opus']
const MODEL_COLORS = {
  haiku: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  sonnet: 'bg-cyan-600 hover:bg-cyan-500 text-white',
  opus: 'bg-violet-600 hover:bg-violet-500 text-white'
}

function calculateCost(inputTokens, outputTokens, model) {
  const pricing = getModelPricing()
  const modelPricing = pricing[model] || pricing.sonnet
  const inputCost = (inputTokens / 1_000_000) * modelPricing.input
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output
  return inputCost + outputCost
}

const MIN_WIDTH = 400
const MIN_HEIGHT = 400

export function ChatbotPanel({
  isOpen,
  onClose,
  initialInput = '',
  onInputChange,
  // Context addition from AI tools (for caching large reference data)
  initialContextAddition = '',
  onContextAdditionHandled,
  onOpenSettings,
  // Branch-related props
  isBranch = false,
  branchId = null,
  branchIndex = 0,
  initialMessages = null,
  onCopyToMain,
  onBranch,
  // Clear conversation on open (for AI tools)
  clearOnOpen = false,
  onClearOnOpenHandled
}) {
  const [apiKeyPresent, setApiKeyPresent] = useState(hasApiKey())

  // Check for API key periodically (in case user returns from settings)
  useEffect(() => {
    const checkApiKey = () => setApiKeyPresent(hasApiKey())
    checkApiKey()
    const interval = setInterval(checkApiKey, 3000)
    return () => clearInterval(interval)
  }, [])
  const [messages, setMessages] = useState(() => {
    // For branches, use initialMessages; for main, try localStorage
    if (isBranch && initialMessages) {
      return initialMessages
    }
    return []
  })
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [context, setContext] = useState(() => {
    return localStorage.getItem('chatbot-context') || ''
  })
  const [totalUsage, setTotalUsage] = useState({ inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 })
  const [currentModel, setCurrentModel] = useState(() => {
    const stored = localStorage.getItem('chatbot-model')
    return stored && MODEL_ORDER.includes(stored) ? stored : getDefaultModel()
  })

  const models = getModels()

  // Persist model selection
  useEffect(() => {
    localStorage.setItem('chatbot-model', currentModel)
  }, [currentModel])

  // Persist context
  useEffect(() => {
    localStorage.setItem('chatbot-context', context)
  }, [context])

  const cycleModel = useCallback(() => {
    setCurrentModel(prev => {
      const currentIdx = MODEL_ORDER.indexOf(prev)
      const nextIdx = (currentIdx + 1) % MODEL_ORDER.length
      return MODEL_ORDER[nextIdx]
    })
  }, [])

  const [position, setPosition] = useState({ x: null, y: null })
  const [size, setSize] = useState(() => ({
    width: Math.max(MIN_WIDTH, Math.floor(window.innerWidth * 0.5)),
    height: Math.floor(window.innerHeight - 40)
  }))

  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState(null)

  const panelRef = useRef(null)
  const messagesRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Set initial input when opened with prefilled text
  useEffect(() => {
    if (initialInput && isOpen) {
      setInput(initialInput)
      onInputChange?.('')
    }
  }, [initialInput, isOpen, onInputChange])

  // Clear conversation when clearOnOpen is triggered (for AI tools)
  useEffect(() => {
    if (clearOnOpen && isOpen) {
      setMessages([])
      setEditingMessageId(null)
      setTotalUsage({ inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 })
      localStorage.removeItem('chatbot-messages')
      onClearOnOpenHandled?.()
    }
  }, [clearOnOpen, isOpen, onClearOnOpenHandled])

  // Handle context addition from AI tools (prepend to context for caching)
  useEffect(() => {
    if (initialContextAddition && isOpen) {
      setContext(prev => {
        // Prepend the new context addition (it will be cached)
        const newContext = prev
          ? `${initialContextAddition}\n\n${prev}`
          : initialContextAddition
        return newContext
      })
      onContextAdditionHandled?.()
    }
  }, [initialContextAddition, isOpen, onContextAdditionHandled])

  // Initialize position on first open - always right side, full height
  // Branch panels are offset to the left of the main panel
  useEffect(() => {
    if (isOpen && position.x === null) {
      const width = isBranch
        ? Math.max(MIN_WIDTH, Math.floor(window.innerWidth * 0.35))
        : Math.max(MIN_WIDTH, Math.floor(window.innerWidth * 0.5))
      const height = window.innerHeight - 40
      setSize({ width, height })

      if (isBranch) {
        // Position branches to the left of the main panel, stacking them
        const mainPanelWidth = Math.floor(window.innerWidth * 0.5)
        const branchOffset = (branchIndex + 1) * (width + 10)
        const xPos = Math.max(10, window.innerWidth - mainPanelWidth - branchOffset)
        setPosition({
          x: xPos,
          y: 20
        })
      } else {
        setPosition({
          x: window.innerWidth - width,
          y: 20
        })
      }
    }
  }, [isOpen, position.x, isBranch, branchIndex])

  // Load messages from localStorage (only for main panel, not branches)
  useEffect(() => {
    if (isBranch) return // Branches don't persist
    const stored = localStorage.getItem('chatbot-messages')
    if (stored) {
      try {
        setMessages(JSON.parse(stored))
      } catch (e) {
        // ignore
      }
    }
  }, [isBranch])

  // Save messages to localStorage (only for main panel, not branches)
  useEffect(() => {
    if (isBranch) return // Branches don't persist
    if (messages.length > 0) {
      localStorage.setItem('chatbot-messages', JSON.stringify(messages))
    }
  }, [messages, isBranch])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages])

  // Keyboard shortcut: Clear conversation (customizable)
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      const clearChatShortcut = getShortcut('clearChat')
      if (matchesShortcut(e, clearChatShortcut)) {
        e.preventDefault()
        clearMessages()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Handle drag
  const handleMouseDown = (e) => {
    if (e.target.closest('.chatbot-drag-handle')) {
      setIsDragging(true)
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
      e.preventDefault()
    }
  }

  // Handle resize
  const handleResizeMouseDown = (e, corner) => {
    e.stopPropagation()
    setIsResizing(corner)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y
    })
    e.preventDefault()
  }

  // Global mouse move/up handlers
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragOffset.x))
        const newY = Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragOffset.y))
        setPosition({ x: newX, y: newY })
      }

      if (isResizing && resizeStart) {
        const dx = e.clientX - resizeStart.x
        const dy = e.clientY - resizeStart.y
        const maxHeight = Math.floor(window.innerHeight * 0.9)

        let newWidth = resizeStart.width
        let newHeight = resizeStart.height
        let newX = resizeStart.posX
        let newY = resizeStart.posY

        if (isResizing.includes('e')) {
          newWidth = Math.max(MIN_WIDTH, resizeStart.width + dx)
        }
        if (isResizing.includes('w')) {
          newWidth = Math.max(MIN_WIDTH, resizeStart.width - dx)
          newX = resizeStart.posX + (resizeStart.width - newWidth)
        }
        if (isResizing.includes('s')) {
          newHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, resizeStart.height + dy))
        }
        if (isResizing.includes('n')) {
          newHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, resizeStart.height - dy))
          newY = resizeStart.posY + (resizeStart.height - newHeight)
        }

        setSize({ width: newWidth, height: newHeight })
        setPosition({ x: newX, y: newY })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(null)
      setResizeStart(null)
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, dragOffset, resizeStart, size.width, size.height])

  const handleAddAttachment = useCallback((attachment) => {
    setAttachments(prev => [...prev, attachment])
  }, [])

  const handleRemoveAttachment = useCallback((id) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }, [])

  const handleUpdateAttachment = useCallback((id, updates) => {
    setAttachments(prev => prev.map(a =>
      a.id === id ? { ...a, ...updates } : a
    ))
  }, [])

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming) return

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      timestamp: Date.now()
    }

    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    }

    let conversationMessages
    if (editingMessageId) {
      // Find the index of the message being edited
      const editIdx = messages.findIndex(m => m.id === editingMessageId)
      // Keep messages before the edited one, add new user message
      const previousMessages = messages.slice(0, editIdx)
      conversationMessages = [...previousMessages, userMessage]
      setMessages([...previousMessages, userMessage, assistantMessage])
      setEditingMessageId(null)
    } else {
      conversationMessages = [...messages, userMessage]
      setMessages(prev => [...prev, userMessage, assistantMessage])
    }

    setInput('')
    setAttachments([])
    setIsStreaming(true)

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController()

    await sendMessage(
      conversationMessages,
      (chunk) => {
        setMessages(prev => {
          const newMessages = [...prev]
          const lastIdx = newMessages.length - 1
          newMessages[lastIdx] = {
            ...newMessages[lastIdx],
            content: newMessages[lastIdx].content + chunk
          }
          return newMessages
        })
      },
      (searchResults) => {
        // Update final message with search results if any
        if (searchResults && searchResults.length > 0) {
          setMessages(prev => {
            const newMessages = [...prev]
            const lastIdx = newMessages.length - 1
            newMessages[lastIdx] = {
              ...newMessages[lastIdx],
              searchResults
            }
            return newMessages
          })
        }
        setIsStreaming(false)
        setIsSearching(false)
      },
      (error) => {
        setMessages(prev => {
          const newMessages = [...prev]
          const lastIdx = newMessages.length - 1
          newMessages[lastIdx] = {
            ...newMessages[lastIdx],
            content: `Error: ${error.message}`,
            isError: true
          }
          return newMessages
        })
        setIsStreaming(false)
        setIsSearching(false)
      },
      () => {
        // onSearchStart
        setIsSearching(true)
        setMessages(prev => {
          const newMessages = [...prev]
          const lastIdx = newMessages.length - 1
          newMessages[lastIdx] = {
            ...newMessages[lastIdx],
            isSearching: true
          }
          return newMessages
        })
      },
      (searchResults) => {
        // onSearchResult - update message with results
        setIsSearching(false)
        setMessages(prev => {
          const newMessages = [...prev]
          const lastIdx = newMessages.length - 1
          newMessages[lastIdx] = {
            ...newMessages[lastIdx],
            isSearching: false,
            searchResults
          }
          return newMessages
        })
      },
      currentModel,
      context,
      (usage) => {
        // Update total usage including cache metrics
        setTotalUsage(prev => ({
          inputTokens: prev.inputTokens + (usage.input_tokens || 0),
          outputTokens: prev.outputTokens + (usage.output_tokens || 0),
          cacheCreationTokens: prev.cacheCreationTokens + (usage.cache_creation_input_tokens || 0),
          cacheReadTokens: prev.cacheReadTokens + (usage.cache_read_input_tokens || 0)
        }))
      },
      abortControllerRef.current?.signal
    )
  }, [input, isStreaming, messages, editingMessageId, attachments, currentModel, context])

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setIsSearching(false)
  }, [])

  const clearMessages = () => {
    setMessages([])
    setEditingMessageId(null)
    setTotalUsage({ inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 })
    localStorage.removeItem('chatbot-messages')
  }

  // Handle close button - clears conversation (minimize preserves state)
  const handleClose = () => {
    clearMessages()
    onClose()
  }

  const handleEditMessage = useCallback((message) => {
    setInput(message.content)
    setEditingMessageId(message.id)
  }, [])

  const handleDeleteMessage = useCallback((message) => {
    const msgIndex = messages.findIndex(m => m.id === message.id)
    if (msgIndex === -1) return

    // If deleting a user message, also delete the following assistant response
    if (message.role === 'user' && messages[msgIndex + 1]?.role === 'assistant') {
      setMessages(prev => prev.filter((_, i) => i !== msgIndex && i !== msgIndex + 1))
    }
    // If deleting an assistant message, also delete the preceding user message
    else if (message.role === 'assistant' && messages[msgIndex - 1]?.role === 'user') {
      setMessages(prev => prev.filter((_, i) => i !== msgIndex && i !== msgIndex - 1))
    }
    else {
      setMessages(prev => prev.filter(m => m.id !== message.id))
    }
  }, [messages])

  // Handle branching from a message
  const handleBranchFromMessage = useCallback((message) => {
    if (!onBranch) return
    // Find the index of the message and get all messages up to and including it
    const msgIndex = messages.findIndex(m => m.id === message.id)
    if (msgIndex === -1) return
    const branchMessages = messages.slice(0, msgIndex + 1)
    onBranch(branchMessages)
  }, [messages, onBranch])

  // Handle copying last assistant response to main
  const handleCopyToMain = useCallback(() => {
    if (!onCopyToMain) return
    // Find the last assistant message
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')
    if (lastAssistantMsg && lastAssistantMsg.content) {
      onCopyToMain(lastAssistantMsg.content, branchId)
    }
  }, [messages, onCopyToMain, branchId])

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className={`fixed z-50 bg-[#1a1a1a] border rounded-xl shadow-2xl flex flex-col overflow-hidden ${
        isBranch ? 'border-purple-600' : 'border-gray-700'
      }`}
      style={{
        left: position.x ?? 'auto',
        top: position.y ?? 'auto',
        right: position.x === null ? 20 : 'auto',
        bottom: position.y === null ? 20 : 'auto',
        width: size.width,
        height: isMinimized ? 48 : size.height
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className={`chatbot-drag-handle flex items-center justify-between px-3 py-2 border-b cursor-move select-none ${
        isBranch ? 'border-purple-700 bg-purple-900/30' : 'border-gray-700 bg-gray-800/50'
      }`}>
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-gray-500" />
          {isBranch && <GitBranch className="w-4 h-4 text-purple-400" />}
          <span className={`font-semibold text-sm ${isBranch ? 'text-purple-200' : 'text-gray-100'}`}>
            {isBranch ? 'AI Assistant Branch' : 'AI Assistant'}
          </span>
          <span className="text-gray-600 text-sm">·</span>
          {/* Model Selector */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              cycleModel()
            }}
            disabled={isStreaming}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition-all ${MODEL_COLORS[currentModel]} ${isStreaming ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={`${models[currentModel]?.name}: ${models[currentModel]?.description} (click to switch)`}
          >
            <span>{models[currentModel]?.name}</span>
            <ChevronRight className="w-3 h-3 opacity-60" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-red-400"
            onClick={clearMessages}
            title="Clear conversation (Ctrl+Shift+K)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white"
            onClick={handleClose}
            title="Close and clear conversation"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div
            ref={messagesRef}
            className="flex-1 overflow-y-auto p-3 space-y-3"
          >
            {!apiKeyPresent ? (
              <div className="flex-1 flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Key className="w-8 h-8 text-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-300 font-medium">API Key Required</p>
                    <p className="text-gray-500 text-sm max-w-xs">
                      Configure your Claude API key to start chatting with AI
                    </p>
                  </div>
                  <Button
                    onClick={onOpenSettings}
                    className="bg-amber-600 hover:bg-amber-500 text-white"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Configure API Key
                  </Button>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                Start a conversation with AI
              </div>
            ) : (
              messages.map((msg, idx) => (
                <ChatbotMessage
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
                  onEdit={handleEditMessage}
                  onDelete={handleDeleteMessage}
                  onBranch={handleBranchFromMessage}
                  showBranch={!isBranch} // Hide branch button in branch panels
                />
              ))
            )}
          </div>

          {/* Copy to Main button for branch panels */}
          {isBranch && messages.some(m => m.role === 'assistant' && m.content) && (
            <div className="px-3 py-2 border-t border-purple-700/50 bg-purple-900/20">
              <Button
                onClick={handleCopyToMain}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium"
                disabled={isStreaming}
              >
                <ArrowUpToLine className="w-4 h-4 mr-2" />
                Copy to Main
              </Button>
              <p className="text-xs text-purple-300/60 text-center mt-1">
                Adds the last response to main chat as context
              </p>
            </div>
          )}

          {/* Input */}
          <ChatbotInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onStop={handleStop}
            isStreaming={isStreaming}
            isEditing={!!editingMessageId}
            onCancelEdit={() => {
              setEditingMessageId(null)
              setInput('')
              setAttachments([])
            }}
            attachments={attachments}
            onAddAttachment={handleAddAttachment}
            onRemoveAttachment={handleRemoveAttachment}
            onUpdateAttachment={handleUpdateAttachment}
            context={context}
            onContextChange={setContext}
          />

          {/* Footer with cost and shortcut hint */}
          <div className="px-3 py-1.5 border-t border-gray-700/50 bg-gray-900/30 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              {(totalUsage.inputTokens > 0 || totalUsage.outputTokens > 0) && (
                <span title={`Input: ${totalUsage.inputTokens.toLocaleString()} | Output: ${totalUsage.outputTokens.toLocaleString()}${totalUsage.cacheReadTokens > 0 ? ` | Cache read: ${totalUsage.cacheReadTokens.toLocaleString()}` : ''}${totalUsage.cacheCreationTokens > 0 ? ` | Cache write: ${totalUsage.cacheCreationTokens.toLocaleString()}` : ''}`}>
                  Cost: ${calculateCost(totalUsage.inputTokens, totalUsage.outputTokens, currentModel).toFixed(4)}
                </span>
              )}
              {(totalUsage.inputTokens > 0 || totalUsage.outputTokens > 0) && (
                <span className="text-gray-600">
                  {(totalUsage.inputTokens + totalUsage.outputTokens).toLocaleString()} tokens
                </span>
              )}
              {totalUsage.cacheReadTokens > 0 && (
                <span className="text-green-500" title={`${totalUsage.cacheReadTokens.toLocaleString()} tokens read from cache (90% savings)`}>
                  ⚡ cached
                </span>
              )}
            </div>
            <span>
              <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">{formatShortcut(getShortcut('clearChat'))}</kbd> clear
            </span>
          </div>
        </>
      )}

      {/* Resize handles */}
      {!isMinimized && (
        <>
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
          />
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
          />
          <div
            className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
          />
          <div
            className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
          />
          <div
            className="absolute right-0 top-4 bottom-4 w-2 cursor-e-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
          />
          <div
            className="absolute left-0 top-4 bottom-4 w-2 cursor-w-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
          />
          <div
            className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 's')}
          />
        </>
      )}
    </div>
  )
}
