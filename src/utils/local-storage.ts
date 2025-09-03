// localStorage utilities for persisting application state

import type { Tool } from "../store/document-atoms";
import type { Element } from "../store/element-atoms";
import type { Group } from "../store/group-atoms";

export interface AppState {
	documentName: string;
	elements: Element[];
	// Allow either ordered array or a map of id -> index
	elementIds: string[] | Record<string, number>;
	groups: Group[];
	selection: string[];
	tool: Tool;
	zoom: number;
	pan: { x: number; y: number };
	viewportSize: { width: number; height: number };
	canvasSize: { width: number; height: number };
}

const STORAGE_KEY = "clise-app-state";
const STORAGE_VERSION = "1.0.0";

interface StoredData {
	version: string;
	timestamp: number;
	state: AppState;
}

/**
 * Save application state to localStorage
 */
export const saveStateToLocalStorage = (state: AppState): void => {
	try {
		const dataToStore: StoredData = {
			version: STORAGE_VERSION,
			timestamp: Date.now(),
			state,
		};

		localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
	} catch (error) {
		console.warn("Failed to save state to localStorage:", error);
	}
};

/**
 * Load application state from localStorage
 */
export const loadStateFromLocalStorage = (): AppState | null => {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) {
			return null;
		}

		const data: StoredData = JSON.parse(stored);

		// Check version compatibility
		if (data.version !== STORAGE_VERSION) {
			console.warn("localStorage data version mismatch, ignoring stored state");
			return null;
		}

		// Validate that we have the expected structure
		if (!data.state || typeof data.state !== "object") {
			console.warn("Invalid localStorage data structure");
			return null;
		}

		return data.state;
	} catch (error) {
		console.warn("Failed to load state from localStorage:", error);
		return null;
	}
};

/**
 * Clear stored state from localStorage
 */
export const clearStoredState = (): void => {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch (error) {
		console.warn("Failed to clear localStorage:", error);
	}
};

/**
 * Get the default application state
 */
export const getDefaultAppState = (): AppState => ({
	documentName: "Untitled",
	elements: [],
	elementIds: [],
	groups: [],
	selection: [],
	tool: "select",
	zoom: 1,
	pan: { x: 0, y: 0 },
	viewportSize: { width: 1000, height: 800 },
	canvasSize: { width: 1000, height: 800 },
});
