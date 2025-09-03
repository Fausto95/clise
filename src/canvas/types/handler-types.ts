import type { DragState, ResizeState, SelectionBox } from "../types";

// Creating element state interface
export interface CreatingElementState {
	id: string;
	startX: number;
	startY: number;
}

// Text editor state interface
export interface TextEditorState {
	elementId: string;
	x: number;
	y: number;
	text: string;
	width: number;
	height: number;
	fontSize: number;
	fontFamily: string;
	isNewElement?: boolean;
}

// Context menu state interface
export interface ContextMenuState {
	x: number;
	y: number;
	elementId?: string | null;
}

// Selection box state interface
export interface SelectionBoxHookState {
	selectionBox: {
		isActive: boolean;
		startX: number;
		startY: number;
		currentX: number;
		currentY: number;
	};
	startSelection: (x: number, y: number) => void;
	updateSelection: (x: number, y: number) => void;
	endSelection: () => void;
	getSelectionBounds: () => SelectionBox;
}

// Drag state hook return interface
export interface DragStateHook extends DragState {
	startDrag: (elementId: string, offsetX: number, offsetY: number) => void;
	updateDragPosition: (deltaX: number, deltaY: number) => void;
	stopDrag: () => void;
}

// Resize state hook return interface
export interface ResizeStateHook extends ResizeState {
	startResize: (
		handleId: string,
		x: number,
		y: number,
		w: number,
		h: number,
	) => void;
	stopResize: () => void;
	setHoverHandle: (handleId: string | null) => void;
}
