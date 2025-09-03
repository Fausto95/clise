import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { Island } from "../canvas/canvaskit/managers/island-detector";
import { panAtom, zoomAtom } from "./viewport-atoms";

// Island detection state
export const islandsAtom = atom<Island[]>([]);
export const isDetectingIslandsAtom = atom<boolean>(false);
export const islandDetectionOptionsAtom = atom({
	clusterThreshold: 200,
	minElements: 1,
	maxConnectionDistance: 300,
});

// Island selection and navigation
export const selectedIslandIdAtom = atom<string | null>(null);
export const isIslandSwitcherOpenAtom = atom<boolean>(false);
export const islandSwitcherIndexAtom = atom<number>(0);

// Island preview generation
export const islandPreviewsAtom = atomFamily((_islandId: string) =>
	atom<string | null>(null),
);

// Island focus and navigation
export const focusedIslandIdAtom = atom<string | null>(null);
export const islandFocusAnimationAtom = atom<boolean>(false);

// Derived atoms
export const selectedIslandAtom = atom((get) => {
	const islands = get(islandsAtom);
	const selectedId = get(selectedIslandIdAtom);
	return islands.find((island) => island.id === selectedId) || null;
});

export const islandCountAtom = atom((get) => {
	return get(islandsAtom).length;
});

export const hasIslandsAtom = atom((get) => {
	return get(islandCountAtom) > 0;
});

export const currentIslandIndexAtom = atom((get) => {
	const islands = get(islandsAtom);
	const selectedId = get(selectedIslandIdAtom);
	if (!selectedId) return -1;
	return islands.findIndex((island) => island.id === selectedId);
});

// Island switcher navigation
export const nextIslandAtom = atom(null, (get, set) => {
	const islands = get(islandsAtom);
	const currentIndex = get(currentIslandIndexAtom);

	if (islands.length === 0) return;

	const nextIndex = (currentIndex + 1) % islands.length;
	const nextIsland = islands[nextIndex];
	if (nextIsland) {
		set(selectedIslandIdAtom, nextIsland.id);
		set(islandSwitcherIndexAtom, nextIndex);
	}
});

export const previousIslandAtom = atom(null, (get, set) => {
	const islands = get(islandsAtom);
	const currentIndex = get(currentIslandIndexAtom);

	if (islands.length === 0) return;

	const prevIndex = currentIndex <= 0 ? islands.length - 1 : currentIndex - 1;
	const prevIsland = islands[prevIndex];
	if (prevIsland) {
		set(selectedIslandIdAtom, prevIsland.id);
		set(islandSwitcherIndexAtom, prevIndex);
	}
});

// Island operations
export const detectIslandsAtom = atom(null, (_get, set, islands: Island[]) => {
	set(isDetectingIslandsAtom, true);

	// Update islands with the detected results
	set(islandsAtom, islands);
	set(isDetectingIslandsAtom, false);
});

export const focusOnIslandAtom = atom(null, (get, set, islandId: string) => {
	const island = get(islandsAtom).find((i) => i.id === islandId);
	if (!island) return;

	set(selectedIslandIdAtom, islandId);
	set(focusedIslandIdAtom, islandId);
	set(islandFocusAnimationAtom, true);

	// Reset animation flag after animation completes
	setTimeout(() => {
		set(islandFocusAnimationAtom, false);
	}, 500);
});

export const openIslandSwitcherAtom = atom(null, (get, set) => {
	const islands = get(islandsAtom);

	set(isIslandSwitcherOpenAtom, true);

	// Set initial selection to current island or first island (only if islands exist)
	if (islands.length > 0) {
		const currentIsland = get(selectedIslandIdAtom);
		const initialIndex = currentIsland
			? islands.findIndex((i) => i.id === currentIsland)
			: 0;

		set(islandSwitcherIndexAtom, Math.max(0, initialIndex));
	} else {
		// Set to 0 for empty state
		set(islandSwitcherIndexAtom, 0);
	}
});

export const closeIslandSwitcherAtom = atom(null, (_get, set) => {
	set(isIslandSwitcherOpenAtom, false);
	set(islandSwitcherIndexAtom, 0);
});

export const selectIslandInSwitcherAtom = atom(
	null,
	(get, set, index: number) => {
		const islands = get(islandsAtom);
		if (index >= 0 && index < islands.length) {
			set(islandSwitcherIndexAtom, index);
		}
	},
);

// Navigation atom to actually move the viewport to an island
export const navigateToIslandAtom = atom(null, (_get, set, island: Island) => {
	// Calculate the zoom level needed to fit the island with padding
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;
	const padding = 100;

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
	set(zoomAtom, targetZoom);
	set(panAtom, { x: targetPanX, y: targetPanY });
});

export const confirmIslandSelectionAtom = atom(null, (get, set) => {
	const islands = get(islandsAtom);
	const selectedIndex = get(islandSwitcherIndexAtom);

	if (selectedIndex >= 0 && selectedIndex < islands.length) {
		const selectedIsland = islands[selectedIndex];
		if (selectedIsland) {
			set(selectedIslandIdAtom, selectedIsland.id);
			set(focusOnIslandAtom, selectedIsland.id);

			// Navigate to the island by focusing on its bounds
			// This will trigger the canvas to pan and zoom to the island
			set(navigateToIslandAtom, selectedIsland);
		}
	}

	set(closeIslandSwitcherAtom);
});
