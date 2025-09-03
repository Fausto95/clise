import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { useElementOperations, type Element } from "@store/index";
import {
	applyLayoutConstraintsAtom,
	applyChildLayoutConstraintsAtom,
	updateImageSVGPathsAtom,
	updateParentChildRelationshipsAtom,
} from "@store/element-atoms";

export const usePropertyUpdater = () => {
	const { updateElement } = useElementOperations();
	const applyLayoutConstraints = useSetAtom(applyLayoutConstraintsAtom);
	const applyChildLayoutConstraints = useSetAtom(
		applyChildLayoutConstraintsAtom,
	);
	const updateImageSVGPaths = useSetAtom(updateImageSVGPathsAtom);
	const updateParentChildRelationships = useSetAtom(
		updateParentChildRelationshipsAtom,
	);

	const updateElementProperty = useCallback(
		(element: Element, id: string, patch: Partial<Element>) => {
			updateElement({ id, patch });

			// If updating layout constraints on a frame, apply them to children
			if (element?.type === "frame" && "layoutConstraints" in patch) {
				applyLayoutConstraints(id);
			}

			// If updating layout constraints on a child element, apply them to this element
			if (element?.parentId && "layoutConstraints" in patch) {
				applyChildLayoutConstraints(id);
			}

			// If updating padding on a frame, reapply layout constraints to all children
			if (element?.type === "frame" && "padding" in patch) {
				applyLayoutConstraints(id);
			}

			// If updating padding on a child element, reapply its own constraints
			if (element?.parentId && "padding" in patch) {
				applyChildLayoutConstraints(id);
			}

			// If toggling clip content on a frame, recompute parent-child relationships
			if (element?.type === "frame" && "clipContent" in patch) {
				updateParentChildRelationships();
			}
		},
		[
			updateElement,
			applyLayoutConstraints,
			applyChildLayoutConstraints,
			updateParentChildRelationships,
		],
	);

	return {
		updateElementProperty,
		updateImageSVGPaths,
	};
};
