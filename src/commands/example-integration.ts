/*
Example of how to integrate commands into existing keyboard handlers:

Replace the existing arrow key handling in use-canvas-keyboard-handlers.ts:

// Old approach:
if (deltaX !== 0 || deltaY !== 0) {
  moveSelectedElements(selection, deltaX, deltaY);
  return;
}

// New command-based approach:
import { useCommandDispatcher } from "../../../commands";
import { moveSelection } from "../../../commands";

const { dispatch } = useCommandDispatcher();

if (deltaX !== 0 || deltaY !== 0) {
  dispatch(moveSelection(deltaX, deltaY));
  return;
}

This provides:
1. Automatic history tracking
2. Consistent state updates
3. Undo/redo support
4. Better testability
5. Cleaner separation of concerns
*/
