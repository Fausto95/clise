import type { Element } from "../../../../store/element-atoms";
import type {
	CanvasKitCanvas,
	CanvasKitInstance,
	CanvasKitPaint,
} from "../../../../types/canvaskit";
import type { ColorCache } from "../color-cache";
import { fontManager } from "../../../../utils/font-manager";

/**
 * Text element renderer for CanvasKit
 */
export class TextRenderer {
	private canvasKit: CanvasKitInstance;
	private colorCache: ColorCache;

	constructor(canvasKit: CanvasKitInstance, colorCache: ColorCache) {
		this.canvasKit = canvasKit;
		this.colorCache = colorCache;
	}

	/**
	 * Draws text with full support for styling, transforms, and decorations
	 * @returns Text bounds if element is selected, null otherwise
	 */
	drawText(
		canvasContext: CanvasKitCanvas,
		element: Element,
		isSelected: boolean = false,
		zoom: number = 1,
		onDrawSelectionOutline?: (
			canvasContext: CanvasKitCanvas,
			x: number,
			y: number,
			width: number,
			height: number,
			zoom: number,
		) => void,
		onDrawResizeHandles?: (
			canvasContext: CanvasKitCanvas,
			x: number,
			y: number,
			width: number,
			height: number,
			zoom: number,
		) => void,
	): { width: number; height: number } | null {
		if (element.type !== "text") return null;

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
		} = element;

		// Don't draw empty text (but still handle selection if selected)
		if (!text && !isSelected) return null;

		// Create paint for text
		const paint = new this.canvasKit.Paint();
		const textColor = this.colorCache.hexToRgba(color, opacity);
		paint.setColor(this.colorCache.getCanvasKitColorFromRgba(textColor));
		paint.setAntiAlias(true);

		// Optional shadow paint
		let shadowPaint: CanvasKitPaint | null = null;
		let shadowOffsetX = 0;
		let shadowOffsetY = 0;
		if (element.shadow) {
			shadowPaint = new this.canvasKit.Paint();
			const shadowColor = this.colorCache.hexToRgba(
				element.shadow.color,
				element.shadow.opacity,
			);
			shadowPaint.setColor(
				this.colorCache.getCanvasKitColorFromRgba(shadowColor),
			);
			shadowPaint.setAntiAlias(true);
			if (element.shadow.blur > 0) {
				const blurFilter = this.canvasKit.ImageFilter.MakeBlur(
					element.shadow.blur,
					element.shadow.blur,
					this.canvasKit.TileMode.Decal,
					null,
				);
				shadowPaint.setImageFilter(blurFilter);
			}
			shadowOffsetX = element.shadow.x;
			shadowOffsetY = element.shadow.y;
		}

		// Create font with proper typeface from font manager
		const font = fontManager.createFont(fontFamily, fontSize);

		// Simulate bold by drawing the text multiple times with slight offsets
		const isBold = fontWeight === "bold";

		// Draw the text at the element's position (only if text exists)
		if (text) {
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

			// Handle multiline text and line height
			const lines = displayText.split("\n");
			const actualLineHeight = (lineHeight || 1.2) * fontSize;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i] || "";
				const lineY = y + fontSize + i * actualLineHeight;

				// Draw shadow line first if configured
				if (shadowPaint) {
					if (letterSpacing && letterSpacing !== 0) {
						let charX = x + shadowOffsetX;
						for (let j = 0; j < line.length; j++) {
							const char = line[j] || "";
							canvasContext.drawText(
								char,
								charX,
								lineY + shadowOffsetY,
								shadowPaint,
								font,
							);

							const charWidth = fontSize * 0.6;
							charX += charWidth + letterSpacing;
						}
					} else {
						canvasContext.drawText(
							line,
							x + shadowOffsetX,
							lineY + shadowOffsetY,
							shadowPaint,
							font,
						);
					}
				}

				if (letterSpacing && letterSpacing !== 0) {
					// Draw character by character with spacing
					let charX = x;
					for (let j = 0; j < line.length; j++) {
						const char = line[j] || "";
						canvasContext.drawText(char, charX, lineY, paint, font);

						// Simulate bold for each character
						if (isBold) {
							canvasContext.drawText(char, charX + 0.5, lineY, paint, font);
							canvasContext.drawText(char, charX, lineY + 0.5, paint, font);
						}

						// Advance position with letter spacing
						const charWidth = fontSize * 0.6; // Approximate character width
						charX += charWidth + letterSpacing;
					}
				} else {
					// Draw the entire line
					canvasContext.drawText(line, x, lineY, paint, font);

					// Simulate bold by drawing additional offset text
					if (isBold) {
						canvasContext.drawText(line, x + 0.5, lineY, paint, font);
						canvasContext.drawText(line, x, lineY + 0.5, paint, font);
					}
				}
			}

			// Draw text decorations for each line
			if (textDecoration && textDecoration !== "none") {
				const lineThickness = Math.max(1, fontSize * 0.05);

				// Create line paint
				const linePaint = new this.canvasKit.Paint();
				linePaint.setColor(
					this.colorCache.getCanvasKitColorFromRgba(textColor),
				);
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
					canvasContext.drawPath(linePath, linePaint);
					linePath.delete();
				}

				// Clean up line paint
				linePaint.delete();
			}
		}

		// If selected, calculate approximate text bounds for proper selection box
		if (isSelected && onDrawSelectionOutline && onDrawResizeHandles) {
			// Calculate bounds considering multiline text and letter spacing
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

			const lines = displayText.split("\n");
			const actualLineHeight = (lineHeight || 1.2) * fontSize;

			// Calculate maximum line width
			let maxLineWidth = 20; // Minimum width for empty text
			for (const line of lines) {
				let lineWidth;
				if (letterSpacing && letterSpacing !== 0) {
					const charWidth = fontSize * 0.6;
					lineWidth =
						line.length * charWidth + (line.length - 1) * letterSpacing;
				} else {
					lineWidth = line.length * (fontSize * 0.6);
				}
				maxLineWidth = Math.max(maxLineWidth, lineWidth);
			}

			const actualWidth = maxLineWidth;
			// Do not apply lineHeight when there's only a single line
			const actualHeight =
				(lines.length <= 1 ? fontSize : lines.length * actualLineHeight) +
				fontSize * 0.2; // Add some padding

			// Override the selection box drawing with calculated text bounds
			const padding = 8;
			onDrawSelectionOutline(
				canvasContext,
				x - padding,
				y - padding,
				actualWidth + padding * 2,
				actualHeight + padding * 2,
				zoom,
			);
			onDrawResizeHandles(
				canvasContext,
				x - padding,
				y - padding,
				actualWidth + padding * 2,
				actualHeight + padding * 2,
				zoom,
			);

			font.delete();
			paint.delete();
			if (shadowPaint) shadowPaint.delete();
			return { width: actualWidth, height: actualHeight };
		}

		font.delete();
		paint.delete();
		if (shadowPaint) shadowPaint.delete();

		return null;
	}
}
