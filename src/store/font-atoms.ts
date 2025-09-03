import { atom } from "jotai";
import type { FontConfig, FontLoadingState } from "../utils/font-manager";
import { fontManager, DEFAULT_FONT, GOOGLE_FONTS } from "../utils/font-manager";
import { fontCacheManager } from "../utils/font-cache-manager";

// Available fonts atom
export const availableFontsAtom = atom<FontConfig[]>(() => {
	return [DEFAULT_FONT, ...GOOGLE_FONTS];
});

// Font loading states atom
export const fontLoadingStatesAtom = atom<Map<string, FontLoadingState>>(
	new Map(),
);

// Currently loading fonts atom
export const loadingFontsAtom = atom<Set<string>>(new Set<string>());

// Custom uploaded fonts atom
export const customFontsAtom = atom<FontConfig[]>([]);

// All fonts (system + google + custom) derived atom
export const allFontsAtom = atom((get) => {
	const available = get(availableFontsAtom);
	const custom = get(customFontsAtom);
	return [...available, ...custom];
});

// Font search query atom
export const fontSearchQueryAtom = atom<string>("");

// Filtered fonts based on search query
export const filteredFontsAtom = atom((get) => {
	const allFonts = get(allFontsAtom);
	const searchQuery = get(fontSearchQueryAtom);

	if (!searchQuery.trim()) {
		return allFonts;
	}

	const query = searchQuery.toLowerCase();
	return allFonts.filter(
		(font) =>
			font.name.toLowerCase().includes(query) ||
			font.family.toLowerCase().includes(query),
	);
});

// Font preview text atom
export const fontPreviewTextAtom = atom<string>(
	"The quick brown fox jumps over the lazy dog",
);

// Font loading actions
export const loadFontAction = atom(
	null,
	async (
		get,
		set,
		{ fontConfig, elementId }: { fontConfig: FontConfig; elementId?: string },
	) => {
		if (!fontConfig.isWebFont && !fontConfig.isGoogleFont) {
			return; // System fonts don't need loading
		}

		const loadingFonts = get(loadingFontsAtom);
		const fontLoadingStates = get(fontLoadingStatesAtom);

		// Check if already loading or loaded
		if (loadingFonts.has(fontConfig.family)) {
			return;
		}

		const currentState = fontLoadingStates.get(fontConfig.family);
		if (currentState === "loaded") {
			return;
		}

		// Mark as loading
		const newLoadingFonts = new Set(loadingFonts);
		newLoadingFonts.add(fontConfig.family);
		set(loadingFontsAtom, newLoadingFonts);

		// Set loading state
		fontManager.setFontLoadingState(fontConfig.family, "loading");

		try {
			if (elementId) {
				await fontManager.loadFontForElement(fontConfig, elementId);
			} else {
				await fontManager.loadWebFont(fontConfig);
			}

			// Set loaded state
			fontManager.setFontLoadingState(fontConfig.family, "loaded");
		} catch {
			// Set error state
			fontManager.setFontLoadingState(fontConfig.family, "error");
		} finally {
			// Remove from loading set
			const updatedLoadingFonts = new Set(get(loadingFontsAtom));
			updatedLoadingFonts.delete(fontConfig.family);
			set(loadingFontsAtom, updatedLoadingFonts);
		}
	},
);

