import React, { useState } from 'react'
import { ComparisonPanel } from '@/components/ComparisonPanel'
import { DiffView } from '@/components/DiffView'
import { Button } from '@/components/ui/button'
import { Plus, Copy, GitCompare, Home } from 'lucide-react'

export function DiffToolPage({ onBackHome }) {
  const [versions, setVersions] = useState([
    { id: 1, title: 'Dev', text: '', included: true },
    { id: 2, title: 'Staging', text: '', included: true },
    { id: 3, title: 'Prod', text: '', included: true },
  ])

  const [masterIndex, setMasterIndex] = useState(null)
  const [showDiff, setShowDiff] = useState(false)
  const [nextId, setNextId] = useState(4)
  const [highlightCommon, setHighlightCommon] = useState(true)

  const updateVersion = (index, updatedVersion) => {
    const newVersions = [...versions]
    newVersions[index] = updatedVersion
    setVersions(newVersions)
  }

  const addVersion = () => {
    if (versions.length < 5) {
      setVersions([
        ...versions,
        { id: nextId, title: `Version ${nextId}`, text: '', included: true }
      ])
      setNextId(nextId + 1)
    }
  }

  const removeVersion = (index) => {
    if (versions.length > 3) {
      const newVersions = versions.filter((_, i) => i !== index)
      setVersions(newVersions)

      if (masterIndex === index) {
        setMasterIndex(null)
      } else if (masterIndex !== null && masterIndex > index) {
        setMasterIndex(masterIndex - 1)
      }
    }
  }

  const copySelectedVersions = () => {
    const includedVersions = versions.filter(v => v.included)

    let output = ''
    includedVersions.forEach((version, idx) => {
      const versionIndex = versions.indexOf(version)
      const isMaster = versionIndex === masterIndex

      output += `Version: ${version.title}\n`
      if (isMaster) {
        output += 'Master version\n'
      }
      output += `Text:\n${version.text}\n`
      output += '"""\n\n'
    })

    output += 'You are a diff tool, please list the differences '
    if (masterIndex !== null) {
      output += 'if a master version is present use that version as master to compare to all versions '
    } else {
      output += 'otherwise just compare all the versions between each other'
    }

    navigator.clipboard.writeText(output).then(() => {
      alert('Copied to clipboard!')
    }).catch(err => {
      console.error('Failed to copy:', err)
    })
  }

  if (showDiff) {
    return (
      <DiffView
        versions={versions}
        masterIndex={masterIndex}
        onBack={() => setShowDiff(false)}
      />
    )
  }

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col p-4 gap-4">
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button
              onClick={onBackHome}
              variant="ghost"
              className="text-gray-400 hover:text-gray-200"
            >
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
            <h1 className="text-3xl font-bold text-gray-100">Text Comparison Tool</h1>
          </div>

          <div className="flex gap-3 items-center">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-400 mr-2">
              <input
                type="checkbox"
                checked={highlightCommon}
                onChange={(e) => setHighlightCommon(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-green-500 focus:ring-2 focus:ring-green-500"
              />
              <span>Highlight common lines</span>
            </label>
            <Button
              onClick={copySelectedVersions}
              disabled={versions.filter(v => v.included).length === 0}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Selected Versions
            </Button>

            <Button
              onClick={() => setShowDiff(true)}
              disabled={versions.filter(v => v.included).length < 2}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            >
              <GitCompare className="mr-2 h-4 w-4" />
              Show Differences
            </Button>

            {versions.length < 5 && (
              <Button
                onClick={addVersion}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Comparison
              </Button>
            )}
          </div>
        </div>

        <div className={`grid gap-4 flex-1 overflow-hidden ${
          versions.length === 3 ? 'grid-cols-3' :
          versions.length === 4 ? 'grid-cols-4' :
          'grid-cols-5'
        }`}>
          {versions.map((version, index) => (
            <ComparisonPanel
              key={version.id}
              version={version}
              onUpdate={(updated) => updateVersion(index, updated)}
              onRemove={() => removeVersion(index)}
              canRemove={versions.length > 3}
              isMaster={index === masterIndex}
              onMasterChange={() => setMasterIndex(index === masterIndex ? null : index)}
              allVersions={versions}
              highlightCommon={highlightCommon}
            />
          ))}
        </div>

        <div className="text-center text-sm text-gray-500 flex-shrink-0">
          <p>Select versions to include in comparison • Set a master version for reference • Add up to 5 versions</p>
        </div>
      </div>
    </div>
  )
}
