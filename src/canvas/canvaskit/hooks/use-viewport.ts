import { useAtom } from "jotai";
import { useCallback } from "react";
import { zoomAtom, panAtom } from "../../../store/viewport-atoms";

export const useViewport = () => {
	const [zoom, setZoom] = useAtom(zoomAtom);
	const [pan, setPan] = useAtom(panAtom);

	// Configurable pan speed helpers (via localStorage)
	const getWheelPanSpeed = (): number => {
		const raw = localStorage.getItem("canvas.wheelPanSpeed");
		const n = raw ? parseFloat(raw) : NaN;
		return Number.isFinite(n) && n > 0 ? n : 1; // default 1x
	};

	const getShiftPanMultiplier = (): number => {
		const raw = localStorage.getItem("canvas.shiftPanMultiplier");
		const n = raw ? parseFloat(raw) : NaN;
		return Number.isFinite(n) && n > 0 ? n : 2.5; // default 2.5x
	};

	// Transform screen coordinates to world coordinates
	const screenToWorld = useCallback(
		(screenX: number, screenY: number, canvasRect: DOMRect) => {
			const canvasX = screenX - canvasRect.left;
			const canvasY = screenY - canvasRect.top;

			// Apply inverse transformations
			const worldX = (canvasX - pan.x) / zoom;
			const worldY = (canvasY - pan.y) / zoom;

			return { x: worldX, y: worldY };
		},
		[pan, zoom],
	);

	// Transform world coordinates to screen coordinates
	const worldToScreen = useCallback(
		(worldX: number, worldY: number) => {
			const screenX = worldX * zoom + pan.x;
			const screenY = worldY * zoom + pan.y;
			return { x: screenX, y: screenY };
		},
		[pan, zoom],
	);

	const handleWheel = useCallback(
		(e: WheelEvent, canvasRect: DOMRect) => {
			// Intercept wheel to handle zoom and pan within the canvas
			e.preventDefault();

			if (e.ctrlKey || e.metaKey) {
				// Zoom with mouse position as anchor point (like HTML example)
				const mouseX = e.clientX - canvasRect.left;
				const mouseY = e.clientY - canvasRect.top;

				// Calculate zoom factor
				const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
				const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));

				// Calculate world position at mouse before zoom
				const worldX = (mouseX - pan.x) / zoom;
				const worldY = (mouseY - pan.y) / zoom;

				// Calculate new pan to keep world position under mouse
				const newPanX = mouseX - worldX * newZoom;
				const newPanY = mouseY - worldY * newZoom;

				setZoom(newZoom);
				setPan({ x: newPanX, y: newPanY });
			} else {
				// Pan (handle trackpad gestures)
				let deltaX = e.deltaX;
				let deltaY = e.deltaY;

				// Adjust for different delta modes
				if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
					deltaX *= 16;
					deltaY *= 16;
				} else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
					deltaX *= 400;
					deltaY *= 400;
				}

				// Speed modifiers (configurable via localStorage)
				const base = getWheelPanSpeed();
				const mult = e.shiftKey ? getShiftPanMultiplier() : 1;
				const speed = base * mult;
				setPan({ x: pan.x - deltaX * speed, y: pan.y - deltaY * speed });
			}
		},
		[zoom, setZoom, pan, setPan],
	);

	return {
		zoom,
		setZoom,
		pan,
		setPan,
		handleWheel,
		screenToWorld,
		worldToScreen,
	};
};