// Upload custom font action
export const uploadCustomFontAction = atom(
	null,
	async (get, set, { file, elementId }: { file: File; elementId?: string }) => {
		try {
			const customFont = await fontManager.uploadCustomFont(file, elementId);

			const currentCustomFonts = get(customFontsAtom);
			const updatedCustomFonts = [...currentCustomFonts, customFont];
			set(customFontsAtom, updatedCustomFonts);

			return customFont;
		} catch (error) {
			throw new Error(
				`Failed to upload font: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
			);
		}
	},
);

// Preload popular fonts action
export const preloadPopularFontsAction = atom(null, async (_get, set) => {
	const popularFonts = GOOGLE_FONTS.slice(0, 5); // First 5 popular fonts

	const loadPromises = popularFonts.map(async (font) => {
		try {
			await set(loadFontAction, { fontConfig: font });
		} catch (error) {
			console.warn(`Failed to preload font ${font.name}:`, error);
		}
	});

	await Promise.allSettled(loadPromises);
});

// Get font loading state
export const getFontLoadingStateAtom = atom(() => {
	return (fontFamily: string): FontLoadingState => {
		const state = fontManager.getFontLoadingState(fontFamily);
		return state;
	};
});

// Check if font is loaded
export const isFontLoadedAtom = atom(() => {
	return (fontFamily: string) => {
		const state = fontManager.getFontLoadingState(fontFamily);
		return state === "loaded";
	};
});

// Check if font is available
export const isFontAvailableAtom = atom(() => {
	return (fontFamily: string): boolean => {
		return fontManager.isFontAvailable(fontFamily);
	};
});

// Font cache atoms
export const fontCacheInitializedAtom = atom<boolean>(false);

// Element-to-font mapping atom
export const elementFontMappingAtom = atom<Map<string, string>>(new Map());

// Cached fonts atom
export const cachedFontsAtom = atom<string[]>([]);

// Font cache actions
export const initializeFontCacheAction = atom(null, async (_get, set) => {
	try {
		await fontCacheManager.initialize();
		set(fontCacheInitializedAtom, true);

		// Load element font mapping
		const elementFontMapping = fontCacheManager.getFontsForElements();
		set(elementFontMappingAtom, elementFontMapping);

		// Load cached font families
		const cachedFontFamilies = fontCacheManager.getCachedFontFamilies();
		set(cachedFontsAtom, cachedFontFamilies);
	} catch (error) {
		console.warn("Failed to initialize font cache:", error);
	}
});

// Cache font action
export const cacheFontAction = atom(
	null,
	async (
		_get,
		set,
		{
			fontConfig,
			fontData,
			elementId,
		}: { fontConfig: FontConfig; fontData: ArrayBuffer; elementId?: string },
	) => {
		try {
			await fontCacheManager.cacheFont(fontConfig, fontData, elementId);

			// Update cached fonts list
			const cachedFontFamilies = fontCacheManager.getCachedFontFamilies();
			set(cachedFontsAtom, cachedFontFamilies);

			// Update element font mapping if elementId provided
			if (elementId) {
				const elementFontMapping = fontCacheManager.getFontsForElements();
				set(elementFontMappingAtom, elementFontMapping);
			}
		} catch (error) {
			console.warn("Failed to cache font:", error);
		}
	},
);

// Get cached font action
export const getCachedFontAction = atom(
	null,
	async (_get, _set, fontFamily: string): Promise<ArrayBuffer | null> => {
		try {
			return await fontCacheManager.getCachedFont(fontFamily);
		} catch (error) {
			console.warn("Failed to get cached font:", error);
			return null;
		}
	},
);

// Associate element with font action
export const associateElementWithFontAction = atom(
	null,
	async (
		_get,
		set,
		{ elementId, fontFamily }: { elementId: string; fontFamily: string },
	) => {
		try {
			await fontCacheManager.associateElementWithFont(elementId, fontFamily);

			// Update element font mapping
			const elementFontMapping = fontCacheManager.getFontsForElements();
			set(elementFontMappingAtom, elementFontMapping);
		} catch (error) {
			console.warn("Failed to associate element with font:", error);
		}
	},
);

// Remove element font association action
export const removeElementFontAssociationAction = atom(
	null,
	async (_get, set, elementId: string) => {
		try {
			await fontCacheManager.removeElementFontAssociation(elementId);

			// Update element font mapping
			const elementFontMapping = fontCacheManager.getFontsForElements();
			set(elementFontMappingAtom, elementFontMapping);
		} catch (error) {
			console.warn("Failed to remove element font association:", error);
		}
	},
);

// Get element font family action
export const getElementFontFamilyAction = atom(() => {
	return (elementId: string): string | null => {
		return fontCacheManager.getElementFontFamily(elementId);
	};
});

// Check if font is cached action
export const isFontCachedAction = atom(() => {
	return (fontFamily: string): boolean => {
		return fontCacheManager.isFontCached(fontFamily);
	};
});

// Clear font cache action
export const clearFontCacheAction = atom(null, async (_get, set) => {
	try {
		await fontCacheManager.clearCache();
		set(elementFontMappingAtom, new Map());
		set(cachedFontsAtom, []);
	} catch (error) {
		console.warn("Failed to clear font cache:", error);
	}
});

// Get font cache stats action
export const getFontCacheStatsAction = atom(() => {
	return () => {
		return fontCacheManager.getCacheStats();
	};
});
