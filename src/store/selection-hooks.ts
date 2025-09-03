import { useAtom, useAtomValue } from "jotai";
import { selectedElementsAtom } from "./derived-atoms";
import {
	boxSelectEndAtom,
	boxSelectStartAtom,
	isBoxSelectingAtom,
	selectionAtom,
} from "./selection-atoms";

// Selection hooks
export const useSelection = () => useAtom(selectionAtom);
export const useSelectedElements = () => useAtomValue(selectedElementsAtom);
export const useIsBoxSelecting = () => useAtom(isBoxSelectingAtom);
export const useBoxSelectStart = () => useAtom(boxSelectStartAtom);
export const useBoxSelectEnd = () => useAtom(boxSelectEndAtom);
