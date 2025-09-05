import type { Command, Scene } from "./types";

export const moveSelection = (dx: number, dy: number): Command => ({
	id: "moveSelection",
	run(scene: Scene) {
		const next: Scene = {
			...scene,
			elements: { ...scene.elements },
		};

		for (const id of scene.selection) {
			const e = scene.elements[id];
			if (e && !e.locked) {
				next.elements[id] = { ...e, x: e.x + dx, y: e.y + dy };
			}
		}

		return next;
	},
	undo(scene: Scene) {
		// Undo by moving in the opposite direction
		const next: Scene = {
			...scene,
			elements: { ...scene.elements },
		};

		for (const id of scene.selection) {
			const e = scene.elements[id];
			if (e && !e.locked) {
				next.elements[id] = { ...e, x: e.x - dx, y: e.y - dy };
			}
		}

		return next;
	},
});
