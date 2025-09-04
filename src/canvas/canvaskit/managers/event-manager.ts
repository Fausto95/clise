import type React from "react";
import type { Tool } from "../../../store/atoms";
import type { Element } from "../../../store/elements/element-types";
import { getElementAtPoint, getResizeHandle } from "../../utils";
import { ContextMenuManager } from "./context-menu-manager";
import { CursorManager, type CursorType } from "./cursor-manager";
import { type DrawingCallbacks, DrawingManager } from "./drawing-manager";
import { ResizeManager } from "./resize-manager";
import { type SelectionCallbacks, SelectionManager } from "./selection-manager";

export interface EventManagerState {
	isDragging: boolean;
	isResizing: boolean;
	dragStart: { x: number; y: number } | null;
	resizeHandle: string | null;
	cursor: CursorType;
}

export interface EventManagerCallbacks
	extends DrawingCallbacks,
		SelectionCallbacks {
	updateElementPosition: (update: {
		id: string;
		position: { x: number; y: number; w?: number; h?: number };
	}) => void;
	deleteElements: (ids: string[]) => void;
	copyElements: (ids: string[]) => void;
	pasteElements: () => void;
	duplicateElements: (ids: string[]) => void;
	getGroups?: () => import("../../../store/group-atoms").Group[];
	getElementGroup?: (
		elementId: string,
	) => import("../../../store/group-atoms").Group | undefined;
	updateGroupBounds?: (groupId: string) => void;
}

export interface EventManagerDependencies {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	dimensions: { width: number; height: number };
	zoom: number;
	pan: { x: number; y: number };
	elements: Element[];
	selection: string[];
	tool: Tool;
}

export class EventManager {
	private state: EventManagerState = {
		isDragging: false,
		isResizing: false,
		dragStart: null,
		resizeHandle: null,
		cursor: "default",
	};

	private drawingManager: DrawingManager;
	private selectionManager: SelectionManager;
	private contextMenuManager: ContextMenuManager;
	private onStateChange?: () => void;

	constructor(
		private callbacks: EventManagerCallbacks,
		onStateChange?: () => void,
	) {
		this.drawingManager = new DrawingManager(callbacks);
		this.selectionManager = new SelectionManager(
			{
				...callbacks,
				getGroups: callbacks.getGroups,
				getElementGroup: callbacks.getElementGroup,
			},
			onStateChange,
		);
		this.contextMenuManager = new ContextMenuManager();
		this.onStateChange = onStateChange;
	}

	private triggerStateChange(): void {
		// Force React to detect state changes by updating a counter
		this.stateVersion++;
		if (this.onStateChange) {
			this.onStateChange();
		}
	}

	private stateVersion = 0;

	getState(): EventManagerState & { version: number } {
		return { ...this.state, version: this.stateVersion };
	}

	getDrawingState() {
		return this.drawingManager.getState();
	}

	getSelectionState() {
		return this.selectionManager.getState();
	}

	getContextMenuState() {
		return this.contextMenuManager.getState();
	}

	private getCanvasCoordinates(
		clientX: number,
		clientY: number,
		deps: EventManagerDependencies,
		toCanvas: (x: number, y: number, rect: DOMRect) => { x: number; y: number },
	): { x: number; y: number } | null {
		const rect = deps.canvasRef.current?.getBoundingClientRect();
		if (!rect) return null;

		return toCanvas(clientX, clientY, rect);
	}

	handleContextMenu(
		e: React.MouseEvent<HTMLCanvasElement>,
		deps: EventManagerDependencies,
		toCanvas: (x: number, y: number, rect: DOMRect) => { x: number; y: number },
	): void {
		e.preventDefault();

		const rect = deps.canvasRef.current?.getBoundingClientRect();
		if (!rect) return;

		const canvasCoords = this.getCanvasCoordinates(
			e.clientX,
			e.clientY,
			deps,
			toCanvas,
		);
		if (!canvasCoords) return;

		const clickedElement = getElementAtPoint(
			canvasCoords,
			deps.elements,
			deps.zoom,
		);

		this.contextMenuManager.showContextMenu(
			{
				clientX: e.clientX,
				clientY: e.clientY,
				canvasRect: rect,
			},
			clickedElement,
			// deps.dimensions
		);
	}

