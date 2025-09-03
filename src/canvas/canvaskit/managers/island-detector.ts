import type { BaseElement } from "@store/elements";

export interface Island {
	id: string;
	elements: BaseElement[];
	bounds: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	center: {
		x: number;
		y: number;
	};
	elementCount: number;
	preview?: string; // Base64 thumbnail data
}

export interface IslandDetectionOptions {
	/** Minimum distance between elements to consider them in the same island */
	clusterThreshold: number;
	/** Minimum number of elements to form an island */
	minElements: number;
	/** Maximum distance to consider elements connected */
	maxConnectionDistance: number;
}

export class IslandDetector {
	private defaultOptions: IslandDetectionOptions = {
		clusterThreshold: 150,
		minElements: 1,
		maxConnectionDistance: 250,
	};

	/**
	 * Detect islands (spatial clusters) of elements on the canvas using a graph-based connected components algorithm.
	 */
	detectIslands(
		elements: BaseElement[],
		options: Partial<IslandDetectionOptions> = {},
	): Island[] {
		const opts = { ...this.defaultOptions, ...options };

		if (elements.length === 0) return [];

		// Filter out elements that are too small or invalid
		const validElements = elements.filter(
			(el) => el.w > 0 && el.h > 0 && !isNaN(el.x) && !isNaN(el.y),
		);
		if (validElements.length < opts.minElements) return [];

		// Build adjacency list based on bounding box intersection or proximity
		const adjacency: Record<string, Set<string>> = {};
		for (let i = 0; i < validElements.length; i++) {
			const a = validElements[i];
			if (!a) continue;
			if (!adjacency[a.id]) adjacency[a.id] = new Set();
			for (let j = i + 1; j < validElements.length; j++) {
				const b = validElements[j];
				if (!b) continue;
				if (this.elementsAreConnected(a, b, opts)) {
					adjacency[a.id]?.add(b.id);
					if (!adjacency[b.id]) adjacency[b.id] = new Set();
					adjacency[b.id]?.add(a.id);
				}
			}
		}

		// Find connected components (islands)
		const visited = new Set<string>();
		const islands: Island[] = [];
		const idToElement = Object.fromEntries(validElements.map((e) => [e.id, e]));

		for (const el of validElements) {
			if (visited.has(el.id)) continue;
			const cluster: BaseElement[] = [];
			const queue = [el.id];
			visited.add(el.id);
			while (queue.length > 0) {
				const currId = queue.shift()!;
				const currEl = idToElement[currId];
				if (currEl) cluster.push(currEl);
				for (const neighbor of adjacency[currId] || []) {
					if (!visited.has(neighbor)) {
						visited.add(neighbor);
						queue.push(neighbor);
					}
				}
			}
			if (cluster.length >= opts.minElements) {
				islands.push(this.createIsland(cluster, `island-${islands.length}`));
			}
		}

		// Fallback: If no islands were found, but there are valid elements, treat each as its own island
		if (islands.length === 0 && validElements.length > 0) {
			for (const el of validElements) {
				islands.push(this.createIsland([el], `island-${islands.length}`));
			}
		}

		return islands;
	}

	/**
	 * Returns true if two elements are considered connected (bounding box intersection or proximity)
	 */
	private elementsAreConnected(
		a: BaseElement,
		b: BaseElement,
		opts: IslandDetectionOptions,
	): boolean {
		// Check bounding box intersection
		const aLeft = a.x,
			aRight = a.x + a.w,
			aTop = a.y,
			aBottom = a.y + a.h;
		const bLeft = b.x,
			bRight = b.x + b.w,
			bTop = b.y,
			bBottom = b.y + b.h;
		const intersects =
			aLeft < bRight && aRight > bLeft && aTop < bBottom && aBottom > bTop;
		if (intersects) return true;

		// Or check proximity (center-to-center distance)
		const centerA = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
		const centerB = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
		const dx = centerA.x - centerB.x;
		const dy = centerA.y - centerB.y;
		const dist = Math.sqrt(dx * dx + dy * dy);
		return dist <= opts.maxConnectionDistance;
	}

	/**
	 * Create an island from a cluster of elements
	 */
	private createIsland(elements: BaseElement[], id: string): Island {
		if (elements.length === 0) {
			throw new Error("Cannot create island from empty element array");
		}

		// Calculate bounds
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		for (const element of elements) {
			minX = Math.min(minX, element.x);
			minY = Math.min(minY, element.y);
			maxX = Math.max(maxX, element.x + element.w);
			maxY = Math.max(maxY, element.y + element.h);
		}

		const bounds = {
			x: minX,
			y: minY,
			width: maxX - minX,
			height: maxY - minY,
		};

		const center = {
			x: bounds.x + bounds.width / 2,
			y: bounds.y + bounds.height / 2,
		};

		return {
			id,
			elements,
			bounds,
			center,
			elementCount: elements.length,
		};
	}

	/**
	 * Update island bounds when elements change
	 */
	updateIslandBounds(island: Island): Island {
		return this.createIsland(island.elements, island.id);
	}

	/**
	 * Check if a point is within an island's bounds
	 */
	isPointInIsland(point: { x: number; y: number }, island: Island): boolean {
		return (
			point.x >= island.bounds.x &&
			point.x <= island.bounds.x + island.bounds.width &&
			point.y >= island.bounds.y &&
			point.y <= island.bounds.y + island.bounds.height
		);
	}

	/**
	 * Find the island that contains a specific element
	 */
	findIslandContainingElement(
		elementId: string,
		islands: Island[],
	): Island | undefined {
		return islands.find((island) =>
			island.elements.some((el) => el.id === elementId),
		);
	}

	/**
	 * Get the closest island to a point
	 */
	getClosestIsland(
		point: { x: number; y: number },
		islands: Island[],
	): Island | undefined {
		if (islands.length === 0) {
			return undefined;
		}

		let closestIsland: Island | undefined;
		let closestDistance = Infinity;

		for (const island of islands) {
			const distance = this.calculatePointToIslandDistance(point, island);

			if (distance < closestDistance) {
				closestDistance = distance;
				closestIsland = island;
			}
		}

		return closestIsland;
	}

	/**
	 * Calculate distance from a point to an island's center
	 */
	private calculatePointToIslandDistance(
		point: { x: number; y: number },
		island: Island,
	): number {
		const dx = point.x - island.center.x;
		const dy = point.y - island.center.y;
		return Math.sqrt(dx * dx + dy * dy);
	}
}
