import type {
	CanvasKitCanvas,
	CanvasKitInstance,
} from "../../../../types/canvaskit";

/**
 * Selection outline and resize handles renderer for CanvasKit
 */
export class SelectionRenderer {
	private canvasKit: CanvasKitInstance;

	constructor(canvasKit: CanvasKitInstance) {
		this.canvasKit = canvasKit;
	}

	/**
	 * Draws a selection outline around an element
	 */
	drawSelectionOutline(
		canvasContext: CanvasKitCanvas,
		x: number,
		y: number,
		width: number,
		height: number,
		zoom: number = 1,
	) {
		const strokePaint = new this.canvasKit.Paint();
		strokePaint.setColor(this.canvasKit.Color(72, 202, 228, 0.8)); // #48cae4 selection color
		strokePaint.setStyle(this.canvasKit.PaintStyle.Stroke);
		strokePaint.setStrokeWidth(1 / zoom); // Scale stroke width inversely with zoom
		strokePaint.setAntiAlias(true);

		// Calculate actual bounds to handle negative dimensions
		const left = Math.min(x, x + width);
		const top = Math.min(y, y + height);
		const actualWidth = Math.abs(width);
		const actualHeight = Math.abs(height);

		const rect = this.canvasKit.XYWHRect(left, top, actualWidth, actualHeight);
		canvasContext.drawRect(rect, strokePaint);

		strokePaint.delete();
	}

	/**
	 * Draws resize handles around an element
	 */
	drawResizeHandles(
		canvasContext: CanvasKitCanvas,
		x: number,
		y: number,
		width: number,
		height: number,
		zoom: number = 1,
	) {
		const handleSize = 6 / zoom; // Scale handle size inversely with zoom

		// Calculate actual bounds to handle negative dimensions
		const left = Math.min(x, x + width);
		const right = Math.max(x, x + width);
		const top = Math.min(y, y + height);
		const bottom = Math.max(y, y + height);
		const actualWidth = right - left;
		const actualHeight = bottom - top;

		const handles = [
			{ x: left - handleSize / 2, y: top - handleSize / 2 }, // nw
			{ x: left + actualWidth / 2 - handleSize / 2, y: top - handleSize / 2 }, // n
			{ x: right - handleSize / 2, y: top - handleSize / 2 }, // ne
			{ x: right - handleSize / 2, y: top + actualHeight / 2 - handleSize / 2 }, // e
			{ x: right - handleSize / 2, y: bottom - handleSize / 2 }, // se
			{
				x: left + actualWidth / 2 - handleSize / 2,
				y: bottom - handleSize / 2,
			}, // s
			{ x: left - handleSize / 2, y: bottom - handleSize / 2 }, // sw
			{ x: left - handleSize / 2, y: top + actualHeight / 2 - handleSize / 2 }, // w
		];

		const fillPaint = new this.canvasKit.Paint();
		fillPaint.setColor(this.canvasKit.Color(72, 202, 228, 1.0)); // #48cae4 fill
		fillPaint.setStyle(this.canvasKit.PaintStyle.Fill);
		fillPaint.setAntiAlias(true);

		for (const handle of handles) {
			const rect = this.canvasKit.XYWHRect(
				handle.x,
				handle.y,
				handleSize,
				handleSize,
			);
			canvasContext.drawOval(rect, fillPaint); // Rounded handles using drawOval
		}

		fillPaint.delete();
	}

	/**
	 * Draws resize handles for line elements
	 */
	drawLineResizeHandles(
		canvasContext: CanvasKitCanvas,
		startX: number,
		startY: number,
		endX: number,
		endY: number,
		zoom: number = 1,
	) {
		const handleSize = 6 / zoom;
		const handlePaintFill = new this.canvasKit.Paint();
		handlePaintFill.setColor(this.canvasKit.Color(72, 202, 228, 1.0));
		handlePaintFill.setStyle(this.canvasKit.PaintStyle.Fill);
		handlePaintFill.setAntiAlias(true);

		const handlePaintStroke = new this.canvasKit.Paint();
		handlePaintStroke.setColor(this.canvasKit.Color(255, 255, 255, 1.0));
		handlePaintStroke.setStyle(this.canvasKit.PaintStyle.Stroke);
		handlePaintStroke.setStrokeWidth(1 / zoom);
		handlePaintStroke.setAntiAlias(true);

		// Draw handle at start point
		const startRect = this.canvasKit.XYWHRect(
			startX - handleSize / 2,
			startY - handleSize / 2,
			handleSize,
			handleSize,
		);
		canvasContext.drawOval(startRect, handlePaintFill);
		canvasContext.drawOval(startRect, handlePaintStroke);

		// Draw handle at end point
		const endRect = this.canvasKit.XYWHRect(
			endX - handleSize / 2,
			endY - handleSize / 2,
			handleSize,
			handleSize,
		);
		canvasContext.drawOval(endRect, handlePaintFill);
		canvasContext.drawOval(endRect, handlePaintStroke);

		handlePaintFill.delete();
		handlePaintStroke.delete();
	}
}
