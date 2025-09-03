import type { PathElement } from "../../../../store/element-atoms";
import type {
	CanvasKitCanvas,
	CanvasKitInstance,
} from "../../../../types/canvaskit";
import type {
	Gradient,
	ImageFill,
} from "../../../../store/elements/element-types";
import { GradientUtils } from "../gradient-utils";
import type { ImageCacheManager } from "../image-cache-manager";
import { ImageFillUtils } from "../image-fill-utils";

/**
 * Path element renderer for CanvasKit
 */
export class PathRenderer {
	private canvasKit: CanvasKitInstance;
	private gradientUtils: GradientUtils;
	private imageFillUtils: ImageFillUtils;

	constructor(
		canvasKit: CanvasKitInstance,
		imageCacheManager: ImageCacheManager,
	) {
		this.canvasKit = canvasKit;
		this.gradientUtils = new GradientUtils(canvasKit);
		this.imageFillUtils = new ImageFillUtils(canvasKit, imageCacheManager);
	}

	/**
	 * Draws a custom path with support for curves and handle visualization
	 */
	drawCustomPath(
		canvasContext: CanvasKitCanvas,
		element: PathElement,
		fill: string | Gradient,
		stroke: string | Gradient,
		strokeWidth: number,
		zoom: number,
		isSelected: boolean,
		imageFill?: ImageFill,
	) {
		const path = new this.canvasKit.Path();
		const offsetX = element.x;
		const offsetY = element.y;

		if (!element.points || element.points.length === 0) return;

		const pts = element.points;
		const firstPoint = pts[0];
		if (!firstPoint) return;

		path.moveTo(offsetX + firstPoint.x, offsetY + firstPoint.y);

		for (let i = 1; i < pts.length; i++) {
			const prev = pts[i - 1];
			const p = pts[i];
			if (!prev || !p) continue;

			if (prev.curve) {
				if (
					prev.curve.type === "cubic" &&
					prev.curve.outHandle &&
					prev.curve.inHandle
				) {
					// Cubic curve (C command) - using quadTo for now as cubicTo may not be available
					// For now, approximate cubic with quadratic using the out handle
					path.quadTo(
						offsetX + prev.curve.outHandle.x,
						offsetY + prev.curve.outHandle.y,
						offsetX + p.x,
						offsetY + p.y,
					);
				} else if (
					prev.curve.type === "quadratic" &&
					prev.curve.cx !== undefined &&
					prev.curve.cy !== undefined
				) {
					// Quadratic curve (Q command)
					path.quadTo(
						offsetX + prev.curve.cx,
						offsetY + prev.curve.cy,
						offsetX + p.x,
						offsetY + p.y,
					);
				} else if (
					prev.curve.type === "smooth" &&
					prev.curve.cx !== undefined &&
					prev.curve.cy !== undefined
				) {
					// Smooth curve (S command) - treat as quadratic for now
					path.quadTo(
						offsetX + prev.curve.cx,
						offsetY + prev.curve.cy,
						offsetX + p.x,
						offsetY + p.y,
					);
				} else {
					// Fallback to line
					path.lineTo(offsetX + p.x, offsetY + p.y);
				}
			} else {
				path.lineTo(offsetX + p.x, offsetY + p.y);
			}
		}

		if (element.closed) path.close();

		// Fill (only for closed paths)
		if (element.closed && fill && this.shouldRenderFill(fill)) {
			const fillPaint = this.createFillPaint(
				fill!,
				element.x,
				element.y,
				element.w,
				element.h,
			);
			canvasContext.drawPath(path, fillPaint);
			fillPaint.delete();
		}

		// Image fill clipped to the path
		if (element.closed && imageFill && imageFill.enabled) {
			const left = Math.min(element.x, element.x + element.w);
			const top = Math.min(element.y, element.y + element.h);
			const aw = Math.abs(element.w);
			const ah = Math.abs(element.h);
			this.imageFillUtils.drawImageFillInRect(
				canvasContext,
				left,
				top,
				aw,
				ah,
				imageFill,
				undefined,
				1,
				path,
			);
		}

		// Stroke
		if (strokeWidth > 0 && stroke && this.shouldRenderStroke(stroke)) {
			const strokePaint = this.createStrokePaint(
				stroke!,
				strokeWidth,
				element.x,
				element.y,
				element.w,
				element.h,
			);
			canvasContext.drawPath(path, strokePaint);
			strokePaint.delete();
		}

		path.delete();

		// Draw handles for each point when selected
		if (isSelected) {
			const handleRadius = Math.max(4 / zoom, 2 / zoom);
			const curveHandleRadius = Math.max(3 / zoom, 1.5 / zoom);

			// Point handles
			const pointHandleFill = new this.canvasKit.Paint();
			pointHandleFill.setStyle(this.canvasKit.PaintStyle.Fill);
			pointHandleFill.setAntiAlias(true);

			const pointHandleStroke = new this.canvasKit.Paint();
			pointHandleStroke.setColor(this.canvasKit.Color(255, 255, 255, 1.0));
			pointHandleStroke.setStyle(this.canvasKit.PaintStyle.Stroke);
			pointHandleStroke.setStrokeWidth(1 / zoom);
			pointHandleStroke.setAntiAlias(true);

			// Curve handle paint
			const curveHandleFill = new this.canvasKit.Paint();
			curveHandleFill.setColor(this.canvasKit.Color(255, 165, 0, 1.0)); // Orange
			curveHandleFill.setStyle(this.canvasKit.PaintStyle.Fill);
			curveHandleFill.setAntiAlias(true);

			const curveHandleStroke = new this.canvasKit.Paint();
			curveHandleStroke.setColor(this.canvasKit.Color(255, 255, 255, 1.0));
			curveHandleStroke.setStyle(this.canvasKit.PaintStyle.Stroke);
			curveHandleStroke.setStrokeWidth(1 / zoom);
			curveHandleStroke.setAntiAlias(true);

			// Connection lines for curve handles
			const connectionLinePaint = new this.canvasKit.Paint();
			connectionLinePaint.setColor(this.canvasKit.Color(200, 200, 200, 0.8));
			connectionLinePaint.setStyle(this.canvasKit.PaintStyle.Stroke);
			connectionLinePaint.setStrokeWidth(1 / zoom);
			connectionLinePaint.setAntiAlias(true);

			for (let i = 0; i < pts.length; i++) {
				const point = pts[i];
				if (!point) continue;

				// Set point handle color based on selection
				const isPointSelected = point.selected;
				pointHandleFill.setColor(
					this.canvasKit.Color(
						isPointSelected ? 255 : 72,
						isPointSelected ? 0 : 202,
						isPointSelected ? 0 : 228,
						1.0,
					),
				);

				// Draw point handle
				const pointRect = this.canvasKit.XYWHRect(
					offsetX + point.x - handleRadius,
					offsetY + point.y - handleRadius,
					handleRadius * 2,
					handleRadius * 2,
				);
				canvasContext.drawOval(pointRect, pointHandleFill);
				canvasContext.drawOval(pointRect, pointHandleStroke);

				// Draw curve handles if present
				if (point.curve) {
					if (
						point.curve.type === "quadratic" &&
						point.curve.cx !== undefined &&
						point.curve.cy !== undefined
					) {
						// Quadratic curve handle
						const curveRect = this.canvasKit.XYWHRect(
							offsetX + point.curve.cx - curveHandleRadius,
							offsetY + point.curve.cy - curveHandleRadius,
							curveHandleRadius * 2,
							curveHandleRadius * 2,
						);

						// Draw connection line using a simple path
						const linePath = new this.canvasKit.Path();
						linePath.moveTo(offsetX + point.x, offsetY + point.y);
						linePath.lineTo(offsetX + point.curve.cx, offsetY + point.curve.cy);
						canvasContext.drawPath(linePath, connectionLinePaint);
						linePath.delete();

						canvasContext.drawOval(curveRect, curveHandleFill);
						canvasContext.drawOval(curveRect, curveHandleStroke);
					} else if (point.curve.type === "cubic") {
						// Cubic curve handles
						if (point.curve.outHandle) {
							const outRect = this.canvasKit.XYWHRect(
								offsetX + point.curve.outHandle.x - curveHandleRadius,
								offsetY + point.curve.outHandle.y - curveHandleRadius,
								curveHandleRadius * 2,
								curveHandleRadius * 2,
							);

							// Draw connection line using a simple path
							const outLinePath = new this.canvasKit.Path();
							outLinePath.moveTo(offsetX + point.x, offsetY + point.y);
							outLinePath.lineTo(
								offsetX + point.curve.outHandle.x,
								offsetY + point.curve.outHandle.y,
							);
							canvasContext.drawPath(outLinePath, connectionLinePaint);
							outLinePath.delete();

							canvasContext.drawOval(outRect, curveHandleFill);
							canvasContext.drawOval(outRect, curveHandleStroke);
						}

						if (point.curve.inHandle) {
							const inRect = this.canvasKit.XYWHRect(
								offsetX + point.curve.inHandle.x - curveHandleRadius,
								offsetY + point.curve.inHandle.y - curveHandleRadius,
								curveHandleRadius * 2,
								curveHandleRadius * 2,
							);

							// Draw connection line using a simple path
							const inLinePath = new this.canvasKit.Path();
							inLinePath.moveTo(offsetX + point.x, offsetY + point.y);
							inLinePath.lineTo(
								offsetX + point.curve.inHandle.x,
								offsetY + point.curve.inHandle.y,
							);
							canvasContext.drawPath(inLinePath, connectionLinePaint);
							inLinePath.delete();

							canvasContext.drawOval(inRect, curveHandleFill);
							canvasContext.drawOval(inRect, curveHandleStroke);
						}
					}
				}
			}

			// Clean up paints
			pointHandleFill.delete();
			pointHandleStroke.delete();
			curveHandleFill.delete();
			curveHandleStroke.delete();
			connectionLinePaint.delete();
		}
	}

