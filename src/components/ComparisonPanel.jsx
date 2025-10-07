import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ComparisonPanel({
  version,
  onUpdate,
  onRemove,
  canRemove,
  isMaster,
  onMasterChange,
  allVersions,
  highlightCommon
}) {
  // Calculer les lignes communes à toutes les versions incluses (peu importe leur position)
  const getCommonLines = () => {
    const includedVersions = allVersions.filter(v => v.included)
    if (!highlightCommon || includedVersions.length < 3) return new Set()

    const commonLines = new Set()
    const lines = version.text.split('\n')

    // Créer un ensemble de toutes les lignes présentes dans toutes les versions
    const allLinesInAllVersions = includedVersions.map(v =>
      new Set(v.text.split('\n').filter(line => line.trim() !== ''))
    )

    lines.forEach((line, index) => {
      if (line.trim() === '') return

      // Vérifier si cette ligne existe dans toutes les versions (peu importe la position)
      const isCommonToAll = allLinesInAllVersions.every(lineSet => lineSet.has(line))

      if (isCommonToAll) {
        commonLines.add(index)
      }
    })

    return commonLines
  }

  const commonLines = getCommonLines()
  return (
    <Card className="flex flex-col h-full overflow-hidden bg-[#1a1a1a] border-[#333333]">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <input
            type="text"
            value={version.title}
            onChange={(e) => onUpdate({ ...version, title: e.target.value })}
            className="flex-1 bg-transparent border-none text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-gray-600 rounded px-2 py-1"
            placeholder="Version name"
          />
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-950/20"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-4 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={version.included}
              onClick={() => onUpdate({ ...version, included: !version.included })}
            />
            <span className="text-sm text-gray-400">Include in comparison</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem
              checked={isMaster}
              onClick={onMasterChange}
            />
            <span className="text-sm text-gray-400">Master version</span>
            {isMaster && (
              <Badge variant="secondary" className="ml-1 bg-blue-500/20 text-blue-400 border-blue-500/30">
                Master
              </Badge>
            )}
          </label>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col pb-4 overflow-hidden">
        <div className="flex-1 relative h-full">
          <Textarea
            value={version.text}
            onChange={(e) => onUpdate({ ...version, text: e.target.value })}
            placeholder="Enter text to compare..."
            className="flex-1 h-full w-full resize-none bg-black/40 border-[#333333] text-gray-200 font-mono text-sm overflow-y-auto relative z-10 bg-transparent"
          />
          <div
            className="absolute inset-0 pointer-events-none font-mono text-sm overflow-y-auto whitespace-pre-wrap break-words px-3 py-2 text-transparent select-none"
            aria-hidden="true"
          >
            {version.text.split('\n').map((line, index) => (
              <div
                key={index}
                className={`${
                  commonLines.has(index) ? 'bg-green-500/20' : ''
                }`}
                style={{ minHeight: '1.5em' }}
              >
                {line || '\u00A0'}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
