import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  X, Move, Square, Circle, Type, Pen, ArrowRight,
  Image, Layers, ZoomIn, ZoomOut, Trash2, Copy, Eye, EyeOff, Lock, Unlock,
  ChevronDown, ChevronRight, RotateCcw, Download, Clipboard, Plus, Minus,
  AlertTriangle, Bug, PlusCircle, XCircle, ArrowUpRight, RefreshCw, MessageSquare, HelpCircle,
  Scissors, Spline, CornerDownRight, ArrowLeftRight, Hash, FileText, Undo2, Redo2, Maximize2
} from 'lucide-react'

const SquareDashed = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 3" />
  </svg>
)

// ================== CONSTANTS ==================
const TOOLS = {
  SELECT: 'select',
  RECTANGLE: 'rectangle',
  ELLIPSE: 'ellipse',
  LINE: 'line',
  ARROW: 'arrow',
  ELBOW_ARROW: 'elbow_arrow',
  CURVED_ARROW: 'curved_arrow',
  BIDIRECTIONAL: 'bidirectional',
  DASHED_ARROW: 'dashed_arrow',
  TEXT: 'text',
  PEN: 'pen',
  RECT_SELECT: 'rect_select',
  LASSO_SELECT: 'lasso_select',
  LABEL: 'label',
  TRANSFORM: 'transform'
}

const LABEL_PRESETS = [
  { type: 'TODO', color: '#EAB308', icon: '⚠️', text: 'TODO' },
  { type: 'FIX', color: '#EF4444', icon: '🐛', text: 'FIX THIS' },
  { type: 'ADD', color: '#22C55E', icon: '➕', text: 'ADD HERE' },
  { type: 'REMOVE', color: '#EF4444', icon: '✕', text: 'REMOVE' },
  { type: 'MOVE', color: '#3B82F6', icon: '↗️', text: 'MOVE TO' },
  { type: 'REPLACE', color: '#F97316', icon: '🔄', text: 'REPLACE WITH' },
  { type: 'NOTE', color: '#9CA3AF', icon: '💬', text: 'Note:' },
  { type: 'QUESTION', color: '#A855F7', icon: '❓', text: '?' }
]

const ARROW_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#F97316', '#A855F7', '#EAB308']

// ================== UTILITY FUNCTIONS ==================
const generateId = () => Math.random().toString(36).substr(2, 9)

const getCanvasPoint = (e, canvasRef, offset, zoom) => {
  const rect = canvasRef.current.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left - offset.x) / zoom,
    y: (e.clientY - rect.top - offset.y) / zoom
  }
}

// ================== LAYER PANEL COMPONENT ==================
const LayerPanel = ({ layers, selectedLayerIds, onSelectLayer, onToggleVisibility, onToggleLock, onDeleteLayer, onReorderLayers, onRenameLayer, smartFillOnDelete, onToggleSmartFill }) => {
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const handleStartRename = (layer) => {
    setEditingId(layer.id)
    setEditingName(layer.name)
  }

  const handleFinishRename = () => {
    if (editingId && editingName.trim()) {
      onRenameLayer(editingId, editingName.trim())
    }
    setEditingId(null)
    setEditingName('')
  }

  return (
    <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-2 w-64">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-sm font-semibold text-gray-300 flex items-center gap-1">
          <Layers className="h-4 w-4" /> Layers
        </span>
      </div>
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {[...layers].reverse().map((layer, index) => (
          <div
            key={layer.id}
            onClick={(e) => onSelectLayer(layer.id, e)}
            className={`group flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer text-sm ${
              selectedLayerIds.includes(layer.id) ? 'bg-blue-500/30 border border-blue-500' : 'hover:bg-gray-800'
            }`}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id) }}
              className="p-0.5 hover:bg-gray-700 rounded"
            >
              {layer.visible ? <Eye className="h-3 w-3 text-gray-400" /> : <EyeOff className="h-3 w-3 text-gray-500" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id) }}
              className="p-0.5 hover:bg-gray-700 rounded"
            >
              {layer.locked ? <Lock className="h-3 w-3 text-yellow-500" /> : <Unlock className="h-3 w-3 text-gray-500" />}
            </button>
            <div className={`w-3 h-3 rounded ${
              layer.type === 'image' ? 'bg-blue-500' :
              layer.type === 'cutout' ? 'bg-purple-500' :
              'bg-green-500'
            }`} />
            {editingId === layer.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                className="flex-1 bg-gray-800 text-gray-200 text-xs px-1 rounded outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="flex-1 text-gray-300 text-xs truncate"
                onDoubleClick={(e) => { e.stopPropagation(); handleStartRename(layer) }}
              >
                {layer.name}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id) }}
              className="p-0.5 hover:bg-red-500/30 rounded opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3 text-red-400" />
            </button>
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 px-1 pt-2 border-t border-gray-700 mt-2 cursor-pointer">
        <input
          type="checkbox"
          checked={smartFillOnDelete}
          onChange={() => onToggleSmartFill(!smartFillOnDelete)}
          className="w-3 h-3 accent-blue-500"
        />
        <span className="text-xs text-gray-400">Smart fill on delete</span>
      </label>
    </div>
  )
}

