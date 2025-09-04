import { useAtom } from "jotai";
import {
	smartGuidesEnabledAtom,
	snapToleranceAtom,
	activeGuidesAtom,
	snapOffsetAtom,
	isSnappingAtom,
	previousPositionAtom,
	type GuideLine,
} from "./smart-guides-atoms";

export const useSmartGuidesEnabled = () => useAtom(smartGuidesEnabledAtom);
export const useSnapTolerance = () => useAtom(snapToleranceAtom);
export const useActiveGuides = () => useAtom(activeGuidesAtom);
export const useSnapOffset = () => useAtom(snapOffsetAtom);
export const useIsSnapping = () => useAtom(isSnappingAtom);
export const usePreviousPosition = () => useAtom(previousPositionAtom);

// Composite hook for smart guides functionality
export const useSmartGuides = () => {
	const [enabled, setEnabled] = useSmartGuidesEnabled();
	const [tolerance, setTolerance] = useSnapTolerance();
	const [activeGuides, setActiveGuides] = useActiveGuides();
	const [snapOffset, setSnapOffset] = useSnapOffset();
	const [isSnapping, setIsSnapping] = useIsSnapping();
	const [previousPosition, setPreviousPosition] = usePreviousPosition();

	const clearGuides = () => {
		setActiveGuides([]);
		setSnapOffset({ x: 0, y: 0 });
		setIsSnapping(false);
		setPreviousPosition(null);
	};

	const addGuide = (guide: GuideLine) => {
		setActiveGuides((prev) => [...prev, guide]);
	};

	const setGuides = (guides: GuideLine[]) => {
		setActiveGuides(guides);
	};

	return {
		enabled,
		setEnabled,
		tolerance,
		setTolerance,
		activeGuides,
		setActiveGuides,
		snapOffset,
		setSnapOffset,
		isSnapping,
		setIsSnapping,
		previousPosition,
		setPreviousPosition,
		clearGuides,
		addGuide,
		setGuides,
	};
};
