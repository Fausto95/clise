import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
	islandsAtom,
	isDetectingIslandsAtom,
	islandDetectionOptionsAtom,
	selectedIslandIdAtom,
	isIslandSwitcherOpenAtom,
	islandSwitcherIndexAtom,
	selectedIslandAtom,
	islandCountAtom,
	hasIslandsAtom,
	currentIslandIndexAtom,
	nextIslandAtom,
	previousIslandAtom,
	detectIslandsAtom,
	focusOnIslandAtom,
	openIslandSwitcherAtom,
	closeIslandSwitcherAtom,
	selectIslandInSwitcherAtom,
	confirmIslandSelectionAtom,
	focusedIslandIdAtom,
	islandFocusAnimationAtom,
} from "./island-atoms";

// Basic island state hooks
export const useIslands = () => useAtomValue(islandsAtom);
export const useIsDetectingIslands = () => useAtomValue(isDetectingIslandsAtom);
export const useIslandDetectionOptions = () =>
	useAtom(islandDetectionOptionsAtom);
export const useSelectedIslandId = () => useAtom(selectedIslandIdAtom);
export const useIslandSwitcherOpen = () => useAtom(isIslandSwitcherOpenAtom);
export const useIslandSwitcherIndex = () => useAtom(islandSwitcherIndexAtom);

// Derived state hooks
export const useSelectedIsland = () => useAtomValue(selectedIslandAtom);
export const useIslandCount = () => useAtomValue(islandCountAtom);
export const useHasIslands = () => useAtomValue(hasIslandsAtom);
export const useCurrentIslandIndex = () => useAtomValue(currentIslandIndexAtom);
export const useFocusedIslandId = () => useAtomValue(focusedIslandIdAtom);
export const useIslandFocusAnimation = () =>
	useAtomValue(islandFocusAnimationAtom);

// Action hooks
export const useDetectIslands = () => useSetAtom(detectIslandsAtom);
export const useFocusOnIsland = () => useSetAtom(focusOnIslandAtom);
export const useOpenIslandSwitcher = () => useSetAtom(openIslandSwitcherAtom);
export const useCloseIslandSwitcher = () => useSetAtom(closeIslandSwitcherAtom);
export const useSelectIslandInSwitcher = () =>
	useSetAtom(selectIslandInSwitcherAtom);
export const useConfirmIslandSelection = () =>
	useSetAtom(confirmIslandSelectionAtom);
export const useNextIsland = () => useSetAtom(nextIslandAtom);
export const usePreviousIsland = () => useSetAtom(previousIslandAtom);

// Composite hooks for common operations
export const useIslandNavigation = () => {
	const nextIsland = useNextIsland();
	const previousIsland = usePreviousIsland();
	const currentIndex = useCurrentIslandIndex();
	const islandCount = useIslandCount();

	return {
		nextIsland,
		previousIsland,
		currentIndex,
		islandCount,
		canGoNext: islandCount > 1,
		canGoPrevious: islandCount > 1,
	};
};

export const useIslandSwitcher = () => {
	const isOpen = useIslandSwitcherOpen();
	const currentIndex = useIslandSwitcherIndex();
	const islandCount = useIslandCount();
	const openSwitcher = useOpenIslandSwitcher();
	const closeSwitcher = useCloseIslandSwitcher();
	const selectIsland = useSelectIslandInSwitcher();
	const confirmSelection = useConfirmIslandSelection();

	return {
		isOpen,
		currentIndex,
		islandCount,
		openSwitcher,
		closeSwitcher,
		selectIsland,
		confirmSelection,
		canSelect: (index: number) => index >= 0 && index < islandCount,
	};
};

export const useIslandManagement = () => {
	const islands = useIslands();
	const selectedIsland = useSelectedIsland();
	const hasIslands = useHasIslands();
	const detectIslands = useDetectIslands();
	const focusOnIsland = useFocusOnIsland();
	const isDetecting = useIsDetectingIslands();

	return {
		islands,
		selectedIsland,
		hasIslands,
		detectIslands,
		focusOnIsland,
		isDetecting,
	};
};
