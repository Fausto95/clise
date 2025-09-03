import type { Element } from "../../../store/atoms";
import type { Group } from "../../../store/group-atoms";

export interface BoxSelection {
	start: { x: number; y: number };
	end: { x: number; y: number };
}

export interface SelectionState {
	isBoxSelecting: boolean;
	boxSelectStart: { x: number; y: number } | null;
	boxSelectEnd: { x: number; y: number } | null;
}

export interface SelectionCallbacks {
	setSelection: (selection: string[]) => void;
	getGroups?: () => Group[];
	getElementGroup?: (elementId: string) => Group | undefined;
}

export class SelectionManager {
	private state: SelectionState = {
		isBoxSelecting: false,
		boxSelectStart: null,
		boxSelectEnd: null,
	};

	private onStateChange?: () => void;

	constructor(
		private callbacks: SelectionCallbacks,
		onStateChange?: () => void,
	) {
		this.onStateChange = onStateChange;
	}

	private triggerStateChange(): void {
		this.stateVersion++;
		if (this.onStateChange) {
			this.onStateChange();
		}
	}

	private stateVersion = 0;

	getState(): SelectionState & { version: number } {
		return { ...this.state, version: this.stateVersion };
	}

	startBoxSelection(startCoords: { x: number; y: number }): void {
		this.state = {
			isBoxSelecting: true,
			boxSelectStart: startCoords,
			boxSelectEnd: startCoords,
		};
		this.triggerStateChange();
	}

	updateBoxSelection(
		currentCoords: { x: number; y: number },
		elements: Element[],
	): void {
		if (!this.state.isBoxSelecting || !this.state.boxSelectStart) {
			return;
		}

		this.state.boxSelectEnd = currentCoords;
		this.triggerStateChange();

		// Update selection in real-time as we drag (OS-style behavior)
		const rect = {
			x: Math.min(this.state.boxSelectStart.x, currentCoords.x),
			y: Math.min(this.state.boxSelectStart.y, currentCoords.y),
			width: Math.abs(currentCoords.x - this.state.boxSelectStart.x),
			height: Math.abs(currentCoords.y - this.state.boxSelectStart.y),
		};

		// Find elements within the current selection box
		const selectedElements = elements.filter((element) => {
			return (
				element.x + element.w > rect.x && // Right edge of element is past left edge of box
				element.x < rect.x + rect.width && // Left edge of element is before right edge of box
				element.y + element.h > rect.y && // Bottom edge of element is past top edge of box
				element.y < rect.y + rect.height // Top edge of element is before bottom edge of box
			);
		});

		// Convert element selection to group-aware selection
		const targetIds = new Set<string>();
		selectedElements.forEach((element) => {
			const elementGroup = this.callbacks.getElementGroup?.(element.id);
			const targetId = elementGroup ? elementGroup.id : element.id;
			targetIds.add(targetId);
		});

		const newSelection = Array.from(targetIds);
		this.callbacks.setSelection(newSelection);
	}

	finishBoxSelection(): void {
		// Selection was already updated in real-time during mouse move,
		// so we just need to clean up the box selection state
		this.state = {
			isBoxSelecting: false,
			boxSelectStart: null,
			boxSelectEnd: null,
		};
		this.triggerStateChange();
	}

	getBoxSelection(): BoxSelection | undefined {
		if (
			this.state.isBoxSelecting &&
			this.state.boxSelectStart &&
			this.state.boxSelectEnd
		) {
			return {
				start: this.state.boxSelectStart,
				end: this.state.boxSelectEnd,
			};
		}
		return undefined;
	}

	handleElementSelection(
		clickedElement: Element | null,
		currentSelection: string[],
		modifiers: {
			ctrlKey: boolean;
			metaKey: boolean;
			shiftKey: boolean;
		},
	): string[] {
		if (!clickedElement) {
			// Clear selection if not holding modifier keys
			if (!(modifiers.ctrlKey || modifiers.metaKey || modifiers.shiftKey)) {
				return [];
			}
			return currentSelection;
		}

		// Check if the clicked element is part of a group
		const elementGroup = this.callbacks.getElementGroup?.(clickedElement.id);
		const targetId = elementGroup ? elementGroup.id : clickedElement.id;

		// Handle multi-selection with Ctrl/Cmd or Shift
		if (modifiers.ctrlKey || modifiers.metaKey) {
			// Toggle element/group in/out of selection
			if (currentSelection.includes(targetId)) {
				return currentSelection.filter((id) => id !== targetId);
			} else {
				return [...currentSelection, targetId];
			}
		} else if (modifiers.shiftKey && currentSelection.length > 0) {
			// Add element/group to selection (extend selection)
			if (!currentSelection.includes(targetId)) {
				return [...currentSelection, targetId];
			}
			return currentSelection;
		} else {
			// Regular click - select single element/group (if not already selected)
			if (!currentSelection.includes(targetId)) {
				return [targetId];
			}
			return currentSelection;
		}
	}

	reset(): void {
		this.state = {
			isBoxSelecting: false,
			boxSelectStart: null,
			boxSelectEnd: null,
		};
		this.triggerStateChange();
	}
}
