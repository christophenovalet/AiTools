// Keyboard Shortcuts Configuration
const SHORTCUTS_STORAGE_KEY = 'keyboard-shortcuts'

// Default keyboard shortcuts
export const DEFAULT_SHORTCUTS = {
  clearChat: {
    id: 'clearChat',
    label: 'Clear Chat',
    description: 'Clear the chatbot conversation',
    key: 'K',
    ctrlKey: true,
    shiftKey: true,
    altKey: false
  },
  quickTags: {
    id: 'quickTags',
    label: 'Quick Tags',
    description: 'Toggle the tags overlay',
    key: 'Space',
    ctrlKey: true,
    shiftKey: true,
    altKey: false
  }
}

// Format a shortcut object into a display string
export function formatShortcut(shortcut) {
  if (!shortcut) return ''
  const parts = []
  if (shortcut.ctrlKey) parts.push('Ctrl')
  if (shortcut.altKey) parts.push('Alt')
  if (shortcut.shiftKey) parts.push('Shift')

  // Format key for display
  let keyDisplay = shortcut.key
  if (keyDisplay === 'Space') keyDisplay = 'Space'
  else if (keyDisplay.length === 1) keyDisplay = keyDisplay.toUpperCase()

  parts.push(keyDisplay)
  return parts.join('+')
}

// Parse a keyboard event into a shortcut object
export function parseKeyboardEvent(event) {
  // Get the key, handling special cases
  let key = event.key
  if (event.code === 'Space') key = 'Space'
  else if (key.length === 1) key = key.toUpperCase()

  return {
    key,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey
  }
}

// Check if a keyboard event matches a shortcut
export function matchesShortcut(event, shortcut) {
  if (!shortcut) return false

  const eventKey = event.code === 'Space' ? 'Space' : event.key.toUpperCase()
  const shortcutKey = shortcut.key === 'Space' ? 'Space' : shortcut.key.toUpperCase()

  return (
    eventKey === shortcutKey &&
    event.ctrlKey === shortcut.ctrlKey &&
    event.shiftKey === shortcut.shiftKey &&
    event.altKey === shortcut.altKey
  )
}

// Check if two shortcuts are the same
export function shortcutsEqual(a, b) {
  if (!a || !b) return false
  return (
    a.key === b.key &&
    a.ctrlKey === b.ctrlKey &&
    a.shiftKey === b.shiftKey &&
    a.altKey === b.altKey
  )
}

// Check for conflicts between shortcuts
export function findConflicts(shortcuts, newShortcut, excludeId) {
  const conflicts = []
  for (const [id, shortcut] of Object.entries(shortcuts)) {
    if (id !== excludeId && shortcutsEqual(shortcut, newShortcut)) {
      conflicts.push(shortcut)
    }
  }
  return conflicts
}

// Validate a shortcut (must have at least one modifier + a key)
export function isValidShortcut(shortcut) {
  if (!shortcut || !shortcut.key) return false
  // Must have at least one modifier key
  return shortcut.ctrlKey || shortcut.altKey || shortcut.shiftKey
}

// Get saved shortcuts from localStorage
export function getShortcuts() {
  try {
    const stored = localStorage.getItem(SHORTCUTS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Merge with defaults to ensure all shortcuts exist
      return { ...DEFAULT_SHORTCUTS, ...parsed }
    }
  } catch (e) {
    // Use defaults on error
  }
  return { ...DEFAULT_SHORTCUTS }
}

// Get a specific shortcut
export function getShortcut(id) {
  const shortcuts = getShortcuts()
  return shortcuts[id] || DEFAULT_SHORTCUTS[id]
}

// Save shortcuts to localStorage
export function saveShortcuts(shortcuts) {
  localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(shortcuts))
}

// Reset shortcuts to defaults
export function resetShortcuts() {
  localStorage.removeItem(SHORTCUTS_STORAGE_KEY)
  return { ...DEFAULT_SHORTCUTS }
}
