import type { Command, Scene } from "./types";

export const selectAll = (): Command => {
	let previousSelection: string[] = [];

	return {
		id: "selectAll",
		run(scene: Scene) {
			previousSelection = [...scene.selection];

			const next: Scene = {
				...scene,
				selection: Object.keys(scene.elements),
			};

			return next;
		},
		undo(scene: Scene) {
			const next: Scene = {
				...scene,
				selection: previousSelection,
			};

			return next;
		},
	};
};
