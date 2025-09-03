import { useSetAtom } from "jotai";
import { useCallback } from "react";
import {
	loadFontAction,
	associateElementWithFontAction,
	removeElementFontAssociationAction,
} from "../store/font-atoms";
import { useElementOperations } from "../store/element-hooks";
import { useFontConfig } from "../store/font-hooks";
import type { TextElement } from "../store/elements/element-types";

/**
 * Hook for managing font application to text elements with caching
 */
export const useFontApplication = () => {
	const loadFont = useSetAtom(loadFontAction);
	const associateElementWithFont = useSetAtom(associateElementWithFontAction);
	const removeElementFontAssociation = useSetAtom(
		removeElementFontAssociationAction,
	);
	const { updateElement } = useElementOperations();

	// Apply font to a text element
	const applyFontToElement = useCallback(
		async (
			elementId: string,
			fontFamily: string,
			element?: TextElement,
		): Promise<void> => {
			try {
				// Get font configuration
				const fontConfig = useFontConfig(fontFamily);
				if (!fontConfig) {
					console.warn(`Font configuration not found for: ${fontFamily}`);
					return;
				}

				// Load the font if it's a web font
				if (fontConfig.isWebFont || fontConfig.isGoogleFont) {
					await loadFont({ fontConfig, elementId });
				}

				// Associate element with font for caching
				await associateElementWithFont({ elementId, fontFamily });

				// Update the element's font family if element is provided
				if (element) {
					updateElement({ id: elementId, patch: { fontFamily } });
				}
			} catch (error) {
				console.error("Failed to apply font to element:", error);
			}
		},
		[loadFont, associateElementWithFont, updateElement],
	);

	// Remove font association from element
	const removeFontFromElement = useCallback(
		async (elementId: string): Promise<void> => {
			try {
				await removeElementFontAssociation(elementId);
			} catch (error) {
				console.error("Failed to remove font association from element:", error);
			}
		},
		[removeElementFontAssociation],
	);

	// Apply font to multiple elements
	const applyFontToElements = useCallback(
		async (
			elementIds: string[],
			fontFamily: string,
			elements?: TextElement[],
		): Promise<void> => {
			const promises = elementIds.map((elementId, index) => {
				const element = elements?.[index];
				return applyFontToElement(elementId, fontFamily, element);
			});

			await Promise.allSettled(promises);
		},
		[applyFontToElement],
	);

	// Preload fonts for elements
	const preloadFontsForElements = useCallback(
		async (elements: TextElement[]): Promise<void> => {
			const fontFamilies = new Set<string>();

			// Collect unique font families from elements
			elements.forEach((element) => {
				if (element.type === "text" && element.fontFamily) {
					fontFamilies.add(element.fontFamily);
				}
			});

			// Load each unique font
			const promises = Array.from(fontFamilies).map(async (fontFamily) => {
				const fontConfig = useFontConfig(fontFamily);
				if (fontConfig && (fontConfig.isWebFont || fontConfig.isGoogleFont)) {
					try {
						await loadFont({ fontConfig });
					} catch (error) {
						console.warn(`Failed to preload font ${fontFamily}:`, error);
					}
				}
			});

			await Promise.allSettled(promises);
		},
		[loadFont],
	);

	// Restore fonts for elements on page load
	const restoreFontsForElements = useCallback(
		async (elements: TextElement[]): Promise<void> => {
			const textElements = elements.filter(
				(element): element is TextElement => element.type === "text",
			);

			if (textElements.length === 0) {
				return;
			}

			// Preload fonts for all text elements
			await preloadFontsForElements(textElements);

			// Associate each element with its font
			const associationPromises = textElements.map(async (element) => {
				if (element.fontFamily) {
					try {
						await associateElementWithFont({
							elementId: element.id,
							fontFamily: element.fontFamily,
						});
					} catch (error) {
						console.warn(
							`Failed to associate element ${element.id} with font ${element.fontFamily}:`,
							error,
						);
					}
				}
			});

			await Promise.allSettled(associationPromises);
		},
		[preloadFontsForElements, associateElementWithFont],
	);

	return {
		applyFontToElement,
		removeFontFromElement,
		applyFontToElements,
		preloadFontsForElements,
		restoreFontsForElements,
	};
};
