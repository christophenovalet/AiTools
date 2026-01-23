import React, { useCallback, useRef, useImperativeHandle, forwardRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { xml } from '@codemirror/lang-xml'
import { foldAll, unfoldAll } from '@codemirror/language'
import { Button } from './ui/button'
import { WrapText, ChevronsDownUp, ChevronsUpDown, Copy } from 'lucide-react'

// XML formatting function - preserves content structure while fixing indentation
export function formatXml(xmlString) {
  if (!xmlString.trim()) return xmlString

  try {
    let formatted = ''
    let indent = 0
    const tab = '\t'

    // Normalize line endings and split into lines
    const lines = xmlString.replace(/\r\n/g, '\n').split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) {
        // Preserve empty lines
        formatted += '\n'
        continue
      }

      // Check if line is a closing tag
      const isClosingTag = /^<\/[^>]+>$/.test(line)
      // Check if line is an opening tag (not self-closing, not closing)
      const isOpeningTag = /^<[^\/!?][^>]*[^\/]>$/.test(line) || /^<[a-zA-Z]>$/.test(line)
      // Check if line is self-closing
      const isSelfClosing = /^<[^>]+\/>$/.test(line)
      // Check if line is a complete element (opening + content + closing on same line)
      const isCompleteElement = /^<([a-zA-Z_][a-zA-Z0-9_-]*)(?:\s[^>]*)?>.*<\/\1>$/.test(line)
      // Check if line is just text content
      const isTextContent = !line.startsWith('<')

      if (isClosingTag) {
        indent = Math.max(0, indent - 1)
        formatted += tab.repeat(indent) + line + '\n'
      } else if (isCompleteElement || isSelfClosing) {
        formatted += tab.repeat(indent) + line + '\n'
      } else if (isOpeningTag) {
        formatted += tab.repeat(indent) + line + '\n'
        indent++
      } else if (isTextContent) {
        formatted += tab.repeat(indent) + line + '\n'
      } else {
        // Mixed or other content
        formatted += tab.repeat(indent) + line + '\n'
      }
    }

    return formatted.trim()
  } catch (e) {
    return xmlString
  }
}

const XmlEditor = forwardRef(function XmlEditor({
  value,
  onChange,
  placeholder = 'Enter XML content...',
  minHeight = '150px',
  maxHeight = '400px',
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
    getSelectionCoords: () => {
      const view = editorRef.current?.view
      if (!view) return null
      const { from, to } = view.state.selection.main
      if (from === to) return null
      const startCoords = view.coordsAtPos(from)
      const endCoords = view.coordsAtPos(to)
      if (!startCoords || !endCoords) return null
      return {
        x: (startCoords.left + endCoords.right) / 2,
        y: startCoords.top - 45
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
    replaceSelection: (text, cursorOffset = null) => {
      const view = editorRef.current?.view
      if (!view) return
      const { from, to } = view.state.selection.main
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: cursorOffset !== null ? from + cursorOffset : from + text.length }
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

  const handleCollapseAll = useCallback(() => {
    const view = editorRef.current?.view
    if (view) foldAll(view)
  }, [])

  const handleExpandAll = useCallback(() => {
    const view = editorRef.current?.view
    if (view) unfoldAll(view)
  }, [])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value)
  }, [value])


  return (
    <div className="flex flex-col h-full">
      {showToolbar && (
        <div className="flex gap-1 mb-1 justify-start">
          <Button
            onClick={handleExpandAll}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-cyan-400 h-6 px-2 text-xs"
            title="Expand all"
          >
            <ChevronsUpDown className="w-3 h-3 mr-1" />
            Expand
          </Button>
          <Button
            onClick={handleCollapseAll}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-cyan-400 h-6 px-2 text-xs"
            title="Collapse all"
          >
            <ChevronsDownUp className="w-3 h-3 mr-1" />
            Collapse
          </Button>
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
          <Button
            onClick={handleCopy}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-cyan-400 h-6 px-2 text-xs"
            title="Copy to clipboard"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto rounded-lg">
        <CodeMirror
          ref={editorRef}
          value={value}
          onChange={onChange}
          extensions={[xml()]}
          theme="dark"
          placeholder={placeholder}
          minHeight={minHeight}
          maxHeight={maxHeight}
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
