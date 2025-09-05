import type { Command, Scene } from "./types";

export const deleteSelection = (): Command => {
	let deletedElements: { [id: string]: any } = {};
	let originalSelection: string[] = [];

	return {
		id: "deleteSelection",
		run(scene: Scene) {
			// Store deleted elements for undo
			deletedElements = {};
			originalSelection = [...scene.selection];

			for (const id of scene.selection) {
				deletedElements[id] = scene.elements[id];
			}

			const next: Scene = {
				...scene,
				elements: { ...scene.elements },
				selection: [],
			};

			// Remove selected elements
			for (const id of scene.selection) {
				delete next.elements[id];
			}

			return next;
		},
		undo(scene: Scene) {
			const next: Scene = {
				...scene,
				elements: { ...scene.elements },
				selection: [...originalSelection],
			};

			// Restore deleted elements
			for (const [id, element] of Object.entries(deletedElements)) {
				next.elements[id] = element;
			}

			return next;
		},
	};
};
