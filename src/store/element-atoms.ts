// Re-export everything from the modular elements structure
export * from "./elements";

import { atom } from "jotai";
import { v4 as uuidv4 } from "uuid";
import { elementsAtom, addElementsWithIdsAtom } from "./elements";
import { selectionAtom } from "./selection-atoms";

const uid = () => uuidv4();

// Keep duplicate operation here as it's complex and involves multiple concerns
export const duplicateElementsAtom = atom(null, (get, set, ids: string[]) => {
	const elements = get(elementsAtom);

	// Build adjacency: parentId -> children
	const childrenByParent = new Map<string, any[]>();
	for (const el of elements) {
		if (!el.parentId) continue;
		const arr = childrenByParent.get(el.parentId) ?? [];
		arr.push(el);
		if (!childrenByParent.has(el.parentId))
			childrenByParent.set(el.parentId, arr);
	}

	// Collect subtrees starting from selected ids
	const byId = new Map(elements.map((e) => [e.id, e] as const));
	const roots: any[] = [];
	const stack: string[] = [...ids];
	const visited = new Set<string>();
	while (stack.length) {
		const id = stack.pop()!;
		if (visited.has(id)) continue;
		visited.add(id);
		const el = byId.get(id);
		if (el) roots.push(el);
		const kids = childrenByParent.get(id);
		if (kids && kids.length) stack.push(...kids.map((k) => k.id));
	}

	// Generate new IDs for all elements to duplicate
	const idMapping = new Map<string, string>();
	for (const el of roots) {
		const stack2 = [el];
		while (stack2.length) {
			const cur = stack2.pop()!;
			if (!idMapping.has(cur.id)) idMapping.set(cur.id, uid());
			const kids = childrenByParent.get(cur.id) ?? [];
			for (const k of kids) stack2.push(k);
		}
	}

	// Create duplicated elements with new IDs
	const duplicatedElements: any[] = [];
	for (const el of roots) {
		const stack2 = [el];
		while (stack2.length) {
			const cur = stack2.pop()!;
			const newId = idMapping.get(cur.id)!;
			const copy: any = {
				...cur,
				id: newId,
				x: cur.x + 10,
				y: cur.y + 10,
				parentId: cur.parentId ? idMapping.get(cur.parentId) || null : null,
				name: `${cur.name} Copy`,
			};
			duplicatedElements.push(copy);
			const kids = childrenByParent.get(cur.id) ?? [];
			for (const k of kids) stack2.push(k);
		}
	}

	// Add duplicated elements to the store
	set(addElementsWithIdsAtom, duplicatedElements);

	// Select the duplicated elements
	const newIds = duplicatedElements.map((el) => el.id);
	set(selectionAtom, newIds);

	return newIds;
});
