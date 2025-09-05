/*
# Command System Integration Guide

## Step 1: Replace existing keyboard handlers

Replace the old `useCanvasKeyboardHandlers` in your main canvas component:

```tsx
// OLD:
import { useCanvasKeyboardHandlers } from "./hooks/use-canvas-keyboard-handlers";

export function Canvas() {
  useCanvasKeyboardHandlers(); // Old approach
  // ... rest of component
}

// NEW:
import { useCommandBasedKeyboardHandlers } from "../commands";

export function Canvas() {
  useCommandBasedKeyboardHandlers(); // New command-based approach
  // ... rest of component
}
```

## Step 2: Replace direct state mutations with commands

### Element Operations

```tsx
// OLD:
import { useElementOperations } from "../store";
const { deleteElements, duplicateElements, updateElementPosition } = useElementOperations();

// Usage:
deleteElements(selection);
updateElementPosition({ id, x: x + 10, y });

// NEW:
import { useCommandDispatcher, deleteSelection, moveSelection } from "../commands";
const { dispatch } = useCommandDispatcher();

// Usage:
dispatch(deleteSelection());
dispatch(moveSelection(10, 0));
```

### Clipboard Operations

```tsx
// OLD:
import { useElementOperations } from "../store";
const { copyElements, pasteElements } = useElementOperations();

// Usage:
copyElements(selection);
pasteElements();

// NEW:
import { useCommandDispatcher, copySelection, pasteClipboard } from "../commands";
const { dispatch } = useCommandDispatcher();

// Usage:
dispatch(copySelection());
dispatch(pasteClipboard());
```

### Group Operations

```tsx
// OLD:
import { useGroupOperations } from "../store";
const { createGroup, ungroup } = useGroupOperations();

// Usage:
createGroup({ elementIds: selection });
ungroup(groupId);

// NEW:
import { useCommandDispatcher, createGroup, ungroup } from "../commands";
const { dispatch } = useCommandDispatcher();

// Usage:
dispatch(createGroup(selection));
dispatch(ungroup(groupId));
```

## Step 3: Tool-specific integrations

### Drawing Tools

```tsx
// When creating new elements from drawing tools:
import { useCommandDispatcher, createRect, createEllipse, createText } from "../commands";

const { dispatch } = useCommandDispatcher();

// In drawing handlers:
const handleRectComplete = (bounds: { x: number, y: number, w: number, h: number }) => {
  dispatch(createRect(bounds.x, bounds.y, bounds.w, bounds.h));
};

const handleTextCreate = (position: { x: number, y: number }, text: string) => {
  dispatch(createText(position.x, position.y, text));
};
```

### Context Menu Actions

```tsx
// Replace context menu handlers:
import { useCommandDispatcher, reorderElements, toggleElementVisibility } from "../commands";

const { dispatch } = useCommandDispatcher();

const contextMenuActions = {
  bringToFront: () => dispatch(reorderElements(selection, "bring-to-front")),
  sendToBack: () => dispatch(reorderElements(selection, "send-to-back")),
  hide: () => dispatch(hideSelectedElements()),
  toggleVisibility: (elementId: string) => dispatch(toggleElementVisibility(elementId))
};
```

## Step 4: Update component integrations

### Inspector Components

```tsx
// Instead of calling store operations directly:
const handleElementUpdate = (elementId: string, changes: Partial<Element>) => {
  // Create a custom update command or use existing ones
  dispatch(updateElementStyle(elementId, changes));
};
```

## Benefits of Command Integration:

1. **Automatic History**: All operations go through history automatically
2. **Undo/Redo**: Every command supports undo/redo
3. **Consistent State**: All state changes go through the same pipeline
4. **Better Testing**: Commands are pure functions, easy to test
5. **Cleaner Code**: Replace complex logic with simple command dispatch
6. **Performance**: Commands can be batched and optimized
7. **Debugging**: Easy to track what operations happened

## Migration Strategy:

1. Start with keyboard handlers (highest impact, easiest to test)
2. Move to context menu actions
3. Update drawing tool integrations
4. Replace inspector operations
5. Add command-based toolbar actions

Each step provides immediate benefits while maintaining compatibility with existing code.
*/
