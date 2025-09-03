import { useAtomValue, useSetAtom } from "jotai";
import { copyElementsAtom, pasteElementsAtom } from "./clipboard-atoms";
import {
	addElementAtom,
	addElementsAtom,
	addElementsWithIdsAtom,
	clearElementsAtom,
	debouncedUpdateParentChildRelationshipsAtom,
	deleteElementsAtom,
	duplicateElementsAtom,
	elementAtomFamily,
	elementIdsAtom,
	elementPositionAtomFamily,
	elementStyleAtomFamily,
	elementsAtom,
	setElementDimensionsLockedAtom,
	setElementLockedAtom,
	updateElementAtom,
	updateElementPositionAtom,
	updateElementStyleAtom,
	updateParentChildRelationshipsAtom,
} from "./element-atoms";
import { useReorderElements } from "./elements/element-operations";
import { childrenByParentIdAtom, elementsByIdAtom } from "./derived-atoms";

// Element hooks - including atomic property hooks
export const useElements = () => useAtomValue(elementsAtom);
export const useElementsById = () => useAtomValue(elementsByIdAtom);
export const useChildrenByParentId = () => useAtomValue(childrenByParentIdAtom);
export const useElement = (id: string) => useAtomValue(elementAtomFamily(id));
export const useElementIds = () => useAtomValue(elementIdsAtom);
export const useElementPosition = (id: string) =>
	useAtomValue(elementPositionAtomFamily(id));
export const useElementStyle = (id: string) =>
	useAtomValue(elementStyleAtomFamily(id));

// Element mutation hooks - including atomic updates
export const useAddElement = () => useSetAtom(addElementAtom);
export const useAddElements = () => useSetAtom(addElementsAtom);
export const useAddElementsWithIds = () => useSetAtom(addElementsWithIdsAtom);
export const useClearElements = () => useSetAtom(clearElementsAtom);
export const useUpdateElement = () => useSetAtom(updateElementAtom);
export const useUpdateElementPosition = () =>
	useSetAtom(updateElementPositionAtom);
export const useUpdateElementStyle = () => useSetAtom(updateElementStyleAtom);
export const useDeleteElements = () => useSetAtom(deleteElementsAtom);
export { useReorderElements };

// Parent-child relationship hooks - optimized for batched updates
export const useUpdateParentChildRelationships = () =>
	useSetAtom(updateParentChildRelationshipsAtom);
export const useDebouncedUpdateParentChildRelationships = () =>
	useSetAtom(debouncedUpdateParentChildRelationshipsAtom);

// Composite hooks for common operations - including atomic updates
export const useElementOperations = () => {
	const addElement = useAddElement();
	const addElements = useAddElements();
	const addElementsWithIds = useAddElementsWithIds();
	const clearElements = useClearElements();
	const updateElement = useUpdateElement();
	const updateElementPosition = useUpdateElementPosition();
	const updateElementStyle = useUpdateElementStyle();
	const deleteElements = useDeleteElements();
	const reorderElements = useReorderElements();
	const setElementLocked = useSetAtom(setElementLockedAtom);
	const setElementDimensionsLocked = useSetAtom(setElementDimensionsLockedAtom);
	const copyElements = useSetAtom(copyElementsAtom);
	const pasteElements = useSetAtom(pasteElementsAtom);
	const duplicateElements = useSetAtom(duplicateElementsAtom);

	return {
		addElement,
		addElements,
		addElementsWithIds,
		clearElements,
		updateElement,
		updateElementPosition,
		updateElementStyle,
		deleteElements,
		reorderElements,
		setElementLocked,
		setElementDimensionsLocked,
		copyElements,
		pasteElements,
		duplicateElements,
	};
};
