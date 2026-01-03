import { useRef, useEffect, useCallback } from 'react'
import * as markerjs2 from 'markerjs2'

export function ImageAnnotator({
  isOpen,
  onClose,
  imageData,
  imageName,
  onSave
}) {
  const imageRef = useRef(null)
  const markerAreaRef = useRef(null)
  const containerRef = useRef(null)

  // Open marker.js when isOpen becomes true
  useEffect(() => {
    if (!isOpen || !imageData) return

    // Create a hidden image element for marker.js to use
    const img = document.createElement('img')
    img.src = imageData
    img.style.position = 'absolute'
    img.style.left = '-9999px'
    img.style.top = '-9999px'
    img.style.visibility = 'hidden'
    img.crossOrigin = 'anonymous'

    document.body.appendChild(img)
    imageRef.current = img

    img.onload = () => {

      const markerArea = new markerjs2.MarkerArea(img)
      markerAreaRef.current = markerArea

      // Configure available markers
      markerArea.availableMarkerTypes = [
        markerjs2.FreehandMarker,
        markerjs2.FrameMarker,
        markerjs2.ArrowMarker,
        markerjs2.TextMarker,
        markerjs2.EllipseMarker,
        markerjs2.HighlightMarker,
        markerjs2.CalloutMarker,
      ]

      // Use popup display mode
      markerArea.settings.displayMode = 'popup'

      // Dark theme styling
      markerArea.uiStyleSettings.toolbarBackgroundColor = '#1f2937'
      markerArea.uiStyleSettings.toolbarBackgroundHoverColor = '#374151'
      markerArea.uiStyleSettings.toolboxColor = '#e5e7eb'
      markerArea.uiStyleSettings.toolboxAccentColor = '#06b6d4'

      // Handle render (save) event
      markerArea.addEventListener('render', (event) => {
        const base64 = event.dataUrl.split(',')[1]
        onSave({
          data: base64,
          preview: event.dataUrl
        })
        cleanup()
      })

      // Handle close event
      markerArea.addEventListener('close', () => {
        cleanup()
      })

      // Show the marker area
      markerArea.show()
    }

    img.onerror = () => {
      console.error('Failed to load image for annotation')
      cleanup()
    }

    const cleanup = () => {
      if (markerAreaRef.current) {
        try {
          markerAreaRef.current.close()
        } catch (e) {
          // Already closed
        }
        markerAreaRef.current = null
      }
      if (imageRef.current && imageRef.current.parentNode) {
        imageRef.current.parentNode.removeChild(imageRef.current)
        imageRef.current = null
      }
      onClose()
    }

    return cleanup
  }, [isOpen, imageData, onSave, onClose])

  // Component doesn't render anything - marker.js handles its own UI
  return null
}
