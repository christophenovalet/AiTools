import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

function computeDiff(text1, text2) {
  const lines1 = text1.split('\n')
  const lines2 = text2.split('\n')
  const maxLines = Math.max(lines1.length, lines2.length)
  
  const diff = []
  
  for (let i = 0; i < maxLines; i++) {
    const line1 = lines1[i] ?? ''
    const line2 = lines2[i] ?? ''
    
    if (line1 === line2) {
      diff.push({ type: 'unchanged', line1, line2, lineNum: i + 1 })
    } else if (i >= lines1.length) {
      diff.push({ type: 'added', line1: '', line2, lineNum: i + 1 })
    } else if (i >= lines2.length) {
      diff.push({ type: 'removed', line1, line2: '', lineNum: i + 1 })
    } else {
      diff.push({ type: 'modified', line1, line2, lineNum: i + 1 })
    }
  }
  
  return diff
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
  
  return (
    <div className={`grid grid-cols-2 gap-4 font-mono text-sm ${getBackgroundClass()} py-1 px-2`}>
      <div className="flex gap-2">
        <span className="text-gray-600 w-10 text-right select-none">{diffLine.lineNum}</span>
        <span className="text-gray-200 whitespace-pre-wrap break-all">{diffLine.line1 || ' '}</span>
      </div>
      <div className="flex gap-2 border-l border-[#333333] pl-4">
        <span className="text-gray-600 w-10 text-right select-none">{diffLine.lineNum}</span>
        <span className="text-gray-200 whitespace-pre-wrap break-all">{diffLine.line2 || ' '}</span>
      </div>
    </div>
  )
}

export function DiffView({ versions, masterIndex, onBack }) {
  const includedVersions = versions.filter(v => v.included)
  
  const comparisons = []
  
  if (masterIndex !== null) {
    const masterVersion = versions[masterIndex]
    includedVersions.forEach((version, idx) => {
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
