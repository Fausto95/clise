import type {
	CanvasKitCanvas,
	CanvasKitInstance,
	CanvasKitPathEffect,
	CanvasKitPath,
	CanvasKitRectObject,
} from "../../../../types/canvaskit";
import type { PaintPool } from "../paint-pool";
import type { BlurFilterCache, BlurType } from "../blur-filter-cache";
import type { PathCache } from "../path-cache";
import type {
	Gradient,
	ImageFill,
} from "../../../../store/elements/element-types";
import { GradientUtils } from "../gradient-utils";
import { hexToRgba } from "../color-utils";
import type { ImageCacheManager } from "../image-cache-manager";
import { ImageFillUtils } from "../image-fill-utils";

/**
 * Rectangle element renderer for CanvasKit
 */
export class RectangleRenderer {
	private canvasKit: CanvasKitInstance;
	private paintPool: PaintPool;
	private blurFilterCache: BlurFilterCache;
	private pathCache: PathCache;
	private gradientUtils: GradientUtils;
	private imageFillUtils: ImageFillUtils;

	constructor(
		canvasKit: CanvasKitInstance,
		paintPool: PaintPool,
		blurFilterCache: BlurFilterCache,
		pathCache: PathCache,
		imageCacheManager: ImageCacheManager,
	) {
		this.canvasKit = canvasKit;
		this.paintPool = paintPool;
		this.blurFilterCache = blurFilterCache;
		this.pathCache = pathCache;
		this.gradientUtils = new GradientUtils(canvasKit);
		this.imageFillUtils = new ImageFillUtils(canvasKit, imageCacheManager);
	}

