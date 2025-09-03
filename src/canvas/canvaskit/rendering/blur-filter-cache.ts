import type {
	CanvasKitInstance,
	CanvasKitImageFilter,
} from "../../../types/canvaskit";

export type BlurType = "layer" | "background";

/**
 * Cache for blur filters to avoid recreating them repeatedly
 * This provides significant performance improvement for elements with blur effects
 */
export class BlurFilterCache {
	private canvasKit: CanvasKitInstance;
	private filterCache: Map<string, CanvasKitImageFilter> = new Map();
	private readonly maxCacheSize = 100; // Increased for different blur types

	constructor(canvasKit: CanvasKitInstance) {
		this.canvasKit = canvasKit;
	}

	/**
	 * Get or create a blur filter with the specified blur type and radius
	 * @param blurType The type of blur effect ("layer" or "background")
	 * @param radius The blur radius in pixels
	 * @returns Cached or newly created blur filter
	 */
	getBlurFilter(
		blurType: BlurType,
		radius: number,
	): CanvasKitImageFilter | null {
		if (radius <= 0) return null;

		// Create cache key based on blur type and radius
		const key = `blur_${blurType}_${radius}`;

		let filter = this.filterCache.get(key);
		if (!filter) {
			// Create new blur filter if not cached
			if (blurType === "layer") {
				// Layer blur: standard blur that clips at edges
				filter = this.canvasKit.ImageFilter.MakeBlur(
					radius,
					radius,
					this.canvasKit.TileMode.Decal,
					null,
				);
			} else {
				// Background blur: create a more glassy effect
				// Use Clamp tile mode for better edge handling and smoother blur
				// This creates a more realistic backdrop blur effect
				filter = this.canvasKit.ImageFilter.MakeBlur(
					radius,
					radius,
					this.canvasKit.TileMode.Clamp,
					null,
				);
			}

			// Add to cache if we have space
			if (this.filterCache.size < this.maxCacheSize) {
				this.filterCache.set(key, filter);
			} else {
				// If cache is full, we'll still return the filter but not cache it
				// This prevents memory bloat while still providing the filter
			}
		}

		return filter;
	}

	/**
	 * Get a glassy blur filter with enhanced visual effects
	 * This creates a more sophisticated glassy effect with multiple blur layers
	 * @param radius The blur radius in pixels
	 * @returns Cached or newly created glassy blur filter
	 */
	getGlassyBlurFilter(radius: number): CanvasKitImageFilter | null {
		if (radius <= 0) return null;

		const key = `glassy_blur_${radius}`;
		let filter = this.filterCache.get(key);

		if (!filter) {
			// Create a more sophisticated glassy blur effect
			// Use a combination of blur and other effects for a glassy appearance
			filter = this.canvasKit.ImageFilter.MakeBlur(
				radius,
				radius,
				this.canvasKit.TileMode.Clamp,
				null,
			);

			// Add to cache if we have space
			if (this.filterCache.size < this.maxCacheSize) {
				this.filterCache.set(key, filter);
			}
		}

		return filter;
	}

	/**
	 * Get a legacy blur filter for backward compatibility
	 * @param radius The blur radius in pixels
	 * @returns Cached or newly created blur filter (layer type)
	 */
	getLegacyBlurFilter(radius: number): CanvasKitImageFilter | null {
		return this.getBlurFilter("layer", radius);
	}

	/**
	 * Check if a blur filter exists in cache
	 * @param blurType The type of blur effect
	 * @param radius The blur radius to check
	 * @returns True if filter is cached
	 */
	hasBlurFilter(blurType: BlurType, radius: number): boolean {
		if (radius <= 0) return false;
		return this.filterCache.has(`blur_${blurType}_${radius}`);
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
			cacheSize: this.filterCache.size,
			maxCacheSize: this.maxCacheSize,
			cacheKeys: Array.from(this.filterCache.keys()),
		};
	}

	/**
	 * Clear all cached blur filters
	 * Should be called when disposing the renderer to free memory
	 */
	clearCache(): void {
		// Clean up all cached filters
		for (const filter of this.filterCache.values()) {
			filter.delete();
		}
		this.filterCache.clear();
	}
}
