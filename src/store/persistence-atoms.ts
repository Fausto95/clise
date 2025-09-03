import { atom } from "jotai";
import {
	type AppState,
	loadStateFromLocalStorage,
	saveStateToLocalStorage,
} from "../utils/local-storage";
import { captureError } from "../utils/sentry";
import { documentNameAtom, toolAtom } from "./document-atoms";
import {
	elementIdsAtom,
	elementsAtom,
	restoreElementsAtom,
} from "./element-atoms";
import { selectionAtom } from "./selection-atoms";
import { addGroupsAtom, clearGroupsAtom, groupsAtom } from "./group-atoms";
import {
	canvasSizeAtom,
	panAtom,
	viewportSizeAtom,
	zoomAtom,
} from "./viewport-atoms";

// Atom to track if we should persist state (can be disabled for testing)
export const persistenceEnabledAtom = atom(true);

// Atom to track if we're currently loading from localStorage (prevents saving during load)
export const isLoadingFromStorageAtom = atom(false);

// Derived atom that collects all the state we want to persist
export const persistableStateAtom = atom<AppState>((get) => {
	return {
		documentName: get(documentNameAtom),
		elements: get(elementsAtom),
		elementIds: get(elementIdsAtom),
		groups: get(groupsAtom),
		selection: get(selectionAtom),
		tool: get(toolAtom),
		zoom: get(zoomAtom),
		pan: get(panAtom),
		viewportSize: get(viewportSizeAtom),
		canvasSize: get(canvasSizeAtom),
	};
});

// Simple debounce implementation to avoid excessive localStorage writes
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedSave = (state: AppState) => {
	if (saveTimeout) {
		clearTimeout(saveTimeout);
	}
	saveTimeout = setTimeout(() => {
		saveStateToLocalStorage(state);
	}, 500); // Save after 500ms of inactivity
};

// Atom that automatically saves state changes to localStorage
export const autoSaveAtom = atom(null, (get) => {
	const persistenceEnabled = get(persistenceEnabledAtom);
	const isLoading = get(isLoadingFromStorageAtom);

	// Don't save if persistence is disabled or we're currently loading
	if (!persistenceEnabled || isLoading) {
		return;
	}

	const state = get(persistableStateAtom);
	// Always persist elementIds as an object map id -> index
	let elementIds: AppState["elementIds"] = state.elementIds;
	if (Array.isArray(state.elementIds)) {
		const map: Record<string, number> = {};
		state.elementIds.forEach((id, idx) => {
			map[id] = idx;
		});
		elementIds = map;
	}
	debouncedSave({ ...state, elementIds });
});

// Atom to load state from localStorage
export const loadStateAtom = atom(null, (_, set) => {
	const storedState = loadStateFromLocalStorage();
	if (!storedState) {
		return;
	}

	// Set loading flag to prevent auto-save during load
	set(isLoadingFromStorageAtom, true);

	try {
		// Load all the state
		set(documentNameAtom, storedState.documentName);
		set(toolAtom, storedState.tool);
		set(selectionAtom, storedState.selection);
		set(zoomAtom, storedState.zoom);
		set(panAtom, storedState.pan);
		set(viewportSizeAtom, storedState.viewportSize);
		set(canvasSizeAtom, storedState.canvasSize);

		// Restore elements using the dedicated restore atom
		set(restoreElementsAtom, storedState.elements);

		// If elementIds were stored as a map, normalize and apply ordering
		if (storedState.elementIds) {
			let orderedIds: string[] | null = null;
			const raw: unknown = storedState.elementIds as unknown;
			if (Array.isArray(raw)) {
				orderedIds = raw as string[];
			} else if (raw && typeof raw === "object") {
				const entries = Object.entries(raw as Record<string, number>);
				orderedIds = entries.sort((a, b) => a[1] - b[1]).map(([id]) => id);
			}
			if (orderedIds) {
				set(elementIdsAtom, orderedIds);
			}
		}

		// Restore groups
		set(clearGroupsAtom);
		if (storedState.groups && Array.isArray(storedState.groups)) {
			set(addGroupsAtom, storedState.groups);
		}
	} catch (error) {
		captureError(error as Error, {
			context: "Error loading state from localStorage",
		});
	} finally {
		// Clear loading flag
		set(isLoadingFromStorageAtom, false);
	}
});

// Atom to manually save current state
export const saveStateAtom = atom(null, (get) => {
	const state = get(persistableStateAtom);
	// Always persist elementIds as an object map id -> index
	if (Array.isArray(state.elementIds)) {
		const map: Record<string, number> = {};
		state.elementIds.forEach((id, idx) => {
			map[id] = idx;
		});
		saveStateToLocalStorage({ ...state, elementIds: map });
	} else {
		saveStateToLocalStorage(state);
	}
});

// Atom to clear stored state
export const clearStoredStateAtom = atom(null, () => {
	localStorage.removeItem("clise-app-state");
});
