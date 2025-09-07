import type { Element, TextElement } from "../../store/element-atoms";
import type {
	CanvasKitCanvas,
	CanvasKitInstance,
	CanvasKitPaint,
	CanvasKitPath,
} from "../../types/canvaskit";
import { fontManager } from "../../utils/font-manager";

export interface RenderBatch {
	elements: Element[];
	type: "rect" | "ellipse" | "text" | "frame" | "line" | "image" | "path";
	paint?: CanvasKitPaint;
	strokePaint?: CanvasKitPaint;
}

export interface BatchedDrawCall {
	execute: (canvas: CanvasKitCanvas) => void;
	cleanup: () => void;
}

export class BatchRenderer {
	private canvasKit: CanvasKitInstance;
	private paintCache: Map<string, CanvasKitPaint> = new Map();
	private pathCache: Map<string, CanvasKitPath> = new Map();
	private cachedDrawCalls: Map<string, BatchedDrawCall> = new Map();

	constructor(canvasKit: CanvasKitInstance) {
		this.canvasKit = canvasKit;
	}

	/**
	 * Create or retrieve a cached paint object
	 */
	private getOrCreatePaint(
		key: string,
		factory: () => CanvasKitPaint,
	): CanvasKitPaint {
		let paint = this.paintCache.get(key);
		if (!paint) {
			paint = factory();
			this.paintCache.set(key, paint);
		}
		return paint;
	}

	/**
	 * Create or retrieve a cached path object
	 */
	private getOrCreatePath(
		key: string,
		factory: () => CanvasKitPath,
	): CanvasKitPath {
		let path = this.pathCache.get(key);
		if (!path) {
			path = factory();
			this.pathCache.set(key, path);
		}
		return path;
	}

	/**
	 * Generate a cache key for paint based on properties
	 */
	private getPaintCacheKey(
		color: [number, number, number, number],
		style: "fill" | "stroke",
		strokeWidth?: number,
		blur?: {
			type: "layer" | "background";
			radius: number;
		},
	): string {
		const blurKey = blur ? `${blur.type}_${blur.radius}` : "0";
		return `${style}_${color.join(",")}_${strokeWidth || 0}_${blurKey}`;
	}

	/**
	 * Generate a cache key for path based on geometry
	 */
	private getPathCacheKey(
		type: string,
		x: number,
		y: number,
		w: number,
		h: number,
		radius?: {
			topLeft: number;
			topRight: number;
			bottomRight: number;
			bottomLeft: number;
		},
	): string {
		const radiusKey = radius ? JSON.stringify(radius) : "none";
		return `${type}_${x}_${y}_${w}_${h}_${radiusKey}`;
	}

	/**
	 * Create a fill paint with caching
	 */
	private createFillPaint(
		fillColor: [number, number, number, number],
		blur?: {
			type: "layer" | "background";
			radius: number;
		},
	): CanvasKitPaint {
		const key = this.getPaintCacheKey(fillColor, "fill", 0, blur);

		return this.getOrCreatePaint(key, () => {
			const paint = new this.canvasKit.Paint();
			paint.setColor(this.canvasKit.Color(...fillColor));
			paint.setStyle(this.canvasKit.PaintStyle.Fill);
			paint.setAntiAlias(true);

			if (blur && blur.radius > 0) {
				if (blur.type === "background") {
					// For background blur, create a more glassy effect
					const tileMode = this.canvasKit.TileMode.Clamp;
					const blurFilter = this.canvasKit.ImageFilter.MakeBlur(
						blur.radius,
						blur.radius,
						tileMode,
						null,
					);
					paint.setImageFilter(blurFilter);
					// Create a more transparent color for glassy effect
					const glassyColor = [
						fillColor[0],
						fillColor[1],
						fillColor[2],
						fillColor[3] * 0.6,
					] as [number, number, number, number];
					paint.setColor(this.canvasKit.Color(...glassyColor));
				} else {
					// For layer blur, use standard blur
					const tileMode = this.canvasKit.TileMode.Decal;
					const blurFilter = this.canvasKit.ImageFilter.MakeBlur(
						blur.radius,
						blur.radius,
						tileMode,
						null,
					);
					paint.setImageFilter(blurFilter);
				}
			}

			return paint;
		});
	}

