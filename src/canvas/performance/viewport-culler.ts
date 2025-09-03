import type { Element } from "../../store/element-atoms";

export interface ViewportBounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export interface CullingResult {
	visibleElements: Element[];
	culledCount: number;
	totalCount: number;
}

export class ViewportCuller {
	private bufferPercentage: number = 0.2; // 20% buffer around viewport

	constructor(bufferPercentage: number = 0.2) {
		this.bufferPercentage = bufferPercentage;
	}

	/**
	 * Calculate viewport bounds based on pan, zoom, and canvas dimensions
	 * This matches the coordinate transformation used in useViewport.screenToWorld
	 */
	calculateViewportBounds(
		pan: { x: number; y: number },
		zoom: number,
		dimensions: { width: number; height: number },
	): ViewportBounds {
		// Calculate the visible area in world coordinates
		// The canvas uses a coordinate system where:
		// - Screen coordinates are relative to canvas top-left
		// - World coordinates are calculated as: (screenCoord - pan) / zoom

		// Calculate world bounds for the entire canvas viewport
		// Top-left corner of canvas in world coordinates
		const worldLeft = (0 - pan.x) / zoom;
		const worldTop = (0 - pan.y) / zoom;

		// Bottom-right corner of canvas in world coordinates
		const worldRight = (dimensions.width - pan.x) / zoom;
		const worldBottom = (dimensions.height - pan.y) / zoom;

		// Add buffer zone for smooth panning
		const worldWidth = worldRight - worldLeft;
		const worldHeight = worldBottom - worldTop;
		const bufferX = worldWidth * this.bufferPercentage;
		const bufferY = worldHeight * this.bufferPercentage;

		return {
			left: worldLeft - bufferX,
			top: worldTop - bufferY,
			right: worldRight + bufferX,
			bottom: worldBottom + bufferY,
		};
	}

	/**
	 * Check if an element intersects with the viewport bounds
	 */
	isElementVisible(element: Element, viewportBounds: ViewportBounds): boolean {
		const { x, y, w, h } = element;

		// Element bounds
		const elementLeft = x;
		const elementTop = y;
		const elementRight = x + w;
		const elementBottom = y + h;

		// Check for intersection using separating axis theorem
		return !(
			elementRight < viewportBounds.left ||
			elementLeft > viewportBounds.right ||
			elementBottom < viewportBounds.top ||
			elementTop > viewportBounds.bottom
		);
	}

	/**
	 * Filter elements based on viewport visibility
	 */
	cullElements(
		elements: Element[],
		pan: { x: number; y: number },
		zoom: number,
		dimensions: { width: number; height: number },
		enableCulling: boolean = true,
	): CullingResult {
		if (!enableCulling) {
			return {
				visibleElements: elements,
				culledCount: 0,
				totalCount: elements.length,
			};
		}

		const viewportBounds = this.calculateViewportBounds(pan, zoom, dimensions);
		const visibleElements: Element[] = [];

		for (const element of elements) {
			if (this.isElementVisible(element, viewportBounds)) {
				visibleElements.push(element);
			}
		}

		return {
			visibleElements,
			culledCount: elements.length - visibleElements.length,
			totalCount: elements.length,
		};
	}

	/**
	 * Update buffer percentage for culling sensitivity
	 */
	setBufferPercentage(percentage: number): void {
		this.bufferPercentage = Math.max(0, Math.min(1, percentage));
	}

	/**
	 * Get current buffer percentage
	 */
	getBufferPercentage(): number {
		return this.bufferPercentage;
	}
}
