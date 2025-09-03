import { atom } from "jotai";
import {
	applyLayoutConstraintsToChildren,
	calculateChildAlignedPosition,
} from "../../canvas/utils";
import { elementIdsAtom, elementAtomFamily } from "./element-state";
import type { Element } from "./element-types";

// Apply layout constraints to frame children
export const applyLayoutConstraintsAtom = atom(
	null,
	(get, set, frameId: string) => {
		const frame = get(elementAtomFamily(frameId));
		if (!frame || frame.type !== "frame" || !frame.layoutConstraints) return;

		const elementIds = get(elementIdsAtom);
		const elements = elementIds
			.map((id) => get(elementAtomFamily(id)))
			.filter((el): el is Element => el !== null);

		const updates = applyLayoutConstraintsToChildren(frame, elements);

		// Apply all position updates
		updates.forEach(({ id, x, y }) => {
			const element = get(elementAtomFamily(id));
			if (element) {
				set(elementAtomFamily(id), { ...element, x, y });
			}
		});
	},
);

// Apply layout constraints to individual child element
export const applyChildLayoutConstraintsAtom = atom(
	null,
	(get, set, childId: string) => {
		const child = get(elementAtomFamily(childId));
		if (!child || !child.parentId || !child.layoutConstraints) return;

		const frame = get(elementAtomFamily(child.parentId));
		if (!frame || frame.type !== "frame") return;

		const alignedPosition = calculateChildAlignedPosition(child, frame);

		// Apply position update if position changed
		if (alignedPosition.x !== child.x || alignedPosition.y !== child.y) {
			set(elementAtomFamily(childId), {
				...child,
				x: alignedPosition.x,
				y: alignedPosition.y,
			});
		}
	},
);