	/**
	 * Draws a rectangle with support for rounded corners, blur, and stroke positioning
	 */
	drawRectangle(
		canvasContext: CanvasKitCanvas,
		x: number,
		y: number,
		width: number,
		height: number,
		fill: string | Gradient,
		stroke: string | Gradient,
		strokeWidth: number = 1,
		blur?: {
			type: BlurType;
			radius: number;
		},
		radius?: {
			topLeft: number;
			topRight: number;
			bottomRight: number;
			bottomLeft: number;
		},
		strokeStyle: "solid" | "dashed" = "solid",
		strokePosition: "center" | "inside" | "outside" = "center",
		opacity: number = 1,
		imageFill?: ImageFill,
	) {
		// Normalize negative dimensions for drawing
		const left = Math.min(x, x + width);
		const top = Math.min(y, y + height);
		const actualWidth = Math.abs(width);
		const actualHeight = Math.abs(height);
		const hasRadius =
			radius &&
			(radius.topLeft > 0 ||
				radius.topRight > 0 ||
				radius.bottomRight > 0 ||
				radius.bottomLeft > 0);

		if (hasRadius) {
			// Use cached path for rounded rectangles
			const path = this.pathCache.getRoundedRectPath(
				left,
				top,
				actualWidth,
				actualHeight,
				radius,
			);

			// Draw fill
			if (fill && this.shouldRenderFill(fill)) {
				const fillPaint = this.createFillPaint(
					fill!,
					left,
					top,
					actualWidth,
					actualHeight,
					opacity,
				);

				// Apply blur filter if specified
				if (blur && blur.radius > 0) {
					if (blur.type === "background") {
						// For background blur, create a glass effect with multiple layers
						this.createGlassEffect(
							canvasContext,
							left,
							top,
							actualWidth,
							actualHeight,
							blur.radius,
							path,
						);
					} else {
						// For layer blur, use standard blur
						const blurFilter = this.blurFilterCache.getBlurFilter(
							blur.type,
							blur.radius,
						);
						if (blurFilter) {
							fillPaint.setImageFilter(blurFilter);
						}
						canvasContext.drawPath(path, fillPaint);
					}
				} else {
					canvasContext.drawPath(path, fillPaint);
				}
				if (!GradientUtils.isGradient(fill)) {
					this.paintPool.returnFillPaint(fillPaint);
				} else {
					fillPaint.delete();
				}

				// Image fill (between fill and stroke)
				if (imageFill && imageFill.enabled) {
					this.imageFillUtils.drawImageFillInRect(
						canvasContext,
						left,
						top,
						actualWidth,
						actualHeight,
						imageFill,
						radius,
						opacity,
						path,
					);
				}
			}

			// Draw stroke
			if (strokeWidth > 0 && stroke && this.shouldRenderStroke(stroke)) {
				const strokePaint = this.createStrokePaint(
					stroke!,
					strokeWidth,
					left,
					top,
					actualWidth,
					actualHeight,
					opacity,
				);

				// Dashed style
				let dashEffect: CanvasKitPathEffect | null = null;
				if (
					strokeStyle === "dashed" &&
					this.canvasKit.PathEffect &&
					strokePaint.setPathEffect
				) {
					// Basic dash pattern scaled to stroke width
					dashEffect = this.canvasKit.PathEffect.MakeDash(
						[Math.max(2, strokeWidth * 3), Math.max(2, strokeWidth * 2)],
						0,
					);
					strokePaint.setPathEffect(dashEffect);
				}

				// Apply blur filter if specified
				if (blur && blur.radius > 0) {
					const blurFilter = this.blurFilterCache.getBlurFilter(
						blur.type,
						blur.radius,
					);
					if (blurFilter) {
						strokePaint.setImageFilter(blurFilter);
					}
					// Adjust for stroke position by insetting/expanding the path
					const inset =
						strokePosition === "inside"
							? strokeWidth / 2
							: strokePosition === "outside"
								? -strokeWidth / 2
								: 0;
					let adjPath = path;
					if (inset !== 0) {
						// Get adjusted path from cache
						const adjRadius = radius
							? {
									topLeft: Math.max(0, radius.topLeft - inset),
									topRight: Math.max(0, radius.topRight - inset),
									bottomRight: Math.max(0, radius.bottomRight - inset),
									bottomLeft: Math.max(0, radius.bottomLeft - inset),
								}
							: undefined;
						adjPath = this.pathCache.getRoundedRectPath(
							left + inset,
							top + inset,
							actualWidth - inset * 2,
							actualHeight - inset * 2,
							adjRadius || {
								topLeft: 0,
								topRight: 0,
								bottomRight: 0,
								bottomLeft: 0,
							},
						);
					}

					canvasContext.drawPath(adjPath, strokePaint);
					// Note: adjPath is now cached, so we don't delete it
				} else {
					// Adjust for stroke position by insetting/expanding the path
					const inset =
						strokePosition === "inside"
							? strokeWidth / 2
							: strokePosition === "outside"
								? -strokeWidth / 2
								: 0;
					let adjPath = path;
					if (inset !== 0) {
						// Get adjusted path from cache
						const adjRadius = radius
							? {
									topLeft: Math.max(0, radius.topLeft - inset),
									topRight: Math.max(0, radius.topRight - inset),
									bottomRight: Math.max(0, radius.bottomRight - inset),
									bottomLeft: Math.max(0, radius.bottomLeft - inset),
								}
							: undefined;
						adjPath = this.pathCache.getRoundedRectPath(
							left + inset,
							top + inset,
							actualWidth - inset * 2,
							actualHeight - inset * 2,
							adjRadius || {
								topLeft: 0,
								topRight: 0,
								bottomRight: 0,
								bottomLeft: 0,
							},
						);
					}

					canvasContext.drawPath(adjPath, strokePaint);
					// Note: adjPath is now cached, so we don't delete it
				}
				if (!GradientUtils.isGradient(stroke)) {
					this.paintPool.returnStrokePaint(strokePaint);
				} else {
					strokePaint.delete();
				}
				if (dashEffect) dashEffect.delete();
			}
		} else {
			// Use regular rect for non-rounded rectangles
			const rect = this.canvasKit.XYWHRect(
				left,
				top,
				actualWidth,
				actualHeight,
			);

			// Draw fill
			if (fill && this.shouldRenderFill(fill)) {
				const fillPaint = this.createFillPaint(
					fill!,
					left,
					top,
					actualWidth,
					actualHeight,
					opacity,
				);

				// Apply blur filter if specified
				if (blur && blur.radius > 0) {
					if (blur.type === "background") {
						// For background blur, create a glass effect with multiple layers
						this.createGlassEffect(
							canvasContext,
							left,
							top,
							actualWidth,
							actualHeight,
							blur.radius,
							rect,
						);
					} else {
						// For layer blur, use standard blur
						const blurFilter = this.blurFilterCache.getBlurFilter(
							blur.type,
							blur.radius,
						);
						if (blurFilter) {
							fillPaint.setImageFilter(blurFilter);
						}
						canvasContext.drawRect(rect, fillPaint);
					}
				} else {
					canvasContext.drawRect(rect, fillPaint);
				}
				if (!GradientUtils.isGradient(fill)) {
					this.paintPool.returnFillPaint(fillPaint);
				} else {
					fillPaint.delete();
				}

				// Image fill (between fill and stroke)
				if (imageFill && imageFill.enabled) {
					this.imageFillUtils.drawImageFillInRect(
						canvasContext,
						left,
						top,
						actualWidth,
						actualHeight,
						imageFill,
						undefined,
						opacity,
					);
				}
			}

			// Draw stroke
			if (strokeWidth > 0 && stroke && this.shouldRenderStroke(stroke)) {
				const strokePaint = this.createStrokePaint(
					stroke!,
					strokeWidth,
					left,
					top,
					actualWidth,
					actualHeight,
					opacity,
				);

				// Dashed style
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

				// Apply blur filter if specified
				if (blur && blur.radius > 0) {
					const blurFilter = this.blurFilterCache.getBlurFilter(
						blur.type,
						blur.radius,
					);
					if (blurFilter) {
						strokePaint.setImageFilter(blurFilter);
					}
					// Adjust for stroke position by insetting/expanding rect
					const inset =
						strokePosition === "inside"
							? strokeWidth / 2
							: strokePosition === "outside"
								? -strokeWidth / 2
								: 0;
					const strokeRect = this.canvasKit.XYWHRect(
						left + inset,
						top + inset,
						actualWidth - inset * 2,
						actualHeight - inset * 2,
					);
					canvasContext.drawRect(strokeRect, strokePaint);
				} else {
					const inset =
						strokePosition === "inside"
							? strokeWidth / 2
							: strokePosition === "outside"
								? -strokeWidth / 2
								: 0;
					const strokeRect = this.canvasKit.XYWHRect(
						left + inset,
						top + inset,
						actualWidth - inset * 2,
						actualHeight - inset * 2,
					);
					canvasContext.drawRect(strokeRect, strokePaint);
				}
				if (!GradientUtils.isGradient(stroke)) {
					this.paintPool.returnStrokePaint(strokePaint);
				} else {
					strokePaint.delete();
				}
				if (dashEffect) dashEffect.delete();
			}
		}
	}

