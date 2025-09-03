import { atom, type Getter } from "jotai";
import { bumpSelectionRecalcAtom } from "./selection-atoms";
import { atomFamily } from "jotai/utils";
import { v4 as uuidv4 } from "uuid";
import { elementAtomFamily } from "./element-atoms";
import { selectionAtom } from "./selection-atoms";

const uid = () => uuidv4();

export interface Group {
	id: string;
	name: string;
	elementIds: string[];
	x: number;
	y: number;
	w: number;
	h: number;
	collapsed: boolean;
	created: number;
}

// Group storage
export const groupIdsAtom = atom<string[]>([]);

// Group atoms using atomFamily for granular updates
export const groupAtomFamily = atomFamily((id: string) => {
	const groupAtom = atom<Group | null>(null);
	groupAtom.debugLabel = `group-${id}`;
	return groupAtom;
});

// Derived atom to get all groups
export const groupsAtom = atom<Group[]>((get) => {
	const groupIds = get(groupIdsAtom);
	return groupIds
		.map((id) => get(groupAtomFamily(id)))
		.filter((group): group is Group => group !== null);
});

// Precomputed map for O(1) elementId -> group lookup
export const elementIdToGroupMapAtom = atom((get) => {
	const map = new Map<string, Group>();
	const groups = get(groupsAtom);
	for (const g of groups) {
		for (const elId of g.elementIds) map.set(elId, g);
	}
	return map;
});

// Helper to calculate group bounds from its elements
const calculateGroupBounds = (elementIds: string[], get: Getter) => {
	if (elementIds.length === 0) {
		return { x: 0, y: 0, w: 0, h: 0 };
	}

	const elements = elementIds
		.map((id) => get(elementAtomFamily(id)))
		.filter((el): el is NonNullable<typeof el> => el !== null);

	if (elements.length === 0) {
		return { x: 0, y: 0, w: 0, h: 0 };
	}

	// Compute robust bounds handling negative sizes and lines
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const el of elements) {
		if (el.type === "line" && "x2" in el && "y2" in el) {
			const left = Math.min(el.x, el.x2);
			const right = Math.max(el.x, el.x2);
			const top = Math.min(el.y, el.y2);
			const bottom = Math.max(el.y, el.y2);
			minX = Math.min(minX, left);
			minY = Math.min(minY, top);
			maxX = Math.max(maxX, right);
			maxY = Math.max(maxY, bottom);
		} else {
			const left = Math.min(el.x, el.x + el.w);
			const right = Math.max(el.x, el.x + el.w);
			const top = Math.min(el.y, el.y + el.h);
			const bottom = Math.max(el.y, el.y + el.h);
			minX = Math.min(minX, left);
			minY = Math.min(minY, top);
			maxX = Math.max(maxX, right);
			maxY = Math.max(maxY, bottom);
		}
	}

	return {
		x: isFinite(minX) ? minX : 0,
		y: isFinite(minY) ? minY : 0,
		w: isFinite(maxX - minX) ? maxX - minX : 0,
		h: isFinite(maxY - minY) ? maxY - minY : 0,
	};
};

// Create a new group from selected elements
export const createGroupAtom = atom(
	null,
	(get, set, { elementIds, name }: { elementIds: string[]; name?: string }) => {
		if (elementIds.length < 2) {
			throw new Error("Groups must contain at least 2 elements");
		}

		const groupId = uid();
		const bounds = calculateGroupBounds(elementIds, get);

		const newGroup: Group = {
			id: groupId,
			name: name || `Group ${get(groupIdsAtom).length + 1}`,
			elementIds: [...elementIds],
			...bounds,
			collapsed: false,
			created: Date.now(),
		};

		// Set the group in the family
		set(groupAtomFamily(groupId), newGroup);

		// Add to group IDs list
		const currentGroupIds = get(groupIdsAtom);
		set(groupIdsAtom, [...currentGroupIds, groupId]);

		// Clear selection and select the group instead
		set(selectionAtom, [groupId]);

		return groupId;
	},
);

// Ungroup elements
export const ungroupAtom = atom(null, (get, set, groupId: string) => {
	const group = get(groupAtomFamily(groupId));
	if (!group) return;

	// Remove group from storage
	set(groupAtomFamily(groupId), null);
	const currentGroupIds = get(groupIdsAtom);
	set(
		groupIdsAtom,
		currentGroupIds.filter((id) => id !== groupId),
	);

	// Select the ungrouped elements
	set(selectionAtom, group.elementIds);
});

// Update group bounds when elements change
export const updateGroupBoundsAtom = atom(null, (get, set, groupId: string) => {
	const group = get(groupAtomFamily(groupId));
	if (!group) return;

	const newBounds = calculateGroupBounds(group.elementIds, get);
	set(groupAtomFamily(groupId), {
		...group,
		...newBounds,
	});

	// Notify renderer to recalc selection overlays (group outline)
	set(bumpSelectionRecalcAtom);
});

// Get group containing an element
export const getElementGroupAtom = atom((get) => (elementId: string) => {
	const map = get(elementIdToGroupMapAtom);
	return map.get(elementId);
});

// Check if an element is grouped
export const isElementGroupedAtom = atom((get) => (elementId: string) => {
	const getElementGroup = get(getElementGroupAtom);
	return getElementGroup(elementId) !== undefined;
});

// Get all elements in groups (for selection logic)
export const groupedElementIdsAtom = atom((get) => {
	const groups = get(groupsAtom);
	return new Set(groups.flatMap((group) => group.elementIds));
});

// Toggle group collapsed state
export const toggleGroupCollapsedAtom = atom(
	null,
	(get, set, groupId: string) => {
		const group = get(groupAtomFamily(groupId));
		if (!group) return;

		set(groupAtomFamily(groupId), {
			...group,
			collapsed: !group.collapsed,
		});
	},
);

// Delete a group (but keep elements)
export const deleteGroupAtom = atom(null, (get, set, groupId: string) => {
	const group = get(groupAtomFamily(groupId));
	if (!group) return;

	// Remove group from storage
	set(groupAtomFamily(groupId), null);
	const currentGroupIds = get(groupIdsAtom);
	set(
		groupIdsAtom,
		currentGroupIds.filter((id) => id !== groupId),
	);

	// Remove from selection if selected
	set(selectionAtom, (prev: string[]) => prev.filter((id) => id !== groupId));
});

// Rename a group
export const renameGroupAtom = atom(
	null,
	(get, set, { groupId, name }: { groupId: string; name: string }) => {
		const group = get(groupAtomFamily(groupId));
		if (!group) return;

		set(groupAtomFamily(groupId), {
			...group,
			name,
		});
	},
);

// Add multiple groups (for import/restore operations)
export const addGroupsAtom = atom(null, (get, set, groups: Group[]) => {
	const currentGroupIds = get(groupIdsAtom);
	const newGroupIds = groups.map((group) => group.id);

	// Set each group in the family
	groups.forEach((group) => {
		set(groupAtomFamily(group.id), group);
	});

	// Add to group IDs list
	set(groupIdsAtom, [...currentGroupIds, ...newGroupIds]);
});

// Clear all groups
export const clearGroupsAtom = atom(null, (get, set) => {
	const currentGroupIds = get(groupIdsAtom);

	// Clear all group atoms
	currentGroupIds.forEach((id) => {
		set(groupAtomFamily(id), null);
	});

	// Clear group IDs list
	set(groupIdsAtom, []);
});
