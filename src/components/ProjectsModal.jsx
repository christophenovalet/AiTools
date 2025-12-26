import React from 'react'
import { X } from 'lucide-react'
import { ProjectsLibrary } from './ProjectsLibrary'

export function ProjectsModal({ isOpen, onClose, onLoadWorkspace }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[90vw] h-[85vh] max-w-6xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 p-2 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
          <span className="sr-only">Close</span>
        </button>

        {/* Content */}
        <ProjectsLibrary
          onLoadWorkspace={(projectId, text) => {
            onLoadWorkspace?.(projectId, text)
            onClose()
          }}
        />
      </div>
    </div>
  )
}