	/**
	 * Create a stroke paint with caching
	 */
	private createStrokePaint(
		strokeColor: [number, number, number, number],
		strokeWidth: number,
		blur?: {
			type: "layer" | "background";
			radius: number;
		},
	): CanvasKitPaint {
		const key = this.getPaintCacheKey(strokeColor, "stroke", strokeWidth, blur);

		return this.getOrCreatePaint(key, () => {
			const paint = new this.canvasKit.Paint();
			paint.setColor(this.canvasKit.Color(...strokeColor));
			paint.setStyle(this.canvasKit.PaintStyle.Stroke);
			paint.setStrokeWidth(strokeWidth);
			paint.setAntiAlias(true);

			if (blur && blur.radius > 0) {
				if (blur.type === "background") {
					// For background blur, create a more glassy effect
					const tileMode = this.canvasKit.TileMode.Clamp;
					const blurFilter = this.canvasKit.ImageFilter.MakeBlur(
						blur.radius,
						blur.radius,
						tileMode,
						null,
					);
					paint.setImageFilter(blurFilter);
					// Create a more transparent color for glassy effect
					const glassyColor = [
						strokeColor[0],
						strokeColor[1],
						strokeColor[2],
						strokeColor[3] * 0.6,
					] as [number, number, number, number];
					paint.setColor(this.canvasKit.Color(...glassyColor));
				} else {
					// For layer blur, use standard blur
					const tileMode = this.canvasKit.TileMode.Decal;
					const blurFilter = this.canvasKit.ImageFilter.MakeBlur(
						blur.radius,
						blur.radius,
						tileMode,
						null,
					);
					paint.setImageFilter(blurFilter);
				}
			}

			return paint;
		});
	}

	/**
	 * Convert hex color to RGBA tuple
	 */
	private hexToRgba(
		hex: string,
		opacity: number = 1,
	): [number, number, number, number] {
		hex = hex.replace("#", "");

		if (hex.length === 3) {
			hex = hex
				.split("")
				.map((char) => char + char)
				.join("");
		}

		const r = parseInt(hex.substr(0, 2), 16);
		const g = parseInt(hex.substr(2, 2), 16);
		const b = parseInt(hex.substr(4, 2), 16);

		return [r, g, b, opacity];
	}

	/**
	 * Group elements by type and similar properties for batching
	 */
	groupElementsForBatching(elements: Element[]): RenderBatch[] {
		const batches: Map<string, Element[]> = new Map();

		for (const element of elements) {
			// Create a batch key based on element type and visual properties
			const blur =
				(element.type === "rect" || element.type === "ellipse") &&
				"blur" in element
					? element.blur || 0
					: 0;
			const strokeKey = element.stroke
				? `${element.stroke.color}_${element.stroke.width}_${element.stroke.opacity}`
				: "none";
			const batchKey = `${element.type}_${element.fill}_${strokeKey}_${element.opacity}_${blur}`;

			if (!batches.has(batchKey)) {
				batches.set(batchKey, []);
			}
			batches.get(batchKey)!.push(element);
		}

		return Array.from(batches.entries()).map(([, elements]) => ({
			elements,
			type: elements[0]?.type || "rect",
		}));
	}

	/**
	 * Render a batch of elements with the same properties
	 */
	renderBatch(canvas: CanvasKitCanvas, batch: RenderBatch): void {
		if (batch.elements.length === 0) return;

		const firstElement = batch.elements[0];
		if (!firstElement) return;
		// Get fallback colors for gradients
		const fillColorStr =
			typeof firstElement.fill === "string"
				? firstElement.fill
				: firstElement.fill &&
						typeof firstElement.fill === "object" &&
						"stops" in firstElement.fill
					? firstElement.fill.stops?.[0]?.color || "#000000"
					: "#000000";
		const strokeColorStr =
			firstElement.stroke && typeof firstElement.stroke.color === "string"
				? firstElement.stroke.color
				: firstElement.stroke?.color &&
						typeof firstElement.stroke.color === "object" &&
						"stops" in firstElement.stroke.color
					? firstElement.stroke.color.stops?.[0]?.color || "#000000"
					: "#000000";

		const fillColor = this.hexToRgba(fillColorStr, firstElement.opacity);
		const strokeColor = firstElement.stroke
			? this.hexToRgba(strokeColorStr, firstElement.stroke.opacity)
			: ([0, 0, 0, 0] as [number, number, number, number]);
		const blur =
			(firstElement.type === "rect" || firstElement.type === "ellipse") &&
			"blur" in firstElement
				? firstElement.blur
				: undefined;

		// Create shared paints for the batch
		const fillPaint =
			fillColor[3] > 0 ? this.createFillPaint(fillColor, blur) : null;
		const strokePaint =
			firstElement.stroke && firstElement.stroke.width > 0 && strokeColor[3] > 0
				? this.createStrokePaint(strokeColor, firstElement.stroke.width, blur)
				: null;

		// Render all elements in the batch
		for (const element of batch.elements) {
			this.renderSingleElement(canvas, element, fillPaint, strokePaint);
		}
	}

