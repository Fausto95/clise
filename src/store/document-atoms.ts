import { atom } from "jotai";

export type Tool =
	| "select"
	| "rect"
	| "ellipse"
	| "frame"
	| "text"
	| "path"
	| "image";

export const documentNameAtom = atom("Untitled");
export const toolAtom = atom<Tool>("select");
