import type {
	CanvasKitCanvas,
	CanvasKitInstance,
} from "../../../../types/canvaskit";

/**
 * Box selection renderer for CanvasKit
 */
export class BoxSelectionRenderer {
	private canvasKit: CanvasKitInstance;

	constructor(canvasKit: CanvasKitInstance) {
		this.canvasKit = canvasKit;
	}

	/**
	 * Draws a box selection rectangle in world coordinates
	 */
	drawBoxSelectionInWorldCoords(
		canvasContext: CanvasKitCanvas,
		start: { x: number; y: number },
		end: { x: number; y: number },
	) {
		// Box selection coordinates are already in world coordinates
		// Draw directly without coordinate transformation
		const x = Math.min(start.x, end.x);
		const y = Math.min(start.y, end.y);
		const width = Math.abs(end.x - start.x);
		const height = Math.abs(end.y - start.y);

		if (width < 2 || height < 2) return; // Don't draw very small selections

		const rect = this.canvasKit.XYWHRect(x, y, width, height);

		// Draw selection box stroke
		const strokePaint = new this.canvasKit.Paint();
		strokePaint.setColor(this.canvasKit.Color(0, 123, 255, 0.8)); // Semi-transparent blue
		strokePaint.setStyle(this.canvasKit.PaintStyle.Stroke);
		strokePaint.setStrokeWidth(1);
		strokePaint.setAntiAlias(true);
		canvasContext.drawRect(rect, strokePaint);
		strokePaint.delete();

		// Draw selection box fill
		const fillPaint = new this.canvasKit.Paint();
		fillPaint.setColor(this.canvasKit.Color(0, 123, 255, 0.1)); // Very transparent blue fill
		fillPaint.setStyle(this.canvasKit.PaintStyle.Fill);
		fillPaint.setAntiAlias(true);
		canvasContext.drawRect(rect, fillPaint);
		fillPaint.delete();
	}
}
