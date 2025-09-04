import type { Element } from "../../../store/element-atoms";
import type { GuideLine } from "../../../store/smart-guides-atoms";

export interface SmartGuidesManagerDependencies {
	elements: Element[];
	selectedElementIds: string[];
	tolerance: number;
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
		const { elements, selectedElementIds, tolerance } = deps;
		const guides: GuideLine[] = [];
		let snapX = targetX;
		let snapY = targetY;

		// Get other elements (excluding the dragged element and other selected elements)
		const otherElements = elements.filter(
			(el) =>
				el.id !== draggedElement.id && !selectedElementIds.includes(el.id),
		);

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
					if (Math.abs(draggedPoint.y - otherPoint.y) <= tolerance) {
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

			// Check vertical alignment (X coordinates)
			for (const draggedPoint of draggedPoints) {
				for (const otherPoint of otherPoints) {
					if (Math.abs(draggedPoint.x - otherPoint.x) <= tolerance) {
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

		return { snapX, snapY, guides };
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
