/*
Complete Command Usage Examples:

import { 
  useCommandDispatcher,
  moveSelection,
  selectAll,
  copySelection,
  pasteClipboard,
  duplicateSelection,
  deleteSelection,
  createGroup,
  ungroup,
  reorderElements,
  toggleElementVisibility,
  hideSelectedElements,
  createElement,
  createRect,
  createText
} from './commands';

export const useCanvasCommands = () => {
  const { dispatch } = useCommandDispatcher();

  // Movement commands
  const moveLeft = () => dispatch(moveSelection(-1, 0));
  const moveRight = () => dispatch(moveSelection(1, 0));
  const moveUp = () => dispatch(moveSelection(0, -1));
  const moveDown = () => dispatch(moveSelection(0, 1));
  const moveLeftFast = () => dispatch(moveSelection(-10, 0));

  // Selection commands
  const selectAllElements = () => dispatch(selectAll());

  // Clipboard commands
  const copy = () => dispatch(copySelection());
  const paste = () => dispatch(pasteClipboard());
  const duplicate = () => dispatch(duplicateSelection());

  // Element lifecycle
  const deleteSelected = () => dispatch(deleteSelection());
  const addRect = (x, y, w, h) => dispatch(createRect(x, y, w, h));
  const addText = (x, y, text) => dispatch(createText(x, y, text));

  // Grouping
  const groupSelected = (elementIds) => dispatch(createGroup(elementIds));
  const ungroupSelected = (groupId) => dispatch(ungroup(groupId));

  // Layer management
  const bringToFront = (ids) => dispatch(reorderElements(ids, "bring-to-front"));
  const sendToBack = (ids) => dispatch(reorderElements(ids, "send-to-back"));
  const bringForward = (ids) => dispatch(reorderElements(ids, "bring-forward"));
  const sendBackward = (ids) => dispatch(reorderElements(ids, "send-backward"));

  // Visibility
  const toggleVisibility = (id) => dispatch(toggleElementVisibility(id));
  const hideSelected = () => dispatch(hideSelectedElements());

  return {
    // Movement
    moveLeft, moveRight, moveUp, moveDown, moveLeftFast,
    // Selection
    selectAllElements,
    // Clipboard
    copy, paste, duplicate,
    // Element lifecycle
    deleteSelected, addRect, addText,
    // Grouping
    groupSelected, ungroupSelected,
    // Layer management
    bringToFront, sendToBack, bringForward, sendBackward,
    // Visibility
    toggleVisibility, hideSelected
  };
};

// Example keyboard handler integration:
export const handleKeyboardShortcuts = (e: KeyboardEvent) => {
  const commands = useCanvasCommands();
  
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 'a': commands.selectAllElements(); break;
      case 'c': commands.copy(); break;
      case 'v': commands.paste(); break;
      case 'd': commands.duplicate(); break;
      case 'g': commands.groupSelected(selectedIds); break;
      case ']': commands.bringForward(selectedIds); break;
      case '[': commands.sendBackward(selectedIds); break;
    }
  }
  
  switch (e.key) {
    case 'Delete': commands.deleteSelected(); break;
    case 'ArrowLeft': commands.moveLeft(); break;
    case 'ArrowRight': commands.moveRight(); break;
    case 'ArrowUp': commands.moveUp(); break;
    case 'ArrowDown': commands.moveDown(); break;
  }
};
*/
