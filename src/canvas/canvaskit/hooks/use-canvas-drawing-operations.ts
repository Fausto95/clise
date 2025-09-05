import { useTranslation } from "react-i18next";
import {
	useDragStart,
	useElementOperations,
	useElementsById,
	useIsDrawing,
	useSelection,
} from "../../../store";
import {
	useCommandDispatcher,
	createRect,
	createEllipse,
	createText,
	createLine,
	createElement,
} from "../../../commands";
import type { FrameElement } from "../../../store/elements/element-types";

export const useCanvasDrawingOperations = () => {
	const { t } = useTranslation();
	const { dispatch } = useCommandDispatcher();
	const { updateElement } = useElementOperations(); // Keep for real-time drawing updates
	const [selection] = useSelection();
	const [isDrawing, setIsDrawing] = useIsDrawing();
	const [dragStart, setDragStart] = useDragStart();
	const elementsById = useElementsById();

	const startDrawing = (
		startCoords: { x: number; y: number },
		tool: string,
	): string | void => {
		if (tool === "select") return;

		const elementType =
			tool === "rect"
				? "rect"
				: tool === "ellipse"
					? "ellipse"
					: tool === "frame"
						? "frame"
						: tool === "text"
							? "text"
							: tool === "line"
								? "line"
								: null;

		if (!elementType) return;

		if (elementType === "text") {
			dispatch(createText(startCoords.x, startCoords.y, ""));
			setIsDrawing(false); // Don't set as drawing since we want to edit immediately
			setDragStart(null);

			// Start editing immediately
			// We need to trigger text editing after element creation
			return; // Commands handle selection automatically
		}

		if (elementType === "line") {
			dispatch(
				createLine(startCoords.x, startCoords.y, startCoords.x, startCoords.y),
			);
			setIsDrawing(true);
			setDragStart(startCoords);
			return;
		}

		if (elementType === "rect") {
			dispatch(createRect(startCoords.x, startCoords.y, 1, 1));
		} else if (elementType === "ellipse") {
			dispatch(createEllipse(startCoords.x, startCoords.y, 1, 1));
		} else if (elementType === "frame") {
			// Create frame with custom properties using createElement
			dispatch(
				createElement<FrameElement>({
					type: "frame",
					x: startCoords.x,
					y: startCoords.y,
					w: 1,
					h: 1,
					name: `${t("elements.frame")} ${Date.now()}`,
					rotation: 0,
					fill: "#ffffff",
					opacity: 1,
					visible: true,
					locked: false,
					parentId: null,
					clipContent: true,
				}),
			);
		}

		setIsDrawing(true);
		setDragStart(startCoords);
	};

	const updateDrawing = (currentCoords: { x: number; y: number }) => {
		const selectedId = selection[0];
		const drawingElement = selectedId
			? elementsById.get(selectedId)
			: undefined;
		if (!isDrawing || !drawingElement || !dragStart) return;

		if (drawingElement.type === "text") return;

		if (drawingElement.type === "line") {
			// For lines, update the end point (x2, y2)
			updateElement({
				id: drawingElement.id,
				patch: {
					x2: currentCoords.x,
					y2: currentCoords.y,
				},
			});
			return;
		}

		// For rectangles, ellipses, and frames
		const startX = Math.min(dragStart.x, currentCoords.x);
		const startY = Math.min(dragStart.y, currentCoords.y);
		const endX = Math.max(dragStart.x, currentCoords.x);
		const endY = Math.max(dragStart.y, currentCoords.y);

		const width = Math.max(1, endX - startX);
		const height = Math.max(1, endY - startY);

		updateElement({
			id: drawingElement.id,
			patch: {
				x: startX,
				y: startY,
				w: width,
				h: height,
			},
		});
	};

	return { startDrawing, updateDrawing };
};
