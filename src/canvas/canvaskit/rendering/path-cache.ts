import type {
	CanvasKitInstance,
	CanvasKitPath,
} from "../../../types/canvaskit";

/**
 * Cache for path objects to avoid recreating complex shapes repeatedly
 * Particularly beneficial for rounded rectangles and other geometric shapes
 */
export class PathCache {
	private canvasKit: CanvasKitInstance;
	private pathCache: Map<string, CanvasKitPath> = new Map();
	private readonly maxCacheSize = 100; // Higher limit since paths can be more varied

	constructor(canvasKit: CanvasKitInstance) {
		this.canvasKit = canvasKit;
	}

	/**
	 * Generate a cache key for a rounded rectangle path
	 */
	private getRoundedRectCacheKey(
		x: number,
		y: number,
		width: number,
		height: number,
		radius: {
			topLeft: number;
			topRight: number;
			bottomRight: number;
			bottomLeft: number;
		},
	): string {
		return `roundedRect_${x}_${y}_${width}_${height}_${radius.topLeft}_${radius.topRight}_${radius.bottomRight}_${radius.bottomLeft}`;
	}

	/**
	 * Get or create a rounded rectangle path
	 */
	getRoundedRectPath(
		x: number,
		y: number,
		width: number,
		height: number,
		radius: {
			topLeft: number;
			topRight: number;
			bottomRight: number;
			bottomLeft: number;
		},
	): CanvasKitPath {
		const key = this.getRoundedRectCacheKey(x, y, width, height, radius);

		let path = this.pathCache.get(key);
		if (!path) {
			// Create new path if not cached
			path = this.createRoundedRectPath(x, y, width, height, radius);

			// Add to cache if we have space
			if (this.pathCache.size < this.maxCacheSize) {
				this.pathCache.set(key, path);
			} else {
				// If cache is full, evict oldest entry and add new one
				this.evictOldestEntry();
				this.pathCache.set(key, path);
			}
		}

		return path;
	}

	/**
	 * Create a rounded rectangle path (same logic as RectangleRenderer)
	 */
	private createRoundedRectPath(
		x: number,
		y: number,
		width: number,
		height: number,
		radius: {
			topLeft: number;
			topRight: number;
			bottomRight: number;
			bottomLeft: number;
		},
	): CanvasKitPath {
		const path = new this.canvasKit.Path();

		// Ensure all radius values are defined and valid
		const maxRadius = Math.min(width, height) / 2;
		const tl = Math.min(Math.max(0, radius.topLeft || 0), maxRadius);
		const tr = Math.min(Math.max(0, radius.topRight || 0), maxRadius);
		const br = Math.min(Math.max(0, radius.bottomRight || 0), maxRadius);
		const bl = Math.min(Math.max(0, radius.bottomLeft || 0), maxRadius);

		// If no radius, create simple rect
		if (tl === 0 && tr === 0 && br === 0 && bl === 0) {
			path.moveTo(x, y);
			path.lineTo(x + width, y);
			path.lineTo(x + width, y + height);
			path.lineTo(x, y + height);
			path.close();
			return path;
		}

		// Create rounded rectangle
		path.moveTo(x + tl, y);

		// Top edge
		path.lineTo(x + width - tr, y);

		// Top-right corner
		if (tr > 0) {
			path.arcToTangent(x + width, y, x + width, y + tr, tr);
		}

		// Right edge
		path.lineTo(x + width, y + height - br);

		// Bottom-right corner
		if (br > 0) {
			path.arcToTangent(x + width, y + height, x + width - br, y + height, br);
		}

		// Bottom edge
		path.lineTo(x + bl, y + height);

		// Bottom-left corner
		if (bl > 0) {
			path.arcToTangent(x, y + height, x, y + height - bl, bl);
		}

		// Left edge
		path.lineTo(x, y + tl);

		// Top-left corner
		if (tl > 0) {
			path.arcToTangent(x, y, x + tl, y, tl);
		}

		path.close();
		return path;
	}

	/**
	 * Generic path caching with custom key
	 * Useful for other types of paths beyond rounded rectangles
	 */
	getPath(key: string, pathFactory: () => CanvasKitPath): CanvasKitPath {
		let path = this.pathCache.get(key);
		if (!path) {
			path = pathFactory();

			if (this.pathCache.size < this.maxCacheSize) {
				this.pathCache.set(key, path);
			} else {
				this.evictOldestEntry();
				this.pathCache.set(key, path);
			}
		}

		return path;
	}

	/**
	 * Check if a path exists in cache
	 */
	hasPath(key: string): boolean {
		return this.pathCache.has(key);
	}

	/**
	 * Get cache statistics for debugging and monitoring
	 */
	getCacheStats(): {
		cacheSize: number;
		maxCacheSize: number;
		cacheKeys: string[];
	} {
		return {
			cacheSize: this.pathCache.size,
			maxCacheSize: this.maxCacheSize,
			cacheKeys: Array.from(this.pathCache.keys()),
		};
	}

	/**
	 * Clear all cached paths
	 * Should be called when disposing the renderer to free memory
	 */
	clearCache(): void {
		// Clean up all cached paths
		for (const path of this.pathCache.values()) {
			path.delete();
		}
		this.pathCache.clear();
	}

	/**
	 * Evict the oldest entry from the cache
	 */
	private evictOldestEntry(): void {
		const firstKey = this.pathCache.keys().next().value;
		if (firstKey) {
			const path = this.pathCache.get(firstKey);
			if (path) {
				path.delete();
			}
			this.pathCache.delete(firstKey);
		}
	}
}
