import React, { useRef, useImperativeHandle, forwardRef } from 'react'
import { Button } from '@/components/ui/button'
import { MessageSquare, LayoutTemplate, RefreshCw, Code2 } from 'lucide-react'
import { getMenuItems, formatTemplate } from '@/lib/claude-api'

export const SelectionToolbar = forwardRef(function SelectionToolbar({ position, selectedText, onAction }, ref) {
  const toolbarRef = useRef(null)
  const menuItems = getMenuItems()

  // Expose a method to check if an element is inside the toolbar
  useImperativeHandle(ref, () => ({
    contains: (element) => toolbarRef.current?.contains(element)
  }))

  const handleClick = (item) => {
    const formattedPrompt = formatTemplate(item.template, selectedText)
    onAction(formattedPrompt)
  }

  const getIcon = (id) => {
    switch (id) {
      case 'ask-ai':
        return <MessageSquare className="w-3.5 h-3.5 mr-1" />
      case 'ascii-mockup':
        return <LayoutTemplate className="w-3.5 h-3.5 mr-1" />
      case 'rewrite-for-ai':
        return <RefreshCw className="w-3.5 h-3.5 mr-1" />
      case 'xml-prompt':
        return <Code2 className="w-3.5 h-3.5 mr-1" />
      default:
        return null
    }
  }

  if (!position || !selectedText) return null

  return (
    <div
      ref={toolbarRef}
      className="fixed z-40 bg-[#1a1a1a] border border-gray-600 rounded-lg shadow-xl flex gap-1 p-1"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%)'
      }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {menuItems.map((item) => (
        <Button
          key={item.id}
          variant="ghost"
          size="sm"
          onClick={() => handleClick(item)}
          className="text-gray-300 hover:text-cyan-400 hover:bg-gray-700/50 h-7 px-2 text-xs"
        >
          {getIcon(item.id)}
          {item.label}
        </Button>
      ))}
    </div>
  )
})
