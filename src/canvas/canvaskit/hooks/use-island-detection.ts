import { useEffect, useMemo } from "react";
import {
	useIslandManagement,
	useIslandDetectionOptions,
} from "@store/island-hooks";
import { useElements } from "@store/element-hooks";
import { IslandDetector } from "../managers/island-detector";

/**
 * Hook to automatically detect islands when elements change
 */
export const useIslandDetection = () => {
	const { isDetecting, detectIslands } = useIslandManagement();
	const [detectionOptions] = useIslandDetectionOptions();
	const elements = useElements();

	// Create island detector instance
	const islandDetector = useMemo(() => new IslandDetector(), []);

	// Detect islands when elements change
	useEffect(() => {
		if (elements.length === 0) {
			detectIslands([]);
			return;
		}

		// Debounce island detection to avoid excessive computation
		const timeoutId = setTimeout(() => {
			const detectedIslands = islandDetector.detectIslands(
				elements,
				detectionOptions,
			);
			detectIslands(detectedIslands);
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [elements, detectionOptions, islandDetector, detectIslands]);

	return {
		isDetecting,
		detectionOptions,
	};
};
