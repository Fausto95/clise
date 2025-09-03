import { useCallback } from "react";
import { useZoomControls, usePan } from "@store/viewport-hooks";
import { useIslandManagement } from "@store/island-hooks";
import type { Island } from "../managers/island-detector";

/**
 * Hook to handle focusing on islands (zoom/pan to island)
 */
export const useIslandFocus = () => {
	const { setZoom } = useZoomControls();
	const { setPan } = usePan();
	const { focusOnIsland } = useIslandManagement();

	const focusOnIslandBounds = useCallback(
		(island: Island, padding: number = 100) => {
			// Calculate the zoom level needed to fit the island with padding
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			// Add padding to island bounds
			const paddedWidth = island.bounds.width + padding * 2;
			const paddedHeight = island.bounds.height + padding * 2;

			// Calculate zoom to fit the island in the viewport
			const zoomX = viewportWidth / paddedWidth;
			const zoomY = viewportHeight / paddedHeight;
			const targetZoom = Math.min(zoomX, zoomY, 2); // Cap at 2x zoom

			// Calculate pan to center the island
			const targetPanX = viewportWidth / 2 - island.center.x * targetZoom;
			const targetPanY = viewportHeight / 2 - island.center.y * targetZoom;

			// Apply the transformations
			setZoom(targetZoom);
			setPan(targetPanX, targetPanY);

			// Trigger the focus animation
			focusOnIsland(island.id);
		},
		[setZoom, setPan, focusOnIsland],
	);

	const focusOnIslandWithAnimation = useCallback(
		(island: Island) => {
			// This would implement smooth animation to the island
			// For now, we'll just focus immediately
			focusOnIslandBounds(island);
		},
		[focusOnIslandBounds],
	);

	return {
		focusOnIslandBounds,
		focusOnIslandWithAnimation,
	};
};

/**
 * Hook to handle island selection and navigation
 */
export const useIslandSelection = () => {
	const { islands, selectedIsland, focusOnIsland } = useIslandManagement();
	const { focusOnIslandBounds } = useIslandFocus();

	const selectIsland = useCallback(
		(islandId: string) => {
			const island = islands.find((i) => i.id === islandId);
			if (island) {
				focusOnIsland(islandId);
				focusOnIslandBounds(island);
			}
		},
		[islands, focusOnIsland, focusOnIslandBounds],
	);

	const selectNextIsland = useCallback(() => {
		if (islands.length === 0) return;

		const currentIndex = selectedIsland
			? islands.findIndex((i) => i.id === selectedIsland.id)
			: -1;

		const nextIndex = (currentIndex + 1) % islands.length;
		const nextIsland = islands[nextIndex];
		if (nextIsland) {
			selectIsland(nextIsland.id);
		}
	}, [islands, selectedIsland, selectIsland]);

	const selectPreviousIsland = useCallback(() => {
		if (islands.length === 0) return;

		const currentIndex = selectedIsland
			? islands.findIndex((i) => i.id === selectedIsland.id)
			: -1;

		const prevIndex = currentIndex <= 0 ? islands.length - 1 : currentIndex - 1;
		const prevIsland = islands[prevIndex];
		if (prevIsland) {
			selectIsland(prevIsland.id);
		}
	}, [islands, selectedIsland, selectIsland]);

	return {
		selectIsland,
		selectNextIsland,
		selectPreviousIsland,
		selectedIsland,
		hasIslands: islands.length > 0,
	};
};
