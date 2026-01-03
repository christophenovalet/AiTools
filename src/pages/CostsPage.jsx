import React, { useState, useEffect } from 'react'
import { ArrowLeft, BarChart3, Calendar, ChevronDown, ChevronRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchCostReport, hasAdminApiKey } from '@/lib/claude-api'

const DATE_PRESETS = [
  { id: 'last7', label: 'Last 7 days', getDates: () => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 7)
    return { start, end }
  }},
  { id: 'last30', label: 'Last 30 days', getDates: () => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    return { start, end }
  }},
  { id: 'thisMonth', label: 'This month', getDates: () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date()
    return { start, end }
  }},
  { id: 'lastMonth', label: 'Last month', getDates: () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return { start, end }
  }}
]

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateRange(start, end) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startStr} - ${endStr}`
}

function formatCost(amountCents) {
  const dollars = parseFloat(amountCents) / 100
  return `$${dollars.toFixed(2)}`
}

function toISODateString(date) {
  return date.toISOString()
}

export function CostsPage({ onBackHome }) {
  const [selectedPreset, setSelectedPreset] = useState('last7')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [costData, setCostData] = useState(null)
  const [expandedDays, setExpandedDays] = useState({})

  const fetchData = async () => {
    if (!hasAdminApiKey()) {
      setError('Admin API key is required. Please add it in Settings.')
      return
    }

    const preset = DATE_PRESETS.find(p => p.id === selectedPreset)
    if (!preset) return

    const { start, end } = preset.getDates()

    setLoading(true)
    setError(null)

    try {
      const data = await fetchCostReport(toISODateString(start), toISODateString(end))
      setCostData(data)
    } catch (err) {
      setError(err.message)
      setCostData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedPreset])

  const toggleDayExpanded = (date) => {
    setExpandedDays(prev => ({
      ...prev,
      [date]: !prev[date]
    }))
  }

  // Process cost data into daily summaries
  const dailySummaries = costData?.data?.map(bucket => {
    const totalCents = bucket.results.reduce((sum, r) => sum + parseFloat(r.amount), 0)
    return {
      date: bucket.starting_at,
      endDate: bucket.ending_at,
      totalCents,
      details: bucket.results
    }
  }) || []

  const totalCostCents = dailySummaries.reduce((sum, day) => sum + day.totalCents, 0)

  const preset = DATE_PRESETS.find(p => p.id === selectedPreset)
  const { start: periodStart, end: periodEnd } = preset?.getDates() || {}

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBackHome}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold text-gray-100">Cost Report</h1>
        </div>

        {/* Date Range Presets */}
        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg text-gray-100">Date Range</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPreset === preset.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#0a0a0a] text-gray-300 border border-[#333333] hover:border-blue-500/50 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <Button
                onClick={fetchData}
                variant="ghost"
                size="sm"
                disabled={loading}
                className="text-gray-400 hover:text-white"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card className="bg-[#1a1a1a] border-[#333333]">
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p>Loading cost data...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Card */}
        {!loading && costData && (
          <Card className="bg-[#1a1a1a] border-[#333333]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-lg text-gray-100">Summary</CardTitle>
                  <CardDescription className="text-gray-400">
                    {periodStart && periodEnd && formatDateRange(periodStart, periodEnd)}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-emerald-400">
                {formatCost(totalCostCents)}
              </div>
              <p className="text-sm text-gray-500 mt-1">Total cost for period</p>
            </CardContent>
          </Card>
        )}

        {/* Daily Breakdown */}
        {!loading && costData && dailySummaries.length > 0 && (
          <Card className="bg-[#1a1a1a] border-[#333333]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <CardTitle className="text-lg text-gray-100">Daily Breakdown</CardTitle>
                  <CardDescription className="text-gray-400">
                    Click a row to see details
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {dailySummaries.map((day) => (
                <div key={day.date} className="bg-[#0a0a0a] rounded-lg border border-[#333333] overflow-hidden">
                  <button
                    onClick={() => toggleDayExpanded(day.date)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedDays[day.date] ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="text-gray-200 font-medium">{formatDate(day.date)}</span>
                    </div>
                    <span className="text-emerald-400 font-mono">{formatCost(day.totalCents)}</span>
                  </button>

                  {expandedDays[day.date] && day.details.length > 0 && (
                    <div className="px-4 pb-3 pt-1 border-t border-[#333333]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-500 text-xs">
                            <th className="text-left py-2 font-medium">Description</th>
                            <th className="text-right py-2 font-medium">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {day.details.map((detail, idx) => (
                            <tr key={idx} className="text-gray-300">
                              <td className="py-1.5">
                                <div className="flex flex-col">
                                  <span>{detail.model || detail.cost_type || 'Unknown'}</span>
                                  {detail.token_type && (
                                    <span className="text-xs text-gray-500">{detail.token_type}</span>
                                  )}
                                </div>
                              </td>
                              <td className="text-right font-mono text-emerald-400/80">
                                {formatCost(detail.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}

              {/* Total Row */}
              <div className="px-4 py-3 bg-[#0a0a0a] rounded-lg border border-emerald-500/30 flex items-center justify-between">
                <span className="text-gray-200 font-semibold">Total</span>
                <span className="text-emerald-400 font-mono font-bold">{formatCost(totalCostCents)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && costData && dailySummaries.length === 0 && (
          <Card className="bg-[#1a1a1a] border-[#333333]">
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <BarChart3 className="w-8 h-8" />
                <p>No cost data available for this period</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