	handleMouseDown(
		e: React.MouseEvent<HTMLCanvasElement>,
		deps: EventManagerDependencies,
		toCanvas: (x: number, y: number, rect: DOMRect) => { x: number; y: number },
	): void {
		const canvasCoords = this.getCanvasCoordinates(
			e.clientX,
			e.clientY,
			deps,
			toCanvas,
		);
		if (!canvasCoords) return;

		// Handle drawing tools first
		if (deps.tool !== "select") {
			this.drawingManager.startDrawing(canvasCoords, deps.tool);
			return;
		}

		// Check if clicking on an element
		const clickedElement = getElementAtPoint(
			canvasCoords,
			deps.elements,
			deps.zoom,
		);

		// First, check if we're clicking on a resize handle for ANY selected elements
		for (const elementId of deps.selection) {
			const element = deps.elements.find((el) => el.id === elementId);
			if (element) {
				const handle = getResizeHandle(canvasCoords, element, deps.zoom);
				if (handle) {
					this.state = {
						...this.state,
						isResizing: true,
						resizeHandle: handle,
						dragStart: canvasCoords,
					};
					this.triggerStateChange();
					return;
				}
			}
		}

		if (clickedElement) {
			// Handle selection
			const newSelection = this.selectionManager.handleElementSelection(
				clickedElement,
				deps.selection,
				{
					ctrlKey: e.ctrlKey,
					metaKey: e.metaKey,
					shiftKey: e.shiftKey,
				},
			);
			this.callbacks.setSelection(newSelection);

			// Start dragging
			this.state = {
				...this.state,
				isDragging: true,
				dragStart: canvasCoords,
			};
			this.triggerStateChange();
		} else {
			// Clicking on empty space
			const newSelection = this.selectionManager.handleElementSelection(
				null,
				deps.selection,
				{
					ctrlKey: e.ctrlKey,
					metaKey: e.metaKey,
					shiftKey: e.shiftKey,
				},
			);
			this.callbacks.setSelection(newSelection);

			// Start box selection
			this.selectionManager.startBoxSelection(canvasCoords);
		}
	}

	handleMouseMove(
		e: React.MouseEvent<HTMLCanvasElement>,
		deps: EventManagerDependencies,
		toCanvas: (x: number, y: number, rect: DOMRect) => { x: number; y: number },
	): void {
		const canvasCoords = this.getCanvasCoordinates(
			e.clientX,
			e.clientY,
			deps,
			toCanvas,
		);
		if (!canvasCoords) return;

		// Update cursor
		const drawingState = this.drawingManager.getState();
		const newCursor = CursorManager.updateCursor(
			canvasCoords,
			deps.tool,
			deps.elements,
			deps.selection,
			deps.zoom,
			this.state.isDragging,
			this.state.isResizing,
			drawingState.isDrawing,
		);
		if (this.state.cursor !== newCursor) {
			this.state.cursor = newCursor;
			this.triggerStateChange();
		}

		// Handle drawing mode
		if (drawingState.isDrawing && drawingState.dragStart) {
			this.drawingManager.updateDrawing(canvasCoords);
			return;
		}

		// Handle box selection
		const selectionState = this.selectionManager.getState();
		if (selectionState.isBoxSelecting) {
			this.selectionManager.updateBoxSelection(canvasCoords, deps.elements);
			return;
		}

		// Handle dragging and resizing operations
		if (!this.state.dragStart) return;

		const deltaX = canvasCoords.x - this.state.dragStart.x;
		const deltaY = canvasCoords.y - this.state.dragStart.y;

		if (this.state.isResizing && this.state.resizeHandle) {
			const elementsById = new Map(
				deps.elements.map((e) => [e.id, e] as const),
			);
			const selectedElement =
				deps.selection.length > 0
					? elementsById.get(deps.selection[0]!)
					: undefined;
			if (selectedElement) {
				ResizeManager.handleResizeRealtime(
					selectedElement,
					this.state.resizeHandle,
					deltaX,
					deltaY,
					this.callbacks.updateElementPosition,
				);
				this.state.dragStart = canvasCoords;
				this.callbacks.updateParentChildRelationships();
			}
		} else if (this.state.isDragging) {
			// Collect all elements to drag (including frame children)
			const elementsToMove = new Set<string>();
			const elementsById = new Map(
				deps.elements.map((e) => [e.id, e] as const),
			);
			const childrenByParent = new Map<string, Element[]>();
			for (const el of deps.elements) {
				if (!el.parentId) continue;
				const arr = childrenByParent.get(el.parentId) ?? [];
				arr.push(el);
				if (!childrenByParent.has(el.parentId))
					childrenByParent.set(el.parentId, arr);
			}
			const getFrameDescendants = (frameId: string) => {
				const stack = [frameId];
				while (stack.length) {
					const pid = stack.pop()!;
					const kids = childrenByParent.get(pid) ?? [];
					for (const child of kids) {
						elementsToMove.add(child.id);
						if (child.type === "frame") stack.push(child.id);
					}
				}
			};

			for (const elementId of deps.selection) {
				const element = elementsById.get(elementId);
				if (element) {
					elementsToMove.add(elementId);
					if (element.type === "frame") {
						getFrameDescendants(elementId);
					}
				}
			}

			// Move all collected elements
			for (const elementId of elementsToMove) {
				const element = elementsById.get(elementId);
				if (element) {
					this.callbacks.updateElementPosition({
						id: elementId,
						position: {
							x: element.x + deltaX,
							y: element.y + deltaY,
						},
					});
				}
			}
			this.state.dragStart = canvasCoords;
			// Don't update parent-child relationships during dragging to maintain frame children
			// this.callbacks.updateParentChildRelationships();

			// If a group is selected, update its bounds during dragging to keep outline in sync
			const groups = this.callbacks.getGroups?.() ?? [];
			const groupIds = new Set(groups.map((g) => g.id));
			for (const selectedId of deps.selection) {
				if (groupIds.has(selectedId))
					this.callbacks.updateGroupBounds?.(selectedId);
			}
		}
	}

