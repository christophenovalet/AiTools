import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { User, Bot, Copy, Check, Pencil, FileText, Image, Globe, ExternalLink, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ChatbotMessage({ message, isStreaming = false, onEdit, onDelete }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleEdit = () => {
    onEdit?.(message)
  }

  return (
    <div
      className={cn(
        'group flex gap-3 p-4 rounded-lg relative',
        isUser ? 'bg-cyan-900/20 ml-8' : 'bg-gray-800/50 mr-8'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-cyan-600' : 'bg-gray-600'
        )}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-400 mb-2">
          {isUser ? 'You' : 'AI Assistant'}
        </div>

        {/* Attachments display for user messages */}
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map((att, idx) => (
              <div
                key={att.id || idx}
                className="rounded-lg border border-gray-600 overflow-hidden bg-gray-800"
              >
                {att.type === 'image' && att.preview ? (
                  <img
                    src={att.preview}
                    alt={att.name}
                    className="max-w-[200px] max-h-[200px] object-contain cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      // Open image in new tab
                      window.open(att.preview, '_blank')
                    }}
                  />
                ) : att.type === 'image' ? (
                  <div className="w-[100px] h-[100px] flex flex-col items-center justify-center p-2">
                    <Image className="w-8 h-8 text-cyan-400" />
                    <span className="text-[10px] text-gray-400 truncate w-full text-center mt-1">
                      {att.name}
                    </span>
                  </div>
                ) : (
                  <div className="w-[100px] h-[80px] flex flex-col items-center justify-center p-2">
                    <FileText className="w-8 h-8 text-red-400" />
                    <span className="text-[10px] text-gray-400 truncate w-full text-center mt-1">
                      {att.name}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {isUser ? (
          <div className="text-gray-200 whitespace-pre-wrap break-words">
            {message.content}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Error Indicator */}
            {message.isError && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>An error occurred</span>
              </div>
            )}

            {/* Web Search Indicator */}
            {message.isSearching && (
              <div className="flex items-center gap-2 text-cyan-400 text-sm bg-cyan-900/20 px-3 py-2 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching the web...</span>
              </div>
            )}

            {/* Web Search Results */}
            {message.searchResults && message.searchResults.length > 0 && (
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Sources ({message.searchResults.length})</span>
                </div>
                <div className="space-y-2">
                  {message.searchResults.slice(0, 5).map((result, idx) => (
                    <a
                      key={idx}
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 text-sm hover:bg-gray-800/50 p-2 rounded-md transition-colors group"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0 group-hover:text-cyan-400" />
                      <div className="min-w-0 flex-1">
                        <div className="text-cyan-400 truncate group-hover:underline">
                          {result.title || result.url}
                        </div>
                        <div className="text-gray-500 text-xs truncate">
                          {result.url}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Message Content */}
            <div className="text-gray-200 prose prose-invert prose-sm max-w-none break-words
              prose-headings:text-gray-100 prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
              prose-p:my-2 prose-p:leading-relaxed
              prose-code:text-cyan-300 prose-code:bg-gray-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-code:break-all
              prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700 prose-pre:rounded-lg prose-pre:my-3 prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:overflow-x-auto
              prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
              prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-100
              prose-blockquote:border-l-cyan-500 prose-blockquote:text-gray-300">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-5 bg-cyan-400 ml-1 animate-pulse align-middle" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons - visible on hover */}
      {!isStreaming && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-700"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-700"
            onClick={handleEdit}
            title="Edit message"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-red-400 hover:bg-gray-700"
            onClick={() => onDelete?.(message)}
            title="Delete message"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
