# Styles Directory

This directory contains the modular CSS structure for the application. Styles have been split into logical, maintainable files based on component and functionality.

## File Structure

### Core Styles

- **`base.css`** - CSS variables, global styles, and common utility classes
- **`layout.css`** - Main app layout, grid system, and responsive design
- **`index.css`** - Main entry point that imports all other CSS files

### Component Styles

- **`panels.css`** - Common panel styles, headers, and animations
- **`canvas.css`** - Canvas-specific styles and empty states
- **`tools.css`** - Floating tools styles and responsive design
- **`layers.css`** - Layer-specific styles for the layers panel
- **`inspector.css`** - Inspector-specific styles for the inspector panel

### Utility Styles

- **`utilities.css`** - Animations, empty states, and welcome overlay
- **`overlays.css`** - Keyboard shortcuts, position indicators, and other overlays

## Import Order

The `index.css` file imports all styles in the correct order to ensure proper CSS cascade:

1. Base styles (variables, global styles)
2. Layout styles (grid, responsive)
3. Component styles (panels, canvas, tools, layers, inspector)
4. Utility styles (animations, overlays)

## Benefits

- **Maintainability**: Each file has a single responsibility
- **Reusability**: Common styles can be easily shared between components
- **Performance**: Only load the styles you need
- **Organization**: Clear separation of concerns
- **Scalability**: Easy to add new component-specific styles

## Usage

Import the main styles file in your main entry point:

```tsx
import "./styles/index.css";
```

All other CSS files will be automatically imported and available.
