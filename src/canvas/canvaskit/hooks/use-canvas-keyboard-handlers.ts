import { useEffect, useCallback } from "react";
import {
	useContextMenu,
	useElementOperations,
	useElements,
	useElementsById,
	useGroupOperations,
	useGroups,
	useSelection,
	useZoomControls,
	useTool,
	useIsDrawing,
} from "../../../store";
import type { Element } from "../../../store/elements/element-types";

export const useCanvasKeyboardHandlers = () => {
	const [selection, setSelection] = useSelection();
	const {
		deleteElements,
		copyElements,
		pasteElements,
		duplicateElements,
		updateElementPosition,
	} = useElementOperations();
	const [contextMenu, setContextMenu] = useContextMenu();
	const { zoomIn, zoomOut, setZoom } = useZoomControls();
	const [tool, setTool] = useTool();
	const [isDrawing, setIsDrawing] = useIsDrawing();
	const elements = useElements();
	const elementsById = useElementsById();
	const { createGroup, ungroup } = useGroupOperations();
	const groups = useGroups();

	// Helper function to move selected elements
	const moveSelectedElements = useCallback(
		(elementIds: string[], deltaX: number, deltaY: number) => {
			if (elementIds.length === 0) return;

			// Collect all elements to move (including frame children)
			const elementsToMove = new Set<string>();
			const childrenByParent = new Map<string, Element[]>();

			// Build parent-child mapping
			for (const el of elements) {
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
			for (const elementId of elementIds) {
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
					// Skip moving locked elements
					if (element.locked) {
						continue;
					}

					// Handle line elements specially - move both endpoints
					if (element.type === "line" && "x2" in element && "y2" in element) {
						updateElementPosition({
							id: elementId,
							x: element.x + deltaX,
							y: element.y + deltaY,
							w: element.w,
							h: element.h,
						});
					} else {
						// Regular element movement
						updateElementPosition({
							id: elementId,
							x: element.x + deltaX,
							y: element.y + deltaY,
						});
					}
				}
			}
		},
		[elements, elementsById, updateElementPosition],
	);

	useEffect(() => {
		const isEditableTarget = (event: KeyboardEvent) => {
			const t = event.target as HTMLElement | null;
			if (!t) return false;
			const tag = t.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")
				return true;
			if (t.isContentEditable) return true;
			return false;
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			// Ignore global shortcuts when typing in any editable field
			if (isEditableTarget(e)) return;

			// Handle arrow key movement for selected elements
			if (selection.length > 0) {
				const moveStep = e.shiftKey ? 10 : 1; // Shift for larger steps
				let deltaX = 0;
				let deltaY = 0;

				// Use e.code for better AZERTY compatibility
				switch (e.code) {
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
					moveSelectedElements(selection, deltaX, deltaY);
					return;
				}
			}

			if (e.key === "Delete" || e.key === "Backspace") {
				e.preventDefault();
				if (selection.length > 0) {
					deleteElements(selection);
				}
				return;
			}

			if (e.key === "Escape") {
				if (contextMenu.open) {
					setContextMenu((prev) => ({ ...prev, open: false }));
					return;
				}
				// Finalize path drawing if active
				if (isDrawing && tool === "path") {
					e.preventDefault();
					setIsDrawing(false);
					setTool("select");
					return;
				}
			}

			if (e.ctrlKey || e.metaKey) {
				switch (e.key) {
					case "a":
					case "A":
						e.preventDefault();
						setSelection(elements.map((el) => el.id));
						break;
					case "c":
					case "C":
						e.preventDefault();
						if (selection.length > 0) {
							copyElements(selection);
						}
						break;
					case "v":
					case "V":
						e.preventDefault();
						pasteElements();
						break;
					case "d":
					case "D":
						e.preventDefault();
						if (selection.length > 0) {
							duplicateElements(selection);
						}
						break;
					case "=":
					case "+":
						e.preventDefault();
						zoomIn();
						break;
					case "-":
						e.preventDefault();
						zoomOut();
						break;
					case "0":
						e.preventDefault();
						setZoom(1);
						break;
					case "g":
					case "G":
						e.preventDefault();
						if (e.shiftKey) {
							// Ungroup: Cmd/Ctrl + Shift + G
							if (selection.length === 1) {
								const groupId = selection[0];
								if (groupId) {
									const groupIds = new Set(groups.map((g) => g.id));
									if (groupIds.has(groupId)) {
										ungroup(groupId);
									}
								}
							}
						} else {
							// Group: Cmd/Ctrl + G
							if (selection.length >= 2) {
								const canGroup = selection.every((id) => elementsById.has(id));
								if (canGroup) {
									createGroup({ elementIds: selection });
								}
							}
						}
						break;
				}
			}

			if (e.key === "d" || e.key === "D") {
				if (!(e.ctrlKey || e.metaKey) && selection.length > 0) {
					e.preventDefault();
					duplicateElements(selection);
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		selection,
		deleteElements,
		elements,
		elementsById,
		setSelection,
		copyElements,
		pasteElements,
		duplicateElements,
		updateElementPosition,
		contextMenu.open,
		setContextMenu,
		zoomIn,
		zoomOut,
		setZoom,
		createGroup,
		ungroup,
		groups,
		isDrawing,
		moveSelectedElements,
		setIsDrawing,
		setTool,
		tool,
	]);
};
