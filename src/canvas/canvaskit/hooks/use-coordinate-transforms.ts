import { useCallback } from "react";
import { useViewport } from "./use-viewport";

export const useCoordinateTransforms = () => {
	const { zoom, pan, screenToWorld, worldToScreen } = useViewport();

	// Simple coordinate transformation that matches the HTML example
	const toCanvas = useCallback(
		(clientX: number, clientY: number, canvasRect: DOMRect) => {
			return screenToWorld(clientX, clientY, canvasRect);
		},
		[screenToWorld],
	);

	const toScreen = useCallback(
		(canvasX: number, canvasY: number) => {
			return worldToScreen(canvasX, canvasY);
		},
		[worldToScreen],
	);

	return {
		toCanvas,
		toScreen,
		zoom,
		pan,
		screenToWorld,
		worldToScreen,
	};
};
