import React, { useState } from 'react'
import { SourceColumn } from '@/components/SourceColumn'
import { OutputColumn } from '@/components/OutputColumn'
import { PromptLibrary } from '@/components/PromptLibrary'
import { Button } from '@/components/ui/button'
import { Plus, Home } from 'lucide-react'

export function TextBuilderPage({ onBackHome }) {
  const [columns, setColumns] = useState([
    {
      id: 1,
      title: 'Source 1',
      text: '',
      color: 'bg-blue-500/20 border-blue-500'
    },
    {
      id: 2,
      title: 'Source 2',
      text: '',
      color: 'bg-green-500/20 border-green-500'
    },
    {
      id: 3,
      title: 'Source 3',
      text: '',
      color: 'bg-yellow-500/20 border-yellow-500'
    }
  ])

  const [selectedBlocks, setSelectedBlocks] = useState([])
  const [selectedPrompt, setSelectedPrompt] = useState(null)
  const [nextId, setNextId] = useState(4)

  const updateColumn = (index, updatedColumn) => {
    const newColumns = [...columns]
    newColumns[index] = updatedColumn
    setColumns(newColumns)
  }

  const addColumn = () => {
    if (columns.length < 5) {
      const colors = [
        'bg-blue-500/20 border-blue-500',
        'bg-green-500/20 border-green-500',
        'bg-yellow-500/20 border-yellow-500',
        'bg-red-500/20 border-red-500',
        'bg-purple-500/20 border-purple-500'
      ]
      setColumns([
        ...columns,
        {
          id: nextId,
          title: `Source ${nextId}`,
          text: '',
          color: colors[(nextId - 1) % colors.length]
        }
      ])
      setNextId(nextId + 1)
    }
  }

  const removeColumn = (index) => {
    if (columns.length > 2) {
      const columnToRemove = columns[index]
      const newColumns = columns.filter((_, i) => i !== index)
      setColumns(newColumns)

      // Remove selected blocks from this column
      setSelectedBlocks(selectedBlocks.filter(block => block.columnId !== columnToRemove.id))
    }
  }

  const toggleBlock = (block) => {
    const isSelected = selectedBlocks.some(sb => sb.id === block.id)
    if (isSelected) {
      setSelectedBlocks(selectedBlocks.filter(sb => sb.id !== block.id))
    } else {
      setSelectedBlocks([...selectedBlocks, block])
    }
  }

  const clearOutput = () => {
    setSelectedBlocks([])
    setSelectedPrompt(null)
  }

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
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
            <h1 className="text-3xl font-bold text-gray-100">TextBuilder</h1>
          </div>

          <div className="flex gap-3 items-center">
            {columns.length < 5 && (
              <Button
                onClick={addColumn}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Column
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
          {/* Prompt Library - Left side */}
          <div className="col-span-2 h-full min-h-0">
            <PromptLibrary
              selectedPrompt={selectedPrompt}
              onSelectPrompt={setSelectedPrompt}
            />
          </div>

          {/* Source Columns - Middle */}
          <div className={`col-span-7 grid gap-4 h-full min-h-0 ${
            columns.length === 2 ? 'grid-cols-2' :
            columns.length === 3 ? 'grid-cols-3' :
            columns.length === 4 ? 'grid-cols-4' :
            'grid-cols-5'
          }`}>
            {columns.map((column, index) => (
              <div className="h-full min-h-0">
                <SourceColumn
                  key={column.id}
                  column={column}
                  onUpdateText={(updated) => updateColumn(index, updated)}
                  onToggleBlock={toggleBlock}
                  onRemove={() => removeColumn(index)}
                  canRemove={columns.length > 2}
                  selectedBlocks={selectedBlocks}
                />
              </div>
            ))}
          </div>

          {/* Output Column - Right side */}
          <div className="col-span-3 h-full min-h-0">
            <OutputColumn
              selectedBlocks={selectedBlocks}
              selectedPrompt={selectedPrompt}
              onClear={clearOutput}
            />
          </div>
        </div>

        <div className="text-center text-sm text-gray-500 flex-shrink-0">
          <p>Paste text in columns • Use double line breaks to create blocks • Select blocks to assemble your document • Add a prompt from the library</p>
        </div>
      </div>
    </div>
  )
}
