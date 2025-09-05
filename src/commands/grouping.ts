import type { Command, Scene } from "./types";
import type { Group } from "../store/group-atoms";
import { v4 as uuidv4 } from "uuid";

export const createGroup = (elementIds: string[]): Command => {
	let groupId: string = "";

	return {
		id: "createGroup",
		run(scene: Scene) {
			if (elementIds.length < 2) {
				return scene;
			}

			groupId = uuidv4();

			// Calculate group bounds from elements
			const elements = elementIds
				.map((id) => scene.elements[id])
				.filter((element): element is NonNullable<typeof element> =>
					Boolean(element),
				);
			if (elements.length === 0) return scene;

			const minX = Math.min(...elements.map((e) => e.x));
			const minY = Math.min(...elements.map((e) => e.y));
			const maxX = Math.max(...elements.map((e) => e.x + e.w));
			const maxY = Math.max(...elements.map((e) => e.y + e.h));

			const group: Group = {
				id: groupId,
				name: `Group ${groupId.slice(0, 8)}`,
				elementIds,
				x: minX,
				y: minY,
				w: maxX - minX,
				h: maxY - minY,
				collapsed: false,
				created: Date.now(),
			};

			const next: Scene = {
				...scene,
				groups: { ...scene.groups, [groupId]: group },
				selection: [groupId],
			};

			return next;
		},
		undo(scene: Scene) {
			const next: Scene = {
				...scene,
				groups: { ...scene.groups },
				selection: elementIds,
			};

			delete next.groups[groupId];
			return next;
		},
	};
};

export const ungroup = (groupId: string): Command => {
	let ungroupedGroup: Group | null = null;

	return {
		id: "ungroup",
		run(scene: Scene) {
			const group = scene.groups[groupId];
			if (!group) return scene;

			ungroupedGroup = group;

			const next: Scene = {
				...scene,
				groups: { ...scene.groups },
				selection: group.elementIds,
			};

			delete next.groups[groupId];
			return next;
		},
		undo(scene: Scene) {
			if (!ungroupedGroup) return scene;

			const next: Scene = {
				...scene,
				groups: { ...scene.groups, [groupId]: ungroupedGroup },
				selection: [groupId],
			};

			return next;
		},
	};
};