	/**
	 * Create a glass effect using multiple layers to simulate backdrop blur
	 * This creates a more convincing glass effect without requiring surface access
	 */
	private createGlassEffect(
		canvasContext: CanvasKitCanvas,
		x: number,
		y: number,
		width: number,
		height: number,
		blurRadius: number,
		shape: CanvasKitPath | CanvasKitRectObject,
	): void {
		// 1. Create a blurred background layer with reduced opacity
		const blurPaint = new this.canvasKit.Paint();
		blurPaint.setColor(this.canvasKit.Color(255, 255, 255, 0.1)); // Very subtle white tint
		blurPaint.setStyle(this.canvasKit.PaintStyle.Fill);
		blurPaint.setAntiAlias(true);

		const blurFilter = this.blurFilterCache.getGlassyBlurFilter(blurRadius);
		if (blurFilter) {
			blurPaint.setImageFilter(blurFilter);
		}

		// Draw the shape (either path or rect)
		if ("moveTo" in shape) {
			// It's a path
			canvasContext.drawPath(shape as CanvasKitPath, blurPaint);
		} else {
			// It's a rect
			canvasContext.drawRect(shape as CanvasKitRectObject, blurPaint);
		}

		// 2. Add a frosty overlay (low alpha white)
		const glassFill = new this.canvasKit.Paint();
		glassFill.setColor(this.canvasKit.Color(255, 255, 255, 0.18));
		glassFill.setStyle(this.canvasKit.PaintStyle.Fill);
		glassFill.setAntiAlias(true);

		if ("moveTo" in shape) {
			canvasContext.drawPath(shape as CanvasKitPath, glassFill);
		} else {
			canvasContext.drawRect(shape as CanvasKitRectObject, glassFill);
		}

		// 3. Add a subtle border highlight for the glass effect
		const glassStroke = new this.canvasKit.Paint();
		glassStroke.setColor(this.canvasKit.Color(255, 255, 255, 0.35));
		glassStroke.setStyle(this.canvasKit.PaintStyle.Stroke);
		glassStroke.setStrokeWidth(1.5);
		glassStroke.setAntiAlias(true);

		// Create a slightly inset shape for the border
		if ("moveTo" in shape) {
			// For paths, create an inset path
			const insetPath = this.pathCache.getRoundedRectPath(
				x + 0.75,
				y + 0.75,
				width - 1.5,
				height - 1.5,
				{ topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 }, // No radius for the border
			);
			canvasContext.drawPath(insetPath, glassStroke);
		} else {
			// For rects, create an inset rect
			const insetRect = this.canvasKit.XYWHRect(
				x + 0.75,
				y + 0.75,
				width - 1.5,
				height - 1.5,
			);
			canvasContext.drawRect(insetRect, glassStroke);
		}

		// Clean up
		blurPaint.delete();
		glassFill.delete();
		glassStroke.delete();
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
		opacity: number = 1,
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
			// Convert hex color to RGBA before passing to paint pool
			const rgba = hexToRgba(fill as string, opacity);
			return this.paintPool.getFillPaint(rgba);
		}
	}

	private createStrokePaint(
		stroke: string | Gradient,
		strokeWidth: number,
		x: number,
		y: number,
		width: number,
		height: number,
		opacity: number = 1,
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
			// Convert hex color to RGBA before passing to paint pool
			const rgba = hexToRgba(stroke as string, opacity);
			return this.paintPool.getStrokePaint(rgba, strokeWidth);
		}
	}
}
