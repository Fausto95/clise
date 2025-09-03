import type { Element, ElementType, Tool } from "../../../store/atoms";

export interface DrawingState {
	isDrawing: boolean;
	drawingElement: Element | null;
	dragStart: { x: number; y: number } | null;
	lastDrawUpdate: number;
}

export interface DrawingCallbacks {
	addElement: (element: Partial<Element> & { type: ElementType }) => string;
	updateElement: (update: { id: string; patch: Partial<Element> }) => void;
	setSelection: (selection: string[]) => void;
	updateParentChildRelationships: () => void;
	setTool: (tool: Tool) => void;
}

export class DrawingManager {
	private state: DrawingState = {
		isDrawing: false,
		drawingElement: null,
		dragStart: null,
		lastDrawUpdate: 0,
	};

	constructor(private callbacks: DrawingCallbacks) {}

	getState(): DrawingState {
		return { ...this.state };
	}

	startDrawing(startCoords: { x: number; y: number }, tool: Tool): void {
		if (tool === "select") return;

		// Create a new element based on the current tool
		const elementType = this.getElementType(tool);
		if (!elementType) return;

		if (elementType === "text") {
			this.startTextDrawing(startCoords);
		} else {
			this.startShapeDrawing(startCoords, elementType);
		}
	}

	private getElementType(tool: Tool): ElementType | null {
		switch (tool) {
			case "rect":
				return "rect";
			case "ellipse":
				return "ellipse";
			case "frame":
				return "frame";
			case "text":
				return "text";
			default:
				return null;
		}
	}

	private startTextDrawing(startCoords: { x: number; y: number }): void {
		const textElement = {
			type: "text" as const,
			x: startCoords.x,
			y: startCoords.y,
			w: 120,
			h: 40,
			fill: "transparent",
			opacity: 1,
			visible: true,
			parentId: null,
			rotation: 0,
			name: `text ${Date.now()}`,
			text: "Double click to edit",
			color: "#000000",
			fontSize: 16,
			fontFamily: "Arial, sans-serif",
			textDecoration: "none",
			fontWeight: "normal",
			textTransform: "none",
			lineHeight: 1.2,
			letterSpacing: 0,
		};

		const elementId = this.callbacks.addElement(textElement);

		this.state = {
			...this.state,
			drawingElement: { id: elementId, ...textElement } as Element,
			isDrawing: true,
			dragStart: startCoords,
		};

		this.callbacks.setSelection([elementId]);
		this.callbacks.updateParentChildRelationships();
	}

	private startShapeDrawing(
		startCoords: { x: number; y: number },
		elementType: ElementType,
	): void {
		const fillColor = elementType === "frame" ? "#ffffff" : "#e5e5e5";
		const newElement = {
			type: elementType as "rect" | "ellipse" | "frame",
			x: startCoords.x,
			y: startCoords.y,
			w: 1,
			h: 1,
			fill: fillColor,
			opacity: 1,
			visible: true,
			parentId: null,
			rotation: 0,
			name: `${elementType} ${Date.now()}`,
			...(elementType === "frame" ? { clipContent: true } : {}),
		};

		const elementId = this.callbacks.addElement(newElement);

		this.state = {
			...this.state,
			drawingElement: { id: elementId, ...newElement } as Element,
			isDrawing: true,
			dragStart: startCoords,
		};

		this.callbacks.setSelection([elementId]);
		this.callbacks.updateParentChildRelationships();
	}

	updateDrawing(currentCoords: { x: number; y: number }): void {
		if (
			!this.state.isDrawing ||
			!this.state.drawingElement ||
			!this.state.dragStart
		) {
			return;
		}

		// Text elements don't resize while drawing - they're placed at fixed size
		if (this.state.drawingElement.type === "text") return;

		// Throttle updates for better performance
		const now = performance.now();
		if (now - this.state.lastDrawUpdate < 16) return; // ~60fps
		this.state.lastDrawUpdate = now;

		const { dragStart, drawingElement } = this.state;

		const startX = Math.min(dragStart.x, currentCoords.x);
		const startY = Math.min(dragStart.y, currentCoords.y);
		const endX = Math.max(dragStart.x, currentCoords.x);
		const endY = Math.max(dragStart.y, currentCoords.y);

		const width = Math.max(1, endX - startX);
		const height = Math.max(1, endY - startY);

		this.callbacks.updateElement({
			id: drawingElement.id,
			patch: {
				x: startX,
				y: startY,
				w: width,
				h: height,
			},
		});

		// Update local drawing element reference
		this.state.drawingElement = {
			...drawingElement,
			x: startX,
			y: startY,
			w: width,
			h: height,
		};
	}

	finishDrawing(): void {
		this.state = {
			isDrawing: false,
			drawingElement: null,
			dragStart: null,
			lastDrawUpdate: 0,
		};

		// Always reset to select tool after drawing
		this.callbacks.setTool("select");
	}

	reset(): void {
		this.state = {
			isDrawing: false,
			drawingElement: null,
			dragStart: null,
			lastDrawUpdate: 0,
		};
	}
}
