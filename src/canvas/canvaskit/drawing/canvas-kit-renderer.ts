import type { Element, PathElement } from "../../../store/element-atoms";
import type { Group } from "../../../store/group-atoms";
import type { ImageFill } from "../../../store/elements/element-types";
import type {
	CanvasKitCanvas,
	CanvasKitInstance,
	CanvasKitSurface,
} from "../../../types/canvaskit";
import { GradientUtils } from "../rendering/gradient-utils";
import { PerformanceManager } from "../../performance/performance-manager";
import { ImageCacheManager } from "../rendering/image-cache-manager";
import { SelectionRenderer } from "../rendering/interaction-renderers/selection-renderer";
import { BoxSelectionRenderer } from "../rendering/interaction-renderers/box-selection-renderer";
import { RectangleRenderer } from "../rendering/element-renderers/rectangle-renderer";
import { LineRenderer } from "../rendering/element-renderers/line-renderer";
import { TextRenderer } from "../rendering/element-renderers/text-renderer";
import { FrameRenderer } from "../rendering/element-renderers/frame-renderer";
import { EllipseRenderer } from "../rendering/element-renderers/ellipse-renderer";
import { PathRenderer } from "../rendering/element-renderers/path-renderer";
import { ImageRenderer } from "../rendering/element-renderers/image-renderer";
import { PaintPool } from "../rendering/paint-pool";
import { BlurFilterCache } from "../rendering/blur-filter-cache";
import { PathCache } from "../rendering/path-cache";
import { ColorCache } from "../rendering/color-cache";
import { fontManager } from "../../../utils/font-manager";

interface PanState {
	x: number;
	y: number;
}

interface Dimensions {
	width: number;
	height: number;
}

export class CanvasKitRenderer {
	private canvasKit: CanvasKitInstance;
	private performanceManager: PerformanceManager;
	private lastElementsLength: number = 0;
	private metricsUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
	private imageCacheManager: ImageCacheManager; // Extracted image cache management
	private selectionRenderer: SelectionRenderer; // Extracted selection rendering
	private boxSelectionRenderer: BoxSelectionRenderer; // Extracted box selection rendering
	private rectangleRenderer: RectangleRenderer; // Extracted rectangle rendering
	private lineRenderer: LineRenderer; // Extracted line rendering
	private textRenderer: TextRenderer; // Extracted text rendering
	private frameRenderer: FrameRenderer; // Extracted frame rendering
	private ellipseRenderer: EllipseRenderer; // Extracted ellipse rendering
	private pathRenderer: PathRenderer; // Extracted path rendering
	private imageRenderer: ImageRenderer; // Extracted image rendering
	private paintPool: PaintPool; // Shared paint object pool for performance
	private blurFilterCache: BlurFilterCache; // Cached blur filters for performance
	private pathCache: PathCache; // Cached paths for performance
	private colorCache: ColorCache; // Cached color conversions for performance

	constructor(canvasKit: CanvasKitInstance, onImageLoaded?: () => void) {
		this.canvasKit = canvasKit;

		// Initialize font manager with CanvasKit
		fontManager.initialize(canvasKit);

		this.imageCacheManager = new ImageCacheManager(canvasKit, onImageLoaded);
		this.colorCache = new ColorCache(canvasKit);
		this.colorCache.preCacheCommonColors(); // Pre-cache frequently used colors
		this.paintPool = new PaintPool(canvasKit, this.colorCache);
		this.blurFilterCache = new BlurFilterCache(canvasKit);
		this.pathCache = new PathCache(canvasKit);
		this.selectionRenderer = new SelectionRenderer(canvasKit);
		this.boxSelectionRenderer = new BoxSelectionRenderer(canvasKit);
		this.rectangleRenderer = new RectangleRenderer(
			canvasKit,
			this.paintPool,
			this.blurFilterCache,
			this.pathCache,
			this.imageCacheManager,
		);
		this.lineRenderer = new LineRenderer(canvasKit);
		this.textRenderer = new TextRenderer(canvasKit, this.colorCache);
		this.frameRenderer = new FrameRenderer(
			canvasKit,
			this.paintPool,
			this.blurFilterCache,
			this.pathCache,
			this.imageCacheManager,
		);
		this.ellipseRenderer = new EllipseRenderer(
			canvasKit,
			this.paintPool,
			this.blurFilterCache,
			this.imageCacheManager,
		);
		this.pathRenderer = new PathRenderer(canvasKit, this.imageCacheManager);
		this.imageRenderer = new ImageRenderer(canvasKit, this.imageCacheManager);
		this.performanceManager = new PerformanceManager(canvasKit, {
			enableViewCulling: true,
			enableQuadtree: true,
			enableBatching: true,
			quadtreeMaxElements: 10,
			quadtreeMaxLevels: 5,
			cullingBufferPercentage: 0.2,
		});
	}

