import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, ArrowLeft, ArrowRight, ArrowUpAZ, SortAsc, Check, RotateCcw, Edit3, Eye } from 'lucide-react'
import * as Diff from 'diff'

// Recursively sort all keys in a JSON object alphabetically
function sortJsonKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sortJsonKeys)
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = sortJsonKeys(obj[key])
        return sorted
      }, {})
  }
  return obj
}

// Normalize JSON text by parsing, sorting keys, and re-stringifying
function normalizeJson(text) {
  try {
    const parsed = JSON.parse(text)
    const sorted = sortJsonKeys(parsed)
    return JSON.stringify(sorted, null, 2)
  } catch {
    return text
  }
}

// Sort lines alphabetically
function sortLines(text) {
  return text.split('\n').sort().join('\n')
}

// Compute word-level diff for modified lines
function getWordDiff(oldText, newText) {
  return Diff.diffWords(oldText, newText)
}

// Compute line-based diff using the diff library
function computeDiff(text1, text2) {
  const changes = Diff.diffLines(text1, text2)
  const result = []

  let leftLineNum = 1
  let rightLineNum = 1

  for (const change of changes) {
    const lines = change.value.replace(/\n$/, '').split('\n')

    if (change.added) {
      for (const line of lines) {
        result.push({
          type: 'added',
          line1: '',
          line2: line,
          leftLineNum: null,
          rightLineNum: rightLineNum++
        })
      }
    } else if (change.removed) {
      for (const line of lines) {
        result.push({
          type: 'removed',
          line1: line,
          line2: '',
          leftLineNum: leftLineNum++,
          rightLineNum: null
        })
      }
    } else {
      for (const line of lines) {
        result.push({
          type: 'unchanged',
          line1: line,
          line2: line,
          leftLineNum: leftLineNum++,
          rightLineNum: rightLineNum++
        })
      }
    }
  }

  // Post-process to pair up adjacent removed/added lines as "modified"
  const processed = []
  let i = 0

  while (i < result.length) {
    const current = result[i]

    if (current.type === 'removed') {
      const removedLines = []
      let j = i

      while (j < result.length && result[j].type === 'removed') {
        removedLines.push(result[j])
        j++
      }

      const addedLines = []
      while (j < result.length && result[j].type === 'added') {
        addedLines.push(result[j])
        j++
      }

      const maxPairs = Math.min(removedLines.length, addedLines.length)

      for (let k = 0; k < maxPairs; k++) {
        processed.push({
          type: 'modified',
          line1: removedLines[k].line1,
          line2: addedLines[k].line2,
          leftLineNum: removedLines[k].leftLineNum,
          rightLineNum: addedLines[k].rightLineNum,
          wordDiff: getWordDiff(removedLines[k].line1, addedLines[k].line2)
        })
      }

      for (let k = maxPairs; k < removedLines.length; k++) {
        processed.push(removedLines[k])
      }

      for (let k = maxPairs; k < addedLines.length; k++) {
        processed.push(addedLines[k])
      }

      i = j
    } else {
      processed.push(current)
      i++
    }
  }

  return processed
}

// Word diff display component
function WordDiffDisplay({ wordDiff, side }) {
  if (!wordDiff) return null

  return (
    <>
      {wordDiff.map((part, idx) => {
        if (side === 'left') {
          if (part.added) return null
          return (
            <span
              key={idx}
              className={part.removed ? 'bg-red-500/40 rounded px-0.5' : ''}
            >
              {part.value}
            </span>
          )
        } else {
          if (part.removed) return null
          return (
            <span
              key={idx}
              className={part.added ? 'bg-green-500/40 rounded px-0.5' : ''}
            >
              {part.value}
            </span>
          )
        }
      })}
    </>
  )
}

