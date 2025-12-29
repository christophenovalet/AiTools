import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import * as Diff from 'diff'

// Compute word-level diff for modified lines
function getWordDiff(oldText, newText) {
  const wordDiff = Diff.diffWords(oldText, newText)
  return wordDiff
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
      // Lines only in text2 (right side)
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
      // Lines only in text1 (left side)
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
      // Unchanged lines
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

    // Look for removed lines followed by added lines to pair them as modified
    if (current.type === 'removed') {
      const removedLines = []
      let j = i

      // Collect consecutive removed lines
      while (j < result.length && result[j].type === 'removed') {
        removedLines.push(result[j])
        j++
      }

      // Collect consecutive added lines
      const addedLines = []
      while (j < result.length && result[j].type === 'added') {
        addedLines.push(result[j])
        j++
      }

      // Pair them up as modified where possible
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

      // Add remaining removed lines
      for (let k = maxPairs; k < removedLines.length; k++) {
        processed.push(removedLines[k])
      }

      // Add remaining added lines
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

// Render word-level diff highlighting
function WordDiffDisplay({ wordDiff, side }) {
  if (!wordDiff) return null

  return (
    <>
      {wordDiff.map((part, idx) => {
        if (side === 'left') {
          // Left side: show removed (highlighted) and unchanged
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
          // Right side: show added (highlighted) and unchanged
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

function DiffLine({ diffLine }) {
  const getBackgroundClass = () => {
    switch (diffLine.type) {
      case 'added':
        return 'bg-green-950/30 border-l-2 border-green-500'
      case 'removed':
        return 'bg-red-950/30 border-l-2 border-red-500'
      case 'modified':
        return 'bg-yellow-950/30 border-l-2 border-yellow-500'
      default:
        return 'bg-transparent'
    }
  }

  const renderContent = (line, side) => {
    if (diffLine.type === 'modified' && diffLine.wordDiff) {
      return <WordDiffDisplay wordDiff={diffLine.wordDiff} side={side} />
    }
    return line || ' '
  }

  return (
    <div className={`grid grid-cols-2 gap-4 font-mono text-sm ${getBackgroundClass()} py-1 px-2`}>
      <div className="flex gap-2">
        <span className="text-gray-600 w-10 text-right select-none">
          {diffLine.leftLineNum ?? ''}
        </span>
        <span className="text-gray-200 whitespace-pre-wrap break-all">
          {renderContent(diffLine.line1, 'left')}
        </span>
      </div>
      <div className="flex gap-2 border-l border-[#333333] pl-4">
        <span className="text-gray-600 w-10 text-right select-none">
          {diffLine.rightLineNum ?? ''}
        </span>
        <span className="text-gray-200 whitespace-pre-wrap break-all">
          {renderContent(diffLine.line2, 'right')}
        </span>
      </div>
    </div>
  )
}

export function DiffView({ versions, masterIndex, onBack }) {
  const includedVersions = versions.filter(v => v.included)

  const comparisons = []

  if (masterIndex !== null) {
    const masterVersion = versions[masterIndex]
    includedVersions.forEach((version) => {
      if (versions.indexOf(version) !== masterIndex) {
        comparisons.push({
          title1: masterVersion.title,
          title2: version.title,
          diff: computeDiff(masterVersion.text, version.text)
        })
      }
    })
  } else {
    for (let i = 0; i < includedVersions.length; i++) {
      for (let j = i + 1; j < includedVersions.length; j++) {
        comparisons.push({
          title1: includedVersions[i].title,
          title2: includedVersions[j].title,
          diff: computeDiff(includedVersions[i].text, includedVersions[j].text)
        })
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-100">Differences View</h1>
          <Button
            onClick={onBack}
            className="bg-gray-700 hover:bg-gray-600 text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Editor
          </Button>
        </div>

        {comparisons.length === 0 ? (
          <Card className="bg-[#1a1a1a] border-[#333333]">
            <CardContent className="p-12 text-center">
              <p className="text-gray-400 text-lg">No comparisons to show. Please select at least 2 versions to compare.</p>
            </CardContent>
          </Card>
        ) : (
          comparisons.map((comparison, idx) => (
            <Card key={idx} className="bg-[#1a1a1a] border-[#333333]">
              <CardHeader>
                <CardTitle className="text-xl text-gray-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-blue-400">{comparison.title1}</div>
                    <div className="border-l border-[#333333] pl-4 text-orange-400">{comparison.title2}</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-black/40 rounded-b-lg overflow-hidden">
                  {comparison.diff.map((diffLine, lineIdx) => (
                    <DiffLine key={lineIdx} diffLine={diffLine} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        <div className="pt-4 pb-8 text-center">
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
        </div>
      </div>
    </div>
  )
}
