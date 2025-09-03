import type { FontConfig } from "./font-manager";

// Font cache entry interface
export interface FontCacheEntry {
	fontConfig: FontConfig;
	fontData: ArrayBuffer;
	cachedAt: number;
	lastUsed: number;
	usageCount: number;
	elementIds: Set<string>; // Track which elements use this font
}

// Font cache metadata
export interface FontCacheMetadata {
	version: string;
	lastCleanup: number;
	totalSize: number;
	maxSize: number; // Maximum cache size in bytes
	maxAge: number; // Maximum age in milliseconds (30 days default)
}

// Cache statistics
export interface FontCacheStats {
	totalFonts: number;
	totalSize: number;
	oldestFont: string | null;
	mostUsedFont: string | null;
	cacheHitRate: number;
}

class FontCacheManager {
	private static readonly CACHE_VERSION = "1.0.0";
	// private static readonly CACHE_KEY_PREFIX = "font_cache_";
	private static readonly METADATA_KEY = "font_cache_metadata";
	private static readonly ELEMENT_FONT_MAPPING_KEY = "element_font_mapping";
	private static readonly DEFAULT_MAX_SIZE = 25 * 1024 * 1024; // 25MB (reduced for better performance)
	private static readonly DEFAULT_MAX_AGE = 14 * 24 * 60 * 60 * 1000; // 14 days (reduced for better cache turnover)
	private static readonly CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days

	private cache: Map<string, FontCacheEntry> = new Map();
	private metadata: FontCacheMetadata;
	private elementFontMapping: Map<string, string> = new Map(); // elementId -> fontFamily
	private isInitialized = false;

	constructor() {
		this.metadata = {
			version: FontCacheManager.CACHE_VERSION,
			lastCleanup: Date.now(),
			totalSize: 0,
			maxSize: FontCacheManager.DEFAULT_MAX_SIZE,
			maxAge: FontCacheManager.DEFAULT_MAX_AGE,
		};
	}

	// Initialize the cache manager
	async initialize(): Promise<void> {
		if (this.isInitialized) return;

		try {
			await this.loadMetadata();
			await this.loadElementFontMapping();
			await this.loadCachedFonts();
			await this.performCleanupIfNeeded();
			this.isInitialized = true;
		} catch (error) {
			console.warn("Failed to initialize font cache:", error);
			// Continue without cache
		}
	}

	// Load metadata from localStorage
	private async loadMetadata(): Promise<void> {
		try {
			const stored = localStorage.getItem(FontCacheManager.METADATA_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				this.metadata = { ...this.metadata, ...parsed };
			}
		} catch (error) {
			console.warn("Failed to load font cache metadata:", error);
		}
	}

	// Save metadata to localStorage
	private async saveMetadata(): Promise<void> {
		try {
			localStorage.setItem(
				FontCacheManager.METADATA_KEY,
				JSON.stringify(this.metadata),
			);
		} catch (error) {
			console.warn("Failed to save font cache metadata:", error);
		}
	}

	// Load element-to-font mapping from localStorage
	private async loadElementFontMapping(): Promise<void> {
		try {
			const stored = localStorage.getItem(
				FontCacheManager.ELEMENT_FONT_MAPPING_KEY,
			);
			if (stored) {
				const mapping = JSON.parse(stored);
				this.elementFontMapping = new Map(Object.entries(mapping));
			}
		} catch (error) {
			console.warn("Failed to load element font mapping:", error);
		}
	}

	// Save element-to-font mapping to localStorage
	private async saveElementFontMapping(): Promise<void> {
		try {
			const mapping = Object.fromEntries(this.elementFontMapping);
			localStorage.setItem(
				FontCacheManager.ELEMENT_FONT_MAPPING_KEY,
				JSON.stringify(mapping),
			);
		} catch (error) {
			console.warn("Failed to save element font mapping:", error);
		}
	}

	// Load cached fonts from IndexedDB
	private async loadCachedFonts(): Promise<void> {
		try {
			const db = await this.openIndexedDB();
			const transaction = db.transaction(["fonts"], "readonly");
			const store = transaction.objectStore("fonts");
			const request = store.getAll();

			return new Promise<void>((resolve, reject) => {
				request.onsuccess = () => {
					const entries = request.result;
					for (const entry of entries) {
						this.cache.set(entry.fontFamily, entry);
					}
					resolve();
				};
				request.onerror = () => reject(request.error);
			});
		} catch (error) {
			console.warn("Failed to load cached fonts:", error);
		}
	}

