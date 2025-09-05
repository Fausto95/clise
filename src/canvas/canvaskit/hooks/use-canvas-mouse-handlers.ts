import type React from "react";
import type { PathElement, Element } from "../../../store/element-atoms";
import {
	useBoxSelectEnd,
	useBoxSelectStart,
	useDebouncedUpdateParentChildRelationships,
	useDragStart,
	useEditingTextId,
	useElementOperations,
	useElements,
	useElementsById,
	useChildrenByParentId,
	useGroupOperations,
	useGroups,
	useElementIdToGroupMap,
	useHistoryOperations,
	useIsBoxSelecting,
	useIsDragging,
	useIsDrawing,
	useIsEditingText,
	useIsResizing,
	useResizeHandle,
	useResizingElementId,
	useSelection,
	useTextCreationPosition,
	useTool,
	useIsEditingPath,
	useEditingPathId,
	useSelectedPathPoints,
	useDraggingPathPoint,
	useDraggingCurveHandle,
} from "../../../store";
import { useSmartGuides } from "../../../store/smart-guides-hooks";
import { SmartGuidesManager } from "../managers/smart-guides-manager";
import { getElementAtPoint, getResizeHandle } from "../../utils";
import { useCoordinateTransforms } from "./use-coordinate-transforms";
import { ResizeManager } from "../managers/resize-manager";
import { PathEditingManager } from "../managers/path-editing-manager";
import { useCanvasDrawingOperations } from "./use-canvas-drawing-operations";

