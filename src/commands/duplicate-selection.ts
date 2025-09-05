import type { Command, Scene } from "./types";
import { v4 as uuidv4 } from "uuid";

export const duplicateSelection = (): Command => ({
	id: "duplicateSelection",
	run(scene: Scene) {
		const next: Scene = {
			...scene,
			elements: { ...scene.elements },
			selection: [],
		};

		const newSelection: string[] = [];
		const offset = 20; // Offset for duplicated elements

		for (const id of scene.selection) {
			const e = scene.elements[id];
			if (e) {
				const newId = uuidv4();
				const duplicatedElement = {
					...e,
					id: newId,
					x: e.x + offset,
					y: e.y + offset,
				};

				next.elements[newId] = duplicatedElement;
				newSelection.push(newId);
			}
		}

		next.selection = newSelection;
		return next;
	},
	undo(scene: Scene) {
		// For simplicity, this would need to store the duplicated IDs
		// In a real implementation, you'd store command metadata
		return scene;
	},
});