	/**
	 * Render a single element using shared paints
	 */
	private renderSingleElement(
		canvas: CanvasKitCanvas,
		element: Element,
		fillPaint: CanvasKitPaint | null,
		strokePaint: CanvasKitPaint | null,
	): void {
		const { x, y, w, h, type } = element;

		if (type === "rect") {
			const radius = "radius" in element ? element.radius : undefined;

			if (
				radius &&
				(radius.topLeft > 0 ||
					radius.topRight > 0 ||
					radius.bottomRight > 0 ||
					radius.bottomLeft > 0)
			) {
				// Use cached rounded rectangle path
				const pathKey = this.getPathCacheKey(type, x, y, w, h, radius);
				const path = this.getOrCreatePath(pathKey, () =>
					this.createRoundedRectPath(x, y, w, h, radius),
				);

				if (fillPaint) canvas.drawPath(path, fillPaint);
				if (strokePaint) canvas.drawPath(path, strokePaint);
			} else {
				// Simple rectangle
				const rect = this.canvasKit.XYWHRect(x, y, w, h);
				if (fillPaint) canvas.drawRect(rect, fillPaint);
				if (strokePaint) canvas.drawRect(rect, strokePaint);
			}
		} else if (type === "ellipse") {
			const rect = this.canvasKit.XYWHRect(x, y, w, h);
			if (fillPaint) canvas.drawOval(rect, fillPaint);
			if (strokePaint) canvas.drawOval(rect, strokePaint);
		} else if (type === "frame") {
			const rect = this.canvasKit.XYWHRect(x, y, w, h);
			if (fillPaint) canvas.drawRect(rect, fillPaint);
			if (strokePaint) canvas.drawRect(rect, strokePaint);
		} else if (type === "text") {
			// Text elements need special handling and can't be easily batched
			this.renderTextElement(canvas, element);
		}
	}

	/**
	 * Create a rounded rectangle path (cached)
	 */
	private createRoundedRectPath(
		x: number,
		y: number,
		width: number,
		height: number,
		radius: {
			topLeft: number;
			topRight: number;
			bottomRight: number;
			bottomLeft: number;
		},
	): CanvasKitPath {
		const path = new this.canvasKit.Path();

		const maxRadius = Math.min(width, height) / 2;
		const tl = Math.min(Math.max(0, radius.topLeft || 0), maxRadius);
		const tr = Math.min(Math.max(0, radius.topRight || 0), maxRadius);
		const br = Math.min(Math.max(0, radius.bottomRight || 0), maxRadius);
		const bl = Math.min(Math.max(0, radius.bottomLeft || 0), maxRadius);

		if (tl === 0 && tr === 0 && br === 0 && bl === 0) {
			path.moveTo(x, y);
			path.lineTo(x + width, y);
			path.lineTo(x + width, y + height);
			path.lineTo(x, y + height);
			path.close();
			return path;
		}

		path.moveTo(x + tl, y);
		path.lineTo(x + width - tr, y);
		if (tr > 0) path.arcToTangent(x + width, y, x + width, y + tr, tr);
		path.lineTo(x + width, y + height - br);
		if (br > 0)
			path.arcToTangent(x + width, y + height, x + width - br, y + height, br);
		path.lineTo(x + bl, y + height);
		if (bl > 0) path.arcToTangent(x, y + height, x, y + height - bl, bl);
		path.lineTo(x, y + tl);
		if (tl > 0) path.arcToTangent(x, y, x + tl, y, tl);
		path.close();

		return path;
	}

