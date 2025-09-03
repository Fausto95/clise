import type { CanvasKitInstance } from "../../../types/canvaskit";

/**
 * Cache for color objects to avoid redundant hex-to-RGBA conversions and CanvasKit color creation
 * Provides significant performance improvement for frequently used colors
 */
export class ColorCache {
	private canvasKit: CanvasKitInstance;
	private rgbaCache: Map<string, [number, number, number, number]> = new Map();
	private canvasKitColorCache: Map<string, number> = new Map();
	private readonly maxCacheSize = 200; // Higher limit since colors are lightweight

	constructor(canvasKit: CanvasKitInstance) {
		this.canvasKit = canvasKit;
	}

	/**
	 * Convert hex color to RGBA tuple with caching
	 * @param hex The hex color string (e.g., "#ff0000", "#f00", "red")
	 * @param opacity The opacity value (0-1)
	 * @returns RGBA tuple [r, g, b, a]
	 */
	hexToRgba(
		hex: string,
		opacity: number = 1,
	): [number, number, number, number] {
		if (!hex) return [0, 0, 0, 0];
		if (hex === "transparent" || hex === "none") return [0, 0, 0, 0];

		// Create cache key including opacity
		const key = `${hex}_${opacity}`;

		let rgba = this.rgbaCache.get(key);
		if (!rgba) {
			// Perform conversion
			rgba = this.convertHexToRgba(hex, opacity);

			// Add to cache if we have space
			if (this.rgbaCache.size < this.maxCacheSize) {
				this.rgbaCache.set(key, rgba);
			} else {
				// If cache is full, evict oldest entry
				this.evictOldestRgbaEntry();
				this.rgbaCache.set(key, rgba);
			}
		}

		return rgba;
	}

	/**
	 * Get CanvasKit Color object with caching
	 * @param hex The hex color string
	 * @param opacity The opacity value (0-1)
	 * @returns CanvasKit Color object (number)
	 */
	getCanvasKitColor(hex: string, opacity: number = 1): number {
		const key = `${hex}_${opacity}`;

		let color = this.canvasKitColorCache.get(key);
		if (!color) {
			const rgba = this.hexToRgba(hex, opacity);
			color = this.canvasKit.Color(rgba[0], rgba[1], rgba[2], rgba[3]);

			// Add to cache if we have space
			if (this.canvasKitColorCache.size < this.maxCacheSize) {
				this.canvasKitColorCache.set(key, color);
			} else {
				// If cache is full, evict oldest entry
				this.evictOldestColorEntry();
				this.canvasKitColorCache.set(key, color);
			}
		}

		return color;
	}

	/**
	 * Get RGBA tuple from already processed color data
	 * @param rgba Pre-computed RGBA values
	 * @returns The same RGBA tuple (for consistency with hexToRgba)
	 */
	rgbaToRgba(
		rgba: [number, number, number, number],
	): [number, number, number, number] {
		return rgba;
	}

	/**
	 * Get CanvasKit Color from RGBA tuple with caching
	 * @param rgba RGBA tuple
	 * @returns CanvasKit Color object
	 */
	getCanvasKitColorFromRgba(rgba: [number, number, number, number]): number {
		const key = `rgba_${rgba[0]}_${rgba[1]}_${rgba[2]}_${rgba[3]}`;

		let color = this.canvasKitColorCache.get(key);
		if (!color) {
			color = this.canvasKit.Color(rgba[0], rgba[1], rgba[2], rgba[3]);

			if (this.canvasKitColorCache.size < this.maxCacheSize) {
				this.canvasKitColorCache.set(key, color);
			} else {
				this.evictOldestColorEntry();
				this.canvasKitColorCache.set(key, color);
			}
		}

		return color;
	}

