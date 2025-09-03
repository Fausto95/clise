---
description:
globs:
alwaysApply: true
---

# Cursor Rules for Clise Design Canvas

## Project Architecture Overview

This is a React-based design canvas application built with TypeScript, using CanvasKit for high-performance rendering. The architecture follows strict single-responsibility principles with atomic state management using Jotai.

## Core Technologies & Libraries

- React 18 with TypeScript (strict mode)
- Jotai for atomic state management
- CanvasKit (Google's Skia-based 2D graphics library)
- Lucide React for icons
- CSS Modules for styling

## File Structure & Naming Conventions

### Universal File Naming Convention

- **ALL files must use kebab-case naming** (e.g., `element-atoms.ts`, `canvaskit-canvas.tsx`, `cursor-manager.ts`)
- **Maximum 200 lines of code per file** - split files when they exceed this limit
- Component files: `component-name.tsx`
- Utility files: `util-name.ts`
- Type definition files: `type-definitions.ts`
- Hook files: `use-hook-name.ts` or `hook-name-hooks.ts`

### Store Architecture (Single Responsibility Modules)

All store files use kebab-case naming and are split by responsibility:

**Atoms** (state definitions):

- `document-atoms.ts` - Document name, tool selection
- `element-atoms.ts` - Element storage, CRUD operations, element families
- `selection-atoms.ts` - Selection state, box selection coordinates
- `interaction-atoms.ts` - Dragging, resizing, drawing, context menu states
- `viewport-atoms.ts` - Zoom, pan, canvas/viewport dimensions
- `renderer-atoms.ts` - CanvasKit instance, renderer configuration
- `clipboard-atoms.ts` - Copy/paste operations
- `derived-atoms.ts` - Cross-module derived atoms (to avoid circular imports)

**Hooks** (state access patterns):

- `document-hooks.ts`, `element-hooks.ts`, `selection-hooks.ts`, etc.
- Each hooks file corresponds to its atoms counterpart
- `index.ts` re-exports everything for backward compatibility

### Canvas Architecture

- `canvaskit-canvas.tsx` - Main canvas component using atomic state hooks
- `drawing/CanvasKitRenderer.ts` - Pure renderer class, no React state
- `managers/` - Utility classes for calculations (no React state)
- `hooks/` - Custom canvas-specific hooks
- `utils.ts` - Pure utility functions for coordinate transforms, element detection

## State Management Patterns

### Atomic State Architecture - CRITICAL RULES

- **NEVER use React state (useState, useReducer, etc.)** - ALWAYS use Jotai atoms instead
- **NEVER use `const [state, setState] = useState()`** - use `const [value, setValue] = useAtom(someAtom)` instead
- **NEVER use `useRef()` for state** - use atoms for all application state
- Each piece of state has a single-responsibility atom
- Use `atomFamily` for dynamic collections (elements by ID)
- Derived atoms for computed values that depend on multiple atoms
- If you see React state in existing code, refactor it to use atoms

### Element Management

- Elements stored in `elementAtomFamily(id)` for granular updates
- `elementIdsAtom` maintains order and existence
- `elementsAtom` is a derived atom that combines IDs with element data
- Position and style updates use optimized `elementPositionAtomFamily` and `elementStyleAtomFamily`

### Interaction State Management

- Each interaction type has dedicated atoms: `isDraggingAtom`, `isResizingAtom`, `isDrawingAtom`, `isBoxSelectingAtom`
- Coordinates stored in canvas coordinate system (after `screenToCanvas` transformation)
- Box selection stores start/end in canvas coordinates for consistent rendering

## Canvas Rendering Architecture

### Coordinate System

- **Screen Coordinates**: Raw mouse/touch coordinates from browser events
- **Canvas Coordinates**: World coordinates after zoom/pan transformation
- **Transformation Order**: DPR scaling → center-origin zoom → pan translation

### Key Coordinate Functions

```typescript
screenToCanvas(clientX, clientY, viewportInfo, transform); // Converts screen → canvas
canvasToScreen(canvasX, canvasY, viewportInfo, transform); // Converts canvas → screen
```

### Center-Origin Zoom Implementation

```typescript
// In renderer - zoom around canvas center, not top-left
const centerX = dimensions.width / dpr / 2;
const centerY = dimensions.height / dpr / 2;
canvasContext.translate(centerX, centerY);
canvasContext.scale(zoom, zoom);
canvasContext.translate(-centerX, -centerY);
```

## Element System

### Element Types

```typescript
type ElementType = "rect" | "ellipse" | "frame" | "text";
type Tool = "select" | "rect" | "ellipse" | "frame" | "text" | "path";
```

### Element Structure

- All elements extend `BaseElement` with `id`, position (`x`, `y`, `w`, `h`), styling, hierarchy
- `TextElement` adds `text`, `color`, `fontSize`, `fontFamily`
- Frame elements can contain other elements via `parentId` relationships

### Element Operations

- CRUD operations via write-only atoms: `addElementAtom`, `updateElementAtom`, `deleteElementsAtom`
- Optimized position-only updates: `updateElementPositionAtom`
- Optimized style-only updates: `updateElementStyleAtom`
- Reordering via `reorderElementsAtom` with specific operations: `"bring-to-front" | "send-to-back"` etc.

## Interaction Patterns

### Selection System

- Multi-selection with Ctrl/Cmd (toggle) and Shift (extend)
- Box selection with real-time visual feedback and element intersection testing
- Selection coordinates stored as canvas coordinates, transformed for rendering

### Resize System

- 8-handle resize system: `nw`, `n`, `ne`, `w`, `e`, `sw`, `s`, `se`
- Handle detection with zoom-scaled hit areas
- Real-time resize with `ResizeManager.calculateResize()`
- Resize cursors: `nw-resize`, `ns-resize`, `ne-resize`, `ew-resize`

### Drawing System

- Tool-based drawing with atomic state management
- Drawing coordinates stored in canvas coordinate system
- Real-time preview during drawing operations
- Tool automatically switches to "select" after drawing completion

### Context Menu System

- Position calculated to stay within canvas bounds
- Coordinates stored relative to canvas container
- Operations: copy, paste, duplicate, reorder (bring to front/back, etc.)
- Reorder operations use specific parameter structure: `{ elementIds: string[], operation: "bring-to-front" | ... }`

## Canvas Rendering Rules

### CanvasKit Renderer Patterns

- Renderer is a pure class with no React dependencies
- All transformations applied in specific order: DPR → zoom → pan
- Elements rendered with proper z-ordering (frames behind, selection on top)
- Box selection rendered in world coordinates (same as elements)

### Performance Optimizations

- Surface recreation on every render for proper state management
- Device pixel ratio handling for high-DPI displays
- Atomic updates for fine-grained re-renders
- Debounced parent-child relationship updates

## TypeScript Conventions

### Strict TypeScript Rules

- No `any` types (use proper typing or `unknown`)
- All function parameters and return types explicitly typed
- Interface segregation for complex types
- Generic constraints for reusable components

### Import/Export Patterns

- Absolute imports using `@store/index` path mapping
- Re-export patterns through `index.ts` files for clean APIs
- Circular import prevention through `derived-atoms.ts`

## Event Handling Patterns

### Mouse Event Processing

1. Get `getBoundingClientRect()` for coordinate normalization
2. Create `viewportInfo` and `transform` objects
3. Convert to canvas coordinates using `screenToCanvas`
4. Process interaction based on current tool and state
5. Update atomic state through appropriate atoms

### Keyboard Shortcuts

- Delete/Backspace: Delete selected elements
- Ctrl/Cmd+A: Select all elements
- Ctrl/Cmd+C: Copy selected elements
- Ctrl/Cmd+V: Paste elements
- Ctrl/Cmd+D: Duplicate elements
- D key: Duplicate elements (without modifier)
- Escape: Close context menus
- Zoom: Ctrl/Cmd + =/-/0

## Testing & Development Patterns

### Component Testing Approach

- Test atomic state changes independently
- Mock CanvasKit for unit tests
- Test coordinate transformations with known values
- Verify interaction state machines

### Debugging Guidelines

- Use atomic state inspection via Jotai DevTools
- Log coordinate transformations during development
- Verify render dependencies in useEffect arrays
- Check for state synchronization between atoms

## Error Handling

### Canvas Errors

- Graceful CanvasKit initialization failure handling
- Surface creation error recovery
- Coordinate transformation boundary checking
- Element operation validation

### State Consistency

- Validate element IDs exist before operations
- Check selection state consistency after updates
- Ensure parent-child relationship integrity
- Handle race conditions in async operations

## Performance Guidelines

### State Update Optimization

- Use atomic updates for fine-grained changes
- Batch related state changes when possible
- Debounce expensive operations (parent-child updates)
- Minimize React re-renders through proper dependency arrays

### Rendering Optimization

- Cache CanvasKit objects when possible
- Use appropriate paint disposal patterns
- Minimize canvas state save/restore calls
- Optimize hit testing for large element counts

## Code Style Guidelines

### File Size & Organization

- **MAXIMUM 200 lines per file** - when a file approaches this limit:
  - Split into smaller single-responsibility files
  - Extract utility functions to separate files
  - Create composite hooks to group related functionality
  - Move large type definitions to separate type files

### Formatting & Structure

- Use arrow functions for components and utilities
- Prefer `const` assertions for literal types
- Use destructuring for clean parameter extraction
- Group related imports with clear separation

### Naming Conventions

- **Files: ALL files must use kebab-case** (e.g., `element-atoms.ts`, `resize-manager.ts`, `canvas-component.tsx`)
- Atoms: `*Atom` suffix (e.g., `selectionAtom`)
- Hooks: `use*` prefix (e.g., `useSelection`)
- Managers: `*Manager` suffix (e.g., `ResizeManager`)
- Types: PascalCase interfaces and types

## Integration Patterns

### Hook Usage Patterns

```typescript
// CORRECT: Always use Jotai atomic hooks - NEVER React state
const [selection, setSelection] = useSelection();
const [isDragging, setIsDragging] = useIsDragging();
const [elements] = useElements();

// WRONG: Never use React state
// const [selection, setSelection] = useState([]); // ❌ FORBIDDEN
// const [isDragging, setIsDragging] = useState(false); // ❌ FORBIDDEN

// Use composite hooks for related operations
const { addElement, updateElement } = useElementOperations();

// Create context for coordinate transformations
const viewportInfo = { x: 0, y: 0, width, height, zoom, rect };
const transform = { zoom, panX: pan.x, panY: pan.y };
```

### Canvas Integration

```typescript
// Coordinate transformation pattern
const canvasCoords = screenToCanvas(clientX, clientY, viewportInfo, transform);

// Element detection pattern
const clickedElement = getElementAtPoint(canvasCoords, elements);
const resizeHandle = getResizeHandle(canvasCoords, element, zoom);

// Atomic state updates
setIsDragging(true);
setDragStart(canvasCoords);
setSelection([elementId]);
```

## CRITICAL ENFORCEMENT RULES

### State Management (STRICTLY ENFORCED)

- **ZERO TOLERANCE for React state** - any `useState`, `useReducer`, or `useRef` for state must be replaced with atoms
- Every piece of application state MUST use Jotai atoms
- If you see React state in any file, it must be refactored immediately

### File Organization (STRICTLY ENFORCED)

- **ALL files MUST use kebab-case naming** - no exceptions
- **200 lines maximum per file** - split files that exceed this limit
- Single responsibility per file - one clear purpose per file

### Code Review Checklist

Before any code is considered complete, verify:

- ✅ No React state (useState, useReducer, useRef for state)
- ✅ All files use kebab-case naming
- ✅ All files under 200 lines
- ✅ Single responsibility per file
- ✅ Proper atomic state patterns
- ✅ Coordinate transformations use center-origin zoom

Follow these patterns consistently throughout the codebase. When adding new features, maintain the atomic state architecture and single-responsibility principle. Always prefer atomic hooks over local React state, and ensure coordinate transformations are handled correctly for the center-origin zoom system.