import { useElementsById, useSelection } from "@store/index";

export const useInspectorState = () => {
	const [selection] = useSelection();
	const elementsById = useElementsById();
	const selectedElement =
		selection.length > 0 ? elementsById.get(selection[0]!) : undefined;

	const hasSelection = selection.length > 0 && selectedElement;

	// Check if element is child of a frame (for layout constraints)
	const parentFrame = selectedElement?.parentId
		? (() => {
				const p = elementsById.get(selectedElement.parentId!);
				return p && p.type === "frame" ? p : null;
			})()
		: null;

	const isChildOfFrame = Boolean(parentFrame);

	return {
		selectedElement,
		hasSelection,
		isChildOfFrame,
		parentFrame,
	};
};
