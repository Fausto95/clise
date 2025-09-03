import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
	allFontsAtom,
	filteredFontsAtom,
	fontSearchQueryAtom,
	fontPreviewTextAtom,
	loadFontAction,
	uploadCustomFontAction,
	preloadPopularFontsAction,
	getFontLoadingStateAtom,
	isFontAvailableAtom,
	customFontsAtom,
	fontLoadingStatesAtom,
	fontCacheInitializedAtom,
	elementFontMappingAtom,
	cachedFontsAtom,
	initializeFontCacheAction,
	cacheFontAction,
	getCachedFontAction,
	associateElementWithFontAction,
	removeElementFontAssociationAction,
	getElementFontFamilyAction,
	isFontCachedAction,
	clearFontCacheAction,
	getFontCacheStatsAction,
} from "./font-atoms";
import type { FontConfig } from "../utils/font-manager";

// Hook to get all available fonts
export const useAllFonts = () => {
	return useAtomValue(allFontsAtom);
};

// Hook to get filtered fonts based on search
export const useFilteredFonts = () => {
	return useAtomValue(filteredFontsAtom);
};

// Hook to manage font search
export const useFontSearch = () => {
	const [searchQuery, setSearchQuery] = useAtom(fontSearchQueryAtom);
	const filteredFonts = useFilteredFonts();

	return {
		searchQuery,
		setSearchQuery,
		filteredFonts,
	};
};

// Hook to manage font preview text
export const useFontPreview = () => {
	return useAtom(fontPreviewTextAtom);
};

// Hook to load fonts
export const useFontLoader = () => {
	const loadFont = useSetAtom(loadFontAction);
	const preloadPopularFonts = useSetAtom(preloadPopularFontsAction);
	const getFontLoadingState = useAtomValue(getFontLoadingStateAtom);
	const isFontAvailable = useAtomValue(isFontAvailableAtom);

	return {
		loadFont,
		preloadPopularFonts,
		getFontLoadingState,
		isFontAvailable,
	};
};

// Hook to upload custom fonts
export const useCustomFonts = () => {
	const customFonts = useAtomValue(customFontsAtom);
	const uploadCustomFont = useSetAtom(uploadCustomFontAction);

	return {
		customFonts,
		uploadCustomFont,
	};
};

// Hook to get font loading states
export const useFontLoadingStates = () => {
	return useAtomValue(fontLoadingStatesAtom);
};

// Hook to get loading state for a specific font
export const useFontLoadingState = (fontFamily: string) => {
	const getFontLoadingState = useAtomValue(getFontLoadingStateAtom);
	return getFontLoadingState(fontFamily);
};

// Hook to check if a font is available
export const useIsFontAvailable = (fontFamily: string) => {
	const isFontAvailable = useAtomValue(isFontAvailableAtom);
	return isFontAvailable(fontFamily);
};

// Hook for font management with all functionality
export const useFontManager = () => {
	const allFonts = useAllFonts();
	const { searchQuery, setSearchQuery, filteredFonts } = useFontSearch();
	const [previewText, setPreviewText] = useFontPreview();
	const {
		loadFont,
		preloadPopularFonts,
		getFontLoadingState,
		isFontAvailable,
	} = useFontLoader();
	const { customFonts, uploadCustomFont } = useCustomFonts();
	const fontLoadingStates = useFontLoadingStates();

	return {
		// Font data
		allFonts,
		filteredFonts,
		customFonts,

		// Search functionality
		searchQuery,
		setSearchQuery,

		// Preview functionality
		previewText,
		setPreviewText,

		// Loading functionality
		loadFont,
		preloadPopularFonts,
		getFontLoadingState,
		isFontAvailable,
		fontLoadingStates,

		// Custom font functionality
		uploadCustomFont,
	};
};

// Hook to get font configuration by family name
export const useFontConfig = (fontFamily: string): FontConfig | undefined => {
	const allFonts = useAllFonts();
	return allFonts.find((font) => font.family === fontFamily);
};

// Hook to get font fallback chain
export const useFontFallback = (fontFamily: string): string => {
	const fontConfig = useFontConfig(fontFamily);
	return fontConfig?.family || "Arial, sans-serif";
};

// Font cache hooks
export const useFontCache = () => {
	const isInitialized = useAtomValue(fontCacheInitializedAtom);
	const elementFontMapping = useAtomValue(elementFontMappingAtom);
	const cachedFonts = useAtomValue(cachedFontsAtom);
	const initializeCache = useSetAtom(initializeFontCacheAction);
	const cacheFont = useSetAtom(cacheFontAction);
	const getCachedFont = useSetAtom(getCachedFontAction);
	const associateElementWithFont = useSetAtom(associateElementWithFontAction);
	const removeElementFontAssociation = useSetAtom(
		removeElementFontAssociationAction,
	);
	const getElementFontFamily = useAtomValue(getElementFontFamilyAction);
	const isFontCached = useAtomValue(isFontCachedAction);
	const clearCache = useSetAtom(clearFontCacheAction);
	const getCacheStats = useAtomValue(getFontCacheStatsAction);

	return {
		isInitialized,
		elementFontMapping,
		cachedFonts,
		initializeCache,
		cacheFont,
		getCachedFont,
		associateElementWithFont,
		removeElementFontAssociation,
		getElementFontFamily,
		isFontCached,
		clearCache,
		getCacheStats,
	};
};

// Hook to get font family for a specific element
export const useElementFontFamily = (elementId: string): string | null => {
	const getElementFontFamily = useAtomValue(getElementFontFamilyAction);
	return getElementFontFamily(elementId);
};

// Hook to check if a font is cached
export const useIsFontCached = (fontFamily: string): boolean => {
	const isFontCached = useAtomValue(isFontCachedAction);
	return isFontCached(fontFamily);
};

// Hook to get cached fonts
export const useCachedFonts = () => {
	return useAtomValue(cachedFontsAtom);
};

// Hook to get element font mapping
export const useElementFontMapping = () => {
	return useAtomValue(elementFontMappingAtom);
};
