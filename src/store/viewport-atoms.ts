import { atom } from "jotai";

// Canvas viewport atoms - grouped related state
export const zoomAtom = atom(1);
export const panAtom = atom({ x: 0, y: 0 });
export const viewportSizeAtom = atom({ width: 1000, height: 800 });
export const canvasSizeAtom = atom({ width: 1000, height: 800 });

// Derived atoms for backward compatibility
export const panXAtom = atom(
	(get) => get(panAtom).x,
	(get, set, newX: number) => {
		const currentPan = get(panAtom);
		set(panAtom, { ...currentPan, x: newX });
	},
);

export const panYAtom = atom(
	(get) => get(panAtom).y,
	(get, set, newY: number) => {
		const currentPan = get(panAtom);
		set(panAtom, { ...currentPan, y: newY });
	},
);

export const viewportWidthAtom = atom(
	(get) => get(viewportSizeAtom).width,
	(get, set, newWidth: number) => {
		const currentSize = get(viewportSizeAtom);
		set(viewportSizeAtom, { ...currentSize, width: newWidth });
	},
);

export const viewportHeightAtom = atom(
	(get) => get(viewportSizeAtom).height,
	(get, set, newHeight: number) => {
		const currentSize = get(viewportSizeAtom);
		set(viewportSizeAtom, { ...currentSize, height: newHeight });
	},
);

export const canvasWidthAtom = atom(
	(get) => get(canvasSizeAtom).width,
	(get, set, newWidth: number) => {
		const currentSize = get(canvasSizeAtom);
		set(canvasSizeAtom, { ...currentSize, width: newWidth });
	},
);

export const canvasHeightAtom = atom(
	(get) => get(canvasSizeAtom).height,
	(get, set, newHeight: number) => {
		const currentSize = get(canvasSizeAtom);
		set(canvasSizeAtom, { ...currentSize, height: newHeight });
	},
);
