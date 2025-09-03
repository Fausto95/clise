import { useTranslation } from "react-i18next";
import {
	useDragStart,
	useElementOperations,
	useElementsById,
	useIsDrawing,
	useSelection,
} from "../../../store";

export const useCanvasDrawingOperations = () => {
	const { t } = useTranslation();
	const { addElement, updateElement } = useElementOperations();
	const [selection, setSelection] = useSelection();
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
			const defaultText = "";
			const fontSize = 16;
			const approximateCharWidth = fontSize * 0.6;
			const calculatedWidth = Math.max(
				20,
				defaultText.length * approximateCharWidth,
			); // Minimum width
			const calculatedHeight = fontSize * 1.2;

			const textElement = {
				type: "text" as const,
				x: startCoords.x,
				y: startCoords.y,
				w: calculatedWidth,
				h: calculatedHeight,
				fill: "transparent",
				opacity: 1,
				visible: true,
				parentId: null,
				rotation: 0,
				name: `${t("elements.text")} ${Date.now()}`,
				text: defaultText,
				color: "#000000",
				fontSize: fontSize,
				fontFamily: "Arial, sans-serif",
				textDecoration: "none",
				fontWeight: "normal",
				textTransform: "none",
				lineHeight: 1.2,
				letterSpacing: 0,
			};

			const elementId = addElement(textElement);
			setIsDrawing(false); // Don't set as drawing since we want to edit immediately
			setDragStart(null);
			setSelection([elementId]);

			// Start editing immediately
			// We need to trigger text editing after element creation
			return elementId;
		}

		if (elementType === "line") {
			const lineElement = {
				type: "line" as const,
				x: startCoords.x,
				y: startCoords.y,
				w: 0, // Not used for lines, but required by BaseElement
				h: 0, // Not used for lines, but required by BaseElement
				x2: startCoords.x, // Initially same as start point
				y2: startCoords.y, // Initially same as start point
				fill: "transparent",
				stroke: {
					color: "#495057",
					width: 2,
					opacity: 1,
					style: "solid" as const,
					position: "center" as const,
				},
				opacity: 1,
				visible: true,
				parentId: null,
				rotation: 0,
				name: `${t("elements.line")} ${Date.now()}`,
			};

			const elementId = addElement(lineElement);

			setIsDrawing(true);
			setDragStart(startCoords);
			setSelection([elementId]);
			return;
		}

		const fillColor = elementType === "frame" ? "#ffffff" : "#e5e5e5";
		const newElement = {
			type: elementType as "rect" | "ellipse" | "frame",
			x: startCoords.x,
			y: startCoords.y,
			w: 1,
			h: 1,
			fill: fillColor,
			opacity: 1,
			visible: true,
			parentId: null,
			rotation: 0,
			name: `${t(`elements.${elementType}`)} ${Date.now()}`,
			...(elementType === "frame" ? { clipContent: true } : {}),
		};

		const elementId = addElement(newElement);

		setIsDrawing(true);
		setDragStart(startCoords);
		setSelection([elementId]);
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
