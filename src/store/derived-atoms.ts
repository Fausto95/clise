import { atom } from "jotai";
import type { Element } from "./element-atoms";
import { elementsAtom } from "./element-atoms";
import { selectionAtom } from "./selection-atoms";

// Derived atoms that depend on multiple modules
export const selectedElementsAtom = atom((get) => {
	const elements = get(elementsAtom);
	const selection = get(selectionAtom);
	// Use a Set to reduce membership checks from O(m) to O(1)
	const selectedSet = new Set(selection);
	return elements.filter((el) => selectedSet.has(el.id));
});

// Fast id -> element map for O(1) lookups by id in derived code
export const elementsByIdAtom = atom((get) => {
	const map = new Map<string, Element>();
	for (const el of get(elementsAtom)) map.set(el.id, el);
	return map;
});

// Parent -> children adjacency map to avoid repeated filters in trees
export const childrenByParentIdAtom = atom((get) => {
	const map = new Map<string | null, Element[]>();
	for (const el of get(elementsAtom)) {
		const key = el.parentId;
		const arr = map.get(key) ?? [];
		arr.push(el);
		if (!map.has(key)) map.set(key, arr);
	}
	return map;
});