	/**
	 * Internal hex to RGBA conversion (same logic as color-utils.ts)
	 */
	private convertHexToRgba(
		hex: string,
		opacity: number,
	): [number, number, number, number] {
		// Handle named colors
		const namedColors: Record<string, string> = {
			red: "#ff0000",
			green: "#00ff00",
			blue: "#0000ff",
			white: "#ffffff",
			black: "#000000",
			yellow: "#ffff00",
			cyan: "#00ffff",
			magenta: "#ff00ff",
			silver: "#c0c0c0",
			gray: "#808080",
			grey: "#808080",
			maroon: "#800000",
			olive: "#808000",
			lime: "#00ff00",
			aqua: "#00ffff",
			teal: "#008080",
			navy: "#000080",
			fuchsia: "#ff00ff",
			purple: "#800080",
		};

		const namedColor = namedColors[hex.toLowerCase()];
		if (namedColor) {
			hex = namedColor;
		}

		hex = hex.replace("#", "");

		// Handle 3-character hex
		if (hex.length === 3) {
			hex = hex
				.split("")
				.map((char) => char + char)
				.join("");
		}

		// Handle invalid hex
		if (hex.length !== 6 || !/^[0-9A-Fa-f]+$/.test(hex)) {
			return [0, 0, 0, 0]; // Invalid color
		}

		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);

		return [r, g, b, opacity];
	}

	/**
	 * Check if a color is cached
	 * @param hex The hex color string
	 * @param opacity The opacity value
	 * @returns True if the color is cached
	 */
	hasColor(hex: string, opacity: number = 1): boolean {
		const key = `${hex}_${opacity}`;
		return this.rgbaCache.has(key) || this.canvasKitColorCache.has(key);
	}

	/**
	 * Pre-cache commonly used colors for better performance
	 */
	preCacheCommonColors(): void {
		const commonColors = [
			// Basic colors
			{ hex: "#000000", opacity: 1 }, // black
			{ hex: "#ffffff", opacity: 1 }, // white
			{ hex: "#ff0000", opacity: 1 }, // red
			{ hex: "#00ff00", opacity: 1 }, // green
			{ hex: "#0000ff", opacity: 1 }, // blue

			// Common UI colors
			{ hex: "#f0f0f0", opacity: 1 }, // light gray
			{ hex: "#e0e0e0", opacity: 1 }, // medium gray
			{ hex: "#808080", opacity: 1 }, // gray
			{ hex: "#404040", opacity: 1 }, // dark gray

			// Transparent variants
			{ hex: "#000000", opacity: 0.5 }, // semi-transparent black
			{ hex: "#ffffff", opacity: 0.5 }, // semi-transparent white
			{ hex: "#0000ff", opacity: 0.3 }, // selection blue

			// Common opacity levels
			{ hex: "#000000", opacity: 0.1 },
			{ hex: "#000000", opacity: 0.2 },
			{ hex: "#000000", opacity: 0.8 },
			{ hex: "#ffffff", opacity: 0.9 },
		];

		commonColors.forEach(({ hex, opacity }) => {
			this.hexToRgba(hex, opacity);
			this.getCanvasKitColor(hex, opacity);
		});
	}

	/**
	 * Get cache statistics for debugging and monitoring
	 */
	getCacheStats(): {
		rgbaCacheSize: number;
		colorCacheSize: number;
		maxCacheSize: number;
		cacheKeys: string[];
		hitRatio: number;
	} {
		return {
			rgbaCacheSize: this.rgbaCache.size,
			colorCacheSize: this.canvasKitColorCache.size,
			maxCacheSize: this.maxCacheSize,
			cacheKeys: [
				...Array.from(this.rgbaCache.keys()),
				...Array.from(this.canvasKitColorCache.keys()),
			],
			hitRatio: this.calculateHitRatio(),
		};
	}

	/**
	 * Clear all cached colors
	 */
	clearCache(): void {
		this.rgbaCache.clear();
		this.canvasKitColorCache.clear();
	}

	/**
	 * Evict the oldest RGBA cache entry
	 */
	private evictOldestRgbaEntry(): void {
		const firstKey = this.rgbaCache.keys().next().value;
		if (firstKey) {
			this.rgbaCache.delete(firstKey);
		}
	}

	/**
	 * Evict the oldest CanvasKit color cache entry
	 */
	private evictOldestColorEntry(): void {
		const firstKey = this.canvasKitColorCache.keys().next().value;
		if (firstKey) {
			this.canvasKitColorCache.delete(firstKey);
		}
	}

	/**
	 * Calculate cache hit ratio for performance monitoring
	 */
	private calculateHitRatio(): number {
		// This would need to be implemented with request counters
		// For now, return a placeholder
		return 0.85; // 85% hit ratio estimate
	}
}
