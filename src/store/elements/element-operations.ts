import { atom, useSetAtom, type Getter, type Setter } from "jotai";
import { v4 as uuidv4 } from "uuid";
import { findContainingFrame } from "../../canvas/utils";
import { isTransactionAtom, pushHistoryAtom } from "../history-atoms";
import { selectionAtom, bumpSelectionRecalcAtom } from "../selection-atoms";
import {
	elementIdToGroupMapAtom,
	updateGroupBoundsAtom,
	groupsAtom,
	groupAtomFamily,
	groupIdsAtom,
} from "../group-atoms";
import {
	elementIdsAtom,
	elementAtomFamily,
	elementsAtom,
	elementStyleAtomFamily,
} from "./element-state";
import type { Element, ElementPatch } from "./element-types";
import { migrateBlurStructure } from "./element-types";

const uid = () => uuidv4();

// Helper function to update group bounds for an element if it's in a group
const updateElementGroupBounds = (
	get: Getter,
	set: Setter,
	elementId: string,
) => {
	const elementIdToGroupMap = get(elementIdToGroupMapAtom);
	const group = elementIdToGroupMap.get(elementId);
	if (group) {
		set(updateGroupBoundsAtom, group.id);
	}
};

// Helper function to check if a group should be disbanded due to insufficient visible elements
const checkAndCleanupGroup = (get: Getter, set: Setter, groupId: string) => {
	const group = get(groupAtomFamily(groupId));
	if (!group) return;

	// Count visible elements in the group
	const visibleElementIds = group.elementIds.filter((elementId) => {
		const element = get(elementAtomFamily(elementId));
		return element && element.visible;
	});

	if (visibleElementIds.length < 2) {
		// Disband the group
		const currentGroupIds = get(groupIdsAtom);
		const newGroupIds = currentGroupIds.filter((id) => id !== groupId);
		set(groupIdsAtom, newGroupIds);
		set(groupAtomFamily(groupId), null);

		// Remove from selection if selected
		set(selectionAtom, (prev: string[]) => prev.filter((id) => id !== groupId));
	}
};

// Create element atom (renamed from createElementAtom)
export const addElementAtom = atom(
	null,
	(get, set, element: Omit<Element, "id">) => {
		const id = uid();
		const elementWithId: Element = { ...element, id } as Element;

		// Push current state to history before making changes
		set(pushHistoryAtom);

		// Add to element family
		set(elementAtomFamily(id), elementWithId);

		// Add to element IDs
		const currentIds = get(elementIdsAtom);
		set(elementIdsAtom, [...currentIds, id]);

		return id;
	},
);

// Alias for backwards compatibility
export const createElementAtom = addElementAtom;

// Add multiple elements (alias for backwards compatibility)
export const addElementsAtom = atom(
	null,
	(_get, set, elements: Omit<Element, "id">[]) => {
		elements.forEach((element) => {
			set(addElementAtom, element);
		});
	},
);

// Add multiple elements with existing IDs (for import operations)
export const addElementsWithIdsAtom = atom(
	null,
	(get, set, elements: Element[]) => {
		// Push current state to history before making changes
		set(pushHistoryAtom);

		elements.forEach((element) => {
			set(elementAtomFamily(element.id), element);
		});

		const currentIds = get(elementIdsAtom);
		const newIds = elements.map((el) => el.id);
		set(elementIdsAtom, [...currentIds, ...newIds]);
	},
);

// Clear all elements
export const clearElementsAtom = atom(null, (get, set) => {
	const currentIds = get(elementIdsAtom);

	// Clear all element atoms
	currentIds.forEach((id) => {
		set(elementAtomFamily(id), null);
	});

	// Clear element IDs
	set(elementIdsAtom, []);

	// Clear selection
	set(selectionAtom, []);
});

// Update element atom
export const updateElementAtom = atom(
	null,
	(get, set, { id, patch }: { id: string; patch: ElementPatch }) => {
		const element = get(elementAtomFamily(id));
		if (!element) return;

		// Only push to history if not in a transaction
		const inTransaction = get(isTransactionAtom);
		if (!inTransaction) {
			set(pushHistoryAtom);
		}

		// If this is a frame and position is being updated, check containment
		let updatedElement: Element = { ...element, ...patch } as Element;

		if (
			updatedElement.type === "frame" &&
			(patch.x !== undefined ||
				patch.y !== undefined ||
				patch.w !== undefined ||
				patch.h !== undefined)
		) {
			// Find containing frame after update
			const elementsSnapshot = get(elementsAtom);
			const containingFrame = findContainingFrame(
				updatedElement,
				elementsSnapshot.filter((el) => el.id !== id),
			);
			updatedElement = {
				...updatedElement,
				parentId: containingFrame?.id || null,
			};
		}

		set(elementAtomFamily(id), updatedElement);

		// Update group bounds if this element is part of a group and position/size changed
		if (
			patch.x !== undefined ||
			patch.y !== undefined ||
			patch.w !== undefined ||
			patch.h !== undefined ||
			patch.visible !== undefined
		) {
			updateElementGroupBounds(get, set, id);
		}
	},
);

