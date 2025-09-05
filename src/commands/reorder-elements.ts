import type { Command, Scene } from "./types";

type ReorderOperation =
	| "bring-to-front"
	| "bring-forward"
	| "send-backward"
	| "send-to-back";

export const reorderElements = (
	elementIds: string[],
	operation: ReorderOperation,
): Command => {
	let originalOrder: string[] = [];

	return {
		id: "reorderElements",
		run(scene: Scene) {
			const currentIds = Object.keys(scene.elements);
			originalOrder = [...currentIds];
			let newIds = [...currentIds];

			// Remove the elements to reorder
			const toMove = new Set(elementIds);
			const elementsToReorder = newIds.filter((id) => toMove.has(id));
			newIds = newIds.filter((id) => !toMove.has(id));

			switch (operation) {
				case "bring-to-front":
					newIds = [...newIds, ...elementsToReorder];
					break;
				case "bring-forward":
					const lastElementToMove =
						elementsToReorder[elementsToReorder.length - 1];
					if (lastElementToMove) {
						const currentIndex = originalOrder.indexOf(lastElementToMove);
						const forwardInsertIndex = Math.min(
							newIds.length,
							currentIndex + 1,
						);
						newIds.splice(forwardInsertIndex, 0, ...elementsToReorder);
					}
					break;
				case "send-backward":
					const firstElementToMove = elementsToReorder[0];
					if (firstElementToMove) {
						const currentIndex = originalOrder.indexOf(firstElementToMove);
						const backwardInsertIndex = Math.max(0, currentIndex - 1);
						newIds.splice(backwardInsertIndex, 0, ...elementsToReorder);
					}
					break;
				case "send-to-back":
					newIds = [...elementsToReorder, ...newIds];
					break;
			}

			// Rebuild elements object in new order
			const reorderedElements: { [id: string]: any } = {};
			newIds.forEach((id) => {
				if (scene.elements[id]) {
					reorderedElements[id] = scene.elements[id];
				}
			});

			const next: Scene = {
				...scene,
				elements: reorderedElements,
			};

			return next;
		},
		undo(scene: Scene) {
			// Restore original order
			const restoredElements: { [id: string]: any } = {};
			originalOrder.forEach((id) => {
				if (scene.elements[id]) {
					restoredElements[id] = scene.elements[id];
				}
			});

			const next: Scene = {
				...scene,
				elements: restoredElements,
			};

			return next;
		},
	};
};
