import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import { v4 as uuidv4 } from "uuid";
import { findContainingFrame } from "../canvas/utils";
import type { ImageElement, LineElement, PathElement } from "./element-atoms";
import type { Gradient } from "./elements/element-types";

// Feature flags for renderer selection
export const useCanvasKitAtom = atom<boolean>(false);
export const rendererModeAtom = atom<"canvas2d" | "canvaskit">("canvas2d");

export type Tool =
	| "select"
	| "rect"
	| "ellipse"
	| "path"
	| "text"
	| "frame"
	| "image";

export type ElementType =
	| "rect"
	| "ellipse"
	| "frame"
	| "text"
	| "line"
	| "path"
	| "image";

export interface BaseElement {
	id: string;
	type: ElementType;
	parentId: string | null;
	rotation: number;
	name: string;
	x: number;
	y: number;
	w: number;
	h: number;
	fill: string | Gradient;
	opacity: number;
	visible: boolean;
	isDragging?: boolean;
	stroke?: {
		color: string | Gradient;
		width: number;
		opacity: number;
		style: "solid" | "dashed";
		position: "center" | "inside" | "outside";
	};
	shadow?: {
		type?: "drop" | "inner";
		x: number; // offset X
		y: number; // offset Y
		blur: number;
		color: string;
		opacity: number;
		spread?: number;
	};
}

export interface RectangleElement extends BaseElement {
	type: "rect";
	blur?: {
		type: "layer" | "background";
		radius: number;
	};
	radius?: {
		topLeft: number;
		topRight: number;
		bottomRight: number;
		bottomLeft: number;
	};
}

export interface EllipseElement extends BaseElement {
	type: "ellipse";
	blur?: {
		type: "layer" | "background";
		radius: number;
	};
}

export interface FrameElement extends BaseElement {
	type: "frame";
	/** When true, children are clipped to the frame's content bounds */
	clipContent?: boolean;
}

export interface TextElement extends BaseElement {
	type: "text";
	text: string;
	color: string;
	fontSize: number;
	fontFamily: string;
}

export type Element =
	| RectangleElement
	| EllipseElement
	| FrameElement
	| TextElement
	| LineElement
	| PathElement
	| ImageElement;

type ElementPatch =
	| Partial<RectangleElement>
	| Partial<EllipseElement>
	| Partial<FrameElement>
	| Partial<TextElement>
	| Partial<LineElement>
	| Partial<PathElement>
	| Partial<ImageElement>
	| Partial<BaseElement>;

const uid = () => uuidv4();

// Core document atoms
export const documentNameAtom = atom("Untitled");
export const elementIdsAtom = atom<string[]>([]);
export const selectionAtom = atom<string[]>([]);
export const toolAtom = atom<Tool>("select");

// Interaction state atoms (single responsibility)
export const isDraggingAtom = atom<boolean>(false);
export const isResizingAtom = atom<boolean>(false);
export const isDrawingAtom = atom<boolean>(false);
export const isBoxSelectingAtom = atom<boolean>(false);
export const isEditingTextAtom = atom<boolean>(false);
export const editingTextIdAtom = atom<string | null>(null);

// Position/coordinate atoms
export const dragStartAtom = atom<{ x: number; y: number } | null>(null);
export const resizeHandleAtom = atom<string | null>(null);
export const resizingElementIdAtom = atom<string | null>(null);
export const boxSelectStartAtom = atom<{ x: number; y: number } | null>(null);
export const boxSelectEndAtom = atom<{ x: number; y: number } | null>(null);

// Drawing state atom
export const drawingElementAtom = atom<Element | null>(null);

// Context menu atom
export const contextMenuAtom = atom<{
	x: number;
	y: number;
	elementId: string | null;
	open: boolean;
}>({ x: 0, y: 0, elementId: null, open: false });

// CanvasKit state atoms
export const canvasKitInstanceAtom = atom<unknown | null>(null); // CanvasKit instance
export const canvasKitRendererAtom = atom<unknown | null>(null); // CanvasKit renderer
export const clipboardAtom = atom<Element[]>([]);

// Canvas viewport atoms - grouped related state
export const zoomAtom = atom(1);
export const panAtom = atom({ x: 0, y: 0 });
export const viewportSizeAtom = atom({ width: 1000, height: 800 });
export const canvasSizeAtom = atom({ width: 1000, height: 800 });

// Derived atoms for backward compatibility
export const panXAtom = atom(
	(get) => get(panAtom).x,
	(get, set, newX: number) => {
		const pan = get(panAtom);
		set(panAtom, { ...pan, x: newX });
	},
);

export const panYAtom = atom(
	(get) => get(panAtom).y,
	(get, set, newY: number) => {
		const pan = get(panAtom);
		set(panAtom, { ...pan, y: newY });
	},
);

