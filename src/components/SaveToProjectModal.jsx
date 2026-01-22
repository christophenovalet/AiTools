import React, { useState, useEffect } from 'react'
import { X, Check, Plus, Folder, FolderOpen, Star, ChevronDown, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { projectsApi, textsApi, isAuthenticated } from '@/lib/api'

const PROJECT_COLORS = {
  purple: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400' },
  cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-400' },
  green: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
  orange: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400' },
  blue: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
  pink: { bg: 'bg-pink-500/20', border: 'border-pink-500', text: 'text-pink-400' },
  yellow: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400' },
}

export function SaveToProjectModal({ isOpen, onClose, workspaceState, onSave, initialTitle = '' }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectColor, setNewProjectColor] = useState('purple')
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)

  // Load projects from API when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProjects()
    }
  }, [isOpen])

  // Set initial title when modal opens, reset when closes
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle)
    } else {
      setTitle('')
      setDescription('')
      setTagsInput('')
      setIsFavorite(false)
      setIsCreatingProject(false)
      setNewProjectName('')
      setError(null)
    }
  }, [isOpen, initialTitle])

  const loadProjects = async () => {
    if (!isAuthenticated()) {
      setProjects([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await projectsApi.list()
      setProjects(data || [])
      if (data?.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to load projects:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    try {
      setSaving(true)
      setError(null)
      const newProject = await projectsApi.create(newProjectName.trim(), newProjectColor)
      setProjects([...projects, newProject])
      setSelectedProjectId(newProject.id)
      setIsCreatingProject(false)
      setNewProjectName('')
    } catch (err) {
      console.error('Failed to create project:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!selectedProjectId || !title.trim()) return

    try {
      setSaving(true)
      setError(null)

      const { text, project } = await textsApi.create(selectedProjectId, {
        title: title.trim(),
        state: workspaceState,
        description: description.trim(),
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
        isFavorite
      })

      // Update local projects list with the updated project
      setProjects(projects.map(p => p.id === selectedProjectId ? project : p))

      onSave?.(selectedProjectId, text)
      onClose()
    } catch (err) {
      console.error('Failed to save text:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1a1a1a] border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">Save to Project</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-4 mt-4 p-2 bg-red-500/20 text-red-400 text-sm rounded">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this text..."
              className="w-full bg-[#0a0a0a] text-gray-100 border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
              autoFocus
            />
          </div>

          {/* Project Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Project</label>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading projects...</span>
              </div>
            ) : isCreatingProject ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="New project name..."
                  className="w-full bg-[#0a0a0a] text-gray-100 border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateProject()
                    if (e.key === 'Escape') setIsCreatingProject(false)
                  }}
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Color:</span>
                  <div className="flex gap-1">
                    {Object.keys(PROJECT_COLORS).map(color => (
                      <button
                        key={color}
                        onClick={() => setNewProjectColor(color)}
                        className={`w-6 h-6 rounded-full ${PROJECT_COLORS[color].bg} ${PROJECT_COLORS[color].border} border-2 transition-transform ${
                          newProjectColor === color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateProject}
                    disabled={saving}
                    size="sm"
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                    Create
                  </Button>
                  <Button
                    onClick={() => setIsCreatingProject(false)}
                    size="sm"
                    variant="ghost"
                    className="text-gray-400"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className="w-full flex items-center justify-between bg-[#0a0a0a] text-gray-100 border border-gray-700 rounded-lg px-3 py-2 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {selectedProject ? (
                      <>
                        <FolderOpen className={`w-4 h-4 ${PROJECT_COLORS[selectedProject.color]?.text || 'text-purple-400'}`} />
                        <span>{selectedProject.name}</span>
                      </>
                    ) : (
                      <>
                        <Folder className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-500">Select a project...</span>
                      </>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showProjectDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a0a] border border-gray-700 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                    {projects.map(project => {
                      const colors = PROJECT_COLORS[project.color] || PROJECT_COLORS.purple
                      return (
                        <button
                          key={project.id}
                          onClick={() => {
                            setSelectedProjectId(project.id)
                            setShowProjectDropdown(false)
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-800 transition-colors ${
                            selectedProjectId === project.id ? 'bg-gray-800' : ''
                          }`}
                        >
                          <FolderOpen className={`w-4 h-4 ${colors.text}`} />
                          <span className="text-gray-100">{project.name}</span>
                          <span className="text-xs text-gray-500 ml-auto">{(project.texts || []).length} texts</span>
                        </button>
                      )
                    })}
                    <hr className="border-gray-700" />
                    <button
                      onClick={() => {
                        setShowProjectDropdown(false)
                        setIsCreatingProject(true)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-emerald-400 hover:bg-gray-800 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create new project
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Tags</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Enter tags separated by commas..."
              className="w-full bg-[#0a0a0a] text-gray-100 border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
            />
            {tagsInput && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tagsInput.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={2}
              className="w-full bg-[#0a0a0a] text-gray-100 border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors resize-none"
            />
          </div>

          {/* Favorite Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-1 rounded transition-colors ${
                isFavorite ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              <Star className={`w-5 h-5 ${isFavorite ? 'fill-yellow-400' : ''}`} />
            </button>
            <span className="text-sm text-gray-400">Add to favorites</span>
          </label>

          {/* Preview */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Workspace Summary</label>
            <div className="bg-[#0a0a0a] border border-gray-700 rounded-lg p-3">
              <div className="text-xs text-gray-400 space-y-1">
                <p><span className="text-gray-500">Columns:</span> {workspaceState?.columns?.length || 0}</p>
                <p><span className="text-gray-500">Selected blocks:</span> {workspaceState?.selectedBlocks?.length || 0}</p>
                <p><span className="text-gray-500">Total content:</span> {workspaceState?.columns?.reduce((acc, c) => acc + (c.text?.length || 0), 0) || 0} chars</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700 bg-[#0a0a0a] rounded-b-xl">
          <Button
            onClick={onClose}
            variant="ghost"
            className="text-gray-400 hover:text-gray-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedProjectId || !title.trim() || saving}
            className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                Save to Project
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Quick Save Dropdown (for inline save button)
export function QuickSaveDropdown({ workspaceState, onSave, trigger }) {
  const [isOpen, setIsOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    if (isOpen && isAuthenticated()) {
      projectsApi.list().then(data => setProjects(data || [])).catch(console.error)
    }
  }, [isOpen])

  const handleQuickSave = async (projectId) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    try {
      setSaving(projectId)
      const { text } = await textsApi.create(projectId, {
        title: `Quick Save ${new Date().toLocaleString()}`,
        state: workspaceState,
        description: '',
        tags: [],
        isFavorite: false
      })

      onSave?.(projectId, text)
      setIsOpen(false)
    } catch (err) {
      console.error('Failed to quick save:', err)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="relative">
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-50 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl min-w-[180px] py-1">
            {projects.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500">
                No projects yet
              </div>
            ) : (
              projects.map(project => {
                const colors = PROJECT_COLORS[project.color] || PROJECT_COLORS.purple
                return (
                  <button
                    key={project.id}
                    onClick={() => handleQuickSave(project.id)}
                    disabled={saving === project.id}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {saving === project.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    ) : (
                      <FolderOpen className={`w-4 h-4 ${colors.text}`} />
                    )}
                    <span className="text-gray-100">{project.name}</span>
                  </button>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
