import type { Element } from "../../../store/atoms";

export interface ContextMenuState {
	x: number;
	y: number;
	elementId: string | null;
	open: boolean;
}

export interface ContextMenuPosition {
	clientX: number;
	clientY: number;
	canvasRect: DOMRect;
}

export class ContextMenuManager {
	private state: ContextMenuState = {
		x: 0,
		y: 0,
		elementId: null,
		open: false,
	};

	getState(): ContextMenuState {
		return { ...this.state };
	}

	showContextMenu(
		position: ContextMenuPosition,
		clickedElement: Element | null,
		// dimensions: { width: number; height: number }
	): void {
		const { clientX, clientY, canvasRect } = position;

		// Calculate position for context menu, ensuring it stays on screen
		const menuWidth = 180; // Approximate width of context menu
		const menuHeight = 280; // Approximate height of context menu

		// Use coordinates relative to the canvas container instead of screen coordinates
		let x = clientX - canvasRect.left + 5;
		let y = clientY - canvasRect.top + 5;

		// Adjust if menu would go off the right edge of the canvas container
		if (x + menuWidth > canvasRect.width) {
			x = clientX - canvasRect.left - menuWidth - 5;
		}

		// Adjust if menu would go off the bottom edge of the canvas container
		if (y + menuHeight > canvasRect.height) {
			y = clientY - canvasRect.top - menuHeight - 5;
		}

		// Ensure the menu doesn't go outside the canvas container bounds
		x = Math.max(0, Math.min(x, canvasRect.width - menuWidth));
		y = Math.max(0, Math.min(y, canvasRect.height - menuHeight));

		this.state = {
			x,
			y,
			elementId: clickedElement?.id || null,
			open: true,
		};
	}

	hideContextMenu(): void {
		this.state = {
			...this.state,
			open: false,
		};
	}

	getCurrentCursorPosition(
		canvasRect: DOMRect | undefined,
		toCanvas: (x: number, y: number, rect: DOMRect) => { x: number; y: number },
	): { canvasX: number; canvasY: number } | null {
		if (!this.state.open || !canvasRect) {
			return null;
		}

		const canvasCoords = toCanvas(this.state.x, this.state.y, canvasRect);

		return {
			canvasX: canvasCoords.x,
			canvasY: canvasCoords.y,
		};
	}

	isOpen(): boolean {
		return this.state.open;
	}

	reset(): void {
		this.state = {
			x: 0,
			y: 0,
			elementId: null,
			open: false,
		};
	}
}
