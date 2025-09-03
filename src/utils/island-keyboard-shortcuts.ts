import React from "react";
import {
	useIslandSwitcher,
	useIslandNavigation,
	useHasIslands,
	useIslands,
} from "@store/island-hooks";
import { usePan, useZoom } from "@store/viewport-hooks";

/**
 * Hook to handle island-related keyboard shortcuts
 */
export const useIslandKeyboardShortcuts = () => {
	const { isOpen, openSwitcher, closeSwitcher, currentIndex } =
		useIslandSwitcher();
	const { nextIsland, previousIsland } = useIslandNavigation();
	const hasIslands = useHasIslands();
	const islands = useIslands();
	const { setPan, pan } = usePan();
	const [zoom] = useZoom();

	// Travel to island function (based on "Go to element" from context menu)
	const travelToIsland = React.useCallback(
		(island: {
			bounds: { x: number; y: number; width: number; height: number };
		}) => {
			if (!island) return;

			// Determine the visible canvas area to center within
			const container = document.querySelector(
				".canvaskit-container",
			) as HTMLElement | null;
			const centerW = container?.clientWidth ?? window.innerWidth;
			const centerH = container?.clientHeight ?? window.innerHeight;

			// Center the island on screen
			const worldCx = island.bounds.x + island.bounds.width / 2;
			const worldCy = island.bounds.y + island.bounds.height / 2;
			const targetPanX = centerW / 2 - worldCx * zoom;
			const targetPanY = centerH / 2 - worldCy * zoom;

			// Animate pan for a better experience
			const startX = pan.x;
			const startY = pan.y;
			const dx = targetPanX - startX;
			const dy = targetPanY - startY;
			const duration = 300; // ms
			const start = performance.now();

			const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

			const step = (now: number) => {
				const elapsed = now - start;
				const tNorm = Math.min(1, elapsed / duration);
				const e = easeOutCubic(tNorm);
				setPan(startX + dx * e, startY + dy * e);
				if (tNorm < 1) requestAnimationFrame(step);
			};

			requestAnimationFrame(step);
		},
		[setPan, zoom, pan],
	);

	// Handle keyboard events
	const handleKeyDown = React.useCallback(
		(event: KeyboardEvent) => {
			// Cmd+Shift+I - Open island switcher
			if (event.metaKey && event.shiftKey && event.key === "I") {
				event.stopPropagation();
				event.preventDefault();

				if (isOpen[0]) {
					// If switcher is open, cycle through islands (only if we have islands)
					if (hasIslands) {
						nextIsland();
					}
				} else {
					// Always open the island switcher, even if no islands
					openSwitcher();
				}
			}

			// Only handle other shortcuts if we have islands
			if (!hasIslands) return;

			// Option+Left/Right - Navigate between islands directly (when switcher is closed)
			if (event.altKey && !event.metaKey && !isOpen[0]) {
				if (event.key === "ArrowLeft") {
					event.preventDefault();
					previousIsland();
				} else if (event.key === "ArrowRight") {
					event.preventDefault();
					nextIsland();
				}
			}
		},
		[hasIslands, isOpen, openSwitcher, previousIsland, nextIsland],
	);

	// Handle keyup events - travel to selected island and close switcher
	const handleKeyUp = React.useCallback(
		(event: KeyboardEvent) => {
			// Only handle if we have islands and switcher is open
			if (!hasIslands || !isOpen[0]) return;

			// When Cmd+Shift is released, travel to selected island and close switcher
			if (event.key === "Meta" || event.key === "Shift") {
				if (islands.length > 0) {
					const selectedIsland = islands[currentIndex[0]];
					if (selectedIsland) {
						travelToIsland(selectedIsland);
					}
					closeSwitcher();
				}
			}
		},
		[hasIslands, isOpen, islands, currentIndex, travelToIsland, closeSwitcher],
	);

	// Setup keyboard event listeners
	React.useEffect(() => {
		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("keyup", handleKeyUp);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("keyup", handleKeyUp);
		};
	}, [handleKeyDown, handleKeyUp]);

	return {
		handleKeyDown,
		hasIslands,
		isOpen,
	};
};
