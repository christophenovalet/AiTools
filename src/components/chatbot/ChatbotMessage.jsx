import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { cn } from '@/lib/utils'
import { User, Bot, Copy, Check, Pencil, FileText, Image, Globe, ExternalLink, Loader2, AlertCircle, Trash2, GitBranch, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Custom code block component with copy button
function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false)
  const language = className?.replace('language-', '') || ''
  const code = String(children).replace(/\n$/, '')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group/code my-3">
      <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
        {language && (
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
            {language}
          </span>
        )}
        <button
          onClick={handleCopy}
          className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
          title="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="bg-black rounded-lg border border-gray-700 p-4 pt-3 overflow-x-auto">
        <code className="text-xs text-gray-200 font-mono">
          {code}
        </code>
      </pre>
    </div>
  )
}

export function ChatbotMessage({ message, isStreaming = false, onEdit, onDelete, onBranch, showBranch = true }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  const [copiedBottom, setCopiedBottom] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Get first line of content for collapsed view
  const getFirstLine = (content) => {
    if (!content) return ''
    const firstLine = content.split('\n')[0]
    const maxLength = 80
    if (firstLine.length > maxLength) {
      return firstLine.substring(0, maxLength) + '...'
    }
    return firstLine + (content.includes('\n') ? '...' : '')
  }

  const handleCopy = async (isBottom = false) => {
    await navigator.clipboard.writeText(message.content)
    if (isBottom) {
      setCopiedBottom(true)
      setTimeout(() => setCopiedBottom(false), 2000)
    } else {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleEdit = () => {
    onEdit?.(message)
  }

  // Reusable action buttons component
  const ActionButtons = ({ position = 'top' }) => {
    const isCopiedState = position === 'bottom' ? copiedBottom : copied
    const positionClasses = position === 'top'
      ? 'absolute top-2 right-2'
      : 'flex justify-end mt-2'

    return (
      <div className={`${positionClasses} flex gap-1 ${position === 'top' ? 'opacity-0 group-hover:opacity-100' : 'opacity-60 hover:opacity-100'} transition-opacity`}>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700"
          onClick={() => handleCopy(position === 'bottom')}
          title="Copy to clipboard"
        >
          {isCopiedState ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        </Button>
        {showBranch && onBranch && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-purple-400 hover:bg-gray-700"
            onClick={() => onBranch(message)}
            title="Branch conversation from here"
          >
            <GitBranch className="w-3 h-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700"
          onClick={handleEdit}
          title="Edit message"
        >
          <Pencil className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-400 hover:text-red-400 hover:bg-gray-700"
          onClick={() => onDelete?.(message)}
          title="Delete message"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-400 hover:text-cyan-400 hover:bg-gray-700"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand message" : "Collapse message"}
        >
          {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group flex gap-2 p-3 rounded-lg relative overflow-hidden',
        isUser ? 'bg-cyan-900/20 ml-6' : 'bg-gray-800/50 mr-6'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
          isUser ? 'bg-cyan-600' : 'bg-gray-600'
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-white" />
        )}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="text-xs text-gray-400 mb-1">
          {isUser ? 'You' : 'AI Assistant'}
        </div>

        {/* Attachments display for user messages */}
        {!isCollapsed && isUser && message.attachments && message.attachments.length > 0 && (
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

        {isCollapsed ? (
          <div
            className="text-sm text-gray-400 italic cursor-pointer hover:text-gray-300"
            onClick={() => setIsCollapsed(false)}
          >
            {getFirstLine(message.content)}
          </div>
        ) : isUser ? (
          <div className="text-sm text-gray-200 whitespace-pre-wrap break-words overflow-wrap-anywhere">
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
            <div className="text-sm text-gray-200 prose prose-invert prose-sm max-w-none break-words overflow-hidden
              prose-headings:text-gray-100 prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-3 prose-headings:text-sm
              prose-p:my-4 prose-p:leading-relaxed [&_p+p]:mt-5
              prose-ul:my-4 prose-ul:list-disc prose-ul:pl-5
              prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-5
              prose-li:my-1 prose-li:pl-1
              prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline prose-a:break-all
              prose-strong:text-gray-100
              prose-blockquote:border-l-cyan-500 prose-blockquote:text-gray-300 prose-blockquote:my-4
              [&_*]:max-w-full">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  code({ node, className, children, ...props }) {
                    // Check if it's a code block (has language class or contains newlines)
                    const isCodeBlock = className?.startsWith('language-') || String(children).includes('\n')
                    if (!isCodeBlock) {
                      return (
                        <code className="text-cyan-300 bg-gray-900 px-1 py-0.5 rounded text-xs" {...props}>
                          {children}
                        </code>
                      )
                    }
                    return <CodeBlock className={className}>{children}</CodeBlock>
                  },
                  pre({ children }) {
                    return <>{children}</>
                  },
                  p({ children }) {
                    return <p className="my-4">{children}</p>
                  },
                  br() {
                    return <span className="block h-4" />
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-cyan-400 ml-1 animate-pulse align-middle" />
              )}
            </div>
          </div>
        )}

        {/* Bottom action buttons */}
        {!isStreaming && !isCollapsed && message.content && (
          <ActionButtons position="bottom" />
        )}
      </div>

      {/* Top action buttons - visible on hover */}
      {!isStreaming && <ActionButtons position="top" />}
    </div>
  )
}
