import type {
	CanvasKitCanvas,
	CanvasKitInstance,
} from "../../../../types/canvaskit";
import { RectangleRenderer } from "./rectangle-renderer";
import type { PaintPool } from "../paint-pool";
import type { BlurFilterCache, BlurType } from "../blur-filter-cache";
import type { PathCache } from "../path-cache";
import type {
	Gradient,
	ImageFill,
} from "../../../../store/elements/element-types";
import type { ImageCacheManager } from "../image-cache-manager";

/**
 * Frame element renderer for CanvasKit
 */
export class FrameRenderer {
	private canvasKit: CanvasKitInstance;
	private rectangleRenderer: RectangleRenderer;

	constructor(
		canvasKit: CanvasKitInstance,
		paintPool: PaintPool,
		blurFilterCache: BlurFilterCache,
		pathCache: PathCache,
		imageCacheManager: ImageCacheManager,
	) {
		this.canvasKit = canvasKit;
		this.rectangleRenderer = new RectangleRenderer(
			canvasKit,
			paintPool,
			blurFilterCache,
			pathCache,
			imageCacheManager,
		);
	}

	/**
	 * Draws a frame (similar to rectangle but with optional frame name)
	 */
	drawFrame(
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
		strokeStyle: "solid" | "dashed" = "solid",
		strokePosition: "center" | "inside" | "outside" = "center",
		frameName?: string,
		imageFill?: ImageFill,
	) {
		// Use rectangle renderer for the main frame
		this.rectangleRenderer.drawRectangle(
			canvasContext,
			x,
			y,
			width,
			height,
			fill,
			stroke,
			strokeWidth,
			blur,
			undefined, // No radius for frames
			strokeStyle,
			strokePosition,
			1,
			imageFill,
		);

		// Draw frame name if provided
		if (frameName) {
			this.drawFrameName(canvasContext, x, y, frameName);
		}
	}

	/**
	 * Draws the frame name label
	 */
	private drawFrameName(
		canvasContext: CanvasKitCanvas,
		x: number,
		y: number,
		frameName: string,
	) {
		// Create paint for frame name
		const paint = new this.canvasKit.Paint();
		// Theme-aware text color for readability on canvas background
		const isDarkMode =
			document.documentElement.getAttribute("data-theme") === "dark";
		const [r, g, b, a] = isDarkMode ? [255, 255, 255, 0.9] : [0, 0, 0, 0.85];
		paint.setColor(this.canvasKit.Color(r, g, b, a));
		paint.setStyle(this.canvasKit.PaintStyle.Fill);
		paint.setAntiAlias(true);

		// Create font for frame name
		const font = new this.canvasKit.Font(null, 12);

		// Draw frame name just outside the top-left corner
		// Position baseline slightly above the top edge and near the left edge
		const labelX = x + 2; // slight inset from the left edge
		const labelY = y - 4; // baseline a few pixels above the top edge
		canvasContext.drawText(frameName, labelX, labelY, paint, font);

		// Clean up
		paint.delete();
		font.delete();
	}
}
