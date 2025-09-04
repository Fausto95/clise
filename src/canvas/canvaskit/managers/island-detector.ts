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

	// Spatial grid for fast neighbor lookup
	private spatialGrid: Map<string, BaseElement[]> = new Map();
	private gridSize: number = 300; // Grid cell size based on max connection distance

	/**
	 * Build spatial grid index for fast neighbor lookup
	 */
	private buildSpatialGrid(elements: BaseElement[]): void {
		this.spatialGrid.clear();

		for (const element of elements) {
			// Add element to all grid cells it touches
			const leftGrid = Math.floor(element.x / this.gridSize);
			const rightGrid = Math.floor((element.x + element.w) / this.gridSize);
			const topGrid = Math.floor(element.y / this.gridSize);
			const bottomGrid = Math.floor((element.y + element.h) / this.gridSize);

			for (let gx = leftGrid; gx <= rightGrid; gx++) {
				for (let gy = topGrid; gy <= bottomGrid; gy++) {
					const key = `${gx},${gy}`;
					if (!this.spatialGrid.has(key)) {
						this.spatialGrid.set(key, []);
					}
					this.spatialGrid.get(key)!.push(element);
				}
			}
		}
	}

	/**
	 * Get potential neighbors for an element using spatial grid
	 */
	private getPotentialNeighbors(
		element: BaseElement,
		maxDistance: number,
	): BaseElement[] {
		const neighbors = new Set<BaseElement>();

		// Calculate which grid cells to check
		const buffer = Math.ceil(maxDistance / this.gridSize);
		const centerX = element.x + element.w / 2;
		const centerY = element.y + element.h / 2;
		const centerGridX = Math.floor(centerX / this.gridSize);
		const centerGridY = Math.floor(centerY / this.gridSize);

		for (let gx = centerGridX - buffer; gx <= centerGridX + buffer; gx++) {
			for (let gy = centerGridY - buffer; gy <= centerGridY + buffer; gy++) {
				const key = `${gx},${gy}`;
				const cellElements = this.spatialGrid.get(key);
				if (cellElements) {
					cellElements.forEach((el) => {
						if (el.id !== element.id) {
							neighbors.add(el);
						}
					});
				}
			}
		}

		return Array.from(neighbors);
	}

	/**
	 * Detect islands (spatial clusters) of elements on the canvas using optimized spatial indexing.
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

		// Build spatial grid for O(n) neighbor lookups instead of O(n²)
		this.gridSize = Math.max(300, opts.maxConnectionDistance * 1.2);
		this.buildSpatialGrid(validElements);

		// Build adjacency list using spatial grid optimization
		const adjacency: Record<string, Set<string>> = {};

		for (const element of validElements) {
			if (!adjacency[element.id]) adjacency[element.id] = new Set();

			// Only check potential neighbors from spatial grid
			const potentialNeighbors = this.getPotentialNeighbors(
				element,
				opts.maxConnectionDistance,
			);

			for (const neighbor of potentialNeighbors) {
				if (this.elementsAreConnected(element, neighbor, opts)) {
					adjacency[element.id]?.add(neighbor.id);
					if (!adjacency[neighbor.id]) adjacency[neighbor.id] = new Set();
					adjacency[neighbor.id]?.add(element.id);
				}
			}
		}

		// Find connected components using Union-Find for better performance
		const unionFind = new UnionFind(validElements.map((e) => e.id));

		// Union connected elements
		for (const element of validElements) {
			for (const neighborId of adjacency[element.id] || []) {
				unionFind.union(element.id, neighborId);
			}
		}

		// Group elements by their root component
		const components = new Map<string, BaseElement[]>();

		for (const element of validElements) {
			const root = unionFind.find(element.id);
			if (!components.has(root)) {
				components.set(root, []);
			}
			components.get(root)!.push(element);
		}

		// Create islands from components
		const islands: Island[] = [];
		for (const [, cluster] of components) {
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

/**
 * Union-Find (Disjoint Set) data structure for efficient connected components
 */
class UnionFind {
	private parent: Map<string, string> = new Map();
	private rank: Map<string, number> = new Map();

	constructor(elements: string[]) {
		for (const element of elements) {
			this.parent.set(element, element);
			this.rank.set(element, 0);
		}
	}

	find(x: string): string {
		const parent = this.parent.get(x);
		if (parent !== x) {
			// Path compression
			const root = this.find(parent!);
			this.parent.set(x, root);
			return root;
		}
		return x;
	}

	union(x: string, y: string): void {
		const rootX = this.find(x);
		const rootY = this.find(y);

		if (rootX === rootY) return;

		const rankX = this.rank.get(rootX) || 0;
		const rankY = this.rank.get(rootY) || 0;

		// Union by rank
		if (rankX < rankY) {
			this.parent.set(rootX, rootY);
		} else if (rankX > rankY) {
			this.parent.set(rootY, rootX);
		} else {
			this.parent.set(rootY, rootX);
			this.rank.set(rootX, rankX + 1);
		}
	}
}