	handleMouseUp(): void {
		const drawingState = this.drawingManager.getState();
		if (drawingState.isDrawing) {
			this.drawingManager.finishDrawing();
		}

		const selectionState = this.selectionManager.getState();
		if (selectionState.isBoxSelecting) {
			this.selectionManager.finishBoxSelection();
		}

		// Update parent-child relationships when dragging or resizing finishes
		if (this.state.isDragging || this.state.isResizing) {
			this.callbacks.updateParentChildRelationships();
		}

		this.state = {
			...this.state,
			isDragging: false,
			isResizing: false,
			dragStart: null,
			resizeHandle: null,
		};
		this.triggerStateChange();
	}

	handleKeyDown(
		e: KeyboardEvent,
		deps: EventManagerDependencies,
		zoomControls: {
			zoomIn: () => void;
			zoomOut: () => void;
			setZoom: (zoom: number) => void;
		},
	): void {
		// Ignore shortcuts when typing in inputs/textarea/contenteditable
		const target = e.target as HTMLElement | null;
		if (target) {
			const tag = target.tagName;
			if (
				tag === "INPUT" ||
				tag === "TEXTAREA" ||
				tag === "SELECT" ||
				target.isContentEditable
			) {
				return;
			}
		}

		// Handle deletion with Delete or Backspace
		if (e.key === "Delete" || e.key === "Backspace") {
			e.preventDefault();
			if (deps.selection.length > 0) {
				this.callbacks.deleteElements(deps.selection);
			}
			return;
		}

		// Handle Escape key to close context menu
		if (e.key === "Escape") {
			if (this.contextMenuManager.isOpen()) {
				this.contextMenuManager.hideContextMenu();
				return;
			}
		}

		// Handle arrow key movement for selected elements
		if (deps.selection.length > 0) {
			const moveStep = e.shiftKey ? 10 : 1; // Shift for larger steps
			let deltaX = 0;
			let deltaY = 0;

			switch (e.key) {
				case "ArrowLeft":
					e.preventDefault();
					deltaX = -moveStep;
					break;
				case "ArrowRight":
					e.preventDefault();
					deltaX = moveStep;
					break;
				case "ArrowUp":
					e.preventDefault();
					deltaY = -moveStep;
					break;
				case "ArrowDown":
					e.preventDefault();
					deltaY = moveStep;
					break;
			}

			if (deltaX !== 0 || deltaY !== 0) {
				this.moveSelectedElements(deps, deltaX, deltaY);
				return;
			}
		}

		// Handle shortcuts with Ctrl/Cmd
		if (e.ctrlKey || e.metaKey) {
			switch (e.key) {
				case "a":
				case "A":
					e.preventDefault();
					this.callbacks.setSelection(deps.elements.map((el) => el.id));
					break;
				case "c":
				case "C":
					e.preventDefault();
					if (deps.selection.length > 0) {
						this.callbacks.copyElements(deps.selection);
					}
					break;
				case "v":
				case "V":
					e.preventDefault();
					this.callbacks.pasteElements();
					break;
				case "d":
				case "D":
					e.preventDefault();
					if (deps.selection.length > 0) {
						this.callbacks.duplicateElements(deps.selection);
					}
					break;
				case "=":
				case "+":
					e.preventDefault();
					zoomControls.zoomIn();
					break;
				case "-":
					e.preventDefault();
					zoomControls.zoomOut();
					break;
				case "0":
					e.preventDefault();
					zoomControls.setZoom(1);
					break;
			}
		}

		// Handle duplicate with just D key
		if (e.key === "d" || e.key === "D") {
			if (!(e.ctrlKey || e.metaKey) && deps.selection.length > 0) {
				e.preventDefault();
				this.callbacks.duplicateElements(deps.selection);
			}
		}
	}

