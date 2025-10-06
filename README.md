# DiffTool - Text Comparison Application

A modern React text comparison tool built with shadcn/ui components and a sleek black/gray theme.

## Features

- **Multiple Comparisons**: Compare up to 5 different text versions simultaneously
- **Master Version**: Set one version as the master for reference comparisons
- **Visual Diff**: Side-by-side diff view with color-coded changes:
  - 🟢 Green: Added lines
  - 🔴 Red: Removed lines
  - 🟡 Yellow: Modified lines
- **Copy to Clipboard**: Export selected versions in a formatted prompt
- **Responsive Design**: Adaptive grid layout for 3-5 columns
- **Dark Theme**: Modern black/gray color scheme with colored accent buttons

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open your browser to the URL shown in the terminal (typically http://localhost:5173)

## Build

```bash
npm run build
```

## Technology Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **shadcn/ui** - Component library
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Usage

1. **Enter Text**: Type or paste text into each comparison panel
2. **Select Versions**: Check the boxes to include versions in comparison
3. **Set Master** (optional): Select a radio button to set a master version
4. **Copy**: Click "Copy Selected Versions" to copy formatted text to clipboard
5. **Compare**: Click "Show Differences" to view side-by-side diff
6. **Add More**: Click "Add Comparison" to add up to 5 panels total

## Color Scheme

- Background: `#0a0a0a` (near black)
- Cards: `#1a1a1a` (dark gray)
- Borders: `#333333` (subtle gray)
- Text: Light gray for readability
- Accent Buttons:
  - Yellow: Copy Selected Versions
  - Orange: Show Differences
  - Blue: Add Comparison
  - Gray: Back to Editor
