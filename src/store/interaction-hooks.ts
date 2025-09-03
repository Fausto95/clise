import { useAtom } from "jotai";
import {
	contextMenuAtom,
	dragStartAtom,
	editingTextIdAtom,
	isDraggingAtom,
	isDrawingAtom,
	isEditingTextAtom,
	isResizingAtom,
	isPanningAtom,
	resizeHandleAtom,
	resizingElementIdAtom,
	textCreationPositionAtom,
	// Path editing atoms
	isEditingPathAtom,
	editingPathIdAtom,
	selectedPathPointsAtom,
	draggingPathPointAtom,
	draggingCurveHandleAtom,
} from "./interaction-atoms";

// Interaction state hooks
export const useIsDragging = () => useAtom(isDraggingAtom);
export const useIsResizing = () => useAtom(isResizingAtom);
export const useIsDrawing = () => useAtom(isDrawingAtom);
export const useIsEditingText = () => useAtom(isEditingTextAtom);
export const useEditingTextId = () => useAtom(editingTextIdAtom);
export const useDragStart = () => useAtom(dragStartAtom);
export const useResizeHandle = () => useAtom(resizeHandleAtom);
export const useResizingElementId = () => useAtom(resizingElementIdAtom);
export const useContextMenu = () => useAtom(contextMenuAtom);
export const useIsPanning = () => useAtom(isPanningAtom);
export const useTextCreationPosition = () => useAtom(textCreationPositionAtom);

// Path editing hooks
export const useIsEditingPath = () => useAtom(isEditingPathAtom);
export const useEditingPathId = () => useAtom(editingPathIdAtom);
export const useSelectedPathPoints = () => useAtom(selectedPathPointsAtom);
export const useDraggingPathPoint = () => useAtom(draggingPathPointAtom);
export const useDraggingCurveHandle = () => useAtom(draggingCurveHandleAtom);
