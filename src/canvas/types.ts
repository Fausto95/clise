export interface ResizeHandle {
	id: string;
	x: number;
	y: number;
}

export interface DragState {
	isDragging: boolean;
	dragOffset: { x: number; y: number };
	draggedElementId: string | null;
	dragDelta: { x: number; y: number }; // Visual offset during dragging
}

export interface ResizeState {
	isResizing: boolean;
	resizeHandle: string | null;
	resizeStart: { x: number; y: number; w: number; h: number };
	hoverHandle: string | null;
}

export interface CanvasTransform {
	zoom: number;
	panX: number;
	panY: number;
}

export interface ViewportInfo {
	x: number;
	y: number;
	width: number;
	height: number;
	zoom: number;
	rect?: DOMRect;
}

export interface SelectionBoxState {
	isActive: boolean;
	startX: number;
	startY: number;
	currentX: number;
	currentY: number;
}

export interface SelectionBox {
	x: number;
	y: number;
	width: number;
	height: number;
}
