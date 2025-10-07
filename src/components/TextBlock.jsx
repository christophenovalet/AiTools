import React from 'react'
import { Check } from 'lucide-react'

export function TextBlock({ block, isSelected, onToggle, columnColor }) {
  const handleDragStart = (e) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('application/json', JSON.stringify(block))
    // Fallback for environments that strip custom MIME types
    e.dataTransfer.setData('text/plain', JSON.stringify(block))
  }

  return (
    <div
      onClick={onToggle}
      draggable
      onDragStart={handleDragStart}
      className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected
          ? `${columnColor} border-opacity-100 shadow-lg`
          : 'bg-[#1a1a1a] border-gray-700 hover:border-gray-500'
      }`}
    >
      {isSelected && (
        <div className="absolute top-2 right-2">
          <Check className="w-5 h-5 text-white" />
        </div>
      )}
      <div className="text-gray-300 text-sm whitespace-pre-wrap pr-6">
        {block.text}
      </div>
    </div>
  )
}
