import React, { useState, useEffect } from 'react'
import {
  Plus, Copy, Trash2, Edit2, Check, X, Star, Search,
  FolderOpen, Folder, LayoutGrid, List, MoreHorizontal,
  ChevronRight, Clock, Tag, Heart
} from 'lucide-react'
import { Button } from './ui/button'
import projectsData from '@/data/projects.json'

const PROJECT_COLORS = {
  purple: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400' },
  cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-400' },
  green: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
  orange: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400' },
  blue: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
  pink: { bg: 'bg-pink-500/20', border: 'border-pink-500', text: 'text-pink-400' },
  yellow: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400' },
}

const STORAGE_KEY = 'textbuilder-projects'

export function ProjectsLibrary({ onLoadWorkspace }) {
  const [projects, setProjects] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : projectsData
  })

  const [activeProjectId, setActiveProjectId] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // grid | list
  const [searchFilter, setSearchFilter] = useState('')
  const [quickFilter, setQuickFilter] = useState('recent') // all | favorites | recent
  const [tagFilter, setTagFilter] = useState(null)
  const [isAddingProject, setIsAddingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectColor, setNewProjectColor] = useState('purple')
  const [editingProjectId, setEditingProjectId] = useState(null)
  const [editingTextId, setEditingTextId] = useState(null)
  const [showProjectMenu, setShowProjectMenu] = useState(null)

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  }, [projects])

  // Reload projects when sync completes (from another device)
  useEffect(() => {
    const handleSyncComplete = () => {
      console.log('Sync complete, reloading projects...')
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setProjects(parsed)
        } catch (e) {
          console.error('Failed to parse projects after sync:', e)
        }
      }
    }

    window.addEventListener('sync-complete', handleSyncComplete)
    return () => window.removeEventListener('sync-complete', handleSyncComplete)
  }, [])

  // Get active project
  const activeProject = (projects || []).find(p => p.id === activeProjectId)

  // Get all unique tags across all projects
  const allTags = [...new Set(
    (projects || []).flatMap(p => (p.texts || []).flatMap(t => t.tags || []))
  )].sort()

  // Get all texts (for favorites/recent views)
  const allTexts = (projects || []).flatMap(p =>
    (p.texts || []).map(t => ({ ...t, projectId: p.id, projectName: p.name, projectColor: p.color }))
  )

  // Filter texts based on current view
  const getFilteredTexts = () => {
    let texts = []

    if (quickFilter === 'favorites') {
      texts = allTexts.filter(t => t.isFavorite)
    } else if (quickFilter === 'recent') {
      texts = [...allTexts].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10)
    } else if (tagFilter) {
      texts = allTexts.filter(t => t.tags?.includes(tagFilter))
    } else if (activeProject) {
      texts = (activeProject.texts || []).map(t => ({
        ...t,
        projectId: activeProject.id,
        projectName: activeProject.name,
        projectColor: activeProject.color
      }))
    } else {
      return []
    }

    // Apply search filter
    if (searchFilter) {
      const query = searchFilter.toLowerCase()
      texts = texts.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.content.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return texts
  }

  const filteredTexts = getFilteredTexts()

  // Project CRUD
  const handleAddProject = () => {
    if (newProjectName.trim()) {
      const newProject = {
        id: Date.now(),
        name: newProjectName.trim(),
        color: newProjectColor,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        texts: []
      }
      setProjects([...projects, newProject])
      setNewProjectName('')
      setIsAddingProject(false)
      setActiveProjectId(newProject.id)
      setQuickFilter('all')
      setTagFilter(null)
    }
  }

  const handleRenameProject = (id, newName) => {
    setProjects(projects.map(p =>
      p.id === id ? { ...p, name: newName, updatedAt: Date.now() } : p
    ))
    setEditingProjectId(null)
  }

  const handleDeleteProject = (id) => {
    setProjects(projects.filter(p => p.id !== id))
    if (activeProjectId === id) {
      setActiveProjectId(null)
    }
    setShowProjectMenu(null)
  }

  const handleChangeProjectColor = (id, color) => {
    setProjects(projects.map(p =>
      p.id === id ? { ...p, color, updatedAt: Date.now() } : p
    ))
    setShowProjectMenu(null)
  }

  // Text CRUD
  const handleAddText = (projectId, textData) => {
    const newText = {
      id: Date.now(),
      title: textData.title || 'Untitled',
      content: textData.content || '',
      description: textData.description || '',
      tags: textData.tags || [],
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    setProjects(projects.map(p =>
      p.id === projectId
        ? { ...p, texts: [...(p.texts || []), newText], updatedAt: Date.now() }
        : p
    ))
    return newText
  }

  const handleUpdateText = (projectId, textId, updates) => {
    setProjects(projects.map(p =>
      p.id === projectId
        ? {
            ...p,
            texts: (p.texts || []).map(t =>
              t.id === textId ? { ...t, ...updates, updatedAt: Date.now() } : t
            ),
            updatedAt: Date.now()
          }
        : p
    ))
    setEditingTextId(null)
  }

  const handleDeleteText = (projectId, textId) => {
    setProjects(projects.map(p =>
      p.id === projectId
        ? { ...p, texts: (p.texts || []).filter(t => t.id !== textId), updatedAt: Date.now() }
        : p
    ))
  }

  const handleToggleFavorite = (projectId, textId) => {
    setProjects(projects.map(p =>
      p.id === projectId
        ? {
            ...p,
            texts: (p.texts || []).map(t =>
              t.id === textId ? { ...t, isFavorite: !t.isFavorite, updatedAt: Date.now() } : t
            ),
            updatedAt: Date.now()
          }
        : p
    ))
  }

  const handleCopyText = (content) => {
    navigator.clipboard.writeText(content)
  }

  const selectProject = (projectId) => {
    setActiveProjectId(projectId)
    setQuickFilter('all')
    setTagFilter(null)
  }

  const selectQuickFilter = (filter) => {
    setQuickFilter(filter)
    setActiveProjectId(null)
    setTagFilter(null)
  }

  const selectTagFilter = (tag) => {
    setTagFilter(tag)
    setActiveProjectId(null)
    setQuickFilter('all')
  }

  // Get current view title
  const getViewTitle = () => {
    if (quickFilter === 'favorites') return 'Favorites'
    if (quickFilter === 'recent') return 'Recent'
    if (tagFilter) return `#${tagFilter}`
    if (activeProject) return activeProject.name
    return 'Select a project'
  }

  return (
    <div className="flex h-full bg-[#1a1a1a] rounded-lg border border-emerald-500/50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-48 border-r border-gray-700 flex flex-col bg-[#0a0a0a]">
        <div className="p-3 border-b border-gray-700">
          <h3 className="text-gray-100 font-semibold text-sm flex items-center gap-2">
            <Folder className="w-4 h-4 text-emerald-400" />
            Projects
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Quick Access */}
          <div className="mb-3">
            <div className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-1">Quick Access</div>
            <button
              onClick={() => selectQuickFilter('favorites')}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                quickFilter === 'favorites'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              Favorites
            </button>
            <button
              onClick={() => selectQuickFilter('recent')}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                quickFilter === 'recent'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Recent
            </button>
          </div>

          {/* Projects List */}
          <div className="mb-3">
            <div className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-1">Projects</div>
            {projects.map(project => {
              const colors = PROJECT_COLORS[project.color] || PROJECT_COLORS.purple
              const isActive = activeProjectId === project.id && quickFilter === 'all' && !tagFilter

              return (
                <div key={project.id} className="relative group">
                  {editingProjectId === project.id ? (
                    <div className="flex items-center gap-1 px-1">
                      <input
                        type="text"
                        defaultValue={project.name}
                        autoFocus
                        className="flex-1 bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-1.5 py-1 outline-none focus:border-emerald-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameProject(project.id, e.target.value)
                          if (e.key === 'Escape') setEditingProjectId(null)
                        }}
                        onBlur={(e) => handleRenameProject(project.id, e.target.value)}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => selectProject(project.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                        isActive
                          ? `${colors.bg} ${colors.text}`
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }`}
                    >
                      <FolderOpen className={`w-3.5 h-3.5 ${isActive ? colors.text : ''}`} />
                      <span className="truncate flex-1 text-left">{project.name}</span>
                      <span className="text-xs text-gray-500">{(project.texts || []).length}</span>
                    </button>
                  )}

                  {/* Project context menu trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowProjectMenu(showProjectMenu === project.id ? null : project.id)
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-opacity"
                  >
                    <MoreHorizontal className="w-3 h-3 text-gray-400" />
                  </button>

                  {/* Context menu */}
                  {showProjectMenu === project.id && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[140px]">
                      <button
                        onClick={() => {
                          setEditingProjectId(project.id)
                          setShowProjectMenu(null)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
                      >
                        <Edit2 className="w-3 h-3" /> Rename
                      </button>
                      <div className="px-3 py-1.5">
                        <div className="text-xs text-gray-500 mb-1">Color</div>
                        <div className="flex gap-1">
                          {Object.keys(PROJECT_COLORS).map(color => (
                            <button
                              key={color}
                              onClick={() => handleChangeProjectColor(project.id, color)}
                              className={`w-4 h-4 rounded-full ${PROJECT_COLORS[color].bg} ${PROJECT_COLORS[color].border} border ${
                                project.color === color ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800' : ''
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <hr className="border-gray-700 my-1" />
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-gray-700"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add Project */}
            {isAddingProject ? (
              <div className="p-2 bg-gray-800 rounded-lg space-y-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name..."
                  autoFocus
                  className="w-full bg-gray-700 text-gray-100 text-xs border border-gray-600 rounded px-2 py-1.5 outline-none focus:border-emerald-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddProject()
                    if (e.key === 'Escape') setIsAddingProject(false)
                  }}
                />
                <div className="flex gap-1">
                  {Object.keys(PROJECT_COLORS).slice(0, 5).map(color => (
                    <button
                      key={color}
                      onClick={() => setNewProjectColor(color)}
                      className={`w-5 h-5 rounded-full ${PROJECT_COLORS[color].bg} ${PROJECT_COLORS[color].border} border ${
                        newProjectColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800' : ''
                      }`}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <Button
                    onClick={handleAddProject}
                    size="sm"
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-6 text-xs"
                  >
                    <Check className="w-3 h-3 mr-1" /> Add
                  </Button>
                  <Button
                    onClick={() => setIsAddingProject(false)}
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 h-6"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingProject(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Project
              </button>
            )}
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-1">Tags</div>
              <div className="flex flex-wrap gap-1 px-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => selectTagFilter(tag)}
                    className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                      tagFilter === tag
                        ? 'bg-emerald-500/30 text-emerald-400'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-[#0a0a0a]">
          <div className="flex items-center gap-2">
            <h3 className="text-gray-100 font-semibold text-sm">{getViewTitle()}</h3>
            {activeProject && (
              <span className="text-xs text-gray-500">
                {filteredTexts.length} text{filteredTexts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex bg-gray-800 rounded p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded transition-colors ${
                  viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded transition-colors ${
                  viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pt-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search texts..."
              className="w-full bg-[#0a0a0a] text-gray-100 text-xs border border-gray-700 rounded pl-7 pr-2 py-1.5 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {!activeProjectId && quickFilter === 'all' && !tagFilter ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Folder className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">Select a project to view texts</p>
              <p className="text-xs mt-1">or use Quick Access filters</p>
            </div>
          ) : filteredTexts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-sm">No texts found</p>
              {activeProject && (
                <p className="text-xs mt-1">Save your first text to this project</p>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            // Grid View
            <div className="grid grid-cols-2 gap-3">
              {filteredTexts.map(text => {
                const colors = PROJECT_COLORS[text.projectColor] || PROJECT_COLORS.purple

                return (
                  <div
                    key={`${text.projectId}-${text.id}`}
                    onClick={() => onLoadWorkspace?.(text.projectId, text)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all bg-[#0a0a0a] border-gray-700 hover:border-gray-500 hover:${colors.bg}`}
                  >
                    {editingTextId === text.id ? (
                      <TextEditForm
                        text={text}
                        onSave={(updates) => handleUpdateText(text.projectId, text.id, updates)}
                        onCancel={() => setEditingTextId(null)}
                      />
                    ) : (
                      <>
                        <div>
                          <div className="flex items-start justify-between mb-1">
                            <span className={`font-semibold text-xs ${colors.text}`}>
                              {text.title}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleFavorite(text.projectId, text.id)
                              }}
                              className="p-0.5"
                            >
                              <Star className={`w-3.5 h-3.5 ${
                                text.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500 hover:text-yellow-400'
                              }`} />
                            </button>
                          </div>
                          <p className="text-gray-400 text-xs line-clamp-3 mb-2">
                            {text.state?.columns?.length || 0} columns, {text.state?.selectedBlocks?.length || 0} blocks selected
                          </p>
                          {text.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {text.tags.map(tag => (
                                <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {(quickFilter !== 'all' || tagFilter) && (
                            <div className="text-xs text-gray-500 mb-2">
                              in {text.projectName}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 pt-1 border-t border-gray-800">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopyText(text.content)
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-gray-300 h-6 px-2"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingTextId(text.id)
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-gray-300 h-6 px-2"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteText(text.projectId, text.id)
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-400 h-6 px-2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            // List View
            <div className="space-y-1">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-2 py-1 text-xs text-gray-500 border-b border-gray-700">
                <span className="w-5"></span>
                <span>Title</span>
                <span>Tags</span>
                <span>Modified</span>
                <span className="w-20">Actions</span>
              </div>
              {filteredTexts.map(text => {
                const colors = PROJECT_COLORS[text.projectColor] || PROJECT_COLORS.purple

                return (
                  <div
                    key={`${text.projectId}-${text.id}`}
                    onClick={() => onLoadWorkspace?.(text.projectId, text)}
                    className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-2 py-2 rounded cursor-pointer transition-all items-center hover:bg-gray-800`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleFavorite(text.projectId, text.id)
                      }}
                    >
                      <Star className={`w-4 h-4 ${
                        text.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600 hover:text-yellow-400'
                      }`} />
                    </button>
                    <div className="min-w-0">
                      <div className={`text-sm font-medium truncate ${colors.text}`}>{text.title}</div>
                      {(quickFilter !== 'all' || tagFilter) && (
                        <div className="text-xs text-gray-500">in {text.projectName}</div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {text.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">
                          #{tag}
                        </span>
                      ))}
                      {text.tags?.length > 2 && (
                        <span className="text-xs text-gray-500">+{text.tags.length - 2}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatRelativeTime(text.updatedAt)}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyText(text.content)
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-gray-300 h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingTextId(text.id)
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-gray-300 h-6 w-6 p-0"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteText(text.projectId, text.id)
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-400 h-6 w-6 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 bg-[#0a0a0a]">
          <div className="text-xs text-gray-500 text-center">
            Click to add to output • Drag to insert • ⭐ to favorite
          </div>
        </div>
      </div>
    </div>
  )
}

// Text Edit Form Component
function TextEditForm({ text, onSave, onCancel }) {
  const [title, setTitle] = useState(text.title)
  const [content, setContent] = useState(text.content)
  const [description, setDescription] = useState(text.description || '')
  const [tagsInput, setTagsInput] = useState(text.tags?.join(', ') || '')

  const handleSubmit = () => {
    onSave({
      title: title.trim() || 'Untitled',
      content,
      description,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    })
  }

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title..."
        className="w-full bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-2 py-1 outline-none focus:border-emerald-500"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Content..."
        rows={3}
        className="w-full bg-gray-800 text-gray-300 text-xs border border-gray-600 rounded px-2 py-1 outline-none focus:border-emerald-500 resize-none"
      />
      <input
        type="text"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="Tags (comma separated)..."
        className="w-full bg-gray-800 text-gray-100 text-xs border border-gray-600 rounded px-2 py-1 outline-none focus:border-emerald-500"
      />
      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          size="sm"
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-6 text-xs"
        >
          <Check className="w-3 h-3 mr-1" /> Save
        </Button>
        <Button
          onClick={onCancel}
          size="sm"
          variant="ghost"
          className="text-gray-400 h-6"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}

// Helper function
function formatRelativeTime(timestamp) {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

// Export helper for saving to project
export function useProjectsStorage() {
  const [projects, setProjects] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : projectsData
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  }, [projects])

  const saveTextToProject = (projectId, textData) => {
    const newText = {
      id: Date.now(),
      title: textData.title || 'Untitled',
      content: textData.content || '',
      description: textData.description || '',
      tags: textData.tags || [],
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, texts: [...(p.texts || []), newText], updatedAt: Date.now() }
        : p
    ))

    return newText
  }

  const addProject = (name, color = 'purple') => {
    const newProject = {
      id: Date.now(),
      name,
      color,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      texts: []
    }
    setProjects(prev => [...prev, newProject])
    return newProject
  }

  return { projects, saveTextToProject, addProject, setProjects }
}
