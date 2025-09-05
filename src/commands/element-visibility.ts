import type { Command, Scene } from "./types";

export const toggleElementVisibility = (elementId: string): Command => {
	let originalVisibility: boolean = true;

	return {
		id: "toggleElementVisibility",
		run(scene: Scene) {
			const element = scene.elements[elementId];
			if (!element) return scene;

			originalVisibility = element.visible ?? true;

			const next: Scene = {
				...scene,
				elements: {
					...scene.elements,
					[elementId]: { ...element, visible: !originalVisibility },
				},
			};

			return next;
		},
		undo(scene: Scene) {
			const element = scene.elements[elementId];
			if (!element) return scene;

			const next: Scene = {
				...scene,
				elements: {
					...scene.elements,
					[elementId]: { ...element, visible: originalVisibility },
				},
			};

			return next;
		},
	};
};

export const setElementVisibility = (
	elementId: string,
	visible: boolean,
): Command => {
	let originalVisibility: boolean = true;

	return {
		id: "setElementVisibility",
		run(scene: Scene) {
			const element = scene.elements[elementId];
			if (!element) return scene;

			originalVisibility = element.visible ?? true;

			if (originalVisibility === visible) {
				return scene; // No change needed
			}

			const next: Scene = {
				...scene,
				elements: {
					...scene.elements,
					[elementId]: { ...element, visible },
				},
			};

			return next;
		},
		undo(scene: Scene) {
			const element = scene.elements[elementId];
			if (!element) return scene;

			const next: Scene = {
				...scene,
				elements: {
					...scene.elements,
					[elementId]: { ...element, visible: originalVisibility },
				},
			};

			return next;
		},
	};
};

export const hideSelectedElements = (): Command => {
	let affectedElements: { [id: string]: boolean } = {};

	return {
		id: "hideSelectedElements",
		run(scene: Scene) {
			affectedElements = {};

			const next: Scene = {
				...scene,
				elements: { ...scene.elements },
				selection: [], // Clear selection since hidden elements can't be selected
			};

			for (const id of scene.selection) {
				const element = scene.elements[id];
				if (element) {
					affectedElements[id] = element.visible ?? true;
					next.elements[id] = { ...element, visible: false };
				}
			}

			return next;
		},
		undo(scene: Scene) {
			const next: Scene = {
				...scene,
				elements: { ...scene.elements },
				selection: Object.keys(affectedElements), // Restore selection
			};

			for (const [id, originalVisibility] of Object.entries(affectedElements)) {
				const element = scene.elements[id];
				if (element) {
					next.elements[id] = { ...element, visible: originalVisibility };
				}
			}

			return next;
		},
	};
};