	setOnImageLoaded(callback: () => void) {
		this.imageCacheManager.setOnImageLoaded(callback);
	}

	// Color utility moved to ../rendering/color-utils.ts for reusability

	private drawElement(
		canvasContext: CanvasKitCanvas,
		element: Element,
		isSelected: boolean = false,
		zoom: number = 1,
	) {
		const { x, y, w, h, fill, stroke } = element;
		// Only extract stroke properties if stroke is defined
		const strokeColor = stroke?.color || "transparent";
		const strokeWidth = stroke?.width || 0;
		// Extract blur properties for elements that support blur
		const blur =
			(element.type === "rect" || element.type === "ellipse") &&
			"blur" in element
				? element.blur
				: undefined;

		const shadow = element.shadow;

		// Handle colors and gradients - keep strings as strings for new renderer
		const fillColorOrGradient = GradientUtils.isGradient(fill) ? fill : fill;
		const strokeColorOrGradient = GradientUtils.isGradient(strokeColor)
			? strokeColor
			: strokeColor;

		if (element.type === "rect") {
			const radius = "radius" in element ? element.radius : undefined;
			// Shadow first (drop only)
			if (shadow) {
				const sType = (shadow as { type?: string }).type || "drop";
				if (sType !== "inner") {
					this.rectangleRenderer.drawRectangle(
						canvasContext,
						x + shadow.x,
						y + shadow.y,
						w,
						h,
						shadow.color, // Use the shadow color string directly
						"transparent",
						0,
						{ type: "layer", radius: shadow.blur },
						"radius" in element ? element.radius : undefined,
					);
				}
			}

			this.rectangleRenderer.drawRectangle(
				canvasContext,
				x,
				y,
				w,
				h,
				fillColorOrGradient,
				strokeColorOrGradient,
				strokeWidth,
				blur,
				radius,
				stroke?.style || "solid",
				stroke?.position || "center",
				element.opacity,
				element.imageFill,
			);

			// Inner shadow on top of fill
			if (shadow) {
				const sType = (shadow as { type?: string }).type || "drop";
				if (sType === "inner") {
					const spread = (shadow as { spread?: number }).spread ?? 0;
					const sSigma =
						Math.min(shadow.blur || 0, 48) / Math.max(zoom, 0.0001);
					if (sSigma > 0) {
						const left = Math.min(x, x + w);
						const top = Math.min(y, y + h);
						const aw = Math.abs(w);
						const ah = Math.abs(h);
						canvasContext.save();
						if (
							radius &&
							(radius.topLeft ||
								radius.topRight ||
								radius.bottomLeft ||
								radius.bottomRight)
						) {
							const path = new this.canvasKit.Path();
							const tl = Math.max(0, radius.topLeft || 0);
							const tr = Math.max(0, radius.topRight || 0);
							const br = Math.max(0, radius.bottomRight || 0);
							const bl = Math.max(0, radius.bottomLeft || 0);
							path.moveTo(left + tl, top);
							path.lineTo(left + aw - tr, top);
							if (tr > 0)
								path.arcToTangent(left + aw, top, left + aw, top + tr, tr);
							path.lineTo(left + aw, top + ah - br);
							if (br > 0)
								path.arcToTangent(
									left + aw,
									top + ah,
									left + aw - br,
									top + ah,
									br,
								);
							path.lineTo(left + bl, top + ah);
							if (bl > 0)
								path.arcToTangent(left, top + ah, left, top + ah - bl, bl);
							path.lineTo(left, top + tl);
							if (tl > 0) path.arcToTangent(left, top, left + tl, top, tl);
							path.close();
							canvasContext.clipPath(
								path,
								this.canvasKit.ClipOp.Intersect,
								true,
							);
						} else {
							const rect = this.canvasKit.XYWHRect(left, top, aw, ah);
							canvasContext.clipRect(
								rect,
								this.canvasKit.ClipOp.Intersect,
								true,
							);
						}
						const blurPaint = new this.canvasKit.Paint();
						const blurFilter = this.canvasKit.ImageFilter.MakeBlur(
							sSigma,
							sSigma,
							this.canvasKit.TileMode.Decal,
							null,
						);
						blurPaint.setImageFilter(blurFilter);
						canvasContext.saveLayer(blurPaint);
						const sPaint = new this.canvasKit.Paint();
						const shadowColorArray = this.colorCache.hexToRgba(
							shadow.color,
							shadow.opacity,
						);
						sPaint.setColor(this.canvasKit.Color(...shadowColorArray));
						sPaint.setStyle(this.canvasKit.PaintStyle.Fill);
						sPaint.setAntiAlias(true);
						const sx = left + (shadow.x || 0) - spread;
						const sy = top + (shadow.y || 0) - spread;
						const sw = Math.max(1, aw + spread * 2);
						const sh = Math.max(1, ah + spread * 2);
						if (
							radius &&
							(radius.topLeft ||
								radius.topRight ||
								radius.bottomLeft ||
								radius.bottomRight)
						) {
							const tl2 = Math.max(0, (radius.topLeft || 0) - spread);
							const tr2 = Math.max(0, (radius.topRight || 0) - spread);
							const br2 = Math.max(0, (radius.bottomRight || 0) - spread);
							const bl2 = Math.max(0, (radius.bottomLeft || 0) - spread);
							const rp = new this.canvasKit.Path();
							rp.moveTo(sx + tl2, sy);
							rp.lineTo(sx + sw - tr2, sy);
							if (tr2 > 0) rp.arcToTangent(sx + sw, sy, sx + sw, sy + tr2, tr2);
							rp.lineTo(sx + sw, sy + sh - br2);
							if (br2 > 0)
								rp.arcToTangent(sx + sw, sy + sh, sx + sw - br2, sy + sh, br2);
							rp.lineTo(sx + bl2, sy + sh);
							if (bl2 > 0) rp.arcToTangent(sx, sy + sh, sx, sy + sh - bl2, bl2);
							rp.lineTo(sx, sy + tl2);
							if (tl2 > 0) rp.arcToTangent(sx, sy, sx + tl2, sy, tl2);
							rp.close();
							canvasContext.drawPath(rp, sPaint);
						} else {
							const sRect = this.canvasKit.XYWHRect(sx, sy, sw, sh);
							canvasContext.drawRect(sRect, sPaint);
						}
						sPaint.delete();
						canvasContext.restore();
						blurFilter.delete();
						blurPaint.delete();
						canvasContext.restore();
					}
				}
			}
		} else if (element.type === "ellipse") {
			// Shadow first (drop only)
			if (shadow) {
				const sType = (shadow as { type?: string }).type || "drop";
				if (sType !== "inner") {
					this.ellipseRenderer.drawEllipse(
						canvasContext,
						x + shadow.x,
						y + shadow.y,
						w,
						h,
						shadow.color, // Use the shadow color string directly
						"transparent",
						0,
						{ type: "layer", radius: shadow.blur },
					);
				}
			}

			this.ellipseRenderer.drawEllipse(
				canvasContext,
				x,
				y,
				w,
				h,
				fillColorOrGradient,
				strokeColorOrGradient,
				strokeWidth,
				blur,
				stroke?.style || "solid",
				stroke?.position || "center",
				element.opacity,
				(element as { imageFill?: ImageFill }).imageFill,
			);

			// Inner shadow on top of fill (ellipse)
			if (shadow) {
				const sType = (shadow as { type?: string }).type || "drop";
				if (sType === "inner") {
					const spread = (shadow as { spread?: number }).spread ?? 0;
					const sSigma =
						Math.min(shadow.blur || 0, 48) / Math.max(zoom, 0.0001);
					if (sSigma > 0) {
						const left = Math.min(x, x + w);
						const top = Math.min(y, y + h);
						const aw = Math.abs(w);
						const ah = Math.abs(h);
						canvasContext.save();
						const rect = this.canvasKit.XYWHRect(left, top, aw, ah);
						canvasContext.clipRect(rect, this.canvasKit.ClipOp.Intersect, true);
						const blurPaint = new this.canvasKit.Paint();
						const blurFilter = this.canvasKit.ImageFilter.MakeBlur(
							sSigma,
							sSigma,
							this.canvasKit.TileMode.Decal,
							null,
						);
						blurPaint.setImageFilter(blurFilter);
						canvasContext.saveLayer(blurPaint);
						const sPaint = new this.canvasKit.Paint();
						const shadowColorArray = this.colorCache.hexToRgba(
							shadow.color,
							shadow.opacity,
						);
						sPaint.setColor(this.canvasKit.Color(...shadowColorArray));
						sPaint.setStyle(this.canvasKit.PaintStyle.Fill);
						sPaint.setAntiAlias(true);
						const sx = left + (shadow.x || 0) - spread;
						const sy = top + (shadow.y || 0) - spread;
						const sw = Math.max(1, aw + spread * 2);
						const sh = Math.max(1, ah + spread * 2);
						const sRect = this.canvasKit.XYWHRect(sx, sy, sw, sh);
						canvasContext.drawOval(sRect, sPaint);
						sPaint.delete();
						canvasContext.restore();
						blurFilter.delete();
						blurPaint.delete();
						canvasContext.restore();
					}
				}
			}
		} else if (element.type === "frame") {
			// Shadow first (if any)
			if (shadow) {
				this.frameRenderer.drawFrame(
					canvasContext,
					x + shadow.x,
					y + shadow.y,
					w,
					h,
					shadow.color,
					"transparent",
					0,
					{ type: "layer", radius: shadow.blur },
					stroke?.style || "solid",
					stroke?.position || "center",
					undefined,
				);
			}

			this.frameRenderer.drawFrame(
				canvasContext,
				x,
				y,
				w,
				h,
				fillColorOrGradient,
				strokeColorOrGradient,
				strokeWidth,
				blur,
				stroke?.style || "solid",
				stroke?.position || "center",
				element.name,
				element.imageFill,
			);
		} else if (element.type === "line") {
			if ("x2" in element && "y2" in element) {
				// Line renderer currently only supports color arrays, not gradients
				// Convert string/gradient to color array
				const lineStrokeColor =
					typeof strokeColorOrGradient === "string"
						? this.colorCache.hexToRgba(
								strokeColorOrGradient,
								stroke?.opacity || 1,
							)
						: ([128, 128, 128, 1] as [number, number, number, number]); // Fallback for gradients
				this.lineRenderer.drawLine(
					canvasContext,
					x,
					y,
					element.x2,
					element.y2,
					lineStrokeColor,
					strokeWidth,
					stroke?.style || "solid",
				);

				// Draw resize handles for lines at start and end points
				if (isSelected) {
					this.selectionRenderer.drawLineResizeHandles(
						canvasContext,
						x,
						y,
						element.x2,
						element.y2,
						zoom,
					);
				}
			}
		} else if (element.type === "text") {
			// Text handles its own selection drawing with proper bounds
			const textBounds = this.textRenderer.drawText(
				canvasContext,
				element,
				isSelected,
				zoom,
				this.selectionRenderer.drawSelectionOutline.bind(
					this.selectionRenderer,
				),
				this.selectionRenderer.drawResizeHandles.bind(this.selectionRenderer),
			);
			// If text bounds were returned, selection is already drawn
			if (textBounds && isSelected) {
				return; // Skip the default selection drawing
			}
		} else if (element.type === "path") {
			this.pathRenderer.drawCustomPath(
				canvasContext,
				element as PathElement,
				fillColorOrGradient,
				strokeColorOrGradient,
				strokeWidth,
				zoom,
				isSelected,
				(element as { imageFill?: ImageFill }).imageFill,
			);
		} else if (element.type === "image") {
			this.imageRenderer.drawImage(
				canvasContext,
				element,
				isSelected,
				zoom,
				this.selectionRenderer.drawSelectionOutline.bind(
					this.selectionRenderer,
				),
				this.selectionRenderer.drawResizeHandles.bind(this.selectionRenderer),
			);
		}

		// Draw selection outline if selected (for non-text and non-image elements or text without bounds)
		if (isSelected && element.type !== "text" && element.type !== "image") {
			const padding = 8;
			// Handle negative dimensions properly
			const left = Math.min(x, x + w) - padding;
			const top = Math.min(y, y + h) - padding;
			const actualWidth = Math.abs(w) + padding * 2;
			const actualHeight = Math.abs(h) + padding * 2;
			this.selectionRenderer.drawSelectionOutline(
				canvasContext,
				left,
				top,
				actualWidth,
				actualHeight,
				zoom,
			);
			// Only draw resize handles if element is not locked and not both dimensions locked
			const lockedAny = element.locked === true;
			const lockedDims =
				element.lockedDimensions === true ||
				(element.lockedWidth === true && element.lockedHeight === true);
			if (!lockedAny && !lockedDims) {
				this.selectionRenderer.drawResizeHandles(
					canvasContext,
					left,
					top,
					actualWidth,
					actualHeight,
					zoom,
				);
			}
		}
	}

