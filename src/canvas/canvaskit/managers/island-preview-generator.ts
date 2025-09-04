import type { Island } from "./island-detector";
import type {
	BaseElement,
	TextElement,
	Element as CanvasElement,
	Gradient,
} from "@store/elements";
import { GradientUtils } from "../rendering/gradient-utils";

export interface PreviewOptions {
	width: number;
	height: number;
	backgroundColor?: string;
	quality?: number;
}

// Use the actual CanvasElement type from the store
type Element = CanvasElement;

type Bounds = { left: number; top: number; right: number; bottom: number };

export class IslandPreviewGenerator {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private isDestroyed = false;

	constructor() {
		this.canvas = document.createElement("canvas");
		this.ctx = this.canvas.getContext("2d")!;
	}

	/**
	 * Clean up resources to prevent memory leaks
	 */
	destroy() {
		if (this.isDestroyed) return;

		this.isDestroyed = true;
		this.canvas.width = 0;
		this.canvas.height = 0;
		// Clear the canvas element reference to help GC
		(this.canvas as any) = null;
		(this.ctx as any) = null;
	}

	/**
	 * Generate an SVG preview for an island using export-utils pattern
	 */
	generateSVGPreview(
		island: Island,
		options: PreviewOptions = { width: 200, height: 150 },
	): string {
		if (this.isDestroyed) {
			return this.generatePlaceholderSVG(island, options);
		}

		try {
			if (!island || !island.elements || !Array.isArray(island.elements)) {
				return this.generatePlaceholderSVG(island, options);
			}

			const elements = island.elements as Element[];
			const visible = elements.filter((e) => e && e.visible !== false);

			if (visible.length === 0) {
				return this.generatePlaceholderSVG(island, options);
			}

			const { x, y, w, h } = this.unionBounds(visible);

			if (
				w <= 0 ||
				h <= 0 ||
				!isFinite(x) ||
				!isFinite(y) ||
				!isFinite(w) ||
				!isFinite(h)
			) {
				return this.generatePlaceholderSVG(island, options);
			}

			// Calculate scale and positioning (similar to export-utils)
			const padding = 8;
			const availableWidth = options.width - padding * 2;
			const availableHeight = options.height - padding * 2;
			const scale = Math.min(availableWidth / w, availableHeight / h, 1);
			const finalScale = Math.max(scale, 0.1); // minimum scale

			const scaledWidth = w * finalScale;
			const scaledHeight = h * finalScale;
			const offsetX = (options.width - scaledWidth) / 2;
			const offsetY = (options.height - scaledHeight) / 2;

			// Use simplified SVG generation pattern from export-utils
			const pieces: string[] = [];
			pieces.push(
				`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${options.width} ${options.height}" width="${options.width}" height="${options.height}">`,
			);

			// Background
			const bgColor = options.backgroundColor || "#f8f9fa";
			pieces.push(`<rect width="100%" height="100%" fill="${bgColor}" />`);

			// Transform group for scaling and centering
			pieces.push(
				`<g transform="translate(${offsetX}, ${offsetY}) scale(${finalScale})">`,
			);

			// Helper function for escaping (from export-utils)
			const esc = (s: string) =>
				s
					.replace(/&/g, "&amp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;")
					.replace(/"/g, "&quot;");

			// Render elements using export-utils pattern
			for (const el of visible) {
				const stroke = el.stroke;
				const sw = stroke?.width || 0;
				const sc = this.getColorFallback(stroke?.color) || "none";
				const so = stroke?.opacity ?? 1;
				const fill = this.getColorFallback(el.fill) ?? "none";
				const op = el.opacity ?? 1;
				const common = `${sw > 0 ? ` stroke="${esc(sc)}" stroke-width="${sw}" stroke-opacity="${so}"` : ""}${fill && fill !== "transparent" ? ` fill="${esc(fill)}" fill-opacity="${op}"` : ` fill="none"`}`;

				const adjustedX = el.x - x;
				const adjustedY = el.y - y;

				if (el.type === "rect" || el.type === "frame") {
					pieces.push(
						`<rect x="${adjustedX}" y="${adjustedY}" width="${el.w}" height="${el.h}"${common} />`,
					);
				} else if (el.type === "ellipse") {
					pieces.push(
						`<ellipse cx="${adjustedX + el.w / 2}" cy="${adjustedY + el.h / 2}" rx="${Math.abs(el.w / 2)}" ry="${Math.abs(el.h / 2)}"${common} />`,
					);
				} else if (el.type === "line") {
					const lineEl = el as Element & { x2: number; y2: number };
					pieces.push(
						`<line x1="${adjustedX}" y1="${adjustedY}" x2="${lineEl.x2 - x}" y2="${lineEl.y2 - y}"${common} />`,
					);
				} else if (el.type === "text") {
					const textEl = el as Element & {
						color: string;
						fontSize: number;
						fontFamily: string;
						text: string;
					};
					const color = textEl.color || "#000";
					const fontSize = textEl.fontSize || 16;
					const family = esc(textEl.fontFamily || "Arial");
					const text = esc(textEl.text || "");
					pieces.push(
						`<text x="${adjustedX}" y="${adjustedY + fontSize}" fill="${color}" font-size="${fontSize}" font-family="${family}">${text}</text>`,
					);
				}
			}

			pieces.push("</g></svg>");
			const svgContent = pieces.join("");

			try {
				const encodedSvg = btoa(unescape(encodeURIComponent(svgContent)));
				return `data:image/svg+xml;base64,${encodedSvg}`;
			} catch (encodingError) {
				return this.generatePlaceholderSVG(island, options);
			}
		} catch (error) {
			return this.generatePlaceholderSVG(island, options);
		}
	}

	/**
	 * Generate a preview thumbnail for an island (canvas-based fallback)
	 */
	async generatePreview(
		island: Island,
		options: PreviewOptions = { width: 200, height: 150 },
	): Promise<string | null> {
		if (this.isDestroyed) {
			return null;
		}

		try {
			// Set canvas dimensions
			this.canvas.width = options.width;
			this.canvas.height = options.height;

			// Clear canvas
			this.ctx.clearRect(0, 0, options.width, options.height);

			// Set background
			this.ctx.fillStyle = options.backgroundColor || "#f8f9fa";
			this.ctx.fillRect(0, 0, options.width, options.height);

			// Add padding to the preview
			const padding = 8;
			const availableWidth = options.width - padding * 2;
			const availableHeight = options.height - padding * 2;

			// Calculate scale to fit island in preview with padding
			const scale = Math.min(
				availableWidth / island.bounds.width,
				availableHeight / island.bounds.height,
				1,
			);

			// Center the island in the preview
			const scaledWidth = island.bounds.width * scale;
			const scaledHeight = island.bounds.height * scale;
			const offsetX = (options.width - scaledWidth) / 2;
			const offsetY = (options.height - scaledHeight) / 2;

			// Draw elements
			this.ctx.save();
			this.ctx.translate(
				offsetX - island.bounds.x * scale,
				offsetY - island.bounds.y * scale,
			);
			this.ctx.scale(scale, scale);

			for (const element of island.elements) {
				this.drawElement(element);
			}

			this.ctx.restore();

			// Convert to base64
			const quality = options.quality || 0.8;
			return this.canvas.toDataURL("image/jpeg", quality);
		} catch (error) {
			return null;
		}
	}

	/**
	 * Draw a single element on the canvas
	 */
	private drawElement(element: BaseElement): void {
		this.ctx.save();

		// Set element style
		this.ctx.fillStyle = this.getColorFallback(element.fill) || "#e9ecef";
		this.ctx.strokeStyle =
			this.getColorFallback(element.stroke?.color) || "#dee2e6";
		this.ctx.lineWidth = element.stroke?.width || 1;

		// Draw based on element type
		switch (element.type) {
			case "rect":
				this.ctx.fillRect(element.x, element.y, element.w, element.h);
				if (this.getColorFallback(element.stroke?.color)) {
					this.ctx.strokeRect(element.x, element.y, element.w, element.h);
				}
				break;

			case "ellipse":
				this.drawEllipse(element);
				break;

			case "frame":
				this.drawFrame(element);
				break;

			case "text":
				this.drawText(element);
				break;

			default:
				// Fallback to rectangle
				this.ctx.fillRect(element.x, element.y, element.w, element.h);
		}

		this.ctx.restore();
	}

	/**
	 * Draw an ellipse element
	 */
	private drawEllipse(element: BaseElement): void {
		const centerX = element.x + element.w / 2;
		const centerY = element.y + element.h / 2;
		const radiusX = element.w / 2;
		const radiusY = element.h / 2;

		this.ctx.beginPath();
		this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
		this.ctx.fill();

		if (this.getColorFallback(element.stroke?.color)) {
			this.ctx.stroke();
		}
	}

	/**
	 * Draw a frame element
	 */
	private drawFrame(element: BaseElement): void {
		// Draw frame background
		this.ctx.fillRect(element.x, element.y, element.w, element.h);

		// Draw frame border
		if (this.getColorFallback(element.stroke?.color)) {
			this.ctx.strokeRect(element.x, element.y, element.w, element.h);
		}

		// Draw frame title area (top portion)
		const titleHeight = Math.min(30, element.h * 0.2);
		this.ctx.fillStyle =
			this.getColorFallback(element.stroke?.color) || "#dee2e6";
		this.ctx.fillRect(element.x, element.y, element.w, titleHeight);
	}

	/**
	 * Draw a text element
	 */
	private drawText(element: BaseElement): void {
		const textElement = element as TextElement; // Type assertion for text-specific properties

		// Set text style
		this.ctx.fillStyle = textElement.color || "#212529";
		this.ctx.font = `${textElement.fontSize || 14}px ${
			textElement.fontFamily || "system-ui"
		}`;
		this.ctx.textAlign = "left";
		this.ctx.textBaseline = "top";

		// Set text background if available (using fill property)
		const fillColor = this.getColorFallback(textElement.fill);
		if (fillColor && fillColor !== "transparent") {
			this.ctx.fillStyle = fillColor;
			this.ctx.fillRect(element.x, element.y, element.w, element.h);
		}

		// Draw text
		this.ctx.fillStyle = textElement.color || "#212529";
		const text = textElement.text || "Text";
		const lines = this.wrapText(text, element.w, this.ctx);

		const lineHeight = (textElement.fontSize || 14) * 1.2;
		lines.forEach((line, index) => {
			this.ctx.fillText(
				line,
				element.x + 4,
				element.y + 4 + index * lineHeight,
			);
		});
	}

	/**
	 * Wrap text to fit within a given width
	 */
	private wrapText(
		text: string,
		maxWidth: number,
		ctx: CanvasRenderingContext2D,
	): string[] {
		const words = text.split(" ");
		const lines: string[] = [];
		let currentLine = "";

		for (const word of words) {
			const testLine = currentLine + (currentLine ? " " : "") + word;
			const metrics = ctx.measureText(testLine);

			if (metrics.width > maxWidth && currentLine) {
				lines.push(currentLine);
				currentLine = word;
			} else {
				currentLine = testLine;
			}
		}

		if (currentLine) {
			lines.push(currentLine);
		}

		return lines;
	}

	/**
	 * Convert gradient to fallback color for preview rendering
	 */
	private getColorFallback(
		value: string | Gradient | undefined,
	): string | undefined {
		if (!value) return undefined;
		if (typeof value === "string") return value;
		if (GradientUtils.isGradient(value)) {
			// Return the first stop color as fallback
			if (value.stops && value.stops.length > 0) {
				return value.stops[0]?.color || "#000000";
			}
			return "#000000";
		}
		return undefined;
	}

	/**
	 * Generate a simple placeholder preview
	 */
	generatePlaceholderPreview(
		island: Island,
		options: PreviewOptions = { width: 200, height: 150 },
	): string {
		if (this.isDestroyed) {
			return this.generatePlaceholderSVG(island, options);
		}

		this.canvas.width = options.width;
		this.canvas.height = options.height;

		// Clear canvas
		this.ctx.clearRect(0, 0, options.width, options.height);

		// Set background
		this.ctx.fillStyle = options.backgroundColor || "#f8f9fa";
		this.ctx.fillRect(0, 0, options.width, options.height);

		// Draw island representation
		this.ctx.fillStyle = "#6c757d";
		this.ctx.font = "14px system-ui";
		this.ctx.textAlign = "center";
		this.ctx.textBaseline = "middle";

		// Draw island icon (simple representation)
		const centerX = options.width / 2;
		const centerY = options.height / 2;

		// Draw a simple island shape (map pin style)
		this.ctx.beginPath();
		this.ctx.arc(centerX, centerY - 5, 20, 0, 2 * Math.PI);
		this.ctx.fill();

		// Draw pin point
		this.ctx.beginPath();
		this.ctx.moveTo(centerX, centerY + 15);
		this.ctx.lineTo(centerX - 8, centerY + 25);
		this.ctx.lineTo(centerX + 8, centerY + 25);
		this.ctx.closePath();
		this.ctx.fill();

		// Draw element count
		this.ctx.fillStyle = "#ffffff";
		this.ctx.font = "bold 12px system-ui";
		this.ctx.fillText(island.elementCount.toString(), centerX, centerY);

		// Draw island label
		this.ctx.fillStyle = "#6c757d";
		this.ctx.font = "12px system-ui";
		this.ctx.fillText(
			`Island ${island.id.split("-")[1] || "1"}`,
			centerX,
			centerY + 50,
		);

		return this.canvas.toDataURL("image/png");
	}

	/**
	 * Calculate bounds for elements (borrowed from export-utils)
	 */
	private getElementBounds(el: Element): Bounds {
		if (el.type === "line" && el.x2 !== undefined && el.y2 !== undefined) {
			const left = Math.min(el.x, el.x2);
			const right = Math.max(el.x, el.x2);
			const top = Math.min(el.y, el.y2);
			const bottom = Math.max(el.y, el.y2);
			return { left, top, right, bottom };
		}
		const left = Math.min(el.x, el.x + el.w);
		const right = Math.max(el.x, el.x + el.w);
		const top = Math.min(el.y, el.y + el.h);
		const bottom = Math.max(el.y, el.y + el.h);
		return { left, top, right, bottom };
	}

	private unionBounds(
		els: Element[],
		pad = 2,
	): { x: number; y: number; w: number; h: number } {
		if (els.length === 0) return { x: 0, y: 0, w: 100, h: 100 }; // Return default size instead of 0
		let left = Infinity,
			top = Infinity,
			right = -Infinity,
			bottom = -Infinity;

		// Filter out elements with invalid bounds
		const validElements = els.filter((el) => {
			const bounds = this.getElementBounds(el);
			return (
				isFinite(bounds.left) &&
				isFinite(bounds.top) &&
				isFinite(bounds.right) &&
				isFinite(bounds.bottom)
			);
		});

		if (validElements.length === 0) return { x: 0, y: 0, w: 100, h: 100 };

		for (const el of validElements) {
			const b = this.getElementBounds(el);
			left = Math.min(left, b.left);
			top = Math.min(top, b.top);
			right = Math.max(right, b.right);
			bottom = Math.max(bottom, b.bottom);
		}

		// Ensure we have valid bounds
		if (
			!isFinite(left) ||
			!isFinite(top) ||
			!isFinite(right) ||
			!isFinite(bottom)
		) {
			return { x: 0, y: 0, w: 100, h: 100 };
		}

		return {
			x: Math.floor(left - pad),
			y: Math.floor(top - pad),
			w: Math.ceil(right - left + pad * 2),
			h: Math.ceil(bottom - top + pad * 2),
		};
	}

	/**
	 * Generate a simple SVG placeholder preview
	 */
	private generatePlaceholderSVG(
		island: Island,
		options: PreviewOptions = { width: 200, height: 150 },
	): string {
		const bgColor = options.backgroundColor || "#f8f9fa";
		const centerX = options.width / 2;
		const centerY = options.height / 2;

		const svgContent = `
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${options.width} ${
				options.height
			}" width="${options.width}" height="${options.height}">
				<rect x="0" y="0" width="${options.width}" height="${
					options.height
				}" fill="${bgColor}" />
				<circle cx="${centerX}" cy="${centerY - 5}" r="20" fill="#6c757d" />
				<polygon points="${centerX},${centerY + 15} ${centerX - 8},${centerY + 25} ${
					centerX + 8
				},${centerY + 25}" fill="#6c757d" />
				<text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="central" fill="white" font-size="12" font-family="system-ui" font-weight="bold">${
					island.elementCount
				}</text>
				<text x="${centerX}" y="${
					centerY + 50
				}" text-anchor="middle" fill="#6c757d" font-size="12" font-family="system-ui">Island ${
					island.id.split("-")[1] || "1"
				}</text>
			</svg>
		`;

		try {
			const encodedSvg = btoa(unescape(encodeURIComponent(svgContent)));
			return `data:image/svg+xml;base64,${encodedSvg}`;
		} catch (error) {
			// Fallback to a simple SVG without encoding issues
			const simpleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${options.width} ${options.height}" width="${options.width}" height="${options.height}"><rect width="100%" height="100%" fill="#f8f9fa"/><text x="50%" y="50%" text-anchor="middle" fill="#6c757d">Island</text></svg>`;
			return `data:image/svg+xml;base64,${btoa(simpleSvg)}`;
		}
	}
}
