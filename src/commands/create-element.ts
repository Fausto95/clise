import type { Command, Scene } from "./types";
import type {
	Element,
	RectangleElement,
	EllipseElement,
	TextElement,
	LineElement,
	PathElement,
} from "../store/elements/element-types";
import { v4 as uuidv4 } from "uuid";

export const createElement = <T extends Element>(
	elementData: Omit<T, "id">,
): Command => {
	let elementId: string = "";

	return {
		id: "createElement",
		run(scene: Scene) {
			elementId = uuidv4();

			const element: T = {
				...elementData,
				id: elementId,
			} as T;

			const next: Scene = {
				...scene,
				elements: {
					...scene.elements,
					[elementId]: element,
				},
				selection: [elementId],
			};

			return next;
		},
		undo(scene: Scene) {
			const next: Scene = {
				...scene,
				elements: { ...scene.elements },
				selection: [],
			};

			delete next.elements[elementId];
			return next;
		},
	};
};

export const createRect = (
	x: number,
	y: number,
	w: number,
	h: number,
): Command =>
	createElement<RectangleElement>({
		type: "rect",
		x,
		y,
		w,
		h,
		name: "Rectangle",
		rotation: 0,
		fill: "#e5e5e5",
		opacity: 1,
		visible: true,
		locked: false,
		parentId: null,
	});

export const createEllipse = (
	x: number,
	y: number,
	w: number,
	h: number,
): Command =>
	createElement<EllipseElement>({
		type: "ellipse",
		x,
		y,
		w,
		h,
		name: "Ellipse",
		rotation: 0,
		fill: "#e5e5e5",
		opacity: 1,
		visible: true,
		locked: false,
		parentId: null,
	});

export const createText = (
	x: number,
	y: number,
	text: string = "Text",
): Command =>
	createElement<TextElement>({
		type: "text",
		x,
		y,
		w: 100,
		h: 20,
		name: "Text",
		rotation: 0,
		text,
		color: "#000000",
		fontSize: 16,
		fontFamily: "Arial",
		fill: "#000000",
		opacity: 1,
		visible: true,
		locked: false,
		parentId: null,
	});

export const createLine = (
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): Command =>
	createElement<LineElement>({
		type: "line",
		x: x1,
		y: y1,
		w: Math.abs(x2 - x1),
		h: Math.abs(y2 - y1),
		name: "Line",
		rotation: 0,
		x2,
		y2,
		fill: "#e5e5e5",
		stroke: {
			width: 2,
			color: "#000000",
			opacity: 1,
			style: "solid",
			position: "center",
		},
		opacity: 1,
		visible: true,
		locked: false,
		parentId: null,
	});

export const createPath = (x: number, y: number): Command =>
	createElement<PathElement>({
		type: "path",
		x,
		y,
		w: 1,
		h: 1,
		name: `Path ${Date.now()}`,
		rotation: 0,
		points: [{ x: 0, y: 0 }],
		closed: false,
		fill: "transparent",
		stroke: {
			color: "#495057",
			width: 5,
			opacity: 1,
			style: "solid",
			position: "center",
		},
		opacity: 1,
		visible: true,
		locked: false,
		parentId: null,
	});
