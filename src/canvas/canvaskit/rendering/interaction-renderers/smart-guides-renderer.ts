import type {
	CanvasKitCanvas,
	CanvasKitInstance,
	CanvasKitPaint,
} from "../../../../types/canvaskit";
import type { GuideLine } from "../../../../store/smart-guides-atoms";

export class SmartGuidesRenderer {
	private canvasKit: CanvasKitInstance;
	private guidePaint: CanvasKitPaint | null = null;

	constructor(canvasKit: CanvasKitInstance) {
		this.canvasKit = canvasKit;
	}

	/**
	 * Draw smart guides on the canvas
	 */
	drawSmartGuides(
		canvasContext: CanvasKitCanvas,
		guides: GuideLine[],
		viewportWidth: number,
		viewportHeight: number,
		zoom: number,
	): void {
		if (guides.length === 0) return;

		// Create or reuse guide paint
		if (!this.guidePaint) {
			this.guidePaint = new this.canvasKit.Paint();
			this.guidePaint.setColor(this.canvasKit.Color(120, 0, 0, 204)); // #780000 with 80% opacity
			this.guidePaint.setStyle(this.canvasKit.PaintStyle.Stroke);
			this.guidePaint.setStrokeWidth(1 / zoom); // Scale with zoom
			this.guidePaint.setAntiAlias(true);
		}

		// Draw each guide line
		for (const guide of guides) {
			const path = new this.canvasKit.Path();

			if (guide.type === "horizontal") {
				// Draw horizontal guide line across the viewport
				path.moveTo(-viewportWidth / 2, guide.position);
				path.lineTo(viewportWidth / 2, guide.position);
			} else {
				// Draw vertical guide line across the viewport
				path.moveTo(guide.position, -viewportHeight / 2);
				path.lineTo(guide.position, viewportHeight / 2);
			}

			canvasContext.drawPath(path, this.guidePaint);
			path.delete();
		}
	}

	/**
	 * Draw smart guides with custom viewport bounds
	 */
	drawSmartGuidesWithBounds(
		canvasContext: CanvasKitCanvas,
		guides: GuideLine[],
		bounds: {
			left: number;
			right: number;
			top: number;
			bottom: number;
		},
		zoom: number,
	): void {
		if (guides.length === 0) return;

		// Create or reuse guide paint
		if (!this.guidePaint) {
			this.guidePaint = new this.canvasKit.Paint();
			this.guidePaint.setColor(this.canvasKit.Color(120, 0, 0, 204)); // #780000 with 80% opacity
			this.guidePaint.setStyle(this.canvasKit.PaintStyle.Stroke);
			this.guidePaint.setStrokeWidth(1 / zoom); // Scale with zoom
			this.guidePaint.setAntiAlias(true);
		}

		// Draw each guide line
		for (const guide of guides) {
			const path = new this.canvasKit.Path();

			if (guide.type === "horizontal") {
				// Draw horizontal guide line across the bounds
				path.moveTo(bounds.left, guide.position);
				path.lineTo(bounds.right, guide.position);
			} else {
				// Draw vertical guide line across the bounds
				path.moveTo(guide.position, bounds.top);
				path.lineTo(guide.position, bounds.bottom);
			}

			canvasContext.drawPath(path, this.guidePaint);
			path.delete();
		}
	}

	/**
	 * Clean up resources
	 */
	dispose(): void {
		if (this.guidePaint) {
			this.guidePaint.delete();
			this.guidePaint = null;
		}
	}
}
