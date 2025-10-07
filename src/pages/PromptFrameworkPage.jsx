import React, { useMemo, useState } from 'react'
import promptsData from '@/data/prompts.json'
import { Button } from '@/components/ui/button'
import { Copy, Home, Filter } from 'lucide-react'

export function PromptFrameworkPage({ onBackHome }) {
  const [activeFilter, setActiveFilter] = useState('all') // all | template | framework | principle | tone

  const groups = useMemo(() => {
    const grouped = promptsData.reduce((acc, p) => {
      const key = p.category || 'uncategorized'
      acc[key] = acc[key] || []
      acc[key].push(p)
      return acc
    }, {})
    // Optional stable ordering
    const order = ['template', 'framework', 'principle', 'tone', 'uncategorized']
    return order
      .filter(key => grouped[key]?.length)
      .map(key => ({ key, items: grouped[key] }))
  }, [])

  const visibleGroups = useMemo(() => {
    if (activeFilter === 'all') return groups
    return groups.filter(g => g.key === activeFilter)
  }, [groups, activeFilter])

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
  }

  const labelFor = (key) => {
    switch (key) {
      case 'template': return 'Templates'
      case 'framework': return 'Frameworks'
      case 'principle': return 'Principles'
      case 'tone': return 'Tone'
      default: return 'Other'
    }
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
            <h1 className="text-3xl font-bold text-gray-100">Prompt Framework</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'ghost'}
              className={activeFilter === 'all' ? 'bg-purple-600 text-white' : 'text-gray-300'}
              onClick={() => setActiveFilter('all')}
            >
              <Filter className="mr-2 h-4 w-4" /> All
            </Button>
            <Button
              variant={activeFilter === 'template' ? 'default' : 'ghost'}
              className={activeFilter === 'template' ? 'bg-purple-600 text-white' : 'text-gray-300'}
              onClick={() => setActiveFilter('template')}
            >
              Templates
            </Button>
            <Button
              variant={activeFilter === 'framework' ? 'default' : 'ghost'}
              className={activeFilter === 'framework' ? 'bg-purple-600 text-white' : 'text-gray-300'}
              onClick={() => setActiveFilter('framework')}
            >
              Frameworks
            </Button>
            <Button
              variant={activeFilter === 'principle' ? 'default' : 'ghost'}
              className={activeFilter === 'principle' ? 'bg-purple-600 text-white' : 'text-gray-300'}
              onClick={() => setActiveFilter('principle')}
            >
              Principles
            </Button>
            <Button
              variant={activeFilter === 'tone' ? 'default' : 'ghost'}
              className={activeFilter === 'tone' ? 'bg-purple-600 text-white' : 'text-gray-300'}
              onClick={() => setActiveFilter('tone')}
            >
              Tone
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6">
          {visibleGroups.map(group => (
            <div key={group.key}>
              <h2 className="text-xl font-semibold text-gray-200 mb-3">{labelFor(group.key)}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.items.map(item => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#1a1a1a] rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-purple-400 font-semibold text-sm">{item.title}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-300 hover:text-white"
                        onClick={() => handleCopy(item.text)}
                        title="Copy"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-gray-300 text-sm whitespace-pre-wrap">{item.text}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