	private shouldRenderFill(fill: string | Gradient | undefined): boolean {
		if (!fill) return false;
		if (GradientUtils.isGradient(fill)) {
			return fill.stops && fill.stops.length > 0;
		}
		return fill !== "transparent" && fill !== ""; // String color check
	}

	private shouldRenderStroke(stroke: string | Gradient | undefined): boolean {
		if (!stroke) return false;
		if (GradientUtils.isGradient(stroke)) {
			return stroke.stops && stroke.stops.length > 0;
		}
		return stroke !== "transparent" && stroke !== ""; // String color check
	}

	private createFillPaint(
		fill: string | Gradient,
		x: number,
		y: number,
		width: number,
		height: number,
	) {
		if (GradientUtils.isGradient(fill)) {
			const paint = new this.canvasKit.Paint();
			paint.setStyle(this.canvasKit.PaintStyle.Fill);
			paint.setAntiAlias(true);

			const shader = this.gradientUtils.createGradientShader(
				fill,
				x,
				y,
				width,
				height,
			);
			if (shader) {
				paint.setShader(shader);
			}

			return paint;
		} else {
			// Handle string colors - need to parse to RGBA first
			const colorStr = fill as string;
			// For now, use a simple approach - more robust parsing could be added later
			const paint = new this.canvasKit.Paint();
			if (colorStr.startsWith("#")) {
				// Simple hex color parsing for common formats
				const hex = colorStr.substring(1);
				if (hex.length === 6) {
					const r = parseInt(hex.substring(0, 2), 16);
					const g = parseInt(hex.substring(2, 4), 16);
					const b = parseInt(hex.substring(4, 6), 16);
					paint.setColor(this.canvasKit.Color(r, g, b, 1));
				} else {
					paint.setColor(this.canvasKit.Color(0, 0, 0, 1)); // Fallback to black
				}
			} else {
				paint.setColor(this.canvasKit.Color(0, 0, 0, 1)); // Fallback to black
			}
			paint.setStyle(this.canvasKit.PaintStyle.Fill);
			paint.setAntiAlias(true);
			return paint;
		}
	}