	/**
	 * Move selected elements by the given delta
	 */
	private moveSelectedElements(
		deps: EventManagerDependencies,
		deltaX: number,
		deltaY: number,
	): void {
		if (deps.selection.length === 0) return;

		// Collect all elements to move (including frame children)
		const elementsToMove = new Set<string>();
		const elementsById = new Map(deps.elements.map((e) => [e.id, e] as const));
		const childrenByParent = new Map<string, Element[]>();

		// Build parent-child mapping
		for (const el of deps.elements) {
			if (!el.parentId) continue;
			const arr = childrenByParent.get(el.parentId) ?? [];
			arr.push(el);
			if (!childrenByParent.has(el.parentId))
				childrenByParent.set(el.parentId, arr);
		}

		// Get all frame descendants recursively
		const getFrameDescendants = (frameId: string) => {
			const stack = [frameId];
			while (stack.length) {
				const pid = stack.pop()!;
				const kids = childrenByParent.get(pid) ?? [];
				for (const child of kids) {
					elementsToMove.add(child.id);
					if (child.type === "frame") stack.push(child.id);
				}
			}
		};

		// Add selected elements and their frame children
		for (const elementId of deps.selection) {
			const element = elementsById.get(elementId);
			if (element) {
				elementsToMove.add(elementId);
				if (element.type === "frame") {
					getFrameDescendants(elementId);
				}
			}
		}

		// Move all collected elements
		const affectedGroupIds = new Set<string>();
		for (const elementId of elementsToMove) {
			const element = elementsById.get(elementId);
			if (element) {
				// Skip moving locked elements
				if (element.locked) {
					continue;
				}

				// Handle line elements specially - move both endpoints
				if (element.type === "line" && "x2" in element && "y2" in element) {
					this.callbacks.updateElementPosition({
						id: elementId,
						position: {
							x: element.x + deltaX,
							y: element.y + deltaY,
							w: element.w,
							h: element.h,
						},
					});
				} else {
					// Regular element movement
					this.callbacks.updateElementPosition({
						id: elementId,
						position: {
							x: element.x + deltaX,
							y: element.y + deltaY,
						},
					});
				}

				// Track groups that contain moved elements
				if (this.callbacks.getElementGroup) {
					const containingGroup = this.callbacks.getElementGroup(elementId);
					if (containingGroup) affectedGroupIds.add(containingGroup.id);
				}
			}
		}

		// Update bounds for any groups that were affected by movement
		if (this.callbacks.updateGroupBounds) {
			for (const groupId of affectedGroupIds) {
				this.callbacks.updateGroupBounds(groupId);
			}
		}
	}

	getCurrentCursorPosition(
		deps: EventManagerDependencies,
		toCanvas: (x: number, y: number, rect: DOMRect) => { x: number; y: number },
	) {
		const rect = deps.canvasRef.current?.getBoundingClientRect();
		return this.contextMenuManager.getCurrentCursorPosition(rect, toCanvas);
	}

	closeContextMenu(): void {
		this.contextMenuManager.hideContextMenu();
	}

	getCursor(): CursorType {
		return this.state.cursor;
	}

	reset(): void {
		this.state = {
			isDragging: false,
			isResizing: false,
			dragStart: null,
			resizeHandle: null,
			cursor: "default",
		};
		this.drawingManager.reset();
		this.selectionManager.reset();
		this.contextMenuManager.reset();
	}
}
