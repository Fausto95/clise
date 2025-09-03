import { type Atom, atom, type Setter } from "jotai";
import {
	type Element,
	elementAtomFamily,
	elementIdsAtom,
} from "./element-atoms";

type GetAtom = <T>(atom: Atom<T>) => T;

// History state atoms
export const historyAtom = atom<Element[][]>([]);
export const redoStackAtom = atom<Element[][]>([]);
export const maxHistoryStepsAtom = atom(50);
export const isTransactionAtom = atom(false);

// Helper function to get current elements state
const getCurrentElements = (get: GetAtom): Element[] => {
	const elementIds = get(elementIdsAtom);
	return elementIds
		.map((id: string) => get(elementAtomFamily(id)))
		.filter((element: Element | null): element is Element => element !== null);
};

// Helper function to restore elements state
const restoreElements = (set: Setter, elements: Element[]) => {
	// Set new element IDs
	const newIds = elements.map((el) => el.id);
	set(elementIdsAtom, newIds);

	// Set element atoms
	elements.forEach((element) => {
		set(elementAtomFamily(element.id), element);
	});
};

// Transaction management atoms
export const startTransactionAtom = atom(null, (get, set) => {
	if (!get(isTransactionAtom)) {
		const elements = getCurrentElements(get);
		const currentHistory = get(historyAtom);
		const maxSteps = get(maxHistoryStepsAtom);

		const updatedHistory = [...currentHistory, elements];
		if (updatedHistory.length > maxSteps) {
			updatedHistory.shift();
		}

		set(historyAtom, updatedHistory);
		set(redoStackAtom, []);
		set(isTransactionAtom, true);
	}
});

export const commitTransactionAtom = atom(null, (_, set) => {
	set(isTransactionAtom, false);
});

// History operations atoms
export const pushHistoryAtom = atom(null, (get, set) => {
	if (get(isTransactionAtom)) return;

	const elements = getCurrentElements(get);
	const currentHistory = get(historyAtom);
	const maxSteps = get(maxHistoryStepsAtom);

	const updatedHistory = [...currentHistory, elements];
	if (updatedHistory.length > maxSteps) {
		updatedHistory.shift();
	}

	set(historyAtom, updatedHistory);
	set(redoStackAtom, []);
});

export const undoAtom = atom(null, (get, set) => {
	const history = get(historyAtom);
	if (history.length === 0) return;

	const prev = history[history.length - 1];
	const currentElements = getCurrentElements(get);
	const currentRedoStack = get(redoStackAtom);

	// Restore previous state
	if (prev) {
		restoreElements(set, prev);
	}

	// Update history and redo stack
	set(historyAtom, history.slice(0, -1));
	set(redoStackAtom, [currentElements, ...currentRedoStack]);
});

export const redoAtom = atom(null, (get, set) => {
	const redoStack = get(redoStackAtom);
	if (redoStack.length === 0) return;

	const next = redoStack[0];
	const currentElements = getCurrentElements(get);
	const currentHistory = get(historyAtom);

	// Restore next state
	if (next) {
		restoreElements(set, next);
	}

	// Update history and redo stack
	set(historyAtom, [...currentHistory, currentElements]);
	set(redoStackAtom, redoStack.slice(1));
});

export const clearHistoryAtom = atom(null, (_, set) => {
	set(historyAtom, []);
	set(redoStackAtom, []);
	set(isTransactionAtom, false);
});

// Hook for convenient usage
export const useJotaiHistory = () => {
	return {
		startTransaction: startTransactionAtom,
		commitTransaction: commitTransactionAtom,
		push: pushHistoryAtom,
		undo: undoAtom,
		redo: redoAtom,
		clear: clearHistoryAtom,
	};
};
