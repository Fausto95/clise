import { atom } from "jotai";
import type { Element } from "./element-atoms";

// Interaction state atoms (single responsibility)
export const isDraggingAtom = atom<boolean>(false);
export const isResizingAtom = atom<boolean>(false);
export const isDrawingAtom = atom<boolean>(false);
export const isEditingTextAtom = atom<boolean>(false);
export const editingTextIdAtom = atom<string | null>(null);
export const textCreationPositionAtom = atom<{ x: number; y: number } | null>(
	null,
);

// Path editing state atoms
export const isEditingPathAtom = atom<boolean>(false);
export const editingPathIdAtom = atom<string | null>(null);
export const selectedPathPointsAtom = atom<number[]>([]); // indices of selected points
export const draggingPathPointAtom = atom<{
	pathId: string;
	pointIndex: number;
	handleType?: "in" | "out" | "quadratic";
} | null>(null);
export const draggingCurveHandleAtom = atom<{
	pathId: string;
	pointIndex: number;
	handleType: "in" | "out" | "quadratic";
} | null>(null);

// Panning visibility state (true while user is panning)
export const isPanningAtom = atom<boolean>(false);

// Position/coordinate atoms
export const dragStartAtom = atom<{ x: number; y: number } | null>(null);
export const resizeHandleAtom = atom<string | null>(null);
export const resizingElementIdAtom = atom<string | null>(null);

// Drawing state atom
export const drawingElementAtom = atom<Element | null>(null);

// Context menu atom
export const contextMenuAtom = atom<{
	x: number;
	y: number;
	elementId: string | null;
	open: boolean;
}>({
	x: 0,
	y: 0,
	elementId: null,
	open: false,
});
