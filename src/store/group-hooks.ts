import { useAtomValue, useSetAtom } from "jotai";
import {
	addGroupsAtom,
	clearGroupsAtom,
	createGroupAtom,
	deleteGroupAtom,
	elementIdToGroupMapAtom,
	getElementGroupAtom,
	groupAtomFamily,
	groupedElementIdsAtom,
	groupIdsAtom,
	groupsAtom,
	isElementGroupedAtom,
	renameGroupAtom,
	toggleGroupCollapsedAtom,
	ungroupAtom,
	updateGroupBoundsAtom,
} from "./group-atoms";

// Group read hooks
export const useGroups = () => useAtomValue(groupsAtom);
export const useGroup = (id: string) => useAtomValue(groupAtomFamily(id));
export const useGroupIds = () => useAtomValue(groupIdsAtom);
export const useGetElementGroup = () => useAtomValue(getElementGroupAtom);
export const useIsElementGrouped = () => useAtomValue(isElementGroupedAtom);
export const useGroupedElementIds = () => useAtomValue(groupedElementIdsAtom);
export const useElementIdToGroupMap = () =>
	useAtomValue(elementIdToGroupMapAtom);

// Group mutation hooks
export const useCreateGroup = () => useSetAtom(createGroupAtom);
export const useUngroup = () => useSetAtom(ungroupAtom);
export const useUpdateGroupBounds = () => useSetAtom(updateGroupBoundsAtom);
export const useToggleGroupCollapsed = () =>
	useSetAtom(toggleGroupCollapsedAtom);
export const useDeleteGroup = () => useSetAtom(deleteGroupAtom);
export const useRenameGroup = () => useSetAtom(renameGroupAtom);
export const useAddGroups = () => useSetAtom(addGroupsAtom);
export const useClearGroups = () => useSetAtom(clearGroupsAtom);

// Composite hook for all group operations
export const useGroupOperations = () => {
	const createGroup = useCreateGroup();
	const ungroup = useUngroup();
	const updateGroupBounds = useUpdateGroupBounds();
	const toggleGroupCollapsed = useToggleGroupCollapsed();
	const deleteGroup = useDeleteGroup();
	const renameGroup = useRenameGroup();
	const addGroups = useAddGroups();
	const clearGroups = useClearGroups();
	const getElementGroup = useGetElementGroup();
	const isElementGrouped = useIsElementGrouped();

	return {
		createGroup,
		ungroup,
		updateGroupBounds,
		toggleGroupCollapsed,
		deleteGroup,
		renameGroup,
		addGroups,
		clearGroups,
		getElementGroup,
		isElementGrouped,
	};
};