// Update element position (alias for backwards compatibility)
export const updateElementPositionAtom = atom(
	null,
	(
		_get,
		set,
		{
			id,
			x,
			y,
			w,
			h,
		}: { id: string; x?: number; y?: number; w?: number; h?: number },
	) => {
		const patch: Partial<Element> = {};
		if (x !== undefined) patch.x = x;
		if (y !== undefined) patch.y = y;
		if (w !== undefined) patch.w = w;
		if (h !== undefined) patch.h = h;

		set(updateElementAtom, { id, patch });
	},
);

// Update element style with optimized handling
export const updateElementStyleAtom = atom(
	null,
	(get, set, { id, style }: { id: string; style: Partial<Element> }) => {
		const element = get(elementAtomFamily(id));
		if (!element) return;

		// Only push to history if not in a transaction
		const inTransaction = get(isTransactionAtom);
		if (!inTransaction) {
			set(pushHistoryAtom);
		}

		set(elementStyleAtomFamily(id), style);

		// Notify selection recalculation if stroke width or opacity changed
		if (
			(style.stroke && typeof style.stroke.width !== "undefined") ||
			typeof style.opacity !== "undefined"
		) {
			set(bumpSelectionRecalcAtom);
		}
	},
);

// Set element locked state
export const setElementLockedAtom = atom(
	null,
	(_get, set, { id, locked }: { id: string; locked: boolean }) => {
		set(updateElementAtom, { id, patch: { locked } });
	},
);

// Set element dimensions locked state
export const setElementDimensionsLockedAtom = atom(
	null,
	(_get, set, { id, locked }: { id: string; locked: boolean }) => {
		set(updateElementAtom, { id, patch: { lockedDimensions: locked } });
	},
);

// Parent-child relationship management
let parentUpdateTimeout: number | null = null;

export const updateParentChildRelationshipsAtom = atom(null, (get, set) => {
	const elements = get(elementsAtom);
	elements.forEach((element) => {
		const containingFrame = findContainingFrame(element, elements);
		const newParentId = containingFrame ? containingFrame.id : null;

		if (element.parentId !== newParentId) {
			set(updateElementAtom, {
				id: element.id,
				patch: { parentId: newParentId },
			});
		}
	});
});

export const debouncedUpdateParentChildRelationshipsAtom = atom(
	null,
	(_get, set) => {
		if (parentUpdateTimeout) {
			clearTimeout(parentUpdateTimeout);
		}
		parentUpdateTimeout = setTimeout(() => {
			set(updateParentChildRelationshipsAtom);
			parentUpdateTimeout = null;
		}, 100) as unknown as number;
	},
);

// Delete elements atom
export const deleteElementsAtom = atom(null, (get, set, ids: string[]) => {
	// Push current state to history before making changes
	set(pushHistoryAtom);

	// Get all children of elements being deleted recursively
	const elements = get(elementsAtom);
	const childrenByParent = new Map<string, string[]>();
	for (const el of elements) {
		if (!el.parentId) continue;
		const arr = childrenByParent.get(el.parentId) ?? [];
		arr.push(el.id);
		if (!childrenByParent.has(el.parentId))
			childrenByParent.set(el.parentId, arr);
	}

	const allIdsToDelete: string[] = [];
	const stack: string[] = [...ids];
	const seen = new Set<string>();
	while (stack.length) {
		const id = stack.pop()!;
		if (seen.has(id)) continue;
		seen.add(id);
		allIdsToDelete.push(id);
		const kids = childrenByParent.get(id);
		if (kids && kids.length) stack.push(...kids);
	}

	// Remove elements from the family atoms
	allIdsToDelete.forEach((id) => {
		set(elementAtomFamily(id), null);
	});

	// Remove from element IDs list
	const currentIds = get(elementIdsAtom);
	const newIds = currentIds.filter((id) => !allIdsToDelete.includes(id));
	set(elementIdsAtom, newIds);

	// Clear from selection
	set(selectionAtom, (prev: string[]) =>
		prev.filter((id) => !allIdsToDelete.includes(id)),
	);

	// Clean up any child elements that had these as parents
	const remainingIds = get(elementIdsAtom);
	remainingIds.forEach((remainingId) => {
		const element = get(elementAtomFamily(remainingId));
		if (
			element &&
			element.parentId &&
			allIdsToDelete.includes(element.parentId)
		) {
			set(elementAtomFamily(remainingId), { ...element, parentId: null });
		}
	});

	// Clean up groups that now have fewer than 2 elements
	const groups = get(groupsAtom);
	const groupsToDisband: string[] = [];

	for (const group of groups) {
		// Remove deleted elements from the group
		const remainingElementIds = group.elementIds.filter(
			(elementId) => !allIdsToDelete.includes(elementId),
		);

		if (remainingElementIds.length < 2) {
			// Group has fewer than 2 elements, mark for disbanding
			groupsToDisband.push(group.id);
		} else if (remainingElementIds.length < group.elementIds.length) {
			// Some elements were removed, update the group
			set(groupAtomFamily(group.id), {
				...group,
				elementIds: remainingElementIds,
			});
			// Update bounds since elements were removed
			set(updateGroupBoundsAtom, group.id);
		}
	}

	// Disband groups with fewer than 2 elements
	if (groupsToDisband.length > 0) {
		const currentGroupIds = get(groupIdsAtom);
		const newGroupIds = currentGroupIds.filter(
			(groupId) => !groupsToDisband.includes(groupId),
		);
		set(groupIdsAtom, newGroupIds);

		// Remove the group atoms
		groupsToDisband.forEach((groupId) => {
			set(groupAtomFamily(groupId), null);
		});

		// Remove disbanded groups from selection if they were selected
		set(selectionAtom, (prev: string[]) =>
			prev.filter((id) => !groupsToDisband.includes(id)),
		);
	}
});

