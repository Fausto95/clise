import { atom } from "jotai";

// Smart guides state atoms
export const smartGuidesEnabledAtom = atom<boolean>(true);
export const snapToleranceAtom = atom<number>(2); // Pixels within which snapping occurs

// Guide line data
export interface GuideLine {
	type: "horizontal" | "vertical";
	position: number; // x for vertical, y for horizontal
	elementId: string; // ID of the element this guide aligns with
	alignmentType: "edge" | "center"; // What part of the element this guide represents
}

export const activeGuidesAtom = atom<GuideLine[]>([]);

// Snap offset for the currently dragged element
export const snapOffsetAtom = atom<{ x: number; y: number }>({ x: 0, y: 0 });

// Whether we're currently snapping to guides
export const isSnappingAtom = atom<boolean>(false);

// Previous position for snap escape detection
export const previousPositionAtom = atom<{ x: number; y: number } | null>(null);
