import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
	addElementAtom,
	boxSelectEndAtom,
	boxSelectStartAtom,
	canvasHeightAtom,
	canvasKitInstanceAtom,
	canvasKitRendererAtom,
	canvasSizeAtom,
	canvasWidthAtom,
	clipboardAtom,
	contextMenuAtom,
	copyElementsAtom,
	debouncedUpdateParentChildRelationshipsAtom,
	deleteElementsAtom,
	dragStartAtom,
	duplicateElementsAtom,
	editingTextIdAtom,
	elementAtomFamily,
	elementIdsAtom,
	elementPositionAtomFamily,
	elementStyleAtomFamily,
	isBoxSelectingAtom,
	isDraggingAtom,
	isDrawingAtom,
	isEditingTextAtom,
	isResizingAtom,
	panAtom,
	panXAtom,
	panYAtom,
	pasteElementsAtom,
	rendererModeAtom,
	resizeHandleAtom,
	resizingElementIdAtom,
	selectedElementsAtom,
	toolAtom,
	updateElementAtom,
	updateElementPositionAtom,
	updateElementStyleAtom,
	updateParentChildRelationshipsAtom,
	useCanvasKitAtom,
	viewportHeightAtom,
	viewportSizeAtom,
	viewportWidthAtom,
	zoomAtom,
} from "./atoms";
import { useReorderElements } from "./elements/element-operations";

import {
	addElementsAtom,
	addElementsWithIdsAtom,
	clearElementsAtom,
	setElementVisibilityAtom,
	toggleElementVisibilityAtom,
} from "./element-atoms";

import {
	clearHistoryAtom,
	commitTransactionAtom,
	pushHistoryAtom,
	redoAtom,
	startTransactionAtom,
	undoAtom,
} from "./history-atoms";
import { clearStoredStateAtom, saveStateAtom } from "./persistence-atoms";

// Document hooks
export const useTool = () => useAtom(toolAtom);

// Selection hooks
export const useSelectedElements = () => useAtomValue(selectedElementsAtom);

// Element hooks - including atomic property hooks
export const useElement = (id: string) => useAtomValue(elementAtomFamily(id));
export const useElementIds = () => useAtomValue(elementIdsAtom);
export const useElementPosition = (id: string) =>
	useAtomValue(elementPositionAtomFamily(id));
export const useElementStyle = (id: string) =>
	useAtomValue(elementStyleAtomFamily(id));

// Canvas viewport hooks - optimized for fewer re-renders
export const useZoom = () => useAtom(zoomAtom);

// Atomic pan hook - single state update for both x and y
export const usePan = () => {
	const [pan, setPan] = useAtom(panAtom);
	const [panX] = useAtom(panXAtom);
	const [panY] = useAtom(panYAtom);

	const setPanAtomic = (x: number, y: number) => {
		setPan({ x, y });
	};

	const panBy = (dx: number, dy: number) => {
		setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
	};

	// Return atomic version for better performance
	return { panX, panY, setPan: setPanAtomic, panBy, pan };
};

// Atomic viewport hook - single state update for both dimensions
export const useViewport = () => {
	const [viewport, setViewportSize] = useAtom(viewportSizeAtom);
	const [viewportWidth] = useAtom(viewportWidthAtom);
	const [viewportHeight] = useAtom(viewportHeightAtom);

	const setViewport = (width: number, height: number) => {
		setViewportSize({ width, height });
	};

	return { viewportWidth, viewportHeight, setViewport, viewport };
};

// Atomic canvas size hook - single state update for both dimensions
export const useCanvasSize = () => {
	const [canvas, setCanvasSizeAtomic] = useAtom(canvasSizeAtom);
	const [canvasWidth] = useAtom(canvasWidthAtom);
	const [canvasHeight] = useAtom(canvasHeightAtom);

	const setCanvasSize = (width: number, height: number) => {
		setCanvasSizeAtomic({ width, height });
	};

	return { canvasWidth, canvasHeight, setCanvasSize, canvas };
};

// Element mutation hooks - including atomic updates
export const useAddElement = () => useSetAtom(addElementAtom);
export const useAddElements = () => useSetAtom(addElementsAtom);
export const useAddElementsWithIds = () => useSetAtom(addElementsWithIdsAtom);
export const useClearElements = () => useSetAtom(clearElementsAtom);
export const useUpdateElement = () => useSetAtom(updateElementAtom);
export const useUpdateElementPosition = () =>
	useSetAtom(updateElementPositionAtom);
export const useUpdateElementStyle = () => useSetAtom(updateElementStyleAtom);
export const useDeleteElements = () => useSetAtom(deleteElementsAtom);

