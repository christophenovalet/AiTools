import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Square, X, Pencil, Paperclip, FileText, FileCode } from 'lucide-react'
import { ImageAnnotator } from './ImageAnnotator'

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const SUPPORTED_DOC_TYPES = ['application/pdf']

export function ChatbotInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  isEditing,
  onCancelEdit,
  attachments = [],
  onAddAttachment,
  onRemoveAttachment,
  onUpdateAttachment,
  context = '',
  onContextChange
}) {
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const [isContextOpen, setIsContextOpen] = useState(false)
  const contextTextareaRef = useRef(null)
  const [annotatingAttachment, setAnnotatingAttachment] = useState(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [value])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  const processFile = async (file) => {
    if (!file) return null

    const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type)
    const isDoc = SUPPORTED_DOC_TYPES.includes(file.type)

    if (!isImage && !isDoc) {
      alert(`Unsupported file type: ${file.type}\n\nSupported: JPEG, PNG, GIF, WebP images and PDF documents.`)
      return null
    }

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target.result.split(',')[1]
        resolve({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: isImage ? 'image' : 'document',
          mediaType: file.type,
          data: base64,
          name: file.name,
          preview: isImage ? e.target.result : null
        })
      }
      reader.readAsDataURL(file)
    })
  }

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          const attachment = await processFile(file)
          if (attachment) {
            onAddAttachment?.(attachment)
          }
        }
      }
    }
  }

  const handleFileSelect = async (e) => {
    const files = e.target.files
    if (!files) return

    for (const file of files) {
      const attachment = await processFile(file)
      if (attachment) {
        onAddAttachment?.(attachment)
      }
    }

    // Reset input so the same file can be selected again
    e.target.value = ''
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if ((value.trim() || attachments.length > 0) && !isStreaming) {
        onSend()
      }
    }
    if (e.key === 'Escape' && isEditing) {
      onCancelEdit?.()
    }
  }

  const handleImageClick = useCallback((attachment) => {
    if (attachment.type === 'image') {
      setAnnotatingAttachment(attachment)
    }
  }, [])

  const handleAnnotationSave = useCallback(({ data, preview }) => {
    if (annotatingAttachment) {
      onUpdateAttachment?.(annotatingAttachment.id, {
        data,
        preview
      })
    }
    setAnnotatingAttachment(null)
  }, [annotatingAttachment, onUpdateAttachment])

  const canSend = (value.trim() || attachments.length > 0) && !isStreaming

  return (
    <div className="border-t border-gray-700 p-3">
      {/* Context Pane - slides above input */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isContextOpen ? 'max-h-48 mb-3' : 'max-h-0'
        }`}
      >
        <div className="bg-gray-800/50 rounded-lg border border-gray-600 p-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-purple-400" />
              Context (added to system prompt)
            </span>
            <span className="text-xs text-gray-500">
              {context.length > 0 ? `${context.length} chars` : ''}
            </span>
          </div>
          <textarea
            ref={contextTextareaRef}
            value={context}
            onChange={(e) => onContextChange?.(e.target.value)}
            placeholder="Paste context here (documentation, code, data...). This will be cached for faster follow-up messages."
            className="w-full h-28 resize-none rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {isEditing && (
        <div className="flex items-center gap-2 mb-2 text-xs text-amber-400">
          <Pencil className="w-3 h-3" />
          <span>Editing message - conversation will continue from this point</span>
          <button
            onClick={onCancelEdit}
            className="ml-auto text-gray-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative group bg-gray-800 rounded-lg border border-gray-600 overflow-hidden"
            >
              {att.type === 'image' && att.preview ? (
                <button
                  type="button"
                  onClick={() => handleImageClick(att)}
                  className="relative w-16 h-16 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                  title="Click to annotate image"
                >
                  <img
                    src={att.preview}
                    alt={att.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Annotation hint overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Pencil className="w-5 h-5 text-white" />
                  </div>
                </button>
              ) : (
                <div className="w-16 h-16 flex flex-col items-center justify-center p-1">
                  <FileText className="w-6 h-6 text-red-400" />
                  <span className="text-[10px] text-gray-400 truncate w-full text-center mt-1">
                    {att.name.length > 10 ? att.name.slice(0, 8) + '...' : att.name}
                  </span>
                </div>
              )}
              <button
                onClick={() => onRemoveAttachment?.(att.id)}
                className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Context button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-10 w-10 flex-shrink-0 transition-colors ${
            isContextOpen
              ? 'text-purple-400 bg-purple-500/10 hover:bg-purple-500/20'
              : context.length > 0
              ? 'text-purple-400 hover:text-purple-300 hover:bg-gray-700'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
          onClick={() => setIsContextOpen(!isContextOpen)}
          title={isContextOpen ? 'Hide context' : 'Add context'}
        >
          <div className="relative">
            <FileCode className="w-4 h-4" />
            {context.length > 0 && !isContextOpen && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full" />
            )}
          </div>
        </Button>

        {/* Attach button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-gray-400 hover:text-white hover:bg-gray-700 flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          title="Attach image or PDF"
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={isEditing ? "Edit your message..." : "Type a message or paste an image..."}
          disabled={isStreaming}
          className={`flex-1 min-h-[40px] max-h-[120px] resize-none rounded-lg border px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 ${
            isEditing
              ? 'border-amber-500 bg-amber-900/20 focus:ring-amber-500'
              : 'border-gray-600 bg-gray-800 focus:ring-cyan-500'
          }`}
          rows={1}
        />
        {isStreaming ? (
          <Button
            onClick={onStop}
            size="icon"
            className="h-10 w-10 text-white bg-red-600 hover:bg-red-500"
            title="Stop streaming"
          >
            <Square className="w-4 h-4 fill-current" />
          </Button>
        ) : (
          <Button
            onClick={onSend}
            disabled={!canSend}
            size="icon"
            className={`h-10 w-10 text-white ${
              isEditing
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-cyan-600 hover:bg-cyan-500'
            }`}
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {isEditing
          ? 'Press Enter to resend, Escape to cancel'
          : 'Enter to send, Shift+Enter for new line, paste or attach images/PDFs'}
      </div>

      {/* Image Annotator Dialog */}
      <ImageAnnotator
        isOpen={!!annotatingAttachment}
        onClose={() => setAnnotatingAttachment(null)}
        imageData={annotatingAttachment?.preview}
        imageName={annotatingAttachment?.name}
        onSave={handleAnnotationSave}
      />
    </div>
  )
}
