import type { Element } from "../../../store/element-atoms";
import type { GuideLine } from "../../../store/smart-guides-atoms";
import type { Group } from "../../../store/group-atoms";

export interface SmartGuidesManagerDependencies {
	elements: Element[];
	selectedElementIds: string[];
	tolerance: number;
	previousPosition?: { x: number; y: number };
	elementIdToGroupMap: Map<string, Group>;
}

export class SmartGuidesManager {
	/**
	 * Find snap points for a dragged element
	 */
	findSnapPoints(
		draggedElement: Element,
		targetX: number,
		targetY: number,
		deps: SmartGuidesManagerDependencies,
	): {
		snapX: number;
		snapY: number;
		guides: GuideLine[];
	} {
		const {
			elements,
			selectedElementIds,
			tolerance,
			previousPosition,
			elementIdToGroupMap,
		} = deps;
		const guides: GuideLine[] = [];
		let snapX = targetX;
		let snapY = targetY;

		// Check if user is moving away from a snap point
		const isMovingAway = this.isMovingAwayFromSnapPoint(
			targetX,
			targetY,
			previousPosition,
			tolerance,
		);

		// Check if we're dragging a group (draggedElement.id would be a group ID)
		const isDraggingGroup =
			selectedElementIds.length === 1 &&
			!elements.some((el) => el.id === draggedElement.id);

		// Get other elements for snapping
		const otherElements = elements.filter((el) => {
			// Skip hidden elements
			if (!el.visible) return false;

			// Skip the dragged element itself (if it's actually an element)
			if (el.id === draggedElement.id) return false;

			if (isDraggingGroup) {
				// When dragging a group, exclude all elements in the selected groups
				// The draggedElement.id is actually a group ID in this case
				const elementGroup = elementIdToGroupMap.get(el.id);
				if (elementGroup && selectedElementIds.includes(elementGroup.id)) {
					return false;
				}
			} else {
				// When dragging individual elements, skip other selected elements
				if (selectedElementIds.includes(el.id)) return false;

				// If dragged element is in a group, include other elements in the same group
				const draggedElementGroup = elementIdToGroupMap.get(draggedElement.id);
				if (draggedElementGroup) {
					const elementGroup = elementIdToGroupMap.get(el.id);
					if (elementGroup && elementGroup.id === draggedElementGroup.id) {
						return true;
					}
				}
			}

			// Include all other visible elements (grouped or ungrouped)
			return true;
		});

		// Calculate dragged element's key points
		const draggedPoints = this.getElementPoints(
			draggedElement,
			targetX,
			targetY,
		);

		// Check against other elements
		for (const otherElement of otherElements) {
			const otherPoints = this.getElementPoints(
				otherElement,
				otherElement.x,
				otherElement.y,
			);

			// Check horizontal alignment (Y coordinates)
			for (const draggedPoint of draggedPoints) {
				for (const otherPoint of otherPoints) {
					const distance = Math.abs(draggedPoint.y - otherPoint.y);
					if (distance <= tolerance) {
						// Only snap if not moving away or if very close to snap point
						if (!isMovingAway || distance <= tolerance * 0.5) {
							snapY = otherPoint.y - (draggedPoint.y - targetY);
							guides.push({
								type: "horizontal",
								position: otherPoint.y,
								elementId: otherElement.id,
								alignmentType: otherPoint.type,
							});
						}
					}
				}
			}

			// Check vertical alignment (X coordinates)
			for (const draggedPoint of draggedPoints) {
				for (const otherPoint of otherPoints) {
					const distance = Math.abs(draggedPoint.x - otherPoint.x);
					if (distance <= tolerance) {
						// Only snap if not moving away or if very close to snap point
						if (!isMovingAway || distance <= tolerance * 0.5) {
							snapX = otherPoint.x - (draggedPoint.x - targetX);
							guides.push({
								type: "vertical",
								position: otherPoint.x,
								elementId: otherElement.id,
								alignmentType: otherPoint.type,
							});
						}
					}
				}
			}
		}

		return { snapX, snapY, guides };
	}

	/**
	 * Check if the user is moving away from a snap point
	 */
	private isMovingAwayFromSnapPoint(
		currentX: number,
		currentY: number,
		previousPosition: { x: number; y: number } | undefined,
		tolerance: number,
	): boolean {
		if (!previousPosition) {
			return false;
		}

		const deltaX = currentX - previousPosition.x;
		const deltaY = currentY - previousPosition.y;
		const movementDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

		// If movement is very small, don't consider it as "moving away"
		if (movementDistance < 1) {
			return false;
		}

		// Check if we're moving away from the previous position
		// This is a simple heuristic - if we've moved more than half the tolerance
		// away from the previous position, consider it as moving away
		return movementDistance > tolerance * 0.3;
	}

	/**
	 * Get key alignment points for an element
	 */
	private getElementPoints(
		element: Element,
		x: number,
		y: number,
	): Array<{ x: number; y: number; type: "edge" | "center" }> {
		const points: Array<{ x: number; y: number; type: "edge" | "center" }> = [];

		// Left edge
		points.push({ x, y, type: "edge" });
		// Right edge
		points.push({ x: x + element.w, y, type: "edge" });
		// Top edge
		points.push({ x, y, type: "edge" });
		// Bottom edge
		points.push({ x, y: y + element.h, type: "edge" });
		// Center X
		points.push({ x: x + element.w / 2, y, type: "center" });
		// Center Y
		points.push({ x, y: y + element.h / 2, type: "center" });

		return points;
	}

	/**
	 * Check if two elements are aligned
	 */
	areElementsAligned(
		element1: Element,
		element2: Element,
		tolerance: number,
	): {
		horizontal: boolean;
		vertical: boolean;
		guides: GuideLine[];
	} {
		const guides: GuideLine[] = [];
		let horizontal = false;
		let vertical = false;

		// Skip if either element is hidden
		if (!element1.visible || !element2.visible) {
			return { horizontal, vertical, guides };
		}

		const points1 = this.getElementPoints(element1, element1.x, element1.y);
		const points2 = this.getElementPoints(element2, element2.x, element2.y);

		// Check horizontal alignment
		for (const p1 of points1) {
			for (const p2 of points2) {
				if (Math.abs(p1.y - p2.y) <= tolerance) {
					horizontal = true;
					guides.push({
						type: "horizontal",
						position: p1.y,
						elementId: element2.id,
						alignmentType: p2.type,
					});
				}
			}
		}

		// Check vertical alignment
		for (const p1 of points1) {
			for (const p2 of points2) {
				if (Math.abs(p1.x - p2.x) <= tolerance) {
					vertical = true;
					guides.push({
						type: "vertical",
						position: p1.x,
						elementId: element2.id,
						alignmentType: p2.type,
					});
				}
			}
		}

		return { horizontal, vertical, guides };
	}

	/**
	 * Find the closest snap point
	 */
	findClosestSnapPoint(
		targetX: number,
		targetY: number,
		guides: GuideLine[],
	): { x: number; y: number; distance: number } | null {
		let closest: { x: number; y: number; distance: number } | null = null;

		for (const guide of guides) {
			let distance: number;
			let snapX = targetX;
			let snapY = targetY;

			if (guide.type === "horizontal") {
				snapY = guide.position;
				distance = Math.abs(targetY - guide.position);
			} else {
				snapX = guide.position;
				distance = Math.abs(targetX - guide.position);
			}

			if (!closest || distance < closest.distance) {
				closest = { x: snapX, y: snapY, distance };
			}
		}

		return closest;
	}
}
