import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GitCompare, Type, Filter, Settings } from 'lucide-react'

export function HomePage({ onSelectTool }) {
  const tools = [
    {
      id: 'diff-tool',
      title: 'Diff Tool',
      description: 'Compare up to 5 text versions side by side. Highlight differences, set master versions, and export comparisons.',
      icon: GitCompare,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      available: true
    },
    {
      id: 'text-builder',
      title: 'Prompt Designer',
      description: 'Assemble documents from multiple text sources. Select blocks, add prompts, and build your masterclass content.',
      icon: Type,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      available: true
    },
    {
      id: 'prompt-framework',
      title: 'Prompt Framework',
      description: 'Organize reusable prompt templates, frameworks, and principles. Copy snippets with one click.',
      icon: Filter,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      available: true
    }
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative">
      {/* Settings button in top right */}
      <div className="absolute top-6 right-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSelectTool('settings')}
          className="text-gray-400 hover:text-white hover:bg-gray-800"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      <div className="max-w-6xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold text-gray-100">AI Tools</h1>
          <p className="text-xl text-gray-400">Choose a tool to get started</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
          {tools.map((tool) => {
            const Icon = tool.icon
            return (
              <Card
                key={tool.id}
                className={`bg-[#1a1a1a] border-[#333333] ${tool.borderColor} transition-all duration-300 ${
                  tool.available
                    ? 'hover:scale-105 hover:shadow-xl cursor-pointer hover:border-2'
                    : 'opacity-60 cursor-not-allowed'
                }`}
                onClick={() => tool.available && onSelectTool(tool.id)}
              >
                <CardHeader>
                  <div className={`w-16 h-16 rounded-lg ${tool.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`w-8 h-8 ${tool.iconColor}`} />
                  </div>
                  <CardTitle className="text-2xl text-gray-100">{tool.title}</CardTitle>
                  <CardDescription className="text-gray-400 text-base">
                    {tool.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!tool.available && (
                    <span className="text-sm text-gray-500 italic">Coming soon</span>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="text-center text-sm text-gray-600 pt-8">
          <p>More tools coming soon</p>
        </div>
      </div>
    </div>
  )
}