// Diff line component with copy arrows
function DiffLine({ diffLine, onCopyToLeft, onCopyToRight, showArrows }) {
  const getBackgroundClass = () => {
    switch (diffLine.type) {
      case 'added':
        return 'bg-green-950/30 border-l-2 border-green-500'
      case 'removed':
        return 'bg-red-950/30 border-l-2 border-red-500'
      case 'modified':
        return 'bg-yellow-950/30 border-l-2 border-yellow-500'
      default:
        return 'bg-transparent border-l-2 border-transparent'
    }
  }

  const renderContent = (line, side) => {
    if (diffLine.type === 'modified' && diffLine.wordDiff) {
      return <WordDiffDisplay wordDiff={diffLine.wordDiff} side={side} />
    }
    return line || '\u00A0'
  }

  const canCopyToRight = diffLine.type === 'removed' || diffLine.type === 'modified'
  const canCopyToLeft = diffLine.type === 'added' || diffLine.type === 'modified'

  return (
    <div className={`grid grid-cols-[1fr_auto_1fr] gap-0 font-mono text-sm ${getBackgroundClass()} py-1`}>
      {/* Left side */}
      <div className="flex gap-2 px-2">
        <span className="text-gray-600 w-8 text-right select-none flex-shrink-0">
          {diffLine.leftLineNum ?? ''}
        </span>
        <span className="text-gray-200 whitespace-pre-wrap break-all flex-1">
          {renderContent(diffLine.line1, 'left')}
        </span>
      </div>

      {/* Center arrows */}
      <div className="flex flex-col items-center justify-center gap-0.5 px-1 border-x border-[#333333]">
        {showArrows && canCopyToRight && (
          <button
            onClick={onCopyToRight}
            className="p-0.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
            title="Copy to right"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
        {showArrows && canCopyToLeft && (
          <button
            onClick={onCopyToLeft}
            className="p-0.5 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 rounded transition-colors"
            title="Copy to left"
          >
            <ArrowLeft className="w-3 h-3" />
          </button>
        )}
        {!showArrows && <span className="w-3">=</span>}
      </div>

      {/* Right side */}
      <div className="flex gap-2 px-2">
        <span className="text-gray-600 w-8 text-right select-none flex-shrink-0">
          {diffLine.rightLineNum ?? ''}
        </span>
        <span className="text-gray-200 whitespace-pre-wrap break-all flex-1">
          {renderContent(diffLine.line2, 'right')}
        </span>
      </div>
    </div>
  )
}

// Editor panel for a single version
function EditorPanel({ version, onChange, isEditing, onToggleEdit }) {
  return (
    <div className="flex flex-col h-full border border-[#333333] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-[#0a0a0a] border-b border-[#333333]">
        <span className="text-sm font-semibold text-gray-200">{version.title}</span>
        <Button
          onClick={onToggleEdit}
          variant="ghost"
          size="sm"
          className={isEditing ? 'text-green-400' : 'text-gray-400'}
        >
          {isEditing ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="ml-1 text-xs">{isEditing ? 'Editing' : 'View'}</span>
        </Button>
      </div>
      <textarea
        value={version.text}
        onChange={(e) => onChange(e.target.value)}
        readOnly={!isEditing}
        className={`flex-1 w-full p-3 bg-[#1a1a1a] text-gray-200 font-mono text-sm resize-none outline-none ${
          isEditing ? 'cursor-text' : 'cursor-default'
        }`}
        placeholder="No content..."
      />
    </div>
  )
}

export function CompareColumnsModal({ isOpen, onClose, columns, onApplyChanges }) {
  // Convert columns to editable versions
  const [versions, setVersions] = useState([])
  const [editingStates, setEditingStates] = useState({})
  const [viewMode, setViewMode] = useState('diff') // 'diff' or 'edit'
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize versions when columns change
  useEffect(() => {
    if (columns && columns.length > 0) {
      setVersions(columns.map(col => ({
        id: col.id,
        title: col.title,
        text: col.text || '',
        originalText: col.text || ''
      })))
      setEditingStates({})
      setHasChanges(false)
    }
  }, [columns])

  // Update a version's text
  const updateVersionText = useCallback((id, newText) => {
    setVersions(prev => {
      const updated = prev.map(v =>
        v.id === id ? { ...v, text: newText } : v
      )
      // Check if any version differs from original
      const changed = updated.some(v => v.text !== v.originalText)
      setHasChanges(changed)
      return updated
    })
  }, [])

  // Toggle editing for a version
  const toggleEditing = useCallback((id) => {
    setEditingStates(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }, [])

  // Sort JSON keys for all versions
  const handleSortJsonKeys = useCallback(() => {
    setVersions(prev => {
      const updated = prev.map(v => ({
        ...v,
        text: normalizeJson(v.text)
      }))
      const changed = updated.some(v => v.text !== v.originalText)
      setHasChanges(changed)
      return updated
    })
  }, [])

  // Sort lines for all versions
  const handleSortLines = useCallback(() => {
    setVersions(prev => {
      const updated = prev.map(v => ({
        ...v,
        text: sortLines(v.text)
      }))
      const changed = updated.some(v => v.text !== v.originalText)
      setHasChanges(changed)
      return updated
    })
  }, [])

  // Reset to original
  const handleReset = useCallback(() => {
    setVersions(prev => prev.map(v => ({
      ...v,
      text: v.originalText
    })))
    setHasChanges(false)
  }, [])

  // Apply changes
  const handleApply = useCallback(() => {
    onApplyChanges(versions.map(v => ({ id: v.id, text: v.text })))
  }, [versions, onApplyChanges])

  // Copy line from one version to another
  const handleCopyLine = useCallback((fromIdx, toIdx, lineContent) => {
    setVersions(prev => {
      const updated = [...prev]
      const targetVersion = updated[toIdx]
      const sourceVersion = updated[fromIdx]

      // For now, simple approach: append line or replace if empty
      // A more sophisticated approach would insert at the right position
      if (!targetVersion.text.trim()) {
        updated[toIdx] = { ...targetVersion, text: lineContent }
      } else {
        // Append the line
        updated[toIdx] = { ...targetVersion, text: targetVersion.text + '\n' + lineContent }
      }

      const changed = updated.some(v => v.text !== v.originalText)
      setHasChanges(changed)
      return updated
    })
  }, [])

  if (!isOpen || versions.length < 2) return null

  // Generate comparisons
  const comparisons = []
  for (let i = 0; i < versions.length; i++) {
    for (let j = i + 1; j < versions.length; j++) {
      comparisons.push({
        leftIdx: i,
        rightIdx: j,
        left: versions[i],
        right: versions[j],
        diff: computeDiff(versions[i].text, versions[j].text)
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#333333] bg-[#0a0a0a]">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-100">Compare & Edit</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setViewMode('diff')}
              variant={viewMode === 'diff' ? 'default' : 'ghost'}
              size="sm"
              className={viewMode === 'diff' ? 'bg-orange-500 text-white' : 'text-gray-400'}
            >
              Diff View
            </Button>
            <Button
              onClick={() => setViewMode('edit')}
              variant={viewMode === 'edit' ? 'default' : 'ghost'}
              size="sm"
              className={viewMode === 'edit' ? 'bg-orange-500 text-white' : 'text-gray-400'}
            >
              Edit View
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSortJsonKeys}
            variant="ghost"
            className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
          >
            <ArrowUpAZ className="mr-2 h-4 w-4" />
            Sort JSON Keys
          </Button>
          <Button
            onClick={handleSortLines}
            variant="ghost"
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
          >
            <SortAsc className="mr-2 h-4 w-4" />
            Sort Lines
          </Button>
          <div className="w-px h-6 bg-[#333333]" />
          <Button
            onClick={handleReset}
            variant="ghost"
            disabled={!hasChanges}
            className="text-gray-400 hover:text-gray-300"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button
            onClick={handleApply}
            disabled={!hasChanges}
            className="bg-green-600 hover:bg-green-500 text-white"
          >
            <Check className="mr-2 h-4 w-4" />
            Apply Changes
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            className="text-gray-400 hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'edit' ? (
          // Edit view - side by side editors
          <div className={`grid gap-4 h-full ${
            versions.length === 2 ? 'grid-cols-2' :
            versions.length === 3 ? 'grid-cols-3' :
            versions.length === 4 ? 'grid-cols-4' :
            'grid-cols-5'
          }`}>
            {versions.map((version) => (
              <EditorPanel
                key={version.id}
                version={version}
                onChange={(text) => updateVersionText(version.id, text)}
                isEditing={editingStates[version.id] ?? false}
                onToggleEdit={() => toggleEditing(version.id)}
              />
            ))}
          </div>
        ) : (
          // Diff view - comparisons
          <div className="space-y-6">
            {comparisons.map((comparison, idx) => (
              <Card key={idx} className="bg-[#1a1a1a] border-[#333333]">
                <CardHeader className="py-3">
                  <CardTitle className="text-lg text-gray-100">
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-0">
                      <div className="text-blue-400 px-2">{comparison.left.title}</div>
                      <div className="px-4 text-gray-500">vs</div>
                      <div className="text-orange-400 px-2">{comparison.right.title}</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="bg-black/40 rounded-b-lg overflow-hidden max-h-[500px] overflow-y-auto">
                    {comparison.diff.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        Both versions are identical
                      </div>
                    ) : (
                      comparison.diff.map((diffLine, lineIdx) => (
                        <DiffLine
                          key={lineIdx}
                          diffLine={diffLine}
                          showArrows={diffLine.type !== 'unchanged'}
                          onCopyToRight={() => {
                            if (diffLine.line1) {
                              handleCopyLine(comparison.leftIdx, comparison.rightIdx, diffLine.line1)
                            }
                          }}
                          onCopyToLeft={() => {
                            if (diffLine.line2) {
                              handleCopyLine(comparison.rightIdx, comparison.leftIdx, diffLine.line2)
                            }
                          }}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer legend */}
      <div className="px-6 py-3 border-t border-[#333333] bg-[#0a0a0a]">
        <div className="flex items-center justify-between">
          <div className="inline-flex gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-950/50 border-l-2 border-green-500"></div>
              <span>Added</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-950/50 border-l-2 border-red-500"></div>
              <span>Removed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-950/50 border-l-2 border-yellow-500"></div>
              <span>Modified</span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {hasChanges ? (
              <span className="text-amber-400">Unsaved changes</span>
            ) : (
              <span>No changes</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
