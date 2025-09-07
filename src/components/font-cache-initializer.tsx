import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { initializeFontCacheAction } from "../store/font-atoms";
import { useElements } from "../store/element-hooks";
import { useFontApplication } from "../hooks/use-font-application";
import { fontCacheCleanup } from "../utils/font-cache-cleanup";
import { fontPreloader } from "../utils/font-preloader";
import type { Element, TextElement } from "../store/atoms";

/**
 * Component that initializes the font cache system on app startup
 * and restores fonts for existing text elements
 */
export const FontCacheInitializer = () => {
	const initializeCache = useSetAtom(initializeFontCacheAction);
	const elements = useElements();
	const { restoreFontsForElements } = useFontApplication();

	useEffect(() => {
		const initializeFontSystem = async () => {
			try {
				// Initialize the font cache system
				await initializeCache();

				// Start automatic cleanup
				fontCacheCleanup.startAutomaticCleanup();

				// Restore fonts for existing text elements
				const textElements = elements.filter(
					(element: Element) => element.type === "text",
				) as TextElement[];
				if (textElements.length > 0) {
					await restoreFontsForElements(textElements);
				}
			} catch (error) {
				console.warn("Failed to initialize font cache system:", error);
			}
		};

		// Initialize immediately for cache restoration
		initializeFontSystem();

		// Cleanup on unmount
		return () => {
			// clearTimeout(preloadTimer); // Disabled automatic preloading
			fontPreloader.stopPreloading();
			fontCacheCleanup.stopAutomaticCleanup();
		};
	}, [initializeCache, elements, restoreFontsForElements]);

	// This component doesn't render anything
	return null;
};