export const useCopyElements = () => useSetAtom(copyElementsAtom);
export const usePasteElements = () => useSetAtom(pasteElementsAtom);
export const useDuplicateElements = () => useSetAtom(duplicateElementsAtom);
export const useClipboard = () => useAtomValue(clipboardAtom);

// Parent-child relationship hooks - optimized for batched updates
export const useUpdateParentChildRelationships = () =>
	useSetAtom(updateParentChildRelationshipsAtom);
export const useDebouncedUpdateParentChildRelationships = () =>
	useSetAtom(debouncedUpdateParentChildRelationshipsAtom);

// Zoom control hooks
// Optimized zoom controls - batch zoom operations
export const useZoomControls = () => {
	const [zoom, setZoom] = useAtom(zoomAtom);

	const setZoomValue = (z: number) => {
		const clampedZoom = Math.max(0.1, Math.min(5, z));
		if (clampedZoom !== zoom) {
			setZoom(clampedZoom);
		}
	};

	const zoomIn = () => {
		const newZoom = Math.min(5, zoom * 1.2);
		if (newZoom !== zoom) {
			setZoom(newZoom);
		}
	};

	const zoomOut = () => {
		const newZoom = Math.max(0.1, zoom / 1.2);
		if (newZoom !== zoom) {
			setZoom(newZoom);
		}
	};

	return { setZoom: setZoomValue, zoomIn, zoomOut, zoom };
};

// History hooks
export const useHistoryOperations = () => {
	const startTransaction = useSetAtom(startTransactionAtom);
	const commitTransaction = useSetAtom(commitTransactionAtom);
	const push = useSetAtom(pushHistoryAtom);
	const undo = useSetAtom(undoAtom);
	const redo = useSetAtom(redoAtom);
	const clear = useSetAtom(clearHistoryAtom);

	return {
		startTransaction,
		commitTransaction,
		push,
		undo,
		redo,
		clear,
	};
};

// Renderer control hooks
export const useCanvasKit = () => useAtom(useCanvasKitAtom);
export const useRendererMode = () => useAtom(rendererModeAtom);

// Canvas rendering state hooks
export const useCanvasKitInstance = () => useAtom(canvasKitInstanceAtom);
export const useRendererRef = () => useAtom(canvasKitRendererAtom);

// Persistence hooks
export const useClearStoredState = () => useSetAtom(clearStoredStateAtom);
export const useSaveState = () => useSetAtom(saveStateAtom);

// Interaction state hooks
export const useIsDragging = () => useAtom(isDraggingAtom);
export const useIsResizing = () => useAtom(isResizingAtom);
export const useIsDrawing = () => useAtom(isDrawingAtom);
export const useIsBoxSelecting = () => useAtom(isBoxSelectingAtom);
export const useIsEditingText = () => useAtom(isEditingTextAtom);
export const useEditingTextId = () => useAtom(editingTextIdAtom);
export const useDragStart = () => useAtom(dragStartAtom);
export const useResizeHandle = () => useAtom(resizeHandleAtom);
export const useResizingElementId = () => useAtom(resizingElementIdAtom);
export const useContextMenu = () => useAtom(contextMenuAtom);
export const useBoxSelectStart = () => useAtom(boxSelectStartAtom);
export const useBoxSelectEnd = () => useAtom(boxSelectEndAtom);

// Composite hooks for common operations - including atomic updates
// Element visibility hooks
export const useElementVisibility = () => {
	const toggleVisibility = useSetAtom(toggleElementVisibilityAtom);
	const setVisibility = useSetAtom(setElementVisibilityAtom);

	return { toggleVisibility, setVisibility };
};

export const useElementOperations = () => {
	const addElement = useAddElement();
	const addElements = useAddElements();
	const addElementsWithIds = useAddElementsWithIds();
	const clearElements = useClearElements();
	const updateElement = useUpdateElement();
	const updateElementPosition = useUpdateElementPosition();
	const updateElementStyle = useUpdateElementStyle();
	const deleteElements = useDeleteElements();
	const copyElements = useCopyElements();
	const pasteElements = usePasteElements();
	const duplicateElements = useDuplicateElements();
	const reorderElements = useReorderElements();
	const { toggleVisibility, setVisibility } = useElementVisibility();

	return {
		addElement,
		addElements,
		addElementsWithIds,
		clearElements,
		updateElement,
		updateElementPosition,
		updateElementStyle,
		deleteElements,
		copyElements,
		pasteElements,
		duplicateElements,
		reorderElements,
		toggleVisibility,
		setVisibility,
	};
};
