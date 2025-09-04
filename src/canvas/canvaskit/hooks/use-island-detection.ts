import { useEffect, useMemo, useRef } from "react";
import {
	useIslandManagement,
	useIslandDetectionOptions,
} from "@store/island-hooks";
import { useElements } from "@store/element-hooks";
import { IslandDetector } from "../managers/island-detector";
import type { BaseElement } from "@store/elements";

/**
 * Hook to automatically detect islands when elements change
 */
export const useIslandDetection = () => {
	const { isDetecting, detectIslands } = useIslandManagement();
	const [detectionOptions] = useIslandDetectionOptions();
	const elements = useElements();

	// Create island detector instance
	const islandDetector = useMemo(() => new IslandDetector(), []);

	// Track previous elements for incremental detection
	const prevElementsRef = useRef<BaseElement[]>([]);
	const timeoutRef = useRef<number | null>(null);

	// Optimized change detection
	const hasSignificantChange = useMemo(() => {
		const prev = prevElementsRef.current;

		// Quick checks for obvious changes
		if (prev.length !== elements.length) return true;
		if (elements.length === 0) return prev.length > 0;

		// Check if any element has significantly changed position or size
		const threshold = 10; // pixels
		for (let i = 0; i < elements.length; i++) {
			const curr = elements[i];
			if (!curr) continue;
			const prevEl = prev.find((p) => p.id === curr.id);

			if (!prevEl) return true; // New element

			if (
				Math.abs(curr.x - prevEl.x) > threshold ||
				Math.abs(curr.y - prevEl.y) > threshold ||
				Math.abs(curr.w - prevEl.w) > threshold ||
				Math.abs(curr.h - prevEl.h) > threshold
			) {
				return true;
			}
		}

		return false;
	}, [elements]);

	// Detect islands when elements change significantly
	useEffect(() => {
		// Clear existing timeout
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		if (elements.length === 0) {
			detectIslands([]);
			prevElementsRef.current = [];
			return;
		}

		// Only run detection if there are significant changes
		if (!hasSignificantChange) {
			return;
		}

		// Use adaptive debouncing - shorter delay for small datasets
		const adaptiveDelay = Math.min(300, Math.max(50, elements.length * 2));

		timeoutRef.current = setTimeout(() => {
			const detectedIslands = islandDetector.detectIslands(
				elements,
				detectionOptions,
			);
			detectIslands(detectedIslands);
			prevElementsRef.current = [...elements]; // Deep copy for comparison
		}, adaptiveDelay) as unknown as number;

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [
		elements,
		detectionOptions,
		islandDetector,
		detectIslands,
		hasSignificantChange,
	]);

	return {
		isDetecting,
		detectionOptions,
	};
};
