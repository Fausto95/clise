import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { initializeFontCacheAction } from "../store/font-atoms";
import { useElements } from "../store/element-hooks";
import { useFontApplication } from "../hooks/use-font-application";
import { fontCacheCleanup } from "../utils/font-cache-cleanup";
import { fontPreloader } from "../utils/font-preloader";

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
					(element: any) => element.type === "text",
				) as any[];
				if (textElements.length > 0) {
					await restoreFontsForElements(textElements);
				}
			} catch (error) {
				console.warn("Failed to initialize font cache system:", error);
			}
		};

		// Initialize immediately for cache restoration
		initializeFontSystem();

		// Start delayed font preloading after app launch
		const startPreloading = async () => {
			try {
				await fontPreloader.startDelayedPreloading();
			} catch (error) {
				console.warn("Failed to start font preloading:", error);
			}
		};

		// Start preloading after a delay to improve startup performance
		const preloadTimer = setTimeout(startPreloading, 3000); // 3 second delay (increased to let app fully load)

		// Cleanup on unmount
		return () => {
			clearTimeout(preloadTimer);
			fontPreloader.stopPreloading();
			fontCacheCleanup.stopAutomaticCleanup();
		};
	}, [initializeCache, elements, restoreFontsForElements]);

	// This component doesn't render anything
	return null;
};