	/**
	 * Render text element (cannot be batched effectively)
	 */
	private renderTextElement(canvas: CanvasKitCanvas, element: Element): void {
		if (element.type !== "text") return;

		const textElement = element as TextElement;
		const {
			x,
			y,
			text,
			color,
			fontSize,
			fontFamily,
			opacity,
			textDecoration,
			fontWeight,
			textTransform,
			lineHeight,
			letterSpacing,
		} = textElement;
		if (!text) return;

		// Apply text transform
		let displayText = text;
		if (textTransform) {
			switch (textTransform) {
				case "uppercase":
					displayText = text.toUpperCase();
					break;
				case "lowercase":
					displayText = text.toLowerCase();
					break;
				case "capitalize":
					displayText = text.replace(/\b\w/g, (l) => l.toUpperCase());
					break;
			}
		}

		const textColor = this.hexToRgba(color, opacity);
		const paint = this.createFillPaint(textColor);
		const font = fontManager.createFont(fontFamily, fontSize, fontWeight);
		const isBold = fontWeight === "bold" || fontWeight === "700";
		const lines = displayText.split("\n");
		const actualLineHeight = (lineHeight || 1.2) * fontSize;

		// Draw each line with proper line height
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i] || "";
			const lineY = y + fontSize + i * actualLineHeight;

			if (letterSpacing && letterSpacing !== 0) {
				// Draw character by character with spacing
				let charX = x;
				for (let j = 0; j < line.length; j++) {
					const char = line[j] || "";
					canvas.drawText(char, charX, lineY, paint, font);

					// Simulate bold for each character
					if (isBold) {
						canvas.drawText(char, charX + 0.5, lineY, paint, font);
						canvas.drawText(char, charX, lineY + 0.5, paint, font);
					}

					// Advance position with letter spacing
					const charWidth = fontSize * 0.6;
					charX += charWidth + letterSpacing;
				}
			} else {
				// Draw the entire line
				canvas.drawText(line, x, lineY, paint, font);

				// Simulate bold by drawing additional offset text
				if (isBold) {
					canvas.drawText(line, x + 0.5, lineY, paint, font);
					canvas.drawText(line, x, lineY + 0.5, paint, font);
				}
			}
		}

		// Draw text decorations for each line
		if (textDecoration && textDecoration !== "none") {
			const lineThickness = Math.max(1, fontSize * 0.05);

			// Create line paint
			const linePaint = new this.canvasKit.Paint();
			linePaint.setColor(this.canvasKit.Color(...textColor));
			linePaint.setStrokeWidth(lineThickness);
			linePaint.setStyle(this.canvasKit.PaintStyle.Stroke);
			linePaint.setAntiAlias(true);

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i] || "";
				const lineY = y + fontSize + i * actualLineHeight;

				// Calculate line width considering letter spacing
				let lineWidth;
				if (letterSpacing && letterSpacing !== 0) {
					const charWidth = fontSize * 0.6;
					lineWidth =
						line.length * charWidth + (line.length - 1) * letterSpacing;
				} else {
					lineWidth = line.length * (fontSize * 0.6);
				}

				let decorationY = lineY;
				if (textDecoration === "underline") {
					decorationY = lineY + lineThickness + 4; // Add 4px more space for underline
				} else if (textDecoration === "line-through") {
					decorationY = lineY - fontSize * 0.3; // Position in the middle of text
				}

				// Draw the decoration line
				const linePath = new this.canvasKit.Path();
				linePath.moveTo(x, decorationY);
				linePath.lineTo(x + lineWidth, decorationY);
				canvas.drawPath(linePath, linePaint);
				linePath.delete();
			}

			// Clean up line paint
			linePaint.delete();
		}

		font.delete();
	}

	/**
	 * Clear all caches to free memory
	 */
	clearCaches(): void {
		// Clean up paint cache
		for (const paint of this.paintCache.values()) {
			paint.delete();
		}
		this.paintCache.clear();

		// Clean up path cache
		for (const path of this.pathCache.values()) {
			path.delete();
		}
		this.pathCache.clear();

		// Clean up draw calls cache
		for (const drawCall of this.cachedDrawCalls.values()) {
			drawCall.cleanup();
		}
		this.cachedDrawCalls.clear();
	}

	/**
	 * Get cache statistics for debugging
	 */
	getCacheStats(): {
		paintCacheSize: number;
		pathCacheSize: number;
		drawCallCacheSize: number;
	} {
		return {
			paintCacheSize: this.paintCache.size,
			pathCacheSize: this.pathCache.size,
			drawCallCacheSize: this.cachedDrawCalls.size,
		};
	}
}
