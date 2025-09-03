import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { Element } from "./element-types";

export const elementIdsAtom = atom<string[]>([]);

// Element atoms using atomFamily for granular updates
export const elementAtomFamily = atomFamily((_: string) =>
	atom<Element | null>(null),
);

// Computed atom to get all elements
export const elementsAtom = atom((get) => {
	const elementIds = get(elementIdsAtom);
	return elementIds
		.map((id) => get(elementAtomFamily(id)))
		.filter((element): element is Element => element !== null);
});

// Atomic element property atoms for fine-grained updates
export const elementPositionAtomFamily = atomFamily((id: string) =>
	atom(
		(get) => {
			const element = get(elementAtomFamily(id));
			if (!element) return null;
			return { x: element.x, y: element.y, w: element.w, h: element.h };
		},
		(
			get,
			set,
			newPosition: { x?: number; y?: number; w?: number; h?: number },
		) => {
			const element = get(elementAtomFamily(id));
			if (!element) return;

			set(elementAtomFamily(id), {
				...element,
				x: newPosition.x ?? element.x,
				y: newPosition.y ?? element.y,
				w: newPosition.w ?? element.w,
				h: newPosition.h ?? element.h,
			});
		},
	),
);

export const elementStyleAtomFamily = atomFamily((id: string) =>
	atom(
		(get) => {
			const element = get(elementAtomFamily(id));
			if (!element) return null;
			return {
				fill: element.fill,
				opacity: element.opacity,
				stroke: element.stroke,
				shadow: element.shadow,
			};
		},
		(get, set, style: Partial<Element>) => {
			const element = get(elementAtomFamily(id));
			if (!element) return;

			set(elementAtomFamily(id), {
				...element,
				...style,
			} as Element);
		},
	),
);