export const viewportWidthAtom = atom(
	(get) => get(viewportSizeAtom).width,
	(get, set, newWidth: number) => {
		const viewport = get(viewportSizeAtom);
		set(viewportSizeAtom, { ...viewport, width: newWidth });
	},
);

export const viewportHeightAtom = atom(
	(get) => get(viewportSizeAtom).height,
	(get, set, newHeight: number) => {
		const viewport = get(viewportSizeAtom);
		set(viewportSizeAtom, { ...viewport, height: newHeight });
	},
);

export const canvasWidthAtom = atom(
	(get) => get(canvasSizeAtom).width,
	(get, set, newWidth: number) => {
		const canvas = get(canvasSizeAtom);
		set(canvasSizeAtom, { ...canvas, width: newWidth });
	},
);

export const canvasHeightAtom = atom(
	(get) => get(canvasSizeAtom).height,
	(get, set, newHeight: number) => {
		const canvas = get(canvasSizeAtom);
		set(canvasSizeAtom, { ...canvas, height: newHeight });
	},
);

// Element atoms using atomFamily for granular updates
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const elementAtomFamily = atomFamily((_: string) =>
	atom<Element | null>(null),
);

// Atomic element property atoms for fine-grained updates
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const elementPositionAtomFamily = atomFamily((id: string) =>
	atom(
		(get) => {
			const element = get(elementAtomFamily(id));
			return element
				? { x: element.x, y: element.y, w: element.w, h: element.h }
				: null;
		},
		(
			get,
			set,
			newPosition: { x?: number; y?: number; w?: number; h?: number },
		) => {
			const element = get(elementAtomFamily(id));
			if (element) {
				set(elementAtomFamily(id), { ...element, ...newPosition });
			}
		},
	),
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const elementStyleAtomFamily = atomFamily((id: string) =>
	atom(
		(get) => {
			const element = get(elementAtomFamily(id));
			return element
				? {
						fill: element.fill,
						stroke: element.stroke,
						opacity: element.opacity,
					}
				: null;
		},
		(
			get,
			set,
			newStyle: {
				fill?: string;
				stroke?: {
					color?: string;
					width?: number;
					opacity?: number;
					style?: "solid" | "dashed";
					position?: "center" | "inside" | "outside";
				};
				opacity?: number;
			},
		) => {
			const element = get(elementAtomFamily(id));
			if (element) {
				let updatedElement = { ...element, ...newStyle };
				// Handle partial stroke updates
				if (newStyle.stroke && element.stroke) {
					updatedElement.stroke = { ...element.stroke, ...newStyle.stroke };
				}
				set(elementAtomFamily(id), updatedElement as Element);
			}
		},
	),
);

// Initialize with empty canvas
elementIdsAtom.init = [];

// Derived atoms
export const elementsAtom = atom<Element[]>((get) => {
	const elementIds = get(elementIdsAtom);
	return elementIds
		.map((id) => get(elementAtomFamily(id)))
		.filter((element): element is Element => element !== null);
});

export const selectedElementsAtom = atom<Element[]>((get) => {
	const selection = get(selectionAtom);
	const elements = get(elementsAtom);
	return elements.filter((el) => selection.includes(el.id));
});

// Element manipulation atoms (write-only)
export const addElementAtom = atom(
	null,
	(_, set, newElement: Partial<Element> & { type: ElementType }) => {
		const id = uid();
		let element: Element;

		if (newElement.type === "text") {
			element = {
				id,
				type: "text",
				name: "TEXT",
				x: Math.round(newElement.x ?? 100),
				y: Math.round(newElement.y ?? 100),
				w: Math.round(newElement.w ?? 120),
				h: Math.round(newElement.h ?? 80),
				rotation: 0,
				fill: "transparent",
				opacity: 1,
				visible: true,
				parentId: newElement.parentId ?? null,
				color: newElement.color ?? "#000000",
				text: newElement.text ?? "Click to edit",
				fontSize: newElement.fontSize ?? 16,
				fontFamily: newElement.fontFamily ?? "Arial, sans-serif",
				// Text elements typically don't have strokes
				stroke: newElement.stroke,
			};
		} else if (newElement.type === "rect") {
			element = {
				id,
				type: "rect",
				name: "RECT",
				x: Math.round(newElement.x ?? 100),
				y: Math.round(newElement.y ?? 100),
				w: Math.round(newElement.w ?? 120),
				h: Math.round(newElement.h ?? 80),
				rotation: 0,
				fill: newElement.fill ?? "#e5e5e5",
				opacity: 1,
				visible: true,
				parentId: newElement.parentId ?? null,
				blur: newElement.blur ?? undefined,
				radius: newElement.radius ?? {
					topLeft: 0,
					topRight: 0,
					bottomRight: 0,
					bottomLeft: 0,
				},
				// No stroke by default
				stroke: newElement.stroke,
			};
		} else if (newElement.type === "ellipse") {
			element = {
				id,
				type: "ellipse",
				name: "ELLIPSE",
				x: Math.round(newElement.x ?? 100),
				y: Math.round(newElement.y ?? 100),
				w: Math.round(newElement.w ?? 120),
				h: Math.round(newElement.h ?? 80),
				rotation: 0,
				fill: newElement.fill ?? "#e5e5e5",
				opacity: 1,
				visible: true,
				parentId: newElement.parentId ?? null,
				blur: newElement.blur ?? undefined,
				// No stroke by default
				stroke: newElement.stroke,
			};
		} else {
			// frame
			element = {
				id,
				type: "frame",
				name: "FRAME",
				x: Math.round(newElement.x ?? 100),
				y: Math.round(newElement.y ?? 100),
				w: Math.round(newElement.w ?? 120),
				h: Math.round(newElement.h ?? 80),
				rotation: 0,
				fill: newElement.fill ?? "#ffffff",
				opacity: 1,
				visible: true,
				parentId: newElement.parentId ?? null,
				// No stroke by default
				stroke: newElement.stroke,
			};
		}

		// Add element to family
		set(elementAtomFamily(id), element);

		// Add ID to element list
		set(elementIdsAtom, (prev) => [...prev, id]);

		// Select the new element
		set(selectionAtom, [id]);

		return id;
	},
);

export const updateElementAtom = atom(
	null,
	(get, set, { id, patch }: { id: string; patch: ElementPatch }) => {
		const currentElement = get(elementAtomFamily(id));
		if (currentElement) {
			set(elementAtomFamily(id), { ...currentElement, ...patch } as Element);
		}
	},
);

// Optimized position update atom - only updates position properties
export const updateElementPositionAtom = atom(
	null,
	(
		_,
		set,
		{
			id,
			position,
		}: {
			id: string;
			position: { x?: number; y?: number; w?: number; h?: number };
		},
	) => {
		set(elementPositionAtomFamily(id), position);
	},
);

// Optimized style update atom - only updates style properties
export const updateElementStyleAtom = atom(
	null,
	(
		_,
		set,
		{
			id,
			style,
		}: {
			id: string;
			style: {
				fill?: string;
				stroke?: {
					color?: string;
					width?: number;
					opacity?: number;
					style?: "solid" | "dashed";
					position?: "center" | "inside" | "outside";
				};
				opacity?: number;
			};
		},
	) => {
		set(elementStyleAtomFamily(id), style);
	},
);

export const deleteElementsAtom = atom(null, (get, set, ids: string[]) => {
	const elements = get(elementsAtom);

	// Build adjacency: parentId -> child ids
	const childrenByParent = new Map<string, string[]>();
	for (const el of elements) {
		if (!el.parentId) continue;
		const arr = childrenByParent.get(el.parentId) ?? [];
		arr.push(el.id);
		if (!childrenByParent.has(el.parentId))
			childrenByParent.set(el.parentId, arr);
	}

	// DFS to collect all descendant ids
	const toVisit: string[] = [...ids];
	const allIdsToDelete: string[] = [];
	const seen = new Set<string>();
	while (toVisit.length) {
		const pid = toVisit.pop()!;
		if (seen.has(pid)) continue;
		seen.add(pid);
		allIdsToDelete.push(pid);
		const kids = childrenByParent.get(pid);
		if (kids && kids.length) toVisit.push(...kids);
	}

	// Remove from element IDs
	set(elementIdsAtom, (prev) =>
		prev.filter((id) => !allIdsToDelete.includes(id)),
	);

	// Clear from selection
	set(selectionAtom, (prev) =>
		prev.filter((id) => !allIdsToDelete.includes(id)),
	);

	// Remove atoms (cleanup)
	allIdsToDelete.forEach((id) => {
		set(elementAtomFamily(id), null);
	});
});

// Parent-child relationship updates
let parentUpdateTimeout: number | null = null;

export const updateParentChildRelationshipsAtom = atom(null, (get, set) => {
	const elements = get(elementsAtom);

	elements.forEach((element) => {
		const containingFrame = findContainingFrame(element, elements);
		const newParentId = containingFrame ? containingFrame.id : null;

		if (element.parentId !== newParentId) {
			set(updateElementAtom, {
				id: element.id,
				patch: { parentId: newParentId },
			});
		}
	});
});

// Optimized debounced parent-child relationship updates
export const debouncedUpdateParentChildRelationshipsAtom = atom(
	null,
	(_, set) => {
		if (parentUpdateTimeout) {
			clearTimeout(parentUpdateTimeout);
		}

		parentUpdateTimeout = setTimeout(() => {
			set(updateParentChildRelationshipsAtom);
			parentUpdateTimeout = null;
		}, 100);
	},
);

// Copy/paste operations
export const copyElementsAtom = atom(null, (get, set, ids: string[]) => {
	const elements = get(elementsAtom);

	// Build adjacency: parentId -> children (elements)
	const childrenByParent = new Map<string, Element[]>();
	for (const el of elements) {
		if (!el.parentId) continue;
		const arr = childrenByParent.get(el.parentId) ?? [];
		arr.push(el);
		if (!childrenByParent.has(el.parentId))
			childrenByParent.set(el.parentId, arr);
	}

	// Collect subtrees starting from selected ids
	const allElementsToCopy: Element[] = [];
	const stack: string[] = [...ids];
	const visited = new Set<string>();
	const byId = new Map(elements.map((e) => [e.id, e] as const));
	while (stack.length) {
		const id = stack.pop()!;
		if (visited.has(id)) continue;
		visited.add(id);
		const el = byId.get(id);
		if (el) allElementsToCopy.push(el);
		const kids = childrenByParent.get(id);
		if (kids && kids.length) stack.push(...kids.map((k) => k.id));
	}

	set(clipboardAtom, allElementsToCopy);
});

export const pasteElementsAtom = atom(
	null,
	(
		get,
		set,
		{ offsetX = 20, offsetY = 20 }: { offsetX?: number; offsetY?: number } = {},
	) => {
		const clipboard = get(clipboardAtom);

		if (clipboard.length === 0) return [];

		// Create mapping of old IDs to new IDs to maintain parent-child relationships
		const idMapping = new Map<string, string>();
		clipboard.forEach((el) => {
			idMapping.set(el.id, uid());
		});

		const newElements = clipboard.map((el) => ({
			...el,
			id: idMapping.get(el.id)!,
			name: `${el.name} Copy`,
			x: Math.round(el.x + offsetX),
			y: Math.round(el.y + offsetY),
			isDragging: false,
			// Update parentId to new ID if parent was also copied
			parentId:
				el.parentId && idMapping.has(el.parentId)
					? idMapping.get(el.parentId)!
					: null,
		}));

		const newIds = newElements.map((el) => el.id);

		// Add new elements
		newElements.forEach((element) => {
			set(elementAtomFamily(element.id), element);
		});

		// Add IDs to element list
		set(elementIdsAtom, (prev) => [...prev, ...newIds]);

		// Select new elements
		set(selectionAtom, newIds);

		return newIds;
	},
);

export const duplicateElementsAtom = atom(null, (get, set, ids: string[]) => {
	const elements = get(elementsAtom);

	// Build adjacency: parentId -> children (elements)
	const childrenByParent = new Map<string, Element[]>();
	for (const el of elements) {
		if (!el.parentId) continue;
		const arr = childrenByParent.get(el.parentId) ?? [];
		arr.push(el);
		if (!childrenByParent.has(el.parentId))
			childrenByParent.set(el.parentId, arr);
	}

	// Collect subtrees starting from selected ids
	const allElementsToDuplicate: Element[] = [];
	const stack: string[] = [...ids];
	const visited = new Set<string>();
	const byId = new Map(elements.map((e) => [e.id, e] as const));
	while (stack.length) {
		const id = stack.pop()!;
		if (visited.has(id)) continue;
		visited.add(id);
		const el = byId.get(id);
		if (el) allElementsToDuplicate.push(el);
		const kids = childrenByParent.get(id);
		if (kids && kids.length) stack.push(...kids.map((k) => k.id));
	}

	// Create mapping of old IDs to new IDs to maintain parent-child relationships
	const idMapping = new Map<string, string>();
	allElementsToDuplicate.forEach((el) => {
		idMapping.set(el.id, uid());
	});

	const newElements = allElementsToDuplicate.map((el) => ({
		...el,
		id: idMapping.get(el.id)!,
		name: `${el.name} Copy`,
		x: Math.round(el.x + 20),
		y: Math.round(el.y + 20),
		isDragging: false,
		// Update parentId to new ID if parent was also duplicated
		parentId:
			el.parentId && idMapping.has(el.parentId)
				? idMapping.get(el.parentId)!
				: null,
	}));

	const newIds = newElements.map((el) => el.id);

	// Add new elements
	newElements.forEach((element) => {
		set(elementAtomFamily(element.id), element);
	});

	// Add IDs to element list
	set(elementIdsAtom, (prev) => [...prev, ...newIds]);

	// Select new elements
	set(selectionAtom, newIds);

	return newIds;
});

// Start with empty canvas - no demo elements
