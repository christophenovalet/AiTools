import React, { useCallback, useRef, useImperativeHandle, forwardRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { xml } from '@codemirror/lang-xml'
import { Button } from './ui/button'
import { WrapText } from 'lucide-react'

// XML formatting function
export function formatXml(xmlString) {
  if (!xmlString.trim()) return xmlString

  let formatted = ''
  let indent = 0
  const tab = '\t'

  // Split by tags while keeping the tags
  const parts = xmlString.replace(/>\s*</g, '><').split(/(<[^>]+>)/g).filter(Boolean)

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim()
    if (!part) continue

    if (part.startsWith('</')) {
      // Closing tag - decrease indent first
      indent = Math.max(0, indent - 1)
      formatted += tab.repeat(indent) + part + '\n'
    } else if (part.startsWith('<') && part.endsWith('/>')) {
      // Self-closing tag
      formatted += tab.repeat(indent) + part + '\n'
    } else if (part.startsWith('<')) {
      // Opening tag
      formatted += tab.repeat(indent) + part + '\n'
      // Only increase indent if it's not a self-closing tag and not a special tag
      if (!part.includes('</') && !part.startsWith('<?') && !part.startsWith('<!')) {
        indent++
      }
    } else {
      // Text content
      const trimmed = part.trim()
      if (trimmed) {
        formatted += tab.repeat(indent) + trimmed + '\n'
      }
    }
  }

  return formatted.trim()
}

const XmlEditor = forwardRef(function XmlEditor({
  value,
  onChange,
  placeholder = 'Enter XML content...',
  height = '200px',
  showToolbar = true,
  onFocus
}, ref) {
  const editorRef = useRef(null)

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getSelection: () => {
      const view = editorRef.current?.view
      if (!view) return { start: 0, end: 0, text: '' }
      const { from, to } = view.state.selection.main
      return {
        start: from,
        end: to,
        text: view.state.sliceDoc(from, to)
      }
    },
    insertAtCursor: (text) => {
      const view = editorRef.current?.view
      if (!view) return
      const { from, to } = view.state.selection.main
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length }
      })
    },
    replaceSelection: (text) => {
      const view = editorRef.current?.view
      if (!view) return
      const { from, to } = view.state.selection.main
      view.dispatch({
        changes: { from, to, insert: text }
      })
    },
    focus: () => {
      editorRef.current?.view?.focus()
    },
    getValue: () => value
  }))

  const handleFormat = useCallback(() => {
    const formatted = formatXml(value)
    onChange(formatted)
  }, [value, onChange])

  return (
    <div className="flex flex-col h-full">
      {showToolbar && (
        <div className="flex gap-1 mb-1 justify-end">
          <Button
            onClick={handleFormat}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-cyan-400 h-6 px-2 text-xs"
            title="Auto-format XML"
          >
            <WrapText className="w-3 h-3 mr-1" />
            Format
          </Button>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-hidden rounded-lg" style={{ height }}>
        <CodeMirror
          ref={editorRef}
          value={value}
          onChange={onChange}
          extensions={[xml()]}
          theme="dark"
          placeholder={placeholder}
          height={height}
          onFocus={onFocus}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
          }}
        />
      </div>
    </div>
  )
})

export default XmlEditor
