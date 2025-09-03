import { useAtom } from "jotai";
import {
	canvasHeightAtom,
	canvasSizeAtom,
	canvasWidthAtom,
	panAtom,
	panXAtom,
	panYAtom,
	viewportHeightAtom,
	viewportSizeAtom,
	viewportWidthAtom,
	zoomAtom,
} from "./viewport-atoms";

// Canvas viewport hooks - optimized for fewer re-renders
export const useZoom = () => useAtom(zoomAtom);

// Atomic pan hook - single state update for both x and y
export const usePan = () => {
	const [pan, setPan] = useAtom(panAtom);
	const [panX] = useAtom(panXAtom);
	const [panY] = useAtom(panYAtom);

	const setPanAtomic = (x: number, y: number) => {
		setPan({ x, y });
	};

	const panBy = (dx: number, dy: number) => {
		setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
	};

	// Return atomic version for better performance
	return { panX, panY, setPan: setPanAtomic, panBy, pan };
};

// Atomic viewport hook - single state update for both dimensions
export const useViewport = () => {
	const [viewport, setViewportSize] = useAtom(viewportSizeAtom);
	const [viewportWidth] = useAtom(viewportWidthAtom);
	const [viewportHeight] = useAtom(viewportHeightAtom);

	const setViewport = (width: number, height: number) => {
		setViewportSize({ width, height });
	};

	return { viewportWidth, viewportHeight, setViewport, viewport };
};

// Atomic canvas size hook - single state update for both dimensions
export const useCanvasSize = () => {
	const [canvas, setCanvasSizeAtomic] = useAtom(canvasSizeAtom);
	const [canvasWidth] = useAtom(canvasWidthAtom);
	const [canvasHeight] = useAtom(canvasHeightAtom);

	const setCanvasSize = (width: number, height: number) => {
		setCanvasSizeAtomic({ width, height });
	};

	return { canvasWidth, canvasHeight, setCanvasSize, canvas };
};

// Zoom control hooks
// Optimized zoom controls - batch zoom operations
export const useZoomControls = () => {
	const [zoom, setZoom] = useAtom(zoomAtom);

	const setZoomValue = (z: number) => {
		const clampedZoom = Math.max(0.1, Math.min(5, z));
		if (clampedZoom !== zoom) {
			setZoom(clampedZoom);
		}
	};

	const zoomIn = () => {
		const newZoom = Math.min(5, zoom * 1.2);
		if (newZoom !== zoom) {
			setZoom(newZoom);
		}
	};

	const zoomOut = () => {
		const newZoom = Math.max(0.1, zoom / 1.2);
		if (newZoom !== zoom) {
			setZoom(newZoom);
		}
	};

	return { setZoom: setZoomValue, zoomIn, zoomOut, zoom };
};