export const useCanvasMouseHandlers = ({
	canvasRef,
}: {
	canvasRef: React.RefObject<HTMLCanvasElement>;
}) => {
	const { toCanvas, zoom } = useCoordinateTransforms();
	const [isDragging, setIsDragging] = useIsDragging();
	const [isResizing, setIsResizing] = useIsResizing();
	const [isDrawing, setIsDrawing] = useIsDrawing();
	const [isBoxSelecting, setIsBoxSelecting] = useIsBoxSelecting();
	const [isEditingText, setIsEditingText] = useIsEditingText();
	const [, setEditingTextId] = useEditingTextId();
	const [dragStart, setDragStart] = useDragStart();
	const [resizeHandle, setResizeHandle] = useResizeHandle();
	const [resizingElementId, setResizingElementId] = useResizingElementId();
	const [boxSelectStart, setBoxSelectStart] = useBoxSelectStart();
	const [, setBoxSelectEnd] = useBoxSelectEnd();
	const [selection, setSelection] = useSelection();
	const [, setTextCreationPosition] = useTextCreationPosition();
	const elements = useElements();
	const elementsById = useElementsById();
	const childrenByParent = useChildrenByParentId();
	const [tool, setTool] = useTool();
	const { addElement, updateElementPosition, updateElement } =
		useElementOperations();
	const updateParentChildRelationships =
		useDebouncedUpdateParentChildRelationships();
	const { startDrawing, updateDrawing } = useCanvasDrawingOperations();
	const { getElementGroup, updateGroupBounds } = useGroupOperations();
	const groups = useGroups();
	const elementIdToGroupMap = useElementIdToGroupMap();
	const { startTransaction, commitTransaction } = useHistoryOperations();

	// Path editing state
	const [isEditingPath] = useIsEditingPath();
	const [editingPathId] = useEditingPathId();
	const [selectedPathPoints, setSelectedPathPoints] = useSelectedPathPoints();
	const [draggingPathPoint, setDraggingPathPoint] = useDraggingPathPoint();
	const [draggingCurveHandle, setDraggingCurveHandle] =
		useDraggingCurveHandle();

	// Smart guides
	const smartGuides = useSmartGuides();
	const smartGuidesManager = new SmartGuidesManager();

	// Helpers for Path tool
	const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
		Math.hypot(a.x - b.x, a.y - b.y);
	const computeBoundsAndLocalPoints = (
		absPoints: {
			x: number;
			y: number;
			curve?: {
				type: "quadratic" | "cubic" | "smooth";
				cx?: number;
				cy?: number;
				inHandle?: { x: number; y: number };
				outHandle?: { x: number; y: number };
			};
		}[],
	) => {
		// Collect all x and y coordinates including curve control points
		const xs: number[] = [];
		const ys: number[] = [];

		// Add all path points
		for (const p of absPoints) {
			xs.push(p.x);
			ys.push(p.y);
			// Also include curve control points in bounds calculation
			if (p.curve) {
				if (
					(p.curve.type === "quadratic" || p.curve.type === "smooth") &&
					p.curve.cx !== undefined &&
					p.curve.cy !== undefined
				) {
					xs.push(p.curve.cx);
					ys.push(p.curve.cy);
				} else if (p.curve.type === "cubic") {
					if (p.curve.outHandle) {
						xs.push(p.curve.outHandle.x);
						ys.push(p.curve.outHandle.y);
					}
					if (p.curve.inHandle) {
						xs.push(p.curve.inHandle.x);
						ys.push(p.curve.inHandle.y);
					}
				}
			}
		}

		const minX = Math.min(...xs);
		const minY = Math.min(...ys);
		const maxX = Math.max(...xs);
		const maxY = Math.max(...ys);
		const localPoints = absPoints.map((p) => ({
			x: p.x - minX,
			y: p.y - minY,
			curve: p.curve
				? {
						type: p.curve.type,
						cx: p.curve.cx ? p.curve.cx - minX : undefined,
						cy: p.curve.cy ? p.curve.cy - minY : undefined,
						inHandle: p.curve.inHandle
							? {
									x: p.curve.inHandle.x - minX,
									y: p.curve.inHandle.y - minY,
								}
							: undefined,
						outHandle: p.curve.outHandle
							? {
									x: p.curve.outHandle.x - minX,
									y: p.curve.outHandle.y - minY,
								}
							: undefined,
					}
				: undefined,
		}));
		return {
			x: minX,
			y: minY,
			w: Math.max(1, maxX - minX),
			h: Math.max(1, maxY - minY),
			points: localPoints,
		};
	};

	const handlePathClick = (
		pt: { x: number; y: number },
		makeCurve: boolean,
	) => {
		// If a path is currently selected and was the last created, extend it; otherwise start a new one
		const currentPath =
			(selection
				.map((id) => elementsById.get(id))
				.find((el) => el && el.type === "path") as PathElement | undefined) ||
			undefined;
		if (!currentPath) {
			// start new path with first point
			const base = {
				type: "path" as const,
				x: pt.x,
				y: pt.y,
				w: 1,
				h: 1,
				points: [{ x: 0, y: 0 }],
				closed: false,
				fill: "transparent",
				stroke: {
					color: "#495057",
					width: 5,
					opacity: 1,
					style: "solid" as const,
					position: "center" as const,
				},
				opacity: 1,
				visible: true,
				parentId: null,
				rotation: 0,
				name: `path ${Date.now()}`,
			};
			const newId = addElement(base);
			setSelection([newId]);
			setIsDrawing(true);
			return;
		}

		// Closing if user clicks near first point
		const first = currentPath.points[0];
		if (!first) return;
		const firstAbs = { x: currentPath.x + first.x, y: currentPath.y + first.y };
		if (
			currentPath.points.length >= 2 &&
			distance(firstAbs, pt) <= 8 / Math.max(0.1, zoom)
		) {
			// Close the path and set a white fill on closure
			updateElement({
				id: currentPath.id,
				patch: { closed: true, fill: "#ffffff" },
			});
			setIsDrawing(false);
			setTool("select");
			return;
		}

		// Append a segment
		const lastLocal = currentPath.points[currentPath.points.length - 1];
		if (!lastLocal) return;
		const lastAbs = {
			x: currentPath.x + lastLocal.x,
			y: currentPath.y + lastLocal.y,
		};
		let curveCP: { cx: number; cy: number } | undefined = undefined;
		if (makeCurve) {
			// Calculate curve control point for smooth curves
			const dx = pt.x - lastAbs.x;
			const dy = pt.y - lastAbs.y;
			const len = Math.hypot(dx, dy) || 1;

			// Use a more conservative offset for better curve control
			const offset = Math.min(30, len * 0.25); // 25% of line length, max 30px

			// For the first curve, we'll use a simple perpendicular offset
			// In a more advanced implementation, you'd consider the previous curve direction
			const midX = (lastAbs.x + pt.x) / 2;
			const midY = (lastAbs.y + pt.y) / 2;

			// Calculate perpendicular vector (rotated 90 degrees clockwise for outward curves)
			const perpX = dy / len; // Reversed from -dy
			const perpY = -dx / len; // Reversed from dx

			// For now, use a consistent outward direction
			// You can make this smarter later by considering the path's overall direction
			curveCP = {
				cx: midX + perpX * offset,
				cy: midY + perpY * offset,
			};
		}
		const absPoints = [
			{
				x: currentPath.x + currentPath.points[0]!.x,
				y: currentPath.y + currentPath.points[0]!.y,
			},
			...currentPath.points.slice(1).map((p, i) => ({
				x: currentPath.x + p.x,
				y: currentPath.y + p.y,
				curve: currentPath.points[i]?.curve,
			})),
			{ x: pt.x, y: pt.y },
		];

		// Assign curve to the previous point if requested
		if (curveCP) {
			// The curve should be assigned to the last existing point (not the new one being added)
			const lastExistingPointIndex = absPoints.length - 2; // second to last point
			if (absPoints[lastExistingPointIndex]) {
				absPoints[lastExistingPointIndex] = {
					...absPoints[lastExistingPointIndex],
					curve: {
						type: "quadratic",
						cx: curveCP.cx - currentPath.x,
						cy: curveCP.cy - currentPath.y,
					},
				};
			}
		}
		const { x, y, w, h, points } = computeBoundsAndLocalPoints(
			absPoints as any,
		);
		updateElement({ id: currentPath.id, patch: { x, y, w, h, points } as any });
	};

	const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
		// Don't handle mouse events while editing text
		if (isEditingText) return;

		const rect = canvasRef.current?.getBoundingClientRect();
		if (!rect) return;

		const canvasCoords = toCanvas(e.clientX, e.clientY, rect);

		// Handle path editing mode
		if (isEditingPath && editingPathId) {
			const pathElement = elementsById.get(editingPathId) as
				| PathElement
				| undefined;
			if (pathElement) {
				const handleHit = PathEditingManager.getHandleAtPoint(
					canvasCoords,
					pathElement,
					zoom,
				);
				if (handleHit) {
					if (handleHit.type === "point") {
						// Handle point selection/dragging
						// Check for modifier keys more comprehensively for AZERTY keyboards
						const isModifierPressed = e.ctrlKey || e.metaKey || e.altKey;
						if (isModifierPressed) {
							// Toggle point selection
							const newSelection = selectedPathPoints.includes(
								handleHit.pointIndex,
							)
								? selectedPathPoints.filter((i) => i !== handleHit.pointIndex)
								: [...selectedPathPoints, handleHit.pointIndex];
							setSelectedPathPoints(newSelection);

							// Update the selected property on the path points
							const updatedPoints = pathElement.points.map((point, index) => ({
								...point,
								selected: newSelection.includes(index),
							}));
							updateElement({
								id: editingPathId,
								patch: { points: updatedPoints },
							});
						} else {
							// Start dragging point
							setDraggingPathPoint({
								pathId: editingPathId,
								pointIndex: handleHit.pointIndex,
							});
							setSelectedPathPoints([handleHit.pointIndex]);

							// Update the selected property on the path points
							const updatedPoints = pathElement.points.map((point, index) => ({
								...point,
								selected: index === handleHit.pointIndex,
							}));
							updateElement({
								id: editingPathId,
								patch: { points: updatedPoints },
							});
						}
						return;
					} else if (handleHit.type === "curve" && handleHit.handleType) {
						// Start dragging curve handle
						setDraggingCurveHandle({
							pathId: editingPathId,
							pointIndex: handleHit.pointIndex,
							handleType: handleHit.handleType,
						});
						return;
					}
				}
			}
		}

		if (tool !== "select") {
			if (tool === "text") {
				setIsEditingText(true);
				setEditingTextId(null); // Clear any existing text element being edited
				setTextCreationPosition(canvasCoords); // Store click position for new text creation
			} else if (tool === "path") {
				handlePathClick(canvasCoords, e.shiftKey);
			} else {
				startDrawing(canvasCoords, tool);
			}
			return;
		}

		const clickedElement = getElementAtPoint(canvasCoords, elements, zoom);

		for (const elementId of selection) {
			const element = elementsById.get(elementId);
			if (element) {
				// Skip resize for locked or when both dimensions are locked
				const bothDimsLocked =
					element.lockedDimensions === true ||
					(element.lockedWidth && element.lockedHeight);
				if (element.locked || bothDimsLocked) {
					continue;
				}
				const handle = getResizeHandle(canvasCoords, element, zoom);
				if (handle) {
					startTransaction();
					setIsResizing(true);
					setResizeHandle(handle);
					setResizingElementId(element.id);
					setDragStart(canvasCoords);
					return;
				}
			}
		}

		if (clickedElement) {
			// Prevent selecting locked elements (click-through)
			if (clickedElement.locked) {
				// Treat as clicking empty space to start box selection if no modifiers
				if (!(e.ctrlKey || e.metaKey || e.altKey || e.shiftKey)) {
					setSelection([]);
				}
				setIsBoxSelecting(true);
				setBoxSelectStart(canvasCoords);
				setBoxSelectEnd(canvasCoords);
				return;
			}
			// Check if the clicked element is part of a group
			const elementGroup = getElementGroup(clickedElement.id);
			const targetId = elementGroup ? elementGroup.id : clickedElement.id;

			const selSet = new Set(selection);
			if (e.ctrlKey || e.metaKey || e.altKey) {
				if (selSet.has(targetId)) {
					selSet.delete(targetId);
				} else {
					selSet.add(targetId);
				}
				setSelection(Array.from(selSet));
			} else if (e.shiftKey && selection.length > 0) {
				if (!selSet.has(targetId)) setSelection([...selection, targetId]);
			} else {
				if (!selSet.has(targetId)) setSelection([targetId]);
			}

			startTransaction();
			setIsDragging(true);
			setDragStart(canvasCoords);
		} else {
			if (!(e.ctrlKey || e.metaKey || e.altKey || e.shiftKey)) {
				setSelection([]);
			}

			setIsBoxSelecting(true);
			setBoxSelectStart(canvasCoords);
			setBoxSelectEnd(canvasCoords);
		}
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		// Don't handle mouse events while editing text
		if (isEditingText) return;

		const rect = canvasRef.current?.getBoundingClientRect();
		if (!rect) return;

		const canvasCoords = toCanvas(e.clientX, e.clientY, rect);

		// Handle path point dragging
		if (draggingPathPoint) {
			const pathElement = elementsById.get(draggingPathPoint.pathId) as
				| PathElement
				| undefined;
			if (pathElement) {
				// Check if we have multiple selected points
				const selectedPoints = pathElement.points
					.map((point, index) => (point.selected ? index : -1))
					.filter((index) => index !== -1);

				if (selectedPoints.length > 1) {
					// Move all selected points by the same delta
					const draggedPoint = pathElement.points[draggingPathPoint.pointIndex];
					if (draggedPoint) {
						const deltaX = canvasCoords.x - (pathElement.x + draggedPoint.x);
						const deltaY = canvasCoords.y - (pathElement.y + draggedPoint.y);

						const updatedPath = PathEditingManager.moveSelectedPathPoints(
							pathElement,
							selectedPoints,
							deltaX,
							deltaY,
						);
						updateElement({ id: pathElement.id, patch: updatedPath });
					}
				} else {
					// Move single point
					const updatedPath = PathEditingManager.movePathPoint(
						pathElement,
						draggingPathPoint.pointIndex,
						canvasCoords,
					);
					updateElement({ id: pathElement.id, patch: updatedPath });
				}
			}
			return;
		}

		// Handle curve handle dragging
		if (draggingCurveHandle) {
			const pathElement = elementsById.get(draggingCurveHandle.pathId) as
				| PathElement
				| undefined;
			if (pathElement) {
				const updatedPath = PathEditingManager.moveCurveHandle(
					pathElement,
					draggingCurveHandle.pointIndex,
					draggingCurveHandle.handleType,
					canvasCoords,
				);
				updateElement({ id: pathElement.id, patch: updatedPath });
			}
			return;
		}

		if (isDrawing && dragStart) {
			updateDrawing(canvasCoords);
			return;
		}

		if (isBoxSelecting && boxSelectStart) {
			setBoxSelectEnd(canvasCoords);

			const selectionRect = {
				x: Math.min(boxSelectStart.x, canvasCoords.x),
				y: Math.min(boxSelectStart.y, canvasCoords.y),
				width: Math.abs(canvasCoords.x - boxSelectStart.x),
				height: Math.abs(canvasCoords.y - boxSelectStart.y),
			};

			const selectedElements = elements.filter((element) => {
				return (
					element.locked !== true &&
					element.x + element.w > selectionRect.x &&
					element.x < selectionRect.x + selectionRect.width &&
					element.y + element.h > selectionRect.y &&
					element.y < selectionRect.y + selectionRect.height
				);
			});

			// Convert element selection to group-aware selection
			const targetIds = new Set<string>();
			selectedElements.forEach((element) => {
				const elementGroup = getElementGroup(element.id);
				const targetId = elementGroup ? elementGroup.id : element.id;
				targetIds.add(targetId);
			});

			const newSelection = Array.from(targetIds);
			setSelection(newSelection);
			return;
		}

		if (!dragStart) return;

		const deltaX = canvasCoords.x - dragStart.x;
		const deltaY = canvasCoords.y - dragStart.y;

		if (isResizing && resizeHandle && resizingElementId) {
			const selectedElement = elements.find(
				(el) => el.id === resizingElementId,
			);
			if (selectedElement) {
				// Guard: prevent any resize when element is locked or both dimensions are locked
				const bothDimsLocked =
					selectedElement.lockedDimensions === true ||
					(selectedElement.lockedWidth && selectedElement.lockedHeight);
				if (selectedElement.locked || bothDimsLocked) {
					return;
				}
				// Constrain deltas by per-axis locks
				let constrainedDX = deltaX;
				let constrainedDY = deltaY;
				if (selectedElement.lockedWidth) constrainedDX = 0;
				if (selectedElement.lockedHeight) constrainedDY = 0;
				if (selectedElement.type === "text") {
					// Special handling for text elements
					const textResizeResult = ResizeManager.calculateTextResize({
						element: selectedElement,
						handle: resizeHandle,
						deltaX: constrainedDX,
						deltaY: constrainedDY,
					});

					updateElement({
						id: selectedElement.id,
						patch: {
							x: textResizeResult.x,
							y: textResizeResult.y,
							w: textResizeResult.w,
							h: textResizeResult.h,
							fontSize: textResizeResult.fontSize,
						},
					});
				} else if (selectedElement.type === "line") {
					// Line resize - move endpoints
					const lineResizeResult = ResizeManager.calculateLineResize({
						element: selectedElement,
						handle: resizeHandle,
						deltaX: constrainedDX,
						deltaY: constrainedDY,
					});

					updateElement({
						id: selectedElement.id,
						patch: lineResizeResult,
					});
				} else if (selectedElement.type === "path") {
					const pathResize = ResizeManager.calculatePathResize({
						element: selectedElement as PathElement,
						handle: resizeHandle,
						deltaX: constrainedDX,
						deltaY: constrainedDY,
					});

					updateElement({
						id: selectedElement.id,
						patch: {
							x: pathResize.x,
							y: pathResize.y,
							w: pathResize.w,
							h: pathResize.h,
							points: pathResize.points,
						},
					});
				} else {
					// Regular resize for non-text elements
					const resizeResult = ResizeManager.calculateResize({
						element: selectedElement,
						handle: resizeHandle,
						deltaX: constrainedDX,
						deltaY: constrainedDY,
					});

					updateElementPosition({
						id: selectedElement.id,
						...resizeResult,
					});
				}
				// After resizing a single element, update its group's bounds if any
				const containingGroup = getElementGroup(selectedElement.id);
				if (containingGroup) {
					updateGroupBounds(containingGroup.id);
				}
				setDragStart(canvasCoords);
				updateParentChildRelationships();
			}
		} else if (isDragging) {
			// Collect all elements to drag (including frame children)
			const elementsToMove = new Set<string>();
			const groupById = new Map(groups.map((g) => [g.id, g] as const));
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

			for (const selectedId of selection) {
				const group = groupById.get(selectedId);
				if (group) {
					for (const elementId of group.elementIds) {
						elementsToMove.add(elementId);
						const element = elementsById.get(elementId);
						if (element && element.type === "frame") {
							getFrameDescendants(elementId);
						}
					}
				} else {
					const element = elementsById.get(selectedId);
					if (element) {
						elementsToMove.add(selectedId);
						if (element.type === "frame") {
							getFrameDescendants(selectedId);
						}
					}
				}
			}

			// Apply smart guides if enabled and we have a single selected item (element or group)
			let finalDeltaX = deltaX;
			let finalDeltaY = deltaY;

			if (smartGuides.enabled && selection.length === 1) {
				const selectedId = selection[0]!;
				const group = groupById.get(selectedId);
				const draggedElement = group ? null : elementsById.get(selectedId);

				// Create a virtual element representing the dragged item (group or element)
				let draggedItem: Element | null = null;
				
				if (group) {
					// For groups, create a virtual element with the group's bounds
					draggedItem = {
						id: group.id,
						type: 'rect' as const,
						x: group.x,
						y: group.y,
						w: group.w,
						h: group.h,
						parentId: null,
						rotation: 0,
						name: group.name,
						fill: 'transparent',
						opacity: 1,
						visible: true,
					};
				} else if (draggedElement) {
					draggedItem = draggedElement;
				}

				if (draggedItem) {
					const targetX = draggedItem.x + deltaX;
					const targetY = draggedItem.y + deltaY;

					const snapResult = smartGuidesManager.findSnapPoints(
						draggedItem,
						targetX,
						targetY,
						{
							elements,
							selectedElementIds: selection,
							tolerance: smartGuides.tolerance,
							previousPosition: smartGuides.previousPosition || undefined,
							elementIdToGroupMap,
						},
					);

					// Update guides and snap offset
					smartGuides.setGuides(snapResult.guides);
					smartGuides.setSnapOffset({
						x: snapResult.snapX - targetX,
						y: snapResult.snapY - targetY,
					});
					smartGuides.setIsSnapping(snapResult.guides.length > 0);

					// Use snapped coordinates - simple like the demo
					finalDeltaX = snapResult.snapX - draggedItem.x;
					finalDeltaY = snapResult.snapY - draggedItem.y;

					// Update previous position for next frame
					smartGuides.setPreviousPosition({ x: targetX, y: targetY });
				}
			} else {
				// Clear guides when not dragging or multiple elements selected
				smartGuides.clearGuides();
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
					if (element.type === "line" && "x2" in element && "y2" in element) {
						// Special handling for line dragging - move both endpoints
						updateElement({
							id: elementId,
							patch: {
								x: element.x + finalDeltaX,
								y: element.y + finalDeltaY,
								x2: element.x2 + finalDeltaX,
								y2: element.y2 + finalDeltaY,
							},
						});
					} else {
						// Regular element dragging
						updateElementPosition({
							id: elementId,
							x: element.x + finalDeltaX,
							y: element.y + finalDeltaY,
						});
					}
					// Track groups that contain moved elements so we can update their bounds
					const containingGroup = getElementGroup(elementId);
					if (containingGroup) affectedGroupIds.add(containingGroup.id);
				}
			}
			setDragStart(canvasCoords);
			updateParentChildRelationships();

			// Update bounds for any groups that were affected by movement
			for (const groupId of affectedGroupIds) {
				updateGroupBounds(groupId);
			}
		}
	};

	const handleMouseUp = () => {
		if (isDrawing && tool !== "path") {
			setIsDrawing(false);
			setDragStart(null);
			setTool("select");
		}

		if (isBoxSelecting) {
			setIsBoxSelecting(false);
			setBoxSelectStart(null);
			setBoxSelectEnd(null);
		}

		// Clear path editing drag states
		if (draggingPathPoint) {
			setDraggingPathPoint(null);
		}
		if (draggingCurveHandle) {
			setDraggingCurveHandle(null);
		}

		// Commit transaction for drag/resize operations
		if (isDragging || isResizing) {
			commitTransaction();
		}

		// Clear smart guides when dragging ends
		if (isDragging) {
			smartGuides.clearGuides();
		}

		setIsDragging(false);
		setIsResizing(false);
		setDragStart(null);
		setResizeHandle(null);
		setResizingElementId(null);
	};

	const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const rect = canvasRef.current?.getBoundingClientRect();
		if (!rect) return;

		const canvasCoords = toCanvas(e.clientX, e.clientY, rect);

		const clickedElement = getElementAtPoint(canvasCoords, elements, zoom);

		if (!clickedElement) return;

		// If the clicked element is part of a group, switch selection to that element
		// This allows drilling into a group to select individual items.
		const elementGroup = getElementGroup(clickedElement.id);
		if (elementGroup) {
			setSelection([clickedElement.id]);
		}

		// Start text editing if it's a text element (even if grouped)
		if (clickedElement.type === "text") {
			setIsEditingText(true);
			setEditingTextId(clickedElement.id);
			setSelection([]);
			setTextCreationPosition({ x: clickedElement.x, y: clickedElement.y });
			updateElement({
				id: clickedElement.id,
				patch: { visible: false },
			});
		}
	};

	return { handleMouseDown, handleMouseMove, handleMouseUp, handleDoubleClick };
};
