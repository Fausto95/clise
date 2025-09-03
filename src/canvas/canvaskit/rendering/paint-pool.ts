import type {
	CanvasKitInstance,
	CanvasKitPaint,
} from "../../../types/canvaskit";
import type { ColorCache } from "./color-cache";

/**
 * Paint object pool to reduce allocation pressure and improve performance.
 * Reuses Paint objects instead of creating new ones for each draw operation.
 */
export class PaintPool {
	private canvasKit: CanvasKitInstance;
	private colorCache: ColorCache;
	private fillPaints: CanvasKitPaint[] = [];
	private strokePaints: CanvasKitPaint[] = [];
	private maxPoolSize = 50; // Prevent unbounded growth

	constructor(canvasKit: CanvasKitInstance, colorCache: ColorCache) {
		this.canvasKit = canvasKit;
		this.colorCache = colorCache;
	}

	/**
	 * Get a fill paint object with the specified color
	 */
	getFillPaint(color: [number, number, number, number]): CanvasKitPaint {
		const paint = this.fillPaints.pop() || new this.canvasKit.Paint();
		const canvasKitColor = this.colorCache.getCanvasKitColorFromRgba(color);
		paint.setColor(canvasKitColor);
		paint.setStyle(this.canvasKit.PaintStyle.Fill);
		paint.setAntiAlias(true);
		// Clear any previous effects
		if (paint.setImageFilter) paint.setImageFilter(null);
		return paint;
	}

	/**
	 * Return a fill paint object to the pool for reuse
	 */
	returnFillPaint(paint: CanvasKitPaint): void {
		if (this.fillPaints.length < this.maxPoolSize) {
			// Clear any filters or effects before returning to pool
			paint.setImageFilter(null);
			if (paint.setPathEffect) paint.setPathEffect(null);
			this.fillPaints.push(paint);
		} else {
			// Pool is full, delete the paint object
			paint.delete();
		}
	}

	/**
	 * Get a stroke paint object with the specified color and width
	 */
	getStrokePaint(
		color: [number, number, number, number],
		strokeWidth: number,
	): CanvasKitPaint {
		const paint = this.strokePaints.pop() || new this.canvasKit.Paint();
		const canvasKitColor = this.colorCache.getCanvasKitColorFromRgba(color);
		paint.setColor(canvasKitColor);
		paint.setStyle(this.canvasKit.PaintStyle.Stroke);
		paint.setStrokeWidth(strokeWidth);
		paint.setAntiAlias(true);
		// Clear any previous effects
		if (paint.setImageFilter) paint.setImageFilter(null);
		if (paint.setPathEffect) paint.setPathEffect(null);
		return paint;
	}

	/**
	 * Return a stroke paint object to the pool for reuse
	 */
	returnStrokePaint(paint: CanvasKitPaint): void {
		if (this.strokePaints.length < this.maxPoolSize) {
			// Clear any filters or effects before returning to pool
			paint.setImageFilter(null);
			if (paint.setPathEffect) paint.setPathEffect(null);
			this.strokePaints.push(paint);
		} else {
			// Pool is full, delete the paint object
			paint.delete();
		}
	}

	/**
	 * Get pool statistics for monitoring
	 */
	getStats() {
		return {
			fillPaintsAvailable: this.fillPaints.length,
			strokePaintsAvailable: this.strokePaints.length,
			maxPoolSize: this.maxPoolSize,
		};
	}

	/**
	 * Clean up all pooled paint objects
	 */
	cleanup(): void {
		this.fillPaints.forEach((paint) => paint.delete());
		this.strokePaints.forEach((paint) => paint.delete());
		this.fillPaints = [];
		this.strokePaints = [];
	}
}
