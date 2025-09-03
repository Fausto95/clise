import type { Element, Tool } from "../../../store/atoms";
import { getElementAtPoint, getResizeHandle } from "../../utils";

export type CursorType =
	| "default"
	| "crosshair"
	| "move"
	| "nw-resize"
	| "ns-resize"
	| "ne-resize"
	| "ew-resize";

export class CursorManager {
	private static getResizeCursor(handle: string): CursorType {
		switch (handle) {
			case "nw":
			case "se":
				return "nw-resize";
			case "n":
			case "s":
				return "ns-resize";
			case "ne":
			case "sw":
				return "ne-resize";
			case "e":
			case "w":
				return "ew-resize";
			default:
				return "default";
		}
	}

	static updateCursor(
		canvasCoords: { x: number; y: number },
		tool: Tool,
		elements: Element[],
		selection: string[],
		zoom: number,
		isDragging: boolean,
		isResizing: boolean,
		isDrawing: boolean,
	): CursorType {
		// Don't update cursor during active interactions
		if (isDragging || isResizing || isDrawing) {
			return "default";
		}

		// Set drawing cursor for drawing tools
		if (tool !== "select") {
			return "crosshair";
		}

		// Check if hovering over a selected element's resize handle
		const byId = new Map(elements.map((e) => [e.id, e] as const));
		for (const elementId of selection) {
			const element = byId.get(elementId);
			if (element) {
				const handle = getResizeHandle(canvasCoords, element, zoom);
				if (handle) {
					return CursorManager.getResizeCursor(handle);
				}
			}
		}

		// Check if hovering over any element (for move cursor)
		const hoveredElement = getElementAtPoint(canvasCoords, elements, zoom);
		if (hoveredElement) {
			return "move";
		}

		return "default";
	}
}
