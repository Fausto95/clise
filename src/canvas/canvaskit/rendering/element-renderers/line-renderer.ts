import type {
	CanvasKitCanvas,
	CanvasKitInstance,
	CanvasKitPathEffect,
} from "../../../../types/canvaskit";

/**
 * Line element renderer for CanvasKit
 */
export class LineRenderer {
	private canvasKit: CanvasKitInstance;

	constructor(canvasKit: CanvasKitInstance) {
		this.canvasKit = canvasKit;
	}

	/**
	 * Draws a line with support for dash patterns
	 */
	drawLine(
		canvasContext: CanvasKitCanvas,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		strokeColor: [number, number, number, number],
		strokeWidth: number = 2,
		strokeStyle: "solid" | "dashed" = "solid",
	) {
		if (strokeColor[3] > 0 && strokeWidth > 0) {
			const path = new this.canvasKit.Path();
			path.moveTo(x1, y1);
			path.lineTo(x2, y2);

			const strokePaint = new this.canvasKit.Paint();
			strokePaint.setColor(this.canvasKit.Color(...strokeColor));
			strokePaint.setStyle(this.canvasKit.PaintStyle.Stroke);
			strokePaint.setStrokeWidth(strokeWidth);
			strokePaint.setAntiAlias(true);

			// Dashed style for lines
			let dashEffect: CanvasKitPathEffect | null = null;
			if (
				strokeStyle === "dashed" &&
				this.canvasKit.PathEffect &&
				strokePaint.setPathEffect
			) {
				dashEffect = this.canvasKit.PathEffect.MakeDash(
					[Math.max(2, strokeWidth * 3), Math.max(2, strokeWidth * 2)],
					0,
				);
				strokePaint.setPathEffect(dashEffect);
			}

			canvasContext.drawPath(path, strokePaint);

			path.delete();
			strokePaint.delete();
			if (dashEffect) dashEffect.delete();
		}
	}
}