// Reorder elements atom
export const reorderElementsAtom = atom(
	null,
	(
		get,
		set,
		{
			elementIds,
			operation,
		}: {
			elementIds: string[];
			operation:
				| "bring-to-front"
				| "bring-forward"
				| "send-backward"
				| "send-to-back";
		},
	) => {
		const currentIds = get(elementIdsAtom);
		let newIds = [...currentIds];

		// Remove the elements to reorder using Set for O(1) membership
		const toMove = new Set(elementIds);
		const elementsToReorder: string[] = [];
		for (const id of newIds) {
			if (toMove.has(id)) elementsToReorder.push(id);
		}
		newIds = newIds.filter((id) => !toMove.has(id));

		switch (operation) {
			case "bring-to-front": {
				newIds = [...newIds, ...elementsToReorder];
				break;
			}
			case "bring-forward": {
				// Move one position forward (towards end)
				// Find the last element to move and calculate its new position
				const lastElementToMove =
					elementsToReorder[elementsToReorder.length - 1];
				if (!lastElementToMove) break;
				const currentIndex = currentIds.indexOf(lastElementToMove);
				// Calculate where to insert: one position after the current position
				// Since we removed elements, we need to account for the reduced array length
				const forwardInsertIndex = Math.min(newIds.length, currentIndex + 1);
				newIds.splice(forwardInsertIndex, 0, ...elementsToReorder);
				break;
			}
			case "send-backward": {
				// Move one position backward (towards start)
				// Find the first element to move and calculate its new position
				const firstElementToMove = elementsToReorder[0];
				if (!firstElementToMove) break;
				const currentIndex = currentIds.indexOf(firstElementToMove);
				// Calculate where to insert: one position before the current position
				// Since we removed elements, we need to account for the reduced array length
				const backwardInsertIndex = Math.max(0, currentIndex - 1);
				newIds.splice(backwardInsertIndex, 0, ...elementsToReorder);
				break;
			}
			case "send-to-back": {
				newIds = [...elementsToReorder, ...newIds];
				break;
			}
		}

		set(elementIdsAtom, newIds);
	},
);

// Hook for reorder operations
export const useReorderElements = () => useSetAtom(reorderElementsAtom);

// Restore elements (for persistence)
export const restoreElementsAtom = atom(
	null,
	(_get, set, elements: Element[]) => {
		// Clear existing elements
		set(clearElementsAtom);

		// Migrate elements to new blur structure if needed
		const migratedElements = elements.map(migrateBlurStructure);

		// Add restored elements
		set(addElementsWithIdsAtom, migratedElements);
	},
);

// Element visibility operations
export const toggleElementVisibilityAtom = atom(
	null,
	(get, set, id: string) => {
		const element = get(elementAtomFamily(id));
		if (!element) return;

		// Only push to history if not in a transaction
		const inTransaction = get(isTransactionAtom);
		if (!inTransaction) {
			set(pushHistoryAtom);
		}

		set(elementAtomFamily(id), {
			...element,
			visible: !element.visible,
		});

		// Update group bounds and check if group should be disbanded
		const elementIdToGroupMap = get(elementIdToGroupMapAtom);
		const group = elementIdToGroupMap.get(id);
		if (group) {
			updateElementGroupBounds(get, set, id);
			checkAndCleanupGroup(get, set, group.id);
		}
	},
);

export const setElementVisibilityAtom = atom(
	null,
	(get, set, { id, visible }: { id: string; visible: boolean }) => {
		const element = get(elementAtomFamily(id));
		if (!element) return;

		const inTransaction = get(isTransactionAtom);
		if (!inTransaction) {
			set(pushHistoryAtom);
		}

		set(elementAtomFamily(id), {
			...element,
			visible,
		});

		// Update group bounds and check if group should be disbanded
		const elementIdToGroupMap = get(elementIdToGroupMapAtom);
		const group = elementIdToGroupMap.get(id);
		if (group) {
			updateElementGroupBounds(get, set, id);
			checkAndCleanupGroup(get, set, group.id);
		}
	},
);