	// Path rendering methods moved to ../rendering/element-renderers/path-renderer.ts

	// Rectangle rendering methods moved to ../rendering/element-renderers/rectangle-renderer.ts

	// Line rendering methods moved to ../rendering/element-renderers/line-renderer.ts

	// Selection rendering methods moved to ../rendering/interaction-renderers/selection-renderer.ts

	// Ellipse rendering methods moved to ../rendering/element-renderers/ellipse-renderer.ts

	// Frame rendering methods moved to ../rendering/element-renderers/frame-renderer.ts

	// Text rendering methods moved to ../rendering/element-renderers/text-renderer.ts

	// Image rendering methods moved to ../rendering/element-renderers/image-renderer.ts

	// Image loading logic moved to ../rendering/image-cache-manager.ts

	// Box selection rendering methods moved to ../rendering/interaction-renderers/box-selection-renderer.ts

	public render(
		surface: CanvasKitSurface,
		pan: PanState,
		zoom: number,
		dimensions: Dimensions,
		elements: Element[] = [],
		selectedElementIds: string[] = [],
		dpr: number = 1,
		boxSelection?: {
			start: { x: number; y: number };
			end: { x: number; y: number };
		},
		groups: Group[] = [],
	) {
		if (!surface) return;

		const renderStartTime = performance.now();
		const canvasContext = surface.getCanvas();

		// Filter out invisible elements
		const visibleElements = elements.filter((el) => el.visible !== false);

		// Track viewport changes but don't skip quadtree entirely during pan/zoom
		const elementsChanged = visibleElements.length !== this.lastElementsLength;

		// Always ensure quadtree is available, but limit rebuild frequency
		if (elementsChanged || !this.performanceManager.hasQuadtree()) {
			this.performanceManager.rebuildQuadtree(visibleElements);
			this.lastElementsLength = visibleElements.length;
		}

		// Get visible elements using performance optimizations
		// Pass logical pixel dimensions (not physical pixels) to match viewport culler expectations
		const { visibleElements: elementsInView, metrics } =
			this.performanceManager.getVisibleElements(visibleElements, pan, zoom, {
				width: dimensions.width / dpr,
				height: dimensions.height / dpr,
			});

		// Save the current transform state
		canvasContext.save();

		// Scale for device pixel ratio first
		canvasContext.scale(dpr, dpr);

		// Clear the canvas with theme-appropriate background
		const isDarkMode =
			document.documentElement.getAttribute("data-theme") === "dark";
		const canvasColor = isDarkMode
			? this.canvasKit.Color(33, 37, 41, 1.0) // --gray-8 #212529 for dark mode
			: this.canvasKit.Color(248, 249, 250, 1.0); // --gray-0 #f8f9fa for light mode
		canvasContext.clear(canvasColor);

		// Apply transformations like the HTML example: translate then scale
		canvasContext.translate(pan.x, pan.y);
		canvasContext.scale(zoom, zoom);

		// Draw box selection AFTER transformations in world coordinates
		if (boxSelection) {
			this.boxSelectionRenderer.drawBoxSelectionInWorldCoords(
				canvasContext,
				boxSelection.start,
				boxSelection.end,
			);
		}

		// Identify selected groups and their member elements
		const selectedGroups = groups.filter((g) =>
			selectedElementIds.includes(g.id),
		);
		const selectedGroupElementIds = new Set<string>(
			selectedGroups.flatMap((g) => g.elementIds),
		);

		// Build a lookup for parent traversal (use all elements for correctness)
		const elementsById = new Map<string, Element>(
			elements.map((el) => [el.id, el] as const),
		);

		// Helper: collect clipping frames (ancestors with clipContent !== false)
		const getClippingFrames = (
			el: Element,
		): (Element & { type: "frame" })[] => {
			const frames: (Element & { type: "frame" })[] = [];
			let currentParentId = el.parentId;
			const safety = 1000; // prevent cycles
			let steps = 0;
			while (currentParentId && steps < safety) {
				steps++;
				const parent = elementsById.get(currentParentId);
				if (!parent) break;
				if (parent.type === "frame") {
					const frame = parent as Element & { type: "frame" };
					// Default to true when undefined
					if ((frame as { clipContent?: boolean }).clipContent !== false) {
						frames.unshift(frame);
					}
				}
				currentParentId = parent.parentId;
			}
			return frames;
		};

		// Draw all elements using original method to ensure compatibility
		// First draw all frames
		for (const element of elementsInView) {
			if (element.type === "frame") {
				// Draw selection for the element only if it's directly selected
				// and not indirectly selected via a selected group
				const isSelected =
					selectedElementIds.includes(element.id) &&
					!selectedGroupElementIds.has(element.id);
				this.drawElement(canvasContext, element, isSelected, zoom);
			}
		}

		// Then draw all non-frame elements
		for (const element of elementsInView) {
			if (element.type !== "frame") {
				// Draw selection for the element only if it's directly selected
				// and not indirectly selected via a selected group
				const isSelected =
					selectedElementIds.includes(element.id) &&
					!selectedGroupElementIds.has(element.id);

				// Apply clipping from ancestor frames with clipContent enabled
				const clipFrames = getClippingFrames(element);
				if (clipFrames.length > 0) {
					canvasContext.save();
					for (const frame of clipFrames) {
						// Compute content bounds respecting padding
						const padding = (
							frame as {
								padding?: {
									top: number;
									right: number;
									bottom: number;
									left: number;
								};
							}
						).padding || {
							top: 0,
							right: 0,
							bottom: 0,
							left: 0,
						};
						const left =
							Math.min(frame.x, frame.x + frame.w) + (padding.left || 0);
						const top =
							Math.min(frame.y, frame.y + frame.h) + (padding.top || 0);
						const width = Math.max(
							0,
							Math.abs(frame.w) - (padding.left || 0) - (padding.right || 0),
						);
						const height = Math.max(
							0,
							Math.abs(frame.h) - (padding.top || 0) - (padding.bottom || 0),
						);
						const rect = this.canvasKit.XYWHRect(left, top, width, height);
						canvasContext.clipRect(rect, this.canvasKit.ClipOp.Intersect, true);
					}
					this.drawElement(canvasContext, element, isSelected, zoom);
					canvasContext.restore();
				} else {
					this.drawElement(canvasContext, element, isSelected, zoom);
				}
			}
		}

		// Draw a single selection outline for each selected group
		if (selectedGroups.length > 0) {
			const padding = 8;
			for (const group of selectedGroups) {
				const left = group.x - padding;
				const top = group.y - padding;
				const width = group.w + padding * 2;
				const height = group.h + padding * 2;
				this.selectionRenderer.drawSelectionOutline(
					canvasContext,
					left,
					top,
					width,
					height,
					zoom,
				);
				// Intentionally skip resize handles for groups until interactions support it
			}
		}

		// Restore the transform state
		canvasContext.restore();

		// Flush the drawing commands
		surface.flush();

		// Update performance metrics with debouncing to reduce flickering
		const totalRenderTime = performance.now() - renderStartTime;

		// Update performance metrics immediately to avoid flickering
		if (window.updatePerformanceMetrics) {
			window.updatePerformanceMetrics({
				elementCount: metrics.totalElements || 0,
				visibleCount: metrics.visibleElements || 0,
				renderTime: totalRenderTime,
			});
		}
	}

	/**
	 * Update performance configuration
	 */
	public updatePerformanceConfig(
		config: Partial<Record<string, unknown>>,
	): void {
		this.performanceManager.updateConfig(config);
	}

	/**
	 * Get performance statistics
	 */
	public getPerformanceStats(): Record<string, unknown> {
		return this.performanceManager.getPerformanceStats();
	}

	/**
	 * Clean up performance manager resources
	 */
	public cleanup(): void {
		if (this.metricsUpdateTimeout) {
			clearTimeout(this.metricsUpdateTimeout);
		}
		this.imageCacheManager.cleanup();
		this.performanceManager.cleanup();
		this.paintPool.cleanup();
		this.blurFilterCache.clearCache();
		this.pathCache.clearCache();
		this.colorCache.clearCache();
	}
}