	private createStrokePaint(
		stroke: string | Gradient,
		strokeWidth: number,
		x: number,
		y: number,
		width: number,
		height: number,
	) {
		if (GradientUtils.isGradient(stroke)) {
			const paint = new this.canvasKit.Paint();
			paint.setStyle(this.canvasKit.PaintStyle.Stroke);
			paint.setStrokeWidth(strokeWidth);
			paint.setAntiAlias(true);

			const shader = this.gradientUtils.createGradientShader(
				stroke,
				x,
				y,
				width,
				height,
			);
			if (shader) {
				paint.setShader(shader);
			}

			return paint;
		} else {
			// Handle string colors - need to parse to RGBA first
			const colorStr = stroke as string;
			const paint = new this.canvasKit.Paint();
			if (colorStr.startsWith("#")) {
				// Simple hex color parsing for common formats
				const hex = colorStr.substring(1);
				if (hex.length === 6) {
					const r = parseInt(hex.substring(0, 2), 16);
					const g = parseInt(hex.substring(2, 4), 16);
					const b = parseInt(hex.substring(4, 6), 16);
					paint.setColor(this.canvasKit.Color(r, g, b, 1));
				} else {
					paint.setColor(this.canvasKit.Color(0, 0, 0, 1)); // Fallback to black
				}
			} else {
				paint.setColor(this.canvasKit.Color(0, 0, 0, 1)); // Fallback to black
			}
			paint.setStyle(this.canvasKit.PaintStyle.Stroke);
			paint.setStrokeWidth(strokeWidth);
			paint.setAntiAlias(true);
			return paint;
		}
	}
}
