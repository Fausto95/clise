import type React from "react";
import { useContextMenu, useElements } from "../../../store";
import { getElementAtPoint } from "../../utils";
import { useCoordinateTransforms } from "./use-coordinate-transforms";
import { shouldSuppressOpen } from "../../../context-menu/suppressor";

export const useContextMenuHandler = ({
	canvasRef,
}: {
	canvasRef: React.RefObject<HTMLCanvasElement>;
}) => {
	const { toCanvas, zoom } = useCoordinateTransforms();
	const [contextMenu, setContextMenu] = useContextMenu();
	const elements = useElements();

	const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (shouldSuppressOpen()) {
			e.preventDefault();
			return;
		}
		e.preventDefault();

		const rect = canvasRef.current?.getBoundingClientRect();
		if (!rect) return;

		const clientX = e.clientX;
		const clientY = e.clientY;

		const canvasCoords = toCanvas(clientX, clientY, rect);
		const clickedElement = getElementAtPoint(canvasCoords, elements, zoom);

		// Use viewport (client) coordinates as anchor; smart positioning will clamp
		setContextMenu({
			x: clientX,
			y: clientY,
			elementId: clickedElement?.id || null,
			open: true,
		});
	};

	// Closing is handled by ContextMenu via global handlers.

	const getCurrentCursorPosition = () => {
		if (!contextMenu.open) return null;

		const rect = canvasRef.current?.getBoundingClientRect();
		if (!rect) return null;

		const canvasCoords = toCanvas(
			contextMenu.x + rect.left,
			contextMenu.y + rect.top,
			rect,
		);

		return {
			canvasX: canvasCoords.x,
			canvasY: canvasCoords.y,
		};
	};

	return { contextMenu, handleContextMenu, getCurrentCursorPosition };
};
