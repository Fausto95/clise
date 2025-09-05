import type { Command, Scene } from "./types";
import { v4 as uuidv4 } from "uuid";

export const copySelection = (): Command => ({
	id: "copySelection",
	run(scene: Scene) {
		const selectedElements = scene.selection
			.map((id) => scene.elements[id])
			.filter((element): element is NonNullable<typeof element> =>
				Boolean(element),
			);

		const next: Scene = {
			...scene,
			clipboard: selectedElements,
		};

		return next;
	},
});

export const pasteClipboard = (): Command => {
	let pastedIds: string[] = [];

	return {
		id: "pasteClipboard",
		run(scene: Scene) {
			if (!scene.clipboard || scene.clipboard.length === 0) {
				return scene;
			}

			const next: Scene = {
				...scene,
				elements: { ...scene.elements },
				selection: [],
			};

			pastedIds = [];
			const offset = 20;

			for (const element of scene.clipboard) {
				const newId = uuidv4();
				const pastedElement = {
					...element,
					id: newId,
					x: element.x + offset,
					y: element.y + offset,
				};

				next.elements[newId] = pastedElement;
				pastedIds.push(newId);
			}

			next.selection = pastedIds;
			return next;
		},
		undo(scene: Scene) {
			const next: Scene = {
				...scene,
				elements: { ...scene.elements },
				selection: [],
			};

			// Remove pasted elements
			for (const id of pastedIds) {
				delete next.elements[id];
			}

			return next;
		},
	};
};