	// Open IndexedDB database
	private async openIndexedDB(): Promise<IDBDatabase> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open("FontCache", 1);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;

				if (!db.objectStoreNames.contains("fonts")) {
					const store = db.createObjectStore("fonts", {
						keyPath: "fontFamily",
					});
					store.createIndex("cachedAt", "cachedAt", { unique: false });
					store.createIndex("lastUsed", "lastUsed", { unique: false });
				}
			};
		});
	}

	// Cache a font
	async cacheFont(
		fontConfig: FontConfig,
		fontData: ArrayBuffer,
		elementId?: string,
	): Promise<void> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		const fontFamily = fontConfig.family;
		const now = Date.now();

		// Check if font is already cached
		const existingEntry = this.cache.get(fontFamily);
		if (existingEntry) {
			// Update existing entry
			existingEntry.lastUsed = now;
			existingEntry.usageCount++;
			if (elementId) {
				existingEntry.elementIds.add(elementId);
				this.elementFontMapping.set(elementId, fontFamily);
			}
		} else {
			// Create new entry
			const entry: FontCacheEntry = {
				fontConfig,
				fontData: fontData.slice(), // Create a copy
				cachedAt: now,
				lastUsed: now,
				usageCount: 1,
				elementIds: elementId ? new Set([elementId]) : new Set(),
			};

			this.cache.set(fontFamily, entry);
			this.metadata.totalSize += fontData.byteLength;

			if (elementId) {
				this.elementFontMapping.set(elementId, fontFamily);
			}
		}

		// Save to IndexedDB
		await this.saveFontToIndexedDB(fontFamily, this.cache.get(fontFamily)!);
		await this.saveElementFontMapping();
		await this.saveMetadata();

		// Check if we need to cleanup
		if (this.metadata.totalSize > this.metadata.maxSize) {
			await this.performCleanup();
		}
	}

	// Save font to IndexedDB
	private async saveFontToIndexedDB(
		_fontFamily: string,
		entry: FontCacheEntry,
	): Promise<void> {
		try {
			const db = await this.openIndexedDB();
			const transaction = db.transaction(["fonts"], "readwrite");
			const store = transaction.objectStore("fonts");

			// Convert Set to Array for serialization
			const serializableEntry = {
				...entry,
				elementIds: Array.from(entry.elementIds),
			};

			store.put(serializableEntry);
		} catch (error) {
			console.warn("Failed to save font to IndexedDB:", error);
		}
	}

	// Get cached font
	async getCachedFont(fontFamily: string): Promise<ArrayBuffer | null> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		const entry = this.cache.get(fontFamily);
		if (!entry) {
			return null;
		}

		// Check if font has expired
		const now = Date.now();
		if (now - entry.cachedAt > this.metadata.maxAge) {
			await this.removeFont(fontFamily);
			return null;
		}

		// Update usage statistics
		entry.lastUsed = now;
		entry.usageCount++;
		await this.saveFontToIndexedDB(fontFamily, entry);

		return entry.fontData;
	}

	// Get font config for a cached font
	getCachedFontConfig(fontFamily: string): FontConfig | null {
		const entry = this.cache.get(fontFamily);
		return entry ? entry.fontConfig : null;
	}

	// Associate an element with a font
	async associateElementWithFont(
		elementId: string,
		fontFamily: string,
	): Promise<void> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		this.elementFontMapping.set(elementId, fontFamily);

		const entry = this.cache.get(fontFamily);
		if (entry) {
			entry.elementIds.add(elementId);
			entry.lastUsed = Date.now();
			await this.saveFontToIndexedDB(fontFamily, entry);
		}

		await this.saveElementFontMapping();
	}

	// Remove association between element and font
	async removeElementFontAssociation(elementId: string): Promise<void> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		const fontFamily = this.elementFontMapping.get(elementId);
		if (fontFamily) {
			const entry = this.cache.get(fontFamily);
			if (entry) {
				entry.elementIds.delete(elementId);
				// If no elements use this font, mark it for potential cleanup
				if (entry.elementIds.size === 0) {
					entry.lastUsed = Date.now() - this.metadata.maxAge; // Mark as old
				}
				await this.saveFontToIndexedDB(fontFamily, entry);
			}
			this.elementFontMapping.delete(elementId);
			await this.saveElementFontMapping();
		}
	}

	// Get font family for an element
	getElementFontFamily(elementId: string): string | null {
		return this.elementFontMapping.get(elementId) || null;
	}

	// Get all fonts used by elements
	getFontsForElements(): Map<string, string> {
		return new Map(this.elementFontMapping);
	}

	// Remove a font from cache
	async removeFont(fontFamily: string): Promise<void> {
		const entry = this.cache.get(fontFamily);
		if (entry) {
			this.metadata.totalSize -= entry.fontData.byteLength;
			this.cache.delete(fontFamily);

			// Remove from IndexedDB
			try {
				const db = await this.openIndexedDB();
				const transaction = db.transaction(["fonts"], "readwrite");
				const store = transaction.objectStore("fonts");
				store.delete(fontFamily);
			} catch (error) {
				console.warn("Failed to remove font from IndexedDB:", error);
			}

			// Remove element associations
			for (const elementId of entry.elementIds) {
				this.elementFontMapping.delete(elementId);
			}
			await this.saveElementFontMapping();
			await this.saveMetadata();
		}
	}

	// Perform cleanup of old/unused fonts
	async performCleanup(): Promise<void> {
		const now = Date.now();
		const fontsToRemove: string[] = [];

		// Find fonts to remove
		for (const [fontFamily, entry] of this.cache) {
			const isExpired = now - entry.cachedAt > this.metadata.maxAge;
			const isUnused =
				entry.elementIds.size === 0 &&
				now - entry.lastUsed > this.metadata.maxAge / 2;
			const isLowUsage =
				entry.usageCount < 2 && now - entry.lastUsed > this.metadata.maxAge / 4;

			if (isExpired || isUnused || isLowUsage) {
				fontsToRemove.push(fontFamily);
			}
		}

		// Remove fonts
		for (const fontFamily of fontsToRemove) {
			await this.removeFont(fontFamily);
		}

		this.metadata.lastCleanup = now;
		await this.saveMetadata();

		console.log(`Font cache cleanup: removed ${fontsToRemove.length} fonts`);
	}

	// Check if cleanup is needed
	private async performCleanupIfNeeded(): Promise<void> {
		const now = Date.now();
		const timeSinceLastCleanup = now - this.metadata.lastCleanup;

		if (timeSinceLastCleanup > FontCacheManager.CLEANUP_INTERVAL) {
			await this.performCleanup();
		}
	}

	// Get cache statistics
	getCacheStats(): FontCacheStats {
		let totalSize = 0;
		let oldestFont: string | null = null;
		let mostUsedFont: string | null = null;
		let oldestTime = Infinity;
		let maxUsage = 0;

		for (const [fontFamily, entry] of this.cache) {
			totalSize += entry.fontData.byteLength;

			if (entry.cachedAt < oldestTime) {
				oldestTime = entry.cachedAt;
				oldestFont = fontFamily;
			}

			if (entry.usageCount > maxUsage) {
				maxUsage = entry.usageCount;
				mostUsedFont = fontFamily;
			}
		}

		return {
			totalFonts: this.cache.size,
			totalSize,
			oldestFont,
			mostUsedFont,
			cacheHitRate: 0, // Would need to track hits/misses to calculate this
		};
	}

	// Clear all cached fonts
	async clearCache(): Promise<void> {
		this.cache.clear();
		this.elementFontMapping.clear();
		this.metadata.totalSize = 0;

		try {
			const db = await this.openIndexedDB();
			const transaction = db.transaction(["fonts"], "readwrite");
			const store = transaction.objectStore("fonts");
			store.clear();
		} catch (error) {
			console.warn("Failed to clear IndexedDB cache:", error);
		}

		await this.saveElementFontMapping();
		await this.saveMetadata();
	}

	// Check if a font is cached
	isFontCached(fontFamily: string): boolean {
		return this.cache.has(fontFamily);
	}

	// Get all cached font families
	getCachedFontFamilies(): string[] {
		return Array.from(this.cache.keys());
	}

	// Update cache settings
	async updateCacheSettings(maxSize?: number, maxAge?: number): Promise<void> {
		if (maxSize !== undefined) {
			this.metadata.maxSize = maxSize;
		}
		if (maxAge !== undefined) {
			this.metadata.maxAge = maxAge;
		}
		await this.saveMetadata();
	}
}

// Export singleton instance
export const fontCacheManager = new FontCacheManager();
export default fontCacheManager;
