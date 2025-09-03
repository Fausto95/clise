import { atom } from "jotai";

export const selectionAtom = atom<string[]>([]);

// A simple bump counter to notify selection-related systems to recalculate
export const selectionRecalcVersionAtom = atom<number>(0);
export const bumpSelectionRecalcAtom = atom(null, (get, set) => {
	const v = get(selectionRecalcVersionAtom);
	set(selectionRecalcVersionAtom, v + 1);
});

// Box selection atoms
export const isBoxSelectingAtom = atom<boolean>(false);
export const boxSelectStartAtom = atom<{ x: number; y: number } | null>(null);
export const boxSelectEndAtom = atom<{ x: number; y: number } | null>(null);