// ================== SEQUENCE PANEL COMPONENT ==================
const SequencePanel = ({ annotations, onReorder, onRemove, onSelectAnnotation }) => {
  const sequencedAnnotations = annotations
    .filter(a => a.sequenceNumber !== undefined)
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber)

  if (sequencedAnnotations.length === 0) return null

  return (
    <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-2 w-64">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-sm font-semibold text-gray-300 flex items-center gap-1">
          <Hash className="h-4 w-4" /> Sequence
        </span>
      </div>
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {sequencedAnnotations.map((ann, index) => (
          <div
            key={ann.id}
            onClick={() => onSelectAnnotation(ann.id)}
            className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm hover:bg-gray-800"
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              ann.priority === 'critical' ? 'bg-red-500 text-white' :
              ann.priority === 'optional' ? 'border border-dashed border-gray-500 text-gray-400' :
              'bg-blue-500 text-white'
            }`}>
              {ann.sequenceNumber}
            </span>
            <span className="flex-1 text-gray-300 text-xs truncate">
              {ann.label?.text || ann.text || `Step ${ann.sequenceNumber}`}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(ann.id) }}
              className="p-0.5 hover:bg-red-500/30 rounded"
            >
              <X className="h-3 w-3 text-red-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ================== PROPERTIES PANEL COMPONENT ==================
const PropertiesPanel = ({ selectedObject, onUpdateObject }) => {
  if (!selectedObject) {
    return (
      <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 w-64">
        <span className="text-sm text-gray-500">No selection</span>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 w-64 space-y-3">
      <span className="text-sm font-semibold text-gray-300">Properties</span>

      {/* Stroke Color */}
      {selectedObject.strokeColor !== undefined && (
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Stroke Color</label>
          <div className="flex gap-1">
            {ARROW_COLORS.map(color => (
              <button
                key={color}
                onClick={() => onUpdateObject({ ...selectedObject, strokeColor: color })}
                className={`w-5 h-5 rounded ${selectedObject.strokeColor === color ? 'ring-2 ring-white' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Stroke Width */}
      {selectedObject.strokeWidth !== undefined && (
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Stroke Width</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 6].map(w => (
              <button
                key={w}
                onClick={() => onUpdateObject({ ...selectedObject, strokeWidth: w })}
                className={`px-2 py-1 text-xs rounded ${selectedObject.strokeWidth === w ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stroke Style */}
      {selectedObject.strokeWidth !== undefined && (
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Stroke Style</label>
          <div className="flex gap-1">
            <button
              onClick={() => onUpdateObject({ ...selectedObject, dashed: false })}
              className={`px-2 py-1 rounded ${!selectedObject.dashed ? 'bg-blue-500' : 'bg-gray-700'}`}
              title="Solid"
            >
              <svg width="20" height="12" viewBox="0 0 20 12"><line x1="2" y1="6" x2="18" y2="6" stroke="currentColor" strokeWidth="2"/></svg>
            </button>
            <button
              onClick={() => onUpdateObject({ ...selectedObject, dashed: true })}
              className={`px-2 py-1 rounded ${selectedObject.dashed ? 'bg-blue-500' : 'bg-gray-700'}`}
              title="Dotted"
            >
              <svg width="20" height="12" viewBox="0 0 20 12"><line x1="2" y1="6" x2="18" y2="6" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Fill Color */}
      {selectedObject.fillColor !== undefined && (
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Fill</label>
          <div className="flex gap-1 items-center">
            <button
              onClick={() => onUpdateObject({ ...selectedObject, fillColor: 'none' })}
              className={`px-2 py-1 text-xs rounded ${selectedObject.fillColor === 'none' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              None
            </button>
            {ARROW_COLORS.slice(0, 4).map(color => (
              <button
                key={color}
                onClick={() => onUpdateObject({ ...selectedObject, fillColor: color + '40' })}
                className={`w-5 h-5 rounded ${selectedObject.fillColor === color + '40' ? 'ring-2 ring-white' : ''}`}
                style={{ backgroundColor: color + '40' }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Text Input for Labels */}
      {selectedObject.text !== undefined && (
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Text</label>
          <input
            type="text"
            value={selectedObject.text}
            onChange={(e) => onUpdateObject({ ...selectedObject, text: e.target.value })}
            className="w-full bg-gray-800 text-gray-200 text-sm px-2 py-1 rounded border border-gray-600 focus:border-blue-500 outline-none"
          />
        </div>
      )}

      {/* Font Size for Text */}
      {selectedObject.fontSize !== undefined && (
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Font Size</label>
          <div className="flex gap-1">
            {[16, 24, 36, 48].map(s => (
              <button
                key={s}
                onClick={() => onUpdateObject({ ...selectedObject, fontSize: s })}
                className={`px-2 py-1 text-xs rounded ${selectedObject.fontSize === s ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Priority for Sequenced Items */}
      {selectedObject.sequenceNumber !== undefined && (
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Priority</label>
          <div className="flex gap-1">
            {['normal', 'critical', 'optional'].map(p => (
              <button
                key={p}
                onClick={() => onUpdateObject({ ...selectedObject, priority: p })}
                className={`px-2 py-1 text-xs rounded capitalize ${selectedObject.priority === p ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ================== MAIN COMPONENT ==================
export function MockupAnnotator({ isOpen, onClose }) {
  // Canvas state
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [isDraggingObject, setIsDraggingObject] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Transform tool state
  const [transformHandle, setTransformHandle] = useState(null) // 'tl','tr','bl','br','rotate'
  const [transformStart, setTransformStart] = useState(null) // { x, y, bounds, rotation, scaleX, scaleY }

  // Tool state
  const [activeTool, setActiveTool] = useState(TOOLS.SELECT)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState(null)
  const [currentPath, setCurrentPath] = useState([])

  // Layer state
  const [layers, setLayers] = useState([])
  const [selectedLayerIds, setSelectedLayerIds] = useState([])

  // Object state
  const [objects, setObjects] = useState([])
  const [selectedObjectId, setSelectedObjectId] = useState(null)

  // Undo/redo history
  const historyRef = useRef([{ objects: [], layers: [] }])
  const historyIndexRef = useRef(0)
  const isUndoingRef = useRef(false)

  const pushHistory = useCallback((newObjects, newLayers) => {
    if (isUndoingRef.current) return
    const history = historyRef.current
    // Trim any future entries
    historyRef.current = history.slice(0, historyIndexRef.current + 1)
    // Push new snapshot (strip image elements for size, keep references)
    historyRef.current.push({ objects: newObjects, layers: newLayers })
    historyIndexRef.current = historyRef.current.length - 1
    // Limit history size
    if (historyRef.current.length > 50) {
      historyRef.current.shift()
      historyIndexRef.current--
    }
  }, [])

  // Track changes to push history
  useEffect(() => {
    if (isUndoingRef.current) {
      isUndoingRef.current = false
      return
    }
    pushHistory(objects, layers)
  }, [objects, layers, pushHistory])

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    isUndoingRef.current = true
    historyIndexRef.current--
    const snapshot = historyRef.current[historyIndexRef.current]
    setObjects(snapshot.objects)
    setLayers(snapshot.layers)
  }, [])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    isUndoingRef.current = true
    historyIndexRef.current++
    const snapshot = historyRef.current[historyIndexRef.current]
    setObjects(snapshot.objects)
    setLayers(snapshot.layers)
  }, [])

  // Sequence mode
  const [sequenceMode, setSequenceMode] = useState(false)
  const [nextSequenceNumber, setNextSequenceNumber] = useState(1)

  // Smart fill on delete
  const [smartFillOnDelete, setSmartFillOnDelete] = useState(true)

  // Text size (persisted)
  const [textSize, setTextSize] = useState(() => parseInt(localStorage.getItem('annotator-text-size')) || 16)
  const updateTextSize = (size) => { setTextSize(size); localStorage.setItem('annotator-text-size', size) }

  // Pen width (persisted)
  const [penWidth, setPenWidth] = useState(() => parseInt(localStorage.getItem('annotator-pen-width')) || 2)
  const updatePenWidth = (w) => { setPenWidth(w); localStorage.setItem('annotator-pen-width', w) }

  // Foreground color (persisted)
  const [fgColor, setFgColor] = useState(() => localStorage.getItem('annotator-fg-color') || '#ffffff')
  const fgColorInputRef = useRef(null)

  // Context menu
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })

  // Label menu
  const [showLabelMenu, setShowLabelMenu] = useState(false)
  const [labelMenuPosition, setLabelMenuPosition] = useState({ x: 0, y: 0 })
  const [pendingLabelPosition, setPendingLabelPosition] = useState(null)

  // Text editing
  const [editingTextId, setEditingTextId] = useState(null)
  const [editingTextValue, setEditingTextValue] = useState('')
  const [editingOriginalValue, setEditingOriginalValue] = useState('')
  const [inlineEditCursorPos, setInlineEditCursorPos] = useState(0)
  const [inlineEditCursorVisible, setInlineEditCursorVisible] = useState(true)
  const inlineEditBlinkRef = useRef(null)

  // Selection for cutout
  const [selectionPath, setSelectionPath] = useState([])
  const [selectionType, setSelectionType] = useState(null)

  // Get selected object
  const selectedObject = objects.find(obj => obj.id === selectedObjectId)

  // ================== CANVAS RENDERING ==================
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width, height } = canvas

    // Clear
    ctx.clearRect(0, 0, width, height)

    // Draw checkerboard background
    const gridSize = 20
    ctx.save()
    for (let x = 0; x < width; x += gridSize) {
      for (let y = 0; y < height; y += gridSize) {
        ctx.fillStyle = ((x + y) / gridSize) % 2 === 0 ? '#1a1a1a' : '#222'
        ctx.fillRect(x, y, gridSize, gridSize)
      }
    }
    ctx.restore()

    // Apply transform
    ctx.save()
    ctx.translate(offset.x, offset.y)
    ctx.scale(zoom, zoom)

    // Render layers and objects
    layers.filter(l => l.visible).forEach(layer => {
      const layerObjects = objects.filter(obj => obj.layerId === layer.id)

      layerObjects.forEach(obj => {
        ctx.save()

        // Set opacity
        ctx.globalAlpha = obj.opacity ?? 1

        // Apply rotation/scale transforms
        if (obj.rotation || obj.scaleX !== undefined || obj.scaleY !== undefined) {
          const bounds = getObjectBounds(obj)
          const cx = bounds.x + bounds.width / 2
          const cy = bounds.y + bounds.height / 2
          ctx.translate(cx, cy)
          if (obj.rotation) ctx.rotate(obj.rotation)
          if (obj.scaleX !== undefined || obj.scaleY !== undefined) {
            ctx.scale(obj.scaleX ?? 1, obj.scaleY ?? 1)
          }
          ctx.translate(-cx, -cy)
        }

        switch (obj.type) {
          case 'image':
            if (obj.image) {
              ctx.drawImage(obj.image, obj.x, obj.y, obj.width, obj.height)
            }
            break

          case 'rectangle':
            if (obj.fillColor && obj.fillColor !== 'none') {
              ctx.fillStyle = obj.fillColor
              ctx.fillRect(obj.x, obj.y, obj.width, obj.height)
            }
            ctx.strokeStyle = obj.strokeColor || '#fff'
            ctx.lineWidth = obj.strokeWidth || 2
            if (obj.dashed) ctx.setLineDash([5, 5])
            ctx.strokeRect(obj.x, obj.y, obj.width, obj.height)
            ctx.setLineDash([])
            break

          case 'ellipse':
            ctx.beginPath()
            ctx.ellipse(
              obj.x + obj.width / 2,
              obj.y + obj.height / 2,
              Math.abs(obj.width / 2),
              Math.abs(obj.height / 2),
              0, 0, Math.PI * 2
            )
            if (obj.fillColor && obj.fillColor !== 'none') {
              ctx.fillStyle = obj.fillColor
              ctx.fill()
            }
            ctx.strokeStyle = obj.strokeColor || '#fff'
            ctx.lineWidth = obj.strokeWidth || 2
            ctx.stroke()
            break

          case 'line':
            ctx.beginPath()
            ctx.moveTo(obj.x1, obj.y1)
            ctx.lineTo(obj.x2, obj.y2)
            ctx.strokeStyle = obj.strokeColor || '#fff'
            ctx.lineWidth = obj.strokeWidth || 2
            ctx.stroke()
            break

          case 'arrow':
          case 'dashed_arrow':
            drawArrow(ctx, obj)
            break

          case 'elbow_arrow':
            drawElbowArrow(ctx, obj)
            break

          case 'curved_arrow':
            drawCurvedArrow(ctx, obj)
            break

          case 'bidirectional':
            drawBidirectionalArrow(ctx, obj)
            break

          case 'pen':
            if (obj.points && obj.points.length > 1) {
              ctx.beginPath()
              ctx.moveTo(obj.points[0].x, obj.points[0].y)
              for (let i = 1; i < obj.points.length; i++) {
                ctx.lineTo(obj.points[i].x, obj.points[i].y)
              }
              ctx.strokeStyle = obj.strokeColor || '#fff'
              ctx.lineWidth = obj.strokeWidth || 2
              ctx.lineCap = 'round'
              ctx.lineJoin = 'round'
              if (obj.dashed) ctx.setLineDash([5, 5])
              ctx.stroke()
              ctx.setLineDash([])
            }
            break

          case 'text': {
            const fontSize = obj.fontSize || 16
            const fontFamily = obj.fontFamily || 'sans-serif'
            ctx.font = `${fontSize}px ${fontFamily}`
            ctx.fillStyle = obj.color || '#fff'
            ctx.textBaseline = 'top'
            const isEditing = obj.id === editingTextId
            const displayText = isEditing ? editingTextValue : (obj.text || '')
            const lines = displayText.split('\n')
            const lineHeight = fontSize * 1.3
            if (obj.background && obj.background !== 'none') {
              const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width), 2)
              ctx.fillStyle = obj.background
              ctx.fillRect(obj.x - 4, obj.y - 2, maxWidth + 8, lines.length * lineHeight + 4)
              ctx.fillStyle = obj.color || '#fff'
            }
            lines.forEach((line, i) => {
              ctx.fillText(line, obj.x, obj.y + i * lineHeight)
            })
            // Draw blinking cursor
            if (isEditing && inlineEditCursorVisible) {
              let charCount = 0
              let cursorLine = 0
              let cursorCol = 0
              for (let i = 0; i < lines.length; i++) {
                if (inlineEditCursorPos <= charCount + lines[i].length) {
                  cursorLine = i
                  cursorCol = inlineEditCursorPos - charCount
                  break
                }
                charCount += lines[i].length + 1 // +1 for \n
              }
              const textBeforeCursor = lines[cursorLine].substring(0, cursorCol)
              const cursorX = obj.x + ctx.measureText(textBeforeCursor).width
              const cursorY = obj.y + cursorLine * lineHeight
              ctx.strokeStyle = obj.color || '#fff'
              ctx.lineWidth = 1.5 / zoom
              ctx.beginPath()
              ctx.moveTo(cursorX, cursorY)
              ctx.lineTo(cursorX, cursorY + fontSize)
              ctx.stroke()
            }
            break
          }

          case 'label':
            drawLabel(ctx, obj)
            break
        }

        // Draw selection box (skip for images, labels, arrows, and text)
        const skipSelection = ['image', 'label', 'text', 'arrow', 'dashed_arrow', 'elbow_arrow', 'curved_arrow', 'bidirectional', 'rectangle', 'ellipse', 'pen']
        if (obj.id === selectedObjectId && !skipSelection.includes(obj.type) && activeTool !== TOOLS.TRANSFORM) {
          ctx.strokeStyle = '#00bfff'
          ctx.lineWidth = 2 / zoom
          ctx.setLineDash([5 / zoom, 5 / zoom])
          const bounds = getObjectBounds(obj)
          ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10)
          ctx.setLineDash([])
        }

        // Draw transform bounding box with handles (in transformed space)
        if (obj.id === selectedObjectId && activeTool === TOOLS.TRANSFORM) {

          const bounds = getObjectBounds(obj)
          const pad = 8
          const bx = bounds.x - pad
          const by = bounds.y - pad
          const bw = bounds.width + pad * 2
          const bh = bounds.height + pad * 2
          const handleSize = 8 / zoom
          const rotateOffset = 30 / zoom

          // Bounding box
          ctx.strokeStyle = '#00bfff'
          ctx.lineWidth = 1.5 / zoom
          ctx.setLineDash([])
          ctx.strokeRect(bx, by, bw, bh)

          // Corner handles (scale)
          const corners = [
            { x: bx, y: by },                  // top-left
            { x: bx + bw, y: by },             // top-right
            { x: bx, y: by + bh },             // bottom-left
            { x: bx + bw, y: by + bh }         // bottom-right
          ]
          corners.forEach(c => {
            ctx.fillStyle = '#fff'
            ctx.strokeStyle = '#00bfff'
            ctx.lineWidth = 1.5 / zoom
            ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize)
            ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize)
          })

          // Rotation handle (above top center)
          const rcx = bx + bw / 2
          const rcy = by - rotateOffset
          ctx.beginPath()
          ctx.moveTo(rcx, by)
          ctx.lineTo(rcx, rcy)
          ctx.strokeStyle = '#00bfff'
          ctx.lineWidth = 1.5 / zoom
          ctx.stroke()

          ctx.beginPath()
          ctx.arc(rcx, rcy, handleSize / 2, 0, Math.PI * 2)
          ctx.fillStyle = '#fff'
          ctx.fill()
          ctx.strokeStyle = '#00bfff'
          ctx.stroke()
        }

        // Draw sequence number badge
        if (obj.sequenceNumber !== undefined) {
          const bounds = getObjectBounds(obj)
          const badgeX = bounds.x - 10
          const badgeY = bounds.y - 10
          const badgeSize = 20

          ctx.beginPath()
          ctx.arc(badgeX, badgeY, badgeSize / 2, 0, Math.PI * 2)
          ctx.fillStyle = obj.priority === 'critical' ? '#EF4444' :
                          obj.priority === 'optional' ? '#374151' : '#3B82F6'
          ctx.fill()
          if (obj.priority === 'optional') {
            ctx.strokeStyle = '#6B7280'
            ctx.setLineDash([2, 2])
            ctx.stroke()
            ctx.setLineDash([])
          }

          ctx.fillStyle = '#fff'
          ctx.font = 'bold 12px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(obj.sequenceNumber.toString(), badgeX, badgeY)
        }

        ctx.restore()
      })
    })

    // Draw current drawing preview
    if (isDrawing && drawStart) {
      ctx.strokeStyle = '#00bfff'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])

      if (activeTool === TOOLS.RECTANGLE || activeTool === TOOLS.RECT_SELECT) {
        const w = currentPath[0]?.x - drawStart.x || 0
        const h = currentPath[0]?.y - drawStart.y || 0
        ctx.strokeRect(drawStart.x, drawStart.y, w, h)
      } else if (activeTool === TOOLS.ELLIPSE) {
        const w = currentPath[0]?.x - drawStart.x || 0
        const h = currentPath[0]?.y - drawStart.y || 0
        ctx.beginPath()
        ctx.ellipse(
          drawStart.x + w / 2,
          drawStart.y + h / 2,
          Math.abs(w / 2),
          Math.abs(h / 2),
          0, 0, Math.PI * 2
        )
        ctx.stroke()
      } else if ([TOOLS.LINE, TOOLS.ARROW, TOOLS.ELBOW_ARROW, TOOLS.CURVED_ARROW, TOOLS.BIDIRECTIONAL, TOOLS.DASHED_ARROW].includes(activeTool)) {
        ctx.beginPath()
        ctx.moveTo(drawStart.x, drawStart.y)
        if (currentPath[0]) {
          ctx.lineTo(currentPath[0].x, currentPath[0].y)
        }
        ctx.stroke()
      } else if (activeTool === TOOLS.PEN && currentPath.length > 0) {
        ctx.beginPath()
        ctx.moveTo(currentPath[0].x, currentPath[0].y)
        for (let i = 1; i < currentPath.length; i++) {
          ctx.lineTo(currentPath[i].x, currentPath[i].y)
        }
        ctx.stroke()
      } else if (activeTool === TOOLS.LASSO_SELECT && currentPath.length > 0) {
        ctx.beginPath()
        ctx.moveTo(currentPath[0].x, currentPath[0].y)
        for (let i = 1; i < currentPath.length; i++) {
          ctx.lineTo(currentPath[i].x, currentPath[i].y)
        }
        ctx.closePath()
        ctx.stroke()
      }
      ctx.setLineDash([])
    }

    // Draw selection path
    if (selectionPath.length > 0) {
      ctx.strokeStyle = '#00bfff'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(selectionPath[0].x, selectionPath[0].y)
      for (let i = 1; i < selectionPath.length; i++) {
        ctx.lineTo(selectionPath[i].x, selectionPath[i].y)
      }
      ctx.closePath()
      ctx.stroke()
      ctx.fillStyle = 'rgba(0, 191, 255, 0.1)'
      ctx.fill()
      ctx.setLineDash([])
    }

    ctx.restore()
  }, [layers, objects, selectedObjectId, zoom, offset, isDrawing, drawStart, currentPath, activeTool, selectionPath, editingTextId, editingTextValue, inlineEditCursorVisible, inlineEditCursorPos])

  // ================== ARROW DRAWING HELPERS ==================
  const drawArrowOutline = (ctx, drawFn) => {
    // Drop shadow pass
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2
    drawFn(ctx, '#ffffff', true)
    ctx.restore()

    // White border pass (no shadow)
    drawFn(ctx, '#ffffff', true)

    // Color pass on top
    drawFn(ctx, null, false)
  }

  const drawArrow = (ctx, obj) => {
    const { x1, y1, x2, y2, strokeColor, strokeWidth, dashed } = obj
    const headLength = 15
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const width = strokeWidth || 3
    // Shorten line so it ends at the base of the arrowhead
    const lineEndX = x2 - (headLength - 3) * Math.cos(angle)
    const lineEndY = y2 - (headLength - 3) * Math.sin(angle)

    drawArrowOutline(ctx, (c, overrideColor, isBorder) => {
      c.beginPath()
      c.moveTo(x1, y1)
      c.lineTo(lineEndX, lineEndY)
      c.strokeStyle = overrideColor || strokeColor || '#EF4444'
      c.lineWidth = isBorder ? width + 2 : width
      if (dashed) c.setLineDash([8, 4])
      c.stroke()
      c.setLineDash([])

      c.beginPath()
      c.moveTo(x2, y2)
      c.lineTo(
        x2 - headLength * Math.cos(angle - Math.PI / 6),
        y2 - headLength * Math.sin(angle - Math.PI / 6)
      )
      c.lineTo(
        x2 - headLength * Math.cos(angle + Math.PI / 6),
        y2 - headLength * Math.sin(angle + Math.PI / 6)
      )
      c.closePath()
      c.fillStyle = overrideColor || strokeColor || '#EF4444'
      c.fill()
      if (isBorder) {
        c.strokeStyle = overrideColor
        c.lineWidth = 1
        c.stroke()
      }
    })
  }

  const drawElbowArrow = (ctx, obj) => {
    const { x1, y1, x2, y2, strokeColor, strokeWidth } = obj
    const midX = (x1 + x2) / 2
    const headLength = 15
    const width = strokeWidth || 3
    const finalAngleElbow = x2 > midX ? 0 : Math.PI
    const lineEndX = x2 - (headLength - 3) * Math.cos(finalAngleElbow)

    drawArrowOutline(ctx, (c, overrideColor, isBorder) => {
      c.beginPath()
      c.moveTo(x1, y1)
      c.lineTo(midX, y1)
      c.lineTo(midX, y2)
      c.lineTo(lineEndX, y2)
      c.strokeStyle = overrideColor || strokeColor || '#3B82F6'
      c.lineWidth = isBorder ? width + 2 : width
      c.stroke()

      const finalAngle = x2 > midX ? 0 : Math.PI
      c.beginPath()
      c.moveTo(x2, y2)
      c.lineTo(
        x2 - headLength * Math.cos(finalAngle - Math.PI / 6),
        y2 - headLength * Math.sin(finalAngle - Math.PI / 6)
      )
      c.lineTo(
        x2 - headLength * Math.cos(finalAngle + Math.PI / 6),
        y2 - headLength * Math.sin(finalAngle + Math.PI / 6)
      )
      c.closePath()
      c.fillStyle = overrideColor || strokeColor || '#3B82F6'
      c.fill()
      if (isBorder) {
        c.strokeStyle = overrideColor
        c.lineWidth = 1
        c.stroke()
      }
    })
  }

  const drawCurvedArrow = (ctx, obj) => {
    const { x1, y1, x2, y2, strokeColor, strokeWidth, controlX, controlY } = obj
    const cpX = controlX ?? (x1 + x2) / 2
    const cpY = controlY ?? Math.min(y1, y2) - 50
    const headLength = 15
    const width = strokeWidth || 3

    const t = 0.99
    const dx = 2 * (1 - t) * (cpX - x1) + 2 * t * (x2 - cpX)
    const dy = 2 * (1 - t) * (cpY - y1) + 2 * t * (y2 - cpY)
    const angle = Math.atan2(dy, dx)
    // Shorten curve endpoint so line doesn't poke through arrowhead
    const curveEndX = x2 - (headLength - 3) * Math.cos(angle)
    const curveEndY = y2 - (headLength - 3) * Math.sin(angle)

    drawArrowOutline(ctx, (c, overrideColor, isBorder) => {
      c.beginPath()
      c.moveTo(x1, y1)
      c.quadraticCurveTo(cpX, cpY, curveEndX, curveEndY)
      c.strokeStyle = overrideColor || strokeColor || '#22C55E'
      c.lineWidth = isBorder ? width + 2 : width
      c.stroke()

      c.beginPath()
      c.moveTo(x2, y2)
      c.lineTo(
        x2 - headLength * Math.cos(angle - Math.PI / 6),
        y2 - headLength * Math.sin(angle - Math.PI / 6)
      )
      c.lineTo(
        x2 - headLength * Math.cos(angle + Math.PI / 6),
        y2 - headLength * Math.sin(angle + Math.PI / 6)
      )
      c.closePath()
      c.fillStyle = overrideColor || strokeColor || '#22C55E'
      c.fill()
      if (isBorder) {
        c.strokeStyle = overrideColor
        c.lineWidth = 1
        c.stroke()
      }
    })
  }

  const drawBidirectionalArrow = (ctx, obj) => {
    const { x1, y1, x2, y2, strokeColor, strokeWidth } = obj
    const headLength = 15
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const reverseAngle = angle + Math.PI
    const width = strokeWidth || 3
    // Shorten line from both ends
    const lineStartX = x1 + (headLength - 3) * Math.cos(angle)
    const lineStartY = y1 + (headLength - 3) * Math.sin(angle)
    const lineEndX = x2 - (headLength - 3) * Math.cos(angle)
    const lineEndY = y2 - (headLength - 3) * Math.sin(angle)

    drawArrowOutline(ctx, (c, overrideColor, isBorder) => {
      c.beginPath()
      c.moveTo(lineStartX, lineStartY)
      c.lineTo(lineEndX, lineEndY)
      c.strokeStyle = overrideColor || strokeColor || '#A855F7'
      c.lineWidth = isBorder ? width + 2 : width
      c.stroke()

      // Head at end
      c.beginPath()
      c.moveTo(x2, y2)
      c.lineTo(
        x2 - headLength * Math.cos(angle - Math.PI / 6),
        y2 - headLength * Math.sin(angle - Math.PI / 6)
      )
      c.lineTo(
        x2 - headLength * Math.cos(angle + Math.PI / 6),
        y2 - headLength * Math.sin(angle + Math.PI / 6)
      )
      c.closePath()
      c.fillStyle = overrideColor || strokeColor || '#A855F7'
      c.fill()
      if (isBorder) {
        c.strokeStyle = overrideColor
        c.lineWidth = 1
        c.stroke()
      }

      // Head at start
      c.beginPath()
      c.moveTo(x1, y1)
      c.lineTo(
        x1 - headLength * Math.cos(reverseAngle - Math.PI / 6),
        y1 - headLength * Math.sin(reverseAngle - Math.PI / 6)
      )
      c.lineTo(
        x1 - headLength * Math.cos(reverseAngle + Math.PI / 6),
        y1 - headLength * Math.sin(reverseAngle + Math.PI / 6)
      )
      c.closePath()
      c.fillStyle = overrideColor || strokeColor || '#A855F7'
      c.fill()
      if (isBorder) {
        c.strokeStyle = overrideColor
        c.lineWidth = 1
        c.stroke()
      }
    })
  }

  const drawLabel = (ctx, obj) => {
    const { x, y, label, text, bodyText } = obj
    const preset = LABEL_PRESETS.find(p => p.type === label?.type) || LABEL_PRESETS[0]
    const displayText = text || preset.text
    const padding = 8
    const lineHeight = 20
    const isEditing = editingTextId === obj.id

    ctx.font = 'bold 12px sans-serif'
    const headerLines = displayText.split('\n')
    const headerWidth = Math.max(...headerLines.map(line => ctx.measureText(line).width)) + padding * 2
    const headerHeight = headerLines.length * lineHeight + 4

    let totalHeight = headerHeight
    let bodyWidth = 0
    let bodyLines = []

    if (bodyText) {
      ctx.font = '12px sans-serif'
      bodyLines = bodyText.split('\n')
      bodyWidth = Math.max(...bodyLines.map(line => ctx.measureText(line).width))
      totalHeight += bodyLines.length * 18 + padding
    }

    const totalWidth = Math.max(headerWidth, bodyWidth + padding * 2)

    if (!isEditing) {
      // Drop shadow
      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
      ctx.shadowBlur = 6
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2

      // Orange background
      ctx.fillStyle = '#F97316'
      ctx.beginPath()
      ctx.roundRect(x, y, totalWidth, totalHeight, 4)
      ctx.fill()
      ctx.restore()

      // 2px white border
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(x, y, totalWidth, totalHeight, 4)
      ctx.stroke()

      // Header text (white on orange)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 12px sans-serif'
      ctx.textBaseline = 'middle'
      headerLines.forEach((line, i) => {
        ctx.fillText(line, x + padding, y + i * lineHeight + lineHeight / 2 + 2)
      })

      // Body text
      if (bodyText) {
        ctx.fillStyle = '#fff'
        ctx.font = '12px sans-serif'
        bodyLines.forEach((line, i) => {
          ctx.fillText(line, x + padding, y + headerHeight + i * 18 + 9)
        })
      }
    }
  }

  const measureMultilineText = (text, fontSize = 16, fontFamily = 'sans-serif') => {
    const canvas = canvasRef.current
    if (!canvas) return { width: 10, height: fontSize, lineWidths: [10], lineHeight: fontSize * 1.3, lines: [text || ''] }
    const ctx = canvas.getContext('2d')
    ctx.font = `${fontSize}px ${fontFamily}`
    const lines = (text || '').split('\n')
    const lineHeight = fontSize * 1.3
    const lineWidths = lines.map(line => ctx.measureText(line).width)
    const width = Math.max(...lineWidths, 10)
    const height = lines.length * lineHeight
    return { width, height, lineWidths, lineHeight, lines }
  }

  const getObjectBounds = (obj) => {
    switch (obj.type) {
      case 'rectangle':
      case 'ellipse':
      case 'image':
        return { x: obj.x, y: obj.y, width: obj.width, height: obj.height }
      case 'line':
      case 'arrow':
      case 'dashed_arrow':
      case 'elbow_arrow':
      case 'curved_arrow':
      case 'bidirectional':
        return {
          x: Math.min(obj.x1, obj.x2),
          y: Math.min(obj.y1, obj.y2),
          width: Math.abs(obj.x2 - obj.x1),
          height: Math.abs(obj.y2 - obj.y1)
        }
      case 'text': {
        const textToMeasure = (editingTextId === obj.id ? editingTextValue : obj.text) || ''
        const measured = measureMultilineText(textToMeasure, obj.fontSize || 16, obj.fontFamily || 'sans-serif')
        return { x: obj.x, y: obj.y, width: Math.max(measured.width, 2), height: Math.max(measured.height, obj.fontSize || 16) }
      }
      case 'label':
        return { x: obj.x, y: obj.y, width: 120, height: 40 }
      case 'pen':
        if (!obj.points || obj.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
        const xs = obj.points.map(p => p.x)
        const ys = obj.points.map(p => p.y)
        return {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys)
        }
      default:
        return { x: 0, y: 0, width: 0, height: 0 }
    }
  }

  // ================== EVENT HANDLERS ==================
  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !containerRef.current) return

    const resizeCanvas = () => {
      canvas.width = containerRef.current.clientWidth
      canvas.height = containerRef.current.clientHeight
      renderCanvas()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [isOpen, renderCanvas])

  // Cursor blink for inline text editing
  useEffect(() => {
    if (editingTextId) {
      const editObj = objects.find(o => o.id === editingTextId)
      if (editObj && editObj.type === 'text') {
        setInlineEditCursorVisible(true)
        inlineEditBlinkRef.current = setInterval(() => {
          setInlineEditCursorVisible(v => !v)
        }, 530)
        return () => clearInterval(inlineEditBlinkRef.current)
      }
    }
    if (inlineEditBlinkRef.current) {
      clearInterval(inlineEditBlinkRef.current)
      inlineEditBlinkRef.current = null
    }
  }, [editingTextId])

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.min(Math.max(zoom * delta, 0.1), 5)

    // Zoom towards mouse position
    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const newOffset = {
      x: mouseX - (mouseX - offset.x) * (newZoom / zoom),
      y: mouseY - (mouseY - offset.y) * (newZoom / zoom)
    }

    setZoom(newZoom)
    setOffset(newOffset)
  }, [zoom, offset])

  // Mouse handlers
  const handleMouseDown = useCallback((e) => {
    // Right click is handled by context menu
    if (e.button === 2) return

    const point = getCanvasPoint(e, canvasRef, offset, zoom)

    // Middle click always pans
    if (e.button === 1) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
      return
    }

    // If currently inline-editing a text object, handle click-to-reposition or confirm
    if (editingTextId) {
      const editObj = objects.find(o => o.id === editingTextId)
      if (editObj && editObj.type === 'text') {
        const bounds = getObjectBounds(editObj)
        const inBounds = point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
                         point.y >= bounds.y && point.y <= bounds.y + bounds.height
        if (inBounds) {
          // Reposition cursor based on click location
          const fontSize = editObj.fontSize || 16
          const fontFamily = editObj.fontFamily || 'sans-serif'
          const lineHeight = fontSize * 1.3
          const lines = editingTextValue.split('\n')
          const clickedLine = Math.min(Math.floor((point.y - editObj.y) / lineHeight), lines.length - 1)
          const lineIdx = Math.max(0, clickedLine)
          const canvas = canvasRef.current
          const ctx = canvas.getContext('2d')
          ctx.font = `${fontSize}px ${fontFamily}`
          // Find closest char position in clicked line
          let bestPos = 0
          let bestDist = Infinity
          for (let c = 0; c <= lines[lineIdx].length; c++) {
            const w = ctx.measureText(lines[lineIdx].substring(0, c)).width
            const dist = Math.abs(point.x - (editObj.x + w))
            if (dist < bestDist) {
              bestDist = dist
              bestPos = c
            }
          }
          // Convert to absolute position
          let absPos = 0
          for (let i = 0; i < lineIdx; i++) {
            absPos += lines[i].length + 1
          }
          absPos += bestPos
          setInlineEditCursorPos(absPos)
          setInlineEditCursorVisible(true)
          return
        } else {
          // Clicked outside - confirm edit
          if (editingTextValue.trim() === '') {
            setObjects(prev => prev.filter(o => o.id !== editingTextId))
          } else {
            setObjects(prev => prev.map(obj =>
              obj.id === editingTextId ? { ...obj, text: editingTextValue } : obj
            ))
          }
          setEditingTextId(null)
          setEditingTextValue('')
        }
      }
    }

    // Select tool: click object to select & drag, empty space to pan
    if (activeTool === TOOLS.SELECT) {
      const clickedObject = [...objects].reverse().find(obj => {
        const bounds = getObjectBounds(obj)
        return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
               point.y >= bounds.y && point.y <= bounds.y + bounds.height
      })

      if (clickedObject) {
        if (e.altKey) {
          // Alt+drag: create a copy and drag the copy
          const copy = { ...clickedObject, id: generateId() }
          if (copy.points) copy.points = copy.points.map(p => ({ ...p }))
          setObjects(prev => [...prev, copy])
          setSelectedObjectId(copy.id)
          setSelectedLayerIds([copy.layerId])
        } else {
          setSelectedObjectId(clickedObject.id)
          setSelectedLayerIds([clickedObject.layerId])
        }
        setIsDraggingObject(true)
        // Store offset from click to object origin
        const bounds = getObjectBounds(clickedObject)
        setDragOffset({ x: point.x - bounds.x, y: point.y - bounds.y })
        return
      } else {
        setSelectedObjectId(null)
        // Empty space -> pan
        setIsPanning(true)
        setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
        return
      }
    }

    // Transform tool: detect handle clicks or object selection
    if (activeTool === TOOLS.TRANSFORM) {
      if (selectedObjectId) {
        const obj = objects.find(o => o.id === selectedObjectId)
        if (obj) {
          const bounds = getObjectBounds(obj)
          const cx = bounds.x + bounds.width / 2
          const cy = bounds.y + bounds.height / 2
          const rotation = obj.rotation || 0
          const sx = obj.scaleX ?? 1
          const sy = obj.scaleY ?? 1

          // Transform point into object's local space (inverse of rotation+scale around center)
          const dx = point.x - cx
          const dy = point.y - cy
          const cosR = Math.cos(-rotation)
          const sinR = Math.sin(-rotation)
          const rx = dx * cosR - dy * sinR
          const ry = dx * sinR + dy * cosR
          const localPoint = { x: rx / sx + cx, y: ry / sy + cy }

          const pad = 8
          const bx = bounds.x - pad
          const by = bounds.y - pad
          const bw = bounds.width + pad * 2
          const bh = bounds.height + pad * 2
          const handleSize = 8 / zoom
          const rotateOffset = 30 / zoom
          const hitRadius = handleSize

          // Check rotation handle
          const rcx = bx + bw / 2
          const rcy = by - rotateOffset
          if (Math.hypot(localPoint.x - rcx, localPoint.y - rcy) <= hitRadius) {
            setTransformHandle('rotate')
            setTransformStart({ x: point.x, y: point.y, bounds, rotation, scaleX: sx, scaleY: sy })
            return
          }

          // Check corner handles
          const corners = [
            { key: 'tl', x: bx, y: by },
            { key: 'tr', x: bx + bw, y: by },
            { key: 'bl', x: bx, y: by + bh },
            { key: 'br', x: bx + bw, y: by + bh }
          ]
          for (const c of corners) {
            if (Math.abs(localPoint.x - c.x) <= hitRadius && Math.abs(localPoint.y - c.y) <= hitRadius) {
              setTransformHandle(c.key)
              setTransformStart({ x: point.x, y: point.y, bounds, rotation, scaleX: sx, scaleY: sy })
              return
            }
          }
        }
      }

      // No auto-select in transform mode, just pan on empty space
      setIsPanning(true)
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
      return
    }

    // Start drawing
    if ([TOOLS.RECTANGLE, TOOLS.ELLIPSE, TOOLS.LINE, TOOLS.ARROW, TOOLS.ELBOW_ARROW,
         TOOLS.CURVED_ARROW, TOOLS.BIDIRECTIONAL, TOOLS.DASHED_ARROW, TOOLS.RECT_SELECT,
         TOOLS.PEN, TOOLS.LASSO_SELECT].includes(activeTool)) {
      setIsDrawing(true)
      setDrawStart(point)
      if (activeTool === TOOLS.PEN || activeTool === TOOLS.LASSO_SELECT) {
        setCurrentPath([point])
      }
    }

    // Text tool - create text at click
    if (activeTool === TOOLS.TEXT) {
      const layerId = createLayerForObject('Text')
      const newText = {
        id: generateId(),
        type: 'text',
        layerId,
        x: point.x,
        y: point.y,
        text: '',
        fontSize: textSize,
        fontFamily: 'sans-serif',
        color: '#ffffff',
        background: 'none',
        sequenceNumber: sequenceMode ? nextSequenceNumber : undefined,
        priority: 'normal'
      }
      setObjects([...objects, newText])
      if (sequenceMode) setNextSequenceNumber(prev => prev + 1)
      setSelectedObjectId(newText.id)
      setEditingTextId(newText.id)
      setEditingTextValue('')
      setEditingOriginalValue('')
      setInlineEditCursorPos(0)
    }

    // Label tool - show menu
    if (activeTool === TOOLS.LABEL) {
      setPendingLabelPosition(point)
      setLabelMenuPosition({ x: e.clientX, y: e.clientY })
      setShowLabelMenu(true)
    }
  }, [activeTool, objects, offset, zoom, selectedLayerIds, sequenceMode, nextSequenceNumber, currentPath, editingTextId, editingTextValue, editingOriginalValue, textSize])

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
      return
    }

    // Object dragging
    if (isDraggingObject && selectedObjectId) {
      const point = getCanvasPoint(e, canvasRef, offset, zoom)
      const newX = point.x - dragOffset.x
      const newY = point.y - dragOffset.y

      setObjects(prev => prev.map(obj => {
        if (obj.id !== selectedObjectId) return obj
        if (obj.x1 !== undefined) {
          // Line/arrow type - move both endpoints
          const bounds = getObjectBounds(obj)
          const dx = newX - bounds.x
          const dy = newY - bounds.y
          return { ...obj, x1: obj.x1 + dx, y1: obj.y1 + dy, x2: obj.x2 + dx, y2: obj.y2 + dy }
        }
        if (obj.points) {
          // Pen type - move all points
          const bounds = getObjectBounds(obj)
          const dx = newX - bounds.x
          const dy = newY - bounds.y
          return { ...obj, points: obj.points.map(p => ({ x: p.x + dx, y: p.y + dy })) }
        }
        return { ...obj, x: newX, y: newY }
      }))
      return
    }

    // Transform handle dragging
    if (transformHandle && transformStart && selectedObjectId) {
      const point = getCanvasPoint(e, canvasRef, offset, zoom)
      const { bounds } = transformStart
      const cx = bounds.x + bounds.width / 2
      const cy = bounds.y + bounds.height / 2

      if (transformHandle === 'rotate') {
        const angle = Math.atan2(point.y - cy, point.x - cx) - Math.atan2(transformStart.y - cy, transformStart.x - cx)
        const newRotation = transformStart.rotation + angle
        setObjects(prev => prev.map(obj =>
          obj.id === selectedObjectId ? { ...obj, rotation: newRotation } : obj
        ))
      } else {
        // Scale based on corner drag distance
        const startDist = Math.hypot(transformStart.x - cx, transformStart.y - cy)
        const currentDist = Math.hypot(point.x - cx, point.y - cy)
        const scaleFactor = currentDist / (startDist || 1)

        // Determine which axes to scale
        let newScaleX = transformStart.scaleX * scaleFactor
        let newScaleY = transformStart.scaleY * scaleFactor

        // Clamp to prevent inversion
        newScaleX = Math.max(0.1, newScaleX)
        newScaleY = Math.max(0.1, newScaleY)

        setObjects(prev => prev.map(obj =>
          obj.id === selectedObjectId ? { ...obj, scaleX: newScaleX, scaleY: newScaleY } : obj
        ))
      }
      return
    }

    if (!isDrawing || !drawStart) return

    const point = getCanvasPoint(e, canvasRef, offset, zoom)

    if (activeTool === TOOLS.PEN || activeTool === TOOLS.LASSO_SELECT) {
      setCurrentPath(prev => [...prev, point])
    } else {
      setCurrentPath([point])
    }
  }, [isPanning, panStart, isDraggingObject, selectedObjectId, dragOffset, isDrawing, drawStart, activeTool, offset, zoom, transformHandle, transformStart])

  const handleMouseUp = useCallback((e) => {
    if (isPanning) {
      setIsPanning(false)
      return
    }

    if (isDraggingObject) {
      if (e.shiftKey && selectedObjectId) {
        // Shift held on release: delete the dragged object and its layer
        deleteObject(selectedObjectId)
      }
      setIsDraggingObject(false)
      return
    }

    if (transformHandle) {
      setTransformHandle(null)
      setTransformStart(null)
      return
    }

    if (!isDrawing || !drawStart) return

    const point = getCanvasPoint(e, canvasRef, offset, zoom)
    const layer = layers.find(l => selectedLayerIds.includes(l.id))

    if (layer?.locked) {
      setIsDrawing(false)
      setDrawStart(null)
      setCurrentPath([])
      return
    }

    let newObject = null

    switch (activeTool) {
      case TOOLS.RECTANGLE:
        newObject = {
          id: generateId(),
          type: 'rectangle',
          layerId: createLayerForObject('Rectangle'),
          x: Math.min(drawStart.x, point.x),
          y: Math.min(drawStart.y, point.y),
          width: Math.abs(point.x - drawStart.x),
          height: Math.abs(point.y - drawStart.y),
          strokeColor: '#ffffff',
          strokeWidth: 2,
          fillColor: 'none',
          sequenceNumber: sequenceMode ? nextSequenceNumber : undefined,
          priority: 'normal'
        }
        break

      case TOOLS.ELLIPSE:
        newObject = {
          id: generateId(),
          type: 'ellipse',
          layerId: createLayerForObject('Ellipse'),
          x: Math.min(drawStart.x, point.x),
          y: Math.min(drawStart.y, point.y),
          width: Math.abs(point.x - drawStart.x),
          height: Math.abs(point.y - drawStart.y),
          strokeColor: '#ffffff',
          strokeWidth: 2,
          fillColor: 'none',
          sequenceNumber: sequenceMode ? nextSequenceNumber : undefined,
          priority: 'normal'
        }
        break

      case TOOLS.LINE:
        newObject = {
          id: generateId(),
          type: 'line',
          layerId: createLayerForObject('Line'),
          x1: drawStart.x,
          y1: drawStart.y,
          x2: point.x,
          y2: point.y,
          strokeColor: '#ffffff',
          strokeWidth: 2
        }
        break

      case TOOLS.ARROW:
        newObject = {
          id: generateId(),
          type: 'arrow',
          layerId: createLayerForObject('Arrow'),
          x1: drawStart.x,
          y1: drawStart.y,
          x2: point.x,
          y2: point.y,
          strokeColor: '#EF4444',
          strokeWidth: 3,
          sequenceNumber: sequenceMode ? nextSequenceNumber : undefined,
          priority: 'normal'
        }
        break

      case TOOLS.DASHED_ARROW:
        newObject = {
          id: generateId(),
          type: 'dashed_arrow',
          layerId: createLayerForObject('Dashed Arrow'),
          x1: drawStart.x,
          y1: drawStart.y,
          x2: point.x,
          y2: point.y,
          strokeColor: '#9CA3AF',
          strokeWidth: 3,
          dashed: true,
          sequenceNumber: sequenceMode ? nextSequenceNumber : undefined,
          priority: 'normal'
        }
        break

      case TOOLS.ELBOW_ARROW:
        newObject = {
          id: generateId(),
          type: 'elbow_arrow',
          layerId: createLayerForObject('Elbow Arrow'),
          x1: drawStart.x,
          y1: drawStart.y,
          x2: point.x,
          y2: point.y,
          strokeColor: '#3B82F6',
          strokeWidth: 3,
          sequenceNumber: sequenceMode ? nextSequenceNumber : undefined,
          priority: 'normal'
        }
        break

      case TOOLS.CURVED_ARROW:
        newObject = {
          id: generateId(),
          type: 'curved_arrow',
          layerId: createLayerForObject('Curved Arrow'),
          x1: drawStart.x,
          y1: drawStart.y,
          x2: point.x,
          y2: point.y,
          strokeColor: '#22C55E',
          strokeWidth: 3,
          sequenceNumber: sequenceMode ? nextSequenceNumber : undefined,
          priority: 'normal'
        }
        break

      case TOOLS.BIDIRECTIONAL:
        newObject = {
          id: generateId(),
          type: 'bidirectional',
          layerId: createLayerForObject('Bidirectional'),
          x1: drawStart.x,
          y1: drawStart.y,
          x2: point.x,
          y2: point.y,
          strokeColor: '#A855F7',
          strokeWidth: 3,
          sequenceNumber: sequenceMode ? nextSequenceNumber : undefined,
          priority: 'normal'
        }
        break

      case TOOLS.PEN:
        if (currentPath.length > 1) {
          newObject = {
            id: generateId(),
            type: 'pen',
            layerId: createLayerForObject('Pen'),
            points: currentPath,
            strokeColor: fgColor,
            strokeWidth: penWidth,
            sequenceNumber: sequenceMode ? nextSequenceNumber : undefined,
            priority: 'normal'
          }
        }
        break

      case TOOLS.RECT_SELECT:
        setSelectionPath([
          { x: Math.min(drawStart.x, point.x), y: Math.min(drawStart.y, point.y) },
          { x: Math.max(drawStart.x, point.x), y: Math.min(drawStart.y, point.y) },
          { x: Math.max(drawStart.x, point.x), y: Math.max(drawStart.y, point.y) },
          { x: Math.min(drawStart.x, point.x), y: Math.max(drawStart.y, point.y) }
        ])
        setSelectionType('rectangle')
        break

      case TOOLS.LASSO_SELECT:
        if (currentPath.length > 2) {
          setSelectionPath(currentPath)
          setSelectionType('lasso')
        }
        break
    }

    if (newObject) {
      setObjects([...objects, newObject])
      if (sequenceMode && newObject.sequenceNumber !== undefined) {
        setNextSequenceNumber(prev => prev + 1)
      }
      setSelectedObjectId(newObject.id)
    }

    setIsDrawing(false)
    setDrawStart(null)
    setCurrentPath([])
  }, [isPanning, isDraggingObject, isDrawing, drawStart, activeTool, selectedLayerIds, layers, objects, currentPath, sequenceMode, nextSequenceNumber, offset, zoom, transformHandle, fgColor, penWidth])

  // Double click for text editing
  const handleDoubleClick = useCallback((e) => {
    const point = getCanvasPoint(e, canvasRef, offset, zoom)

    const clickedObject = [...objects].reverse().find(obj => {
      if (obj.type !== 'text' && obj.type !== 'label') return false
      const bounds = getObjectBounds(obj)
      return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
             point.y >= bounds.y && point.y <= bounds.y + bounds.height
    })

    if (clickedObject) {
      const value = clickedObject.text || ''
      setEditingTextId(clickedObject.id)
      setEditingTextValue(value)
      setEditingOriginalValue(value)
      setInlineEditCursorPos(value.length)
    }
  }, [objects, offset, zoom])

  // Paste handler for images
  useEffect(() => {
    if (!isOpen) return

    const handlePaste = (e) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          e.stopPropagation()
          const blob = item.getAsFile()
          const img = new window.Image()
          img.onload = () => {
            // Create new image layer
            const imageLayerId = generateId()
            const newLayer = {
              id: imageLayerId,
              name: `Image ${layers.length}`,
              type: 'image',
              visible: true,
              locked: false
            }

            // Scale to fit if too large
            let width = img.width
            let height = img.height
            const maxSize = 800
            if (width > maxSize || height > maxSize) {
              const scale = maxSize / Math.max(width, height)
              width *= scale
              height *= scale
            }

            // Place image at center of visible canvas
            const canvas = canvasRef.current
            const canvasWidth = canvas ? canvas.width : 800
            const canvasHeight = canvas ? canvas.height : 600
            const centerX = (-offset.x + canvasWidth / 2) / zoom - width / 2
            const centerY = (-offset.y + canvasHeight / 2) / zoom - height / 2

            const newImage = {
              id: generateId(),
              type: 'image',
              layerId: imageLayerId,
              x: centerX,
              y: centerY,
              width,
              height,
              image: img,
              opacity: 1
            }

            setLayers([...layers, newLayer])
            setObjects([...objects, newImage])
            setSelectedLayerIds([imageLayerId])
          }
          img.src = URL.createObjectURL(blob)
          break
        }
      }
    }

    document.addEventListener('paste', handlePaste, true)
    return () => document.removeEventListener('paste', handlePaste, true)
  }, [isOpen, layers, objects, offset, zoom])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      // Don't capture shortcuts when typing in any text input
      const activeEl = document.activeElement
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        return
      }

      // Inline text editing - capture all keystrokes
      if (editingTextId) {
        const editObj = objects.find(o => o.id === editingTextId)
        if (editObj && editObj.type === 'text') {
          e.preventDefault()
          e.stopPropagation()
          const text = editingTextValue
          const pos = inlineEditCursorPos

          if (e.key === 'Escape') {
            // Cancel - revert to original, remove if was empty
            if (editingOriginalValue === '') {
              setObjects(prev => prev.filter(o => o.id !== editingTextId))
            } else {
              setObjects(prev => prev.map(obj =>
                obj.id === editingTextId ? { ...obj, text: editingOriginalValue } : obj
              ))
            }
            setEditingTextId(null)
            setEditingTextValue('')
          } else if (e.key === 'Enter' && !e.shiftKey) {
            // Confirm edit - remove object if empty
            if (text.trim() === '') {
              setObjects(prev => prev.filter(o => o.id !== editingTextId))
            } else {
              setObjects(prev => prev.map(obj =>
                obj.id === editingTextId ? { ...obj, text } : obj
              ))
            }
            setEditingTextId(null)
            setEditingTextValue('')
          } else if (e.key === 'Enter' && e.shiftKey) {
            // Insert newline
            const newText = text.slice(0, pos) + '\n' + text.slice(pos)
            setEditingTextValue(newText)
            setInlineEditCursorPos(pos + 1)
            setInlineEditCursorVisible(true)
          } else if (e.key === 'Backspace') {
            if (pos > 0) {
              setEditingTextValue(text.slice(0, pos - 1) + text.slice(pos))
              setInlineEditCursorPos(pos - 1)
              setInlineEditCursorVisible(true)
            }
          } else if (e.key === 'Delete') {
            if (pos < text.length) {
              setEditingTextValue(text.slice(0, pos) + text.slice(pos + 1))
              setInlineEditCursorVisible(true)
            }
          } else if (e.key === 'ArrowLeft') {
            setInlineEditCursorPos(Math.max(0, pos - 1))
            setInlineEditCursorVisible(true)
          } else if (e.key === 'ArrowRight') {
            setInlineEditCursorPos(Math.min(text.length, pos + 1))
            setInlineEditCursorVisible(true)
          } else if (e.key === 'ArrowUp') {
            const lines = text.split('\n')
            let charCount = 0, curLine = 0, curCol = 0
            for (let i = 0; i < lines.length; i++) {
              if (pos <= charCount + lines[i].length) {
                curLine = i; curCol = pos - charCount; break
              }
              charCount += lines[i].length + 1
            }
            if (curLine > 0) {
              let newPos = 0
              for (let i = 0; i < curLine - 1; i++) newPos += lines[i].length + 1
              newPos += Math.min(curCol, lines[curLine - 1].length)
              setInlineEditCursorPos(newPos)
            }
            setInlineEditCursorVisible(true)
          } else if (e.key === 'ArrowDown') {
            const lines = text.split('\n')
            let charCount = 0, curLine = 0, curCol = 0
            for (let i = 0; i < lines.length; i++) {
              if (pos <= charCount + lines[i].length) {
                curLine = i; curCol = pos - charCount; break
              }
              charCount += lines[i].length + 1
            }
            if (curLine < lines.length - 1) {
              let newPos = 0
              for (let i = 0; i <= curLine; i++) newPos += lines[i].length + 1
              newPos += Math.min(curCol, lines[curLine + 1].length)
              setInlineEditCursorPos(newPos)
            }
            setInlineEditCursorVisible(true)
          } else if (e.key === 'Home') {
            const lines = text.split('\n')
            let charCount = 0
            for (let i = 0; i < lines.length; i++) {
              if (pos <= charCount + lines[i].length) {
                setInlineEditCursorPos(charCount)
                break
              }
              charCount += lines[i].length + 1
            }
            setInlineEditCursorVisible(true)
          } else if (e.key === 'End') {
            const lines = text.split('\n')
            let charCount = 0
            for (let i = 0; i < lines.length; i++) {
              if (pos <= charCount + lines[i].length) {
                setInlineEditCursorPos(charCount + lines[i].length)
                break
              }
              charCount += lines[i].length + 1
            }
            setInlineEditCursorVisible(true)
          } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            // Printable character
            const newText = text.slice(0, pos) + e.key + text.slice(pos)
            setEditingTextValue(newText)
            setInlineEditCursorPos(pos + 1)
            setInlineEditCursorVisible(true)
          }
          return
        }
        // For labels, just handle Escape (textarea handles the rest)
        if (e.key === 'Escape') {
          setEditingTextValue(editingOriginalValue)
          setEditingTextId(null)
        }
        return
      }

      if (e.key === 'Escape') {
        if (selectionPath.length > 0) {
          setSelectionPath([])
          setSelectionType(null)
        } else if (showLabelMenu) {
          setShowLabelMenu(false)
        } else {
          onClose()
        }
        return
      }

      // Tool shortcuts (only without Ctrl/Meta)
      if (!e.ctrlKey && !e.metaKey) {
        if (e.key === 'v' || e.key === 'V') setActiveTool(TOOLS.SELECT)
        if (e.key === 'w' || e.key === 'W') setActiveTool(TOOLS.TRANSFORM)
        if (e.key === 'r' || e.key === 'R') setActiveTool(TOOLS.RECTANGLE)
        if (e.key === 'e' || e.key === 'E') setActiveTool(TOOLS.ELLIPSE)
        if (e.key === 'a' || e.key === 'A') setActiveTool(TOOLS.ARROW)
        if (e.key === 't' || e.key === 'T') setActiveTool(TOOLS.TEXT)
        if (e.key === 'p' || e.key === 'P') setActiveTool(TOOLS.PEN)
        if (e.key === 's' || e.key === 'S') setActiveTool(prev => prev === TOOLS.RECT_SELECT ? TOOLS.LASSO_SELECT : TOOLS.RECT_SELECT)
      }

      // Delete selected layers and their objects
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLayerIds.length > 0) {
        const remaining = layers.filter(l => !selectedLayerIds.includes(l.id))
        selectedLayerIds.forEach(layerId => deleteLayer(layerId))
        if (remaining.length > 0) {
          setSelectedLayerIds([remaining[remaining.length - 1].id])
        }
      }

      // Copy/Paste
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault()
          undo()
        }
        if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault()
          redo()
        }
        if (e.key === 'c') {
          e.preventDefault()
          copyCanvasToClipboard()
        }
        if (e.key === 'g') {
          e.preventDefault()
          generatePrompt()
        }
      }

      // Quick labels 1-8
      if (e.key >= '1' && e.key <= '8' && !e.ctrlKey && !e.metaKey) {
        const preset = LABEL_PRESETS[parseInt(e.key) - 1]
        if (preset) {
          createLabel(preset, { x: -offset.x / zoom + 100, y: -offset.y / zoom + 100 })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, editingTextId, editingTextValue, editingOriginalValue, inlineEditCursorPos, selectedObjectId, selectedLayerIds, objects, layers, selectionPath, showLabelMenu, offset, zoom, onClose, undo, redo])

  // ================== ACTIONS ==================
  const createLayerForObject = (typeName) => {
    const layerId = generateId()
    const newLayer = {
      id: layerId,
      name: typeName,
      type: 'annotation',
      visible: true,
      locked: false
    }
    setLayers(prev => [...prev, newLayer])
    setSelectedLayerIds([layerId])
    return layerId
  }

  const createLabel = (preset, position) => {
    const layerId = createLayerForObject(preset.type)
    const newLabel = {
      id: generateId(),
      type: 'label',
      layerId,
      x: position.x,
      y: position.y,
      label: preset,
      text: preset.text,
      bodyText: '',
      sequenceNumber: sequenceMode ? nextSequenceNumber : undefined,
      priority: 'normal'
    }
    setObjects([...objects, newLabel])
    if (sequenceMode) setNextSequenceNumber(prev => prev + 1)
    setSelectedObjectId(newLabel.id)
    setShowLabelMenu(false)
  }

  const sampleBackgroundColor = (origCtx, localPath, imageWidth, imageHeight) => {
    // 1. Compute centroid of the selection path
    const centroid = {
      x: localPath.reduce((sum, p) => sum + p.x, 0) / localPath.length,
      y: localPath.reduce((sum, p) => sum + p.y, 0) / localPath.length
    }

    // 2. Compute total perimeter length and pick ~16 evenly-spaced sample points
    const segments = []
    let totalLength = 0
    for (let i = 0; i < localPath.length; i++) {
      const a = localPath[i]
      const b = localPath[(i + 1) % localPath.length]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.sqrt(dx * dx + dy * dy)
      segments.push({ a, b, len })
      totalLength += len
    }

    const numSamples = 16
    const interval = totalLength / numSamples
    const samplePoints = []
    let accumulated = 0
    let segIndex = 0
    let segOffset = 0

    for (let i = 0; i < numSamples; i++) {
      const target = i * interval
      while (segIndex < segments.length - 1 && accumulated + segments[segIndex].len - segOffset < target) {
        accumulated += segments[segIndex].len - segOffset
        segIndex++
        segOffset = 0
      }
      const remaining = target - accumulated
      const seg = segments[segIndex]
      const t = (segOffset + remaining) / seg.len
      samplePoints.push({
        x: seg.a.x + (seg.b.x - seg.a.x) * t,
        y: seg.a.y + (seg.b.y - seg.a.y) * t
      })
    }

    // 3. Offset each sample point 3px outward from centroid, clamp to image bounds
    const offsetPoints = samplePoints.map(p => {
      const dx = p.x - centroid.x
      const dy = p.y - centroid.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist === 0) return p
      const nx = dx / dist
      const ny = dy / dist
      return {
        x: Math.max(0, Math.min(imageWidth - 1, Math.round(p.x + nx * 3))),
        y: Math.max(0, Math.min(imageHeight - 1, Math.round(p.y + ny * 3)))
      }
    })

    // 4. Read pixel colors at each offset point
    const pixels = offsetPoints.map(p => {
      const data = origCtx.getImageData(p.x, p.y, 1, 1).data
      return { r: data[0], g: data[1], b: data[2] }
    })

    // 5. Find dominant color by grouping pixels with RGB distance < 30
    const used = new Array(pixels.length).fill(false)
    const groups = []
    for (let i = 0; i < pixels.length; i++) {
      if (used[i]) continue
      const group = [pixels[i]]
      used[i] = true
      for (let j = i + 1; j < pixels.length; j++) {
        if (used[j]) continue
        const dr = pixels[i].r - pixels[j].r
        const dg = pixels[i].g - pixels[j].g
        const db = pixels[i].b - pixels[j].b
        if (Math.sqrt(dr * dr + dg * dg + db * db) < 30) {
          group.push(pixels[j])
          used[j] = true
        }
      }
      groups.push(group)
    }

    // Pick the largest group and average its colors
    const largest = groups.reduce((a, b) => a.length >= b.length ? a : b)
    const avgR = Math.round(largest.reduce((s, p) => s + p.r, 0) / largest.length)
    const avgG = Math.round(largest.reduce((s, p) => s + p.g, 0) / largest.length)
    const avgB = Math.round(largest.reduce((s, p) => s + p.b, 0) / largest.length)

    return `rgb(${avgR}, ${avgG}, ${avgB})`
  }

  const handleCutToLayer = () => {
    if (selectionPath.length === 0) return

    // Find image objects that intersect with selection
    const imageObjects = objects.filter(obj => obj.type === 'image' && obj.image)
    if (imageObjects.length === 0) return

    // Use the topmost visible image layer that intersects the selection
    const selBounds = {
      x: Math.min(...selectionPath.map(p => p.x)),
      y: Math.min(...selectionPath.map(p => p.y)),
      width: Math.max(...selectionPath.map(p => p.x)) - Math.min(...selectionPath.map(p => p.x)),
      height: Math.max(...selectionPath.map(p => p.y)) - Math.min(...selectionPath.map(p => p.y))
    }

    // Find the image that intersects - prefer selected layer, otherwise topmost
    const targetImage = imageObjects.find(obj => {
      return obj.x < selBounds.x + selBounds.width &&
             obj.x + obj.width > selBounds.x &&
             obj.y < selBounds.y + selBounds.height &&
             obj.y + obj.height > selBounds.y
    })

    if (!targetImage) {
      setSelectionPath([])
      setSelectionType(null)
      return
    }

    // Create offscreen canvas for the original image at its full size
    const origCanvas = document.createElement('canvas')
    origCanvas.width = targetImage.width
    origCanvas.height = targetImage.height
    const origCtx = origCanvas.getContext('2d')
    origCtx.drawImage(targetImage.image, 0, 0, targetImage.width, targetImage.height)

    // Create clipping path in image-local coordinates
    const localPath = selectionPath.map(p => ({
      x: p.x - targetImage.x,
      y: p.y - targetImage.y
    }))

    // Create cutout canvas - extract selected pixels
    const cutCanvas = document.createElement('canvas')
    cutCanvas.width = targetImage.width
    cutCanvas.height = targetImage.height
    const cutCtx = cutCanvas.getContext('2d')

    // Draw clip region and fill with original pixels
    cutCtx.beginPath()
    cutCtx.moveTo(localPath[0].x, localPath[0].y)
    for (let i = 1; i < localPath.length; i++) {
      cutCtx.lineTo(localPath[i].x, localPath[i].y)
    }
    cutCtx.closePath()
    cutCtx.clip()
    cutCtx.drawImage(targetImage.image, 0, 0, targetImage.width, targetImage.height)

    // Fill the cut region with the foreground color
    origCtx.save()
    origCtx.beginPath()
    origCtx.moveTo(localPath[0].x, localPath[0].y)
    for (let i = 1; i < localPath.length; i++) {
      origCtx.lineTo(localPath[i].x, localPath[i].y)
    }
    origCtx.closePath()
    origCtx.fillStyle = sampleBackgroundColor(origCtx, localPath, targetImage.width, targetImage.height)
    origCtx.fill()
    origCtx.restore()

    // Convert canvases to Image objects
    const origImg = new window.Image()
    const cutImg = new window.Image()

    origImg.onload = () => {
      cutImg.onload = () => {
        // Create cutout layer above the original image's layer
        const cutoutLayerId = generateId()
        const origLayerIndex = layers.findIndex(l => l.id === targetImage.layerId)
        const newLayer = {
          id: cutoutLayerId,
          name: `${layers.find(l => l.id === targetImage.layerId)?.name || 'Image'} - Cutout ${layers.filter(l => l.type === 'cutout').length + 1}`,
          type: 'cutout',
          visible: true,
          locked: false
        }

        // Insert the new layer above the original
        const newLayers = [...layers]
        newLayers.splice(origLayerIndex + 1, 0, newLayer)
        setLayers(newLayers)

        // Update original image to the version with the hole
        const newCutoutObject = {
          id: generateId(),
          type: 'image',
          layerId: cutoutLayerId,
          x: targetImage.x,
          y: targetImage.y,
          width: targetImage.width,
          height: targetImage.height,
          image: cutImg,
          opacity: 1
        }

        setObjects(prev => [
          ...prev.map(obj =>
            obj.id === targetImage.id ? { ...obj, image: origImg } : obj
          ),
          newCutoutObject
        ])

        setSelectedLayerIds([cutoutLayerId])
      }
      cutImg.src = cutCanvas.toDataURL('image/png')
    }
    origImg.src = origCanvas.toDataURL('image/png')

    setSelectionPath([])
    setSelectionType(null)
  }

  const handleFillSelection = () => {
    if (selectionPath.length === 0) return

    const imageObjects = objects.filter(obj => obj.type === 'image' && obj.image)
    if (imageObjects.length === 0) return

    const selBounds = {
      x: Math.min(...selectionPath.map(p => p.x)),
      y: Math.min(...selectionPath.map(p => p.y)),
      width: Math.max(...selectionPath.map(p => p.x)) - Math.min(...selectionPath.map(p => p.x)),
      height: Math.max(...selectionPath.map(p => p.y)) - Math.min(...selectionPath.map(p => p.y))
    }

    const targetImage = imageObjects.find(obj => {
      return obj.x < selBounds.x + selBounds.width &&
             obj.x + obj.width > selBounds.x &&
             obj.y < selBounds.y + selBounds.height &&
             obj.y + obj.height > selBounds.y
    })

    if (!targetImage) {
      setSelectionPath([])
      setSelectionType(null)
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = targetImage.width
    canvas.height = targetImage.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(targetImage.image, 0, 0, targetImage.width, targetImage.height)

    const localPath = selectionPath.map(p => ({
      x: p.x - targetImage.x,
      y: p.y - targetImage.y
    }))

    const fillColor = smartFillOnDelete
      ? sampleBackgroundColor(ctx, localPath, targetImage.width, targetImage.height)
      : fgColor

    ctx.beginPath()
    ctx.moveTo(localPath[0].x, localPath[0].y)
    for (let i = 1; i < localPath.length; i++) {
      ctx.lineTo(localPath[i].x, localPath[i].y)
    }
    ctx.closePath()
    ctx.fillStyle = fillColor
    ctx.fill()

    const newImg = new window.Image()
    newImg.onload = () => {
      setObjects(prev => prev.map(obj =>
        obj.id === targetImage.id ? { ...obj, image: newImg } : obj
      ))
    }
    newImg.src = canvas.toDataURL('image/png')

    setSelectionPath([])
    setSelectionType(null)
  }

  const updateObject = (updatedObject) => {
    setObjects(prev => prev.map(obj => obj.id === updatedObject.id ? updatedObject : obj))
  }

  const deleteLayer = (layerId) => {
    if (smartFillOnDelete) {
      // Find objects in the layer being deleted
      const deletedObjects = objects.filter(obj => obj.layerId === layerId)
      // Find image objects in other layers to paint over
      const imageObjects = objects.filter(obj => obj.type === 'image' && obj.image && obj.layerId !== layerId)

      for (const delObj of deletedObjects) {
        // Determine the bounds of the deleted object
        const bounds = delObj.type === 'image'
          ? { x: delObj.x, y: delObj.y, width: delObj.width, height: delObj.height }
          : delObj.x !== undefined && delObj.width
            ? { x: delObj.x, y: delObj.y, width: delObj.width, height: delObj.height }
            : null
        if (!bounds) continue

        // Find the underlying image that overlaps
        const targetImage = imageObjects.find(img =>
          img.x < bounds.x + bounds.width &&
          img.x + img.width > bounds.x &&
          img.y < bounds.y + bounds.height &&
          img.y + img.height > bounds.y
        )
        if (!targetImage) continue

        // Build a rectangular path in image-local coordinates
        const localPath = [
          { x: bounds.x - targetImage.x, y: bounds.y - targetImage.y },
          { x: bounds.x - targetImage.x + bounds.width, y: bounds.y - targetImage.y },
          { x: bounds.x - targetImage.x + bounds.width, y: bounds.y - targetImage.y + bounds.height },
          { x: bounds.x - targetImage.x, y: bounds.y - targetImage.y + bounds.height }
        ]

        // Create canvas from the target image
        const canvas = document.createElement('canvas')
        canvas.width = targetImage.width
        canvas.height = targetImage.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(targetImage.image, 0, 0, targetImage.width, targetImage.height)

        // Fill the area with smart background color
        const fillColor = sampleBackgroundColor(ctx, localPath, targetImage.width, targetImage.height)
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(localPath[0].x, localPath[0].y)
        for (let i = 1; i < localPath.length; i++) {
          ctx.lineTo(localPath[i].x, localPath[i].y)
        }
        ctx.closePath()
        ctx.fillStyle = fillColor
        ctx.fill()
        ctx.restore()

        // Update the target image
        const newImg = new window.Image()
        newImg.onload = () => {
          setObjects(prev => prev.map(obj =>
            obj.id === targetImage.id ? { ...obj, image: newImg } : obj
          ))
        }
        newImg.src = canvas.toDataURL('image/png')
      }
    }

    setLayers(prev => prev.filter(l => l.id !== layerId))
    setObjects(prev => prev.filter(obj => obj.layerId !== layerId))
    setSelectedLayerIds(prev => prev.filter(id => id !== layerId))
  }

  const deleteObject = (objectId) => {
    const obj = objects.find(o => o.id === objectId)
    if (!obj) return
    const layerId = obj.layerId
    setObjects(prev => prev.filter(o => o.id !== objectId))
    if (layerId) {
      setLayers(prev => prev.filter(l => l.id !== layerId))
      setSelectedLayerIds(prev => prev.filter(id => id !== layerId))
    }
    setSelectedObjectId(null)
  }

  const toggleLayerVisibility = (layerId) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l))
  }

  const toggleLayerLock = (layerId) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, locked: !l.locked } : l))
  }

  const renameLayer = (layerId, newName) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, name: newName } : l))
  }


  const removeSequenceFromObject = (objectId) => {
    setObjects(prev => prev.map(obj => {
      if (obj.id === objectId) {
        const { sequenceNumber, priority, ...rest } = obj
        return rest
      }
      return obj
    }))
    // Renumber remaining sequenced objects
    const sequenced = objects.filter(o => o.id !== objectId && o.sequenceNumber !== undefined)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
    let num = 1
    setObjects(prev => prev.map(obj => {
      if (obj.id === objectId) return obj
      if (obj.sequenceNumber !== undefined) {
        return { ...obj, sequenceNumber: num++ }
      }
      return obj
    }))
    setNextSequenceNumber(num)
  }

  const generatePrompt = () => {
    const sequencedObjects = objects
      .filter(obj => obj.sequenceNumber !== undefined)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)

    let prompt = '## Visual Instructions\n\n'

    sequencedObjects.forEach(obj => {
      const bounds = getObjectBounds(obj)
      const coords = `(coordinates: ${Math.round(bounds.x)},${Math.round(bounds.y)})`

      let type = ''
      let description = ''

      switch (obj.type) {
        case 'label':
          const preset = LABEL_PRESETS.find(p => p.type === obj.label?.type)
          type = `[${preset?.color || 'GRAY'}] ${obj.label?.type || 'NOTE'}`
          description = obj.bodyText || obj.text || preset?.text || ''
          break
        case 'arrow':
        case 'elbow_arrow':
        case 'curved_arrow':
        case 'bidirectional':
        case 'dashed_arrow':
          type = '[ARROW]'
          description = obj.label || `from: ${Math.round(obj.x1)},${Math.round(obj.y1)} → to: ${Math.round(obj.x2)},${Math.round(obj.y2)}`
          break
        case 'text':
          type = '[NOTE]'
          description = obj.text
          break
        case 'rectangle':
        case 'ellipse':
          type = '[REGION]'
          description = obj.text || 'Highlighted area'
          break
        default:
          type = '[ANNOTATION]'
          description = obj.text || ''
      }

      prompt += `${obj.sequenceNumber}. **${type}** ${coords}\n`
      if (description) prompt += `   ${description}\n`
      prompt += '\n'
    })

    // Copy to clipboard
    navigator.clipboard.writeText(prompt).then(() => {
      alert('Prompt copied to clipboard!')
    })

    return prompt
  }

  const getContentBounds = () => {
    const visibleLayers = layers.filter(l => l.visible)
    const visibleObjects = objects.filter(obj => visibleLayers.some(l => l.id === obj.layerId))
    if (visibleObjects.length === 0) return null

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    visibleObjects.forEach(obj => {
      const bounds = getObjectBounds(obj)
      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.width)
      maxY = Math.max(maxY, bounds.y + bounds.height)
    })

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }

  const renderContentToCanvas = () => {
    const bounds = getContentBounds()
    if (!bounds || bounds.width === 0 || bounds.height === 0) return null

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = Math.ceil(bounds.width)
    tempCanvas.height = Math.ceil(bounds.height)
    const ctx = tempCanvas.getContext('2d')

    // Translate so content starts at (0,0)
    ctx.translate(-bounds.x, -bounds.y)

    // Render visible layers (same logic as renderCanvas but without checkerboard/transform)
    layers.filter(l => l.visible).forEach(layer => {
      const layerObjects = objects.filter(obj => obj.layerId === layer.id)
      layerObjects.forEach(obj => {
        ctx.save()
        ctx.globalAlpha = obj.opacity ?? 1

        switch (obj.type) {
          case 'image':
            if (obj.image) {
              ctx.drawImage(obj.image, obj.x, obj.y, obj.width, obj.height)
            }
            break
          case 'rectangle':
            if (obj.fillColor && obj.fillColor !== 'none') {
              ctx.fillStyle = obj.fillColor
              ctx.fillRect(obj.x, obj.y, obj.width, obj.height)
            }
            ctx.strokeStyle = obj.strokeColor || '#fff'
            ctx.lineWidth = obj.strokeWidth || 2
            if (obj.dashed) ctx.setLineDash([5, 5])
            ctx.strokeRect(obj.x, obj.y, obj.width, obj.height)
            ctx.setLineDash([])
            break
          case 'ellipse':
            ctx.beginPath()
            ctx.ellipse(obj.x + obj.width / 2, obj.y + obj.height / 2, Math.abs(obj.width / 2), Math.abs(obj.height / 2), 0, 0, Math.PI * 2)
            if (obj.fillColor && obj.fillColor !== 'none') {
              ctx.fillStyle = obj.fillColor
              ctx.fill()
            }
            ctx.strokeStyle = obj.strokeColor || '#fff'
            ctx.lineWidth = obj.strokeWidth || 2
            ctx.stroke()
            break
          case 'line':
            ctx.beginPath()
            ctx.moveTo(obj.x1, obj.y1)
            ctx.lineTo(obj.x2, obj.y2)
            ctx.strokeStyle = obj.strokeColor || '#fff'
            ctx.lineWidth = obj.strokeWidth || 2
            ctx.stroke()
            break
          case 'arrow':
          case 'dashed_arrow':
            drawArrow(ctx, obj)
            break
          case 'elbow_arrow':
            drawElbowArrow(ctx, obj)
            break
          case 'curved_arrow':
            drawCurvedArrow(ctx, obj)
            break
          case 'bidirectional':
            drawBidirectionalArrow(ctx, obj)
            break
          case 'pen':
            if (obj.points && obj.points.length > 1) {
              ctx.beginPath()
              ctx.moveTo(obj.points[0].x, obj.points[0].y)
              for (let i = 1; i < obj.points.length; i++) {
                ctx.lineTo(obj.points[i].x, obj.points[i].y)
              }
              ctx.strokeStyle = obj.strokeColor || '#fff'
              ctx.lineWidth = obj.strokeWidth || 2
              ctx.lineCap = 'round'
              ctx.lineJoin = 'round'
              if (obj.dashed) ctx.setLineDash([5, 5])
              ctx.stroke()
              ctx.setLineDash([])
            }
            break
          case 'text': {
            const fontSize = obj.fontSize || 16
            const fontFamily = obj.fontFamily || 'sans-serif'
            ctx.font = `${fontSize}px ${fontFamily}`
            ctx.fillStyle = obj.color || '#fff'
            ctx.textBaseline = 'top'
            const lines = (obj.text || '').split('\n')
            const lineHeight = fontSize * 1.3
            if (obj.background && obj.background !== 'none') {
              const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width), 2)
              ctx.fillStyle = obj.background
              ctx.fillRect(obj.x - 4, obj.y - 2, maxWidth + 8, lines.length * lineHeight + 4)
              ctx.fillStyle = obj.color || '#fff'
            }
            lines.forEach((line, i) => {
              ctx.fillText(line, obj.x, obj.y + i * lineHeight)
            })
            break
          }
          case 'label':
            drawLabel(ctx, obj)
            break
        }
        ctx.restore()
      })
    })

    return tempCanvas
  }

  const exportCanvas = () => {
    const tempCanvas = renderContentToCanvas()
    if (!tempCanvas) return

    const link = document.createElement('a')
    link.download = 'mockup-annotated.png'
    link.href = tempCanvas.toDataURL('image/png')
    link.click()
  }

  const copyCanvasToClipboard = async () => {
    const tempCanvas = renderContentToCanvas()
    if (!tempCanvas) return

    tempCanvas.toBlob(async (blob) => {
      if (!blob) return
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ])
      } catch (err) {
        console.error('Failed to copy to clipboard:', err)
      }
    }, 'image/png')
  }

  // ================== RENDER ==================
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-[#1a1a1a]">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-100">Visual Mockup Annotator</h1>
          <span className="text-xs text-gray-500">Paste image (Ctrl+V) or drag & drop</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={undo} variant="ghost" size="sm" className="text-gray-400 hover:text-gray-200" title="Undo (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button onClick={redo} variant="ghost" size="sm" className="text-gray-400 hover:text-gray-200" title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="h-4 w-4" />
          </Button>
          <div className="w-px h-5 bg-gray-700" />
          <button
            onClick={() => fgColorInputRef.current?.click()}
            className="w-6 h-6 rounded border-2 border-gray-500 hover:border-white cursor-pointer"
            style={{ backgroundColor: fgColor }}
            title="Foreground color"
          />
          <input
            ref={fgColorInputRef}
            type="color"
            value={fgColor}
            onChange={(e) => { setFgColor(e.target.value); localStorage.setItem('annotator-fg-color', e.target.value) }}
            className="sr-only"
          />
          <Button onClick={copyCanvasToClipboard} variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button onClick={exportCanvas} variant="ghost" size="sm" className="text-green-400 hover:text-green-300">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button onClick={onClose} variant="ghost" size="sm" className="text-gray-400 hover:text-gray-200">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex min-h-0">
        {/* Left toolbar */}
        <div className="w-12 bg-[#1a1a1a] border-r border-gray-700 flex flex-col items-center py-2 gap-1">
          <ToolButton icon={Move} tool={TOOLS.SELECT} active={activeTool} setActive={setActiveTool} tooltip="Move (V)" />
          <ToolButton icon={Maximize2} tool={TOOLS.TRANSFORM} active={activeTool} setActive={setActiveTool} tooltip="Rotate/Scale (W)" />
          <div className="w-8 h-px bg-gray-700 my-1" />
          <ToolButton icon={Square} tool={TOOLS.RECTANGLE} active={activeTool} setActive={setActiveTool} tooltip="Rectangle (R)" />
          <ToolButton icon={Circle} tool={TOOLS.ELLIPSE} active={activeTool} setActive={setActiveTool} tooltip="Ellipse (E)" />
          <div className="w-8 h-px bg-gray-700 my-1" />
          <ToolButton icon={ArrowRight} tool={TOOLS.ARROW} active={activeTool} setActive={setActiveTool} tooltip="Arrow (A)" />
          <ToolButton icon={CornerDownRight} tool={TOOLS.ELBOW_ARROW} active={activeTool} setActive={setActiveTool} tooltip="Elbow Arrow" />
          <ToolButton icon={ArrowUpRight} tool={TOOLS.CURVED_ARROW} active={activeTool} setActive={setActiveTool} tooltip="Curved Arrow" />
          <ToolButton icon={ArrowLeftRight} tool={TOOLS.BIDIRECTIONAL} active={activeTool} setActive={setActiveTool} tooltip="Bidirectional" />
          <div className="w-8 h-px bg-gray-700 my-1" />
          <ToolButton icon={Type} tool={TOOLS.TEXT} active={activeTool} setActive={setActiveTool} tooltip="Text (T)" />
          <ToolButton icon={Pen} tool={TOOLS.PEN} active={activeTool} setActive={setActiveTool} tooltip="Pen (P)" />
          <ToolButton icon={MessageSquare} tool={TOOLS.LABEL} active={activeTool} setActive={setActiveTool} tooltip="Label (1-8)" />
          <div className="w-8 h-px bg-gray-700 my-1" />
          <ToolButton icon={SquareDashed} tool={TOOLS.RECT_SELECT} active={activeTool} setActive={setActiveTool} tooltip="Rect Select (S)" />
          <ToolButton icon={Spline} tool={TOOLS.LASSO_SELECT} active={activeTool} setActive={setActiveTool} tooltip="Lasso (S)" />
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden cursor-crosshair"
          onWheel={handleWheel}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenuPosition({ x: e.clientX, y: e.clientY })
              setShowContextMenu(true)
            }}
            className={`${isPanning ? 'cursor-grabbing' : (activeTool === TOOLS.SELECT || activeTool === TOOLS.TRANSFORM) ? 'cursor-default' : 'cursor-crosshair'}`}
          />

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-2 py-1 border border-gray-700">
            <button onClick={() => setZoom(z => Math.max(0.1, z * 0.8))} className="p-1 hover:bg-gray-700 rounded">
              <ZoomOut className="h-4 w-4 text-gray-400" />
            </button>
            <span className="text-xs text-gray-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(5, z * 1.25))} className="p-1 hover:bg-gray-700 rounded">
              <ZoomIn className="h-4 w-4 text-gray-400" />
            </button>
            <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }) }} className="p-1 hover:bg-gray-700 rounded ml-1">
              <RotateCcw className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          {/* Selection actions */}
          {selectionPath.length > 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 bg-[#1a1a1a] rounded-lg px-3 py-2 border border-gray-700">
              <Button onClick={handleCutToLayer} size="sm" variant="ghost" className="text-blue-400">
                <Scissors className="h-4 w-4 mr-1" /> Cut to Layer
              </Button>
              <Button onClick={handleFillSelection} size="sm" variant="ghost" className="text-red-400">
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
              <Button onClick={() => { setSelectionPath([]); setSelectionType(null) }} size="sm" variant="ghost" className="text-gray-400">
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          )}

          {/* Text input overlay (labels only - text objects use inline canvas editing) */}
          {editingTextId && (() => {
            const editObj = objects.find(o => o.id === editingTextId)
            if (!editObj || editObj.type !== 'label') return null
            const padding = 8 * zoom
            return (
              <div
                className="absolute"
                style={{
                  left: (editObj.x || 0) * zoom + offset.x,
                  top: (editObj.y || 0) * zoom + offset.y,
                }}
              >
                <textarea
                  value={editingTextValue}
                  onChange={(e) => setEditingTextValue(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      setObjects(prev => prev.map(obj =>
                        obj.id === editingTextId
                          ? { ...obj, text: editingTextValue }
                          : obj
                      ))
                      setEditingTextId(null)
                      setEditingTextValue('')
                    } else if (e.key === 'Escape') {
                      setEditingTextValue(editingOriginalValue)
                      setEditingTextId(null)
                    }
                  }}
                  className="outline-none resize-none overflow-hidden text-white bg-[#F97316] font-bold border-2 border-white rounded"
                  style={{
                    fontSize: 12 * zoom,
                    lineHeight: `${20 * zoom}px`,
                    padding: `${2 * zoom}px ${padding}px`,
                    minWidth: 80 * zoom,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
                  }}
                  rows={Math.max(1, editingTextValue.split('\n').length)}
                  autoFocus
                />
              </div>
            )
          })()}
        </div>

        {/* Right panel */}
        <div className="w-72 bg-[#0f0f0f] border-l border-gray-700 p-3 flex flex-col gap-3 overflow-y-auto">
          {/* Layer Panel */}
          <LayerPanel
            layers={layers}
            selectedLayerIds={selectedLayerIds}
            onSelectLayer={(layerId, e) => {
              if (e.ctrlKey || e.metaKey) {
                // Ctrl+click: toggle individual layer
                setSelectedLayerIds(prev =>
                  prev.includes(layerId)
                    ? prev.filter(id => id !== layerId)
                    : [...prev, layerId]
                )
              } else if (e.shiftKey && selectedLayerIds.length > 0) {
                // Shift+click: range select
                const lastSelected = selectedLayerIds[selectedLayerIds.length - 1]
                const lastIdx = layers.findIndex(l => l.id === lastSelected)
                const currIdx = layers.findIndex(l => l.id === layerId)
                const start = Math.min(lastIdx, currIdx)
                const end = Math.max(lastIdx, currIdx)
                const range = layers.slice(start, end + 1).map(l => l.id)
                setSelectedLayerIds(prev => [...new Set([...prev, ...range])])
              } else {
                // Normal click: select only this layer
                setSelectedLayerIds([layerId])
              }
            }}
            onToggleVisibility={toggleLayerVisibility}
            onToggleLock={toggleLayerLock}
            onDeleteLayer={deleteLayer}
            onReorderLayers={() => {}}
            onRenameLayer={renameLayer}
            smartFillOnDelete={smartFillOnDelete}
            onToggleSmartFill={setSmartFillOnDelete}
          />
          {/* Sequence Panel */}
          <SequencePanel
            annotations={objects}
            onReorder={() => {}}
            onRemove={removeSequenceFromObject}
            onSelectAnnotation={(id) => setSelectedObjectId(id)}
          />

          {/* Properties Panel */}
          <PropertiesPanel
            selectedObject={selectedObject}
            onUpdateObject={updateObject}
          />

          {/* Quick Labels */}
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-2">
            <span className="text-sm font-semibold text-gray-300 mb-2 block">Quick Labels (1-8)</span>
            <div className="grid grid-cols-2 gap-1">
              {LABEL_PRESETS.map((preset, index) => (
                <button
                  key={preset.type}
                  onClick={() => createLabel(preset, { x: -offset.x / zoom + 100, y: -offset.y / zoom + 100 })}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-gray-700 text-left text-gray-300"
                >
                  <span className="text-gray-500">{index + 1}</span>
                  <span className="text-[#F97316]">{preset.type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sequence & Generate */}
          <div className="flex gap-0.5">
            <Button
              onClick={() => setSequenceMode(!sequenceMode)}
              variant={sequenceMode ? 'default' : 'ghost'}
              size="sm"
              className={`flex-1 text-xs px-1 ${sequenceMode ? 'bg-purple-600 hover:bg-purple-500' : 'text-gray-400'}`}
            >
              <Hash className="h-3.5 w-3.5" />
              Sequence {sequenceMode ? 'ON' : 'OFF'}
            </Button>
            <Button onClick={generatePrompt} variant="ghost" size="sm" className="flex-1 text-xs px-1 text-cyan-400 hover:text-cyan-300">
              <FileText className="h-3.5 w-3.5" />
              Generate Prompt
            </Button>
          </div>

          {/* Help */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Scroll to zoom, drag empty space to pan</p>
            <p>• Press S to toggle sequence mode</p>
            <p>• Ctrl+G to generate prompt</p>
            <p>• Ctrl+C to copy canvas to clipboard</p>
            <p>• Cmd+G to paste image in Claude Code</p>
            <p>• Del to delete selected layer(s)</p>
            <p>• Alt+drag to duplicate object</p>
            <p>• Shift+release to delete dragged object</p>
            <p>• Ctrl+click / Shift+click for multi-select layers</p>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowContextMenu(false)} onContextMenu={(e) => { e.preventDefault(); setShowContextMenu(false) }} />
          <div
            className="fixed bg-[#1a1a1a] border border-gray-600 rounded-lg py-1 shadow-xl z-50 min-w-[160px]"
            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
          >
            <button
              onClick={() => { copyCanvasToClipboard(); setShowContextMenu(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 text-left"
            >
              <Copy className="h-3.5 w-3.5 text-gray-400" /> Copy
            </button>
            <button
              onClick={() => { setActiveTool(TOOLS.SELECT); setShowContextMenu(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 text-left"
            >
              <Move className="h-3.5 w-3.5 text-gray-400" /> Move
            </button>
            <button
              onClick={() => {
                if (selectedObjectId) {
                  deleteObject(selectedObjectId)
                }
                setShowContextMenu(false)
              }}
              disabled={!selectedObjectId}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 text-left disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3.5 w-3.5 text-gray-400" /> Delete
            </button>
            <div className="my-1 border-t border-gray-700" />
            <button
              onClick={() => { setActiveTool(TOOLS.RECT_SELECT); setShowContextMenu(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 text-left"
            >
              <SquareDashed className="h-3.5 w-3.5 text-gray-400" /> Select Rectangle
            </button>
            <button
              onClick={() => { setActiveTool(TOOLS.LASSO_SELECT); setShowContextMenu(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 text-left"
            >
              <Spline className="h-3.5 w-3.5 text-gray-400" /> Select Lasso
            </button>
            <button
              onClick={() => { setActiveTool(TOOLS.ARROW); setShowContextMenu(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 text-left"
            >
              <ArrowRight className="h-3.5 w-3.5 text-gray-400" /> Arrow
            </button>
            <button
              onClick={() => { setActiveTool(TOOLS.LABEL); setShowContextMenu(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 text-left"
            >
              <MessageSquare className="h-3.5 w-3.5 text-gray-400" /> Label
            </button>
          </div>
        </>
      )}

      {/* Label Menu Popup */}
      {showLabelMenu && (
        <div
          className="fixed bg-[#1a1a1a] border border-gray-700 rounded-lg p-2 shadow-xl z-50"
          style={{ left: labelMenuPosition.x, top: labelMenuPosition.y }}
        >
          <div className="grid grid-cols-2 gap-1">
            {LABEL_PRESETS.map(preset => (
              <button
                key={preset.type}
                onClick={() => pendingLabelPosition && createLabel(preset, pendingLabelPosition)}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-gray-700 text-left"
                style={{ color: preset.color }}
              >
                <span>{preset.icon}</span>
                <span>{preset.type}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ================== TOOL BUTTON COMPONENT ==================
const ToolButton = ({ icon: Icon, tool, active, setActive, tooltip }) => (
  <button
    onClick={() => setActive(tool)}
    className={`p-2 rounded ${active === tool ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}
    title={tooltip}
  >
    <Icon className="h-4 w-4" />
  </button>
)
