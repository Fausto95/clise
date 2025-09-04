import { useAtom } from "jotai";
import {
	smartGuidesEnabledAtom,
	snapToleranceAtom,
	activeGuidesAtom,
	snapOffsetAtom,
	isSnappingAtom,
	type GuideLine,
} from "./smart-guides-atoms";

export const useSmartGuidesEnabled = () => useAtom(smartGuidesEnabledAtom);
export const useSnapTolerance = () => useAtom(snapToleranceAtom);
export const useActiveGuides = () => useAtom(activeGuidesAtom);
export const useSnapOffset = () => useAtom(snapOffsetAtom);
export const useIsSnapping = () => useAtom(isSnappingAtom);

// Composite hook for smart guides functionality
export const useSmartGuides = () => {
	const [enabled, setEnabled] = useSmartGuidesEnabled();
	const [tolerance, setTolerance] = useSnapTolerance();
	const [activeGuides, setActiveGuides] = useActiveGuides();
	const [snapOffset, setSnapOffset] = useSnapOffset();
	const [isSnapping, setIsSnapping] = useIsSnapping();

	const clearGuides = () => {
		setActiveGuides([]);
		setSnapOffset({ x: 0, y: 0 });
		setIsSnapping(false);
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
		clearGuides,
		addGuide,
		setGuides,
	};
};
