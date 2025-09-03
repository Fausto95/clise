import { atom } from "jotai";
import {
	addElementAtom,
	type Element,
	elementAtomFamily,
	elementIdsAtom,
	updateElementAtom,
} from "./element-atoms";
import { selectionAtom } from "./selection-atoms";

export const clipboardAtom = atom<Element[]>([]);

// Copy/paste operations
export const copyElementsAtom = atom(null, (get, set, ids: string[]) => {
	const elementIds = get(elementIdsAtom);
	const elements = elementIds
		.map((id) => get(elementAtomFamily(id)))
		.filter((el): el is Element => el !== null);

	const idSet = new Set(ids);
	const elementsToCopy = elements.filter((el) => idSet.has(el.id));
	set(clipboardAtom, elementsToCopy);
});

export const pasteElementsAtom = atom(
	null,
	(get, set, insertPos?: { x: number; y: number }) => {
		const clipboard = get(clipboardAtom);

		if (clipboard.length === 0) return;

		const newIds: string[] = [];
		const idMapping: { [oldId: string]: string } = {};

		// First pass: create elements with new IDs
		clipboard.forEach((element) => {
			const { id, ...elementWithoutId } = element;

			// Calculate offset for pasting
			const offset = insertPos
				? { x: insertPos.x - element.x, y: insertPos.y - element.y }
				: { x: 10, y: 10 };

			const newElement = {
				...elementWithoutId,
				x: element.x + offset.x,
				y: element.y + offset.y,
				parentId: null, // Will be updated in second pass
			};

			const newId = set(addElementAtom, newElement);
			newIds.push(newId);
			idMapping[id] = newId;
		});

		// Second pass: update parent-child relationships
		clipboard.forEach((element, index) => {
			if (element.parentId && idMapping[element.parentId]) {
				const newId = newIds[index];
				if (newId) {
					set(updateElementAtom, {
						id: newId,
						patch: { parentId: idMapping[element.parentId] },
					});
				}
			}
		});

		// Update selection to newly pasted elements
		set(selectionAtom, newIds);
	},
);

// Duplicate functionality moved to element-atoms.ts to avoid conflicts
