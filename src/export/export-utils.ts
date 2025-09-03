import { saveAs } from "./file-save";
import type { Element } from "@store/element-atoms";
import type {
	Gradient,
	ImageFill,
	RectangleElement,
	EllipseElement,
} from "@store/elements/element-types";
import { GradientUtils } from "../canvas/canvaskit/rendering/gradient-utils";

type Bounds = { left: number; top: number; right: number; bottom: number };

const getElementBounds = (el: Element): Bounds => {
	// Account for shadow spread when calculating bounds
	const shadow = el.shadow;
	const shadowSpread = shadow?.spread || 0;
	const shadowOffset = Math.max(
		shadow?.x || 0,
		shadow?.y || 0,
		shadow?.blur || 0,
	);
	const totalOffset = shadowOffset + shadowSpread;

	if (el.type === "line" && "x2" in el && "y2" in el) {
		const left = Math.min(el.x, el.x2) - totalOffset;
		const right = Math.max(el.x, el.x2) + totalOffset;
		const top = Math.min(el.y, el.y2) - totalOffset;
		const bottom = Math.max(el.y, el.y2) + totalOffset;
		return { left, top, right, bottom };
	}
	const left = Math.min(el.x, el.x + el.w) - totalOffset;
	const right = Math.max(el.x, el.x + el.w) + totalOffset;
	const top = Math.min(el.y, el.y + el.h) - totalOffset;
	const bottom = Math.max(el.y, el.y + el.h) + totalOffset;
	return { left, top, right, bottom };
};

const unionBounds = (
	els: Element[],
	pad = 2,
): { x: number; y: number; w: number; h: number } => {
	if (els.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
	let left = Infinity,
		top = Infinity,
		right = -Infinity,
		bottom = -Infinity;
	for (const el of els) {
		const b = getElementBounds(el);
		left = Math.min(left, b.left);
		top = Math.min(top, b.top);
		right = Math.max(right, b.right);
		bottom = Math.max(bottom, b.bottom);
	}
	return {
		x: Math.floor(left - pad),
		y: Math.floor(top - pad),
		w: Math.ceil(right - left + pad * 2),
		h: Math.ceil(bottom - top + pad * 2),
	};
};

const ensureCanvas = (w: number, h: number, scale = 1) => {
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(w * scale));
	canvas.height = Math.max(1, Math.round(h * scale));
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("2D context not available");
	ctx.scale(scale, scale);
	return { canvas, ctx };
};

// Helper function to convert gradient to fallback color for export
const getColorFallback = (value: string | Gradient | undefined): string => {
	if (!value) return "transparent";
	if (typeof value === "string") return value;
	if (GradientUtils.isGradient(value)) {
		// Return the first stop color as fallback
		if (value.stops && value.stops.length > 0) {
			return value.stops[0]?.color || "#000000";
		}
		return "#000000";
	}
	return "transparent";
};

// Helper function to draw rounded rectangle path
const drawRoundedRect = (
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius?: {
		topLeft: number;
		topRight: number;
		bottomRight: number;
		bottomLeft: number;
	},
) => {
	if (
		!radius ||
		(radius.topLeft === 0 &&
			radius.topRight === 0 &&
			radius.bottomRight === 0 &&
			radius.bottomLeft === 0)
	) {
		ctx.rect(x, y, width, height);
		return;
	}

	const tl = Math.min(radius.topLeft, width / 2, height / 2);
	const tr = Math.min(radius.topRight, width / 2, height / 2);
	const br = Math.min(radius.bottomRight, width / 2, height / 2);
	const bl = Math.min(radius.bottomLeft, width / 2, height / 2);

	ctx.beginPath();
	ctx.moveTo(x + tl, y);
	ctx.lineTo(x + width - tr, y);
	if (tr > 0) ctx.quadraticCurveTo(x + width, y, x + width, y + tr);
	ctx.lineTo(x + width, y + height - br);
	if (br > 0)
		ctx.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
	ctx.lineTo(x + bl, y + height);
	if (bl > 0) ctx.quadraticCurveTo(x, y + height, x, y + height - bl);
	ctx.lineTo(x, y + tl);
	if (tl > 0) ctx.quadraticCurveTo(x, y, x + tl, y);
	ctx.closePath();
};

// Helper function to draw shadow
const drawShadow = (
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	shadow: {
		type?: "drop" | "inner";
		x: number;
		y: number;
		blur: number;
		color: string;
		opacity: number;
		spread?: number;
	},
	radius?: {
		topLeft: number;
		topRight: number;
		bottomRight: number;
		bottomLeft: number;
	},
) => {
	if (!shadow || shadow.opacity === 0) return;

	const spread = shadow.spread || 0;
	const shadowX = x + shadow.x - spread;
	const shadowY = y + shadow.y - spread;
	const shadowWidth = width + spread * 2;
	const shadowHeight = height + spread * 2;

	ctx.save();
	ctx.shadowColor = shadow.color;
	ctx.shadowBlur = shadow.blur;
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.globalAlpha = shadow.opacity;

	// Draw shadow shape
	if (
		radius &&
		(radius.topLeft > 0 ||
			radius.topRight > 0 ||
			radius.bottomRight > 0 ||
			radius.bottomLeft > 0)
	) {
		// Adjust radius for shadow spread
		const adjustedRadius = {
			topLeft: Math.max(0, radius.topLeft - spread),
			topRight: Math.max(0, radius.topRight - spread),
			bottomRight: Math.max(0, radius.bottomRight - spread),
			bottomLeft: Math.max(0, radius.bottomLeft - spread),
		};
		drawRoundedRect(
			ctx,
			shadowX,
			shadowY,
			shadowWidth,
			shadowHeight,
			adjustedRadius,
		);
	} else {
		ctx.rect(shadowX, shadowY, shadowWidth, shadowHeight);
	}
	ctx.fill();
	ctx.restore();
};

// Helper function to apply blur filter
const applyBlurFilter = (
	ctx: CanvasRenderingContext2D,
	blur?: {
		type: "layer" | "background";
		radius: number;
	},
) => {
	if (!blur || blur.radius <= 0) return;

	// Apply CSS filter for blur effect
	ctx.filter = `blur(${blur.radius}px)`;
};

// Helper function to draw image fill
const drawImageFill = async (
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	imageFill: ImageFill,
	radius?: {
		topLeft: number;
		topRight: number;
		bottomRight: number;
		bottomLeft: number;
	},
): Promise<void> => {
	if (!imageFill.enabled || !imageFill.src) return;

	try {
		const img = new Image();
		img.crossOrigin = "anonymous";

		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve();
			img.onerror = () => reject(new Error("Failed to load image"));
			img.src = imageFill.src;
		});

		ctx.save();

		// Apply clipping for rounded corners
		if (
			radius &&
			(radius.topLeft > 0 ||
				radius.topRight > 0 ||
				radius.bottomRight > 0 ||
				radius.bottomLeft > 0)
		) {
			ctx.beginPath();
			drawRoundedRect(ctx, x, y, width, height, radius);
			ctx.clip();
		}

		// Calculate image positioning
		const imgWidth = img.width;
		const imgHeight = img.height;
		const fit = imageFill.fit || "fill";
		const align = imageFill.align || "center";
		const rotation = imageFill.rotationDeg || 0;
		const offsetX = imageFill.offsetX || 0;
		const offsetY = imageFill.offsetY || 0;
		const scaleX = imageFill.scaleX || 1;
		const scaleY = imageFill.scaleY || 1;

		let destX = x + offsetX;
		let destY = y + offsetY;
		let destWidth = width;
		let destHeight = height;

		// Calculate fit
		if (fit === "contain") {
			const scale = Math.min(width / imgWidth, height / imgHeight);
			destWidth = imgWidth * scale;
			destHeight = imgHeight * scale;
		} else if (fit === "cover") {
			const scale = Math.max(width / imgWidth, height / imgHeight);
			destWidth = imgWidth * scale;
			destHeight = imgHeight * scale;
		} else if (fit === "stretch") {
			destWidth = width;
			destHeight = height;
		}

		// Apply scale
		destWidth *= scaleX;
		destHeight *= scaleY;

		// Calculate alignment
		if (align.includes("left")) {
			destX = x + offsetX;
		} else if (align.includes("right")) {
			destX = x + width - destWidth + offsetX;
		} else {
			destX = x + (width - destWidth) / 2 + offsetX;
		}

		if (align.includes("top")) {
			destY = y + offsetY;
		} else if (align.includes("bottom")) {
			destY = y + height - destHeight + offsetY;
		} else {
			destY = y + (height - destHeight) / 2 + offsetY;
		}

		// Apply rotation
		if (rotation !== 0) {
			const centerX = x + width / 2;
			const centerY = y + height / 2;
			ctx.translate(centerX, centerY);
			ctx.rotate((rotation * Math.PI) / 180);
			ctx.translate(-centerX, -centerY);
		}

		// Apply blur if specified
		if (imageFill.blur && imageFill.blur > 0) {
			ctx.filter = `blur(${imageFill.blur}px)`;
		}

		// Draw the image
		ctx.drawImage(img, destX, destY, destWidth, destHeight);

		ctx.restore();
	} catch (error) {
		console.warn("Failed to draw image fill:", error);
	}
};

// Very lightweight 2D renderer for export fallback (rect, ellipse, frame, line, text, path, image)
const drawElements2D = async (
	ctx: CanvasRenderingContext2D,
	els: Element[],
	offsetX: number,
	offsetY: number,
) => {
	for (const el of els) {
		if (el.visible === false) continue;

		const stroke = el.stroke;
		const strokeWidth = stroke?.width || 0;
		const strokeColor = getColorFallback(stroke?.color) || "transparent";
		const fill = getColorFallback(el.fill) ?? "transparent";
		const opacity = el.opacity ?? 1;
		const shadow = el.shadow;
		const imageFill = el.imageFill;

		ctx.save();
		ctx.globalAlpha = opacity;
		ctx.lineWidth = strokeWidth;
		if (stroke && stroke.style === "dashed")
			ctx.setLineDash([
				Math.max(2, strokeWidth * 3),
				Math.max(2, strokeWidth * 2),
			]);
		else ctx.setLineDash([]);
		const toRGBA = (hex: string) =>
			hex === "transparent" || hex === "none" ? `rgba(0,0,0,0)` : hex;

		if (el.type === "rect" || el.type === "frame") {
			const x = el.x - offsetX,
				y = el.y - offsetY,
				w = el.w,
				h = el.h;
			const radius = (el as RectangleElement).radius;
			const blur = (el as RectangleElement).blur;

			// Draw shadow first
			if (shadow) {
				drawShadow(ctx, x, y, w, h, shadow, radius);
			}

			// Apply blur filter
			applyBlurFilter(ctx, blur);

			// Draw fill
			if (fill && fill !== "transparent" && fill !== "none") {
				ctx.fillStyle = toRGBA(fill);
				if (
					radius &&
					(radius.topLeft > 0 ||
						radius.topRight > 0 ||
						radius.bottomRight > 0 ||
						radius.bottomLeft > 0)
				) {
					drawRoundedRect(ctx, x, y, w, h, radius);
					ctx.fill();
				} else {
					ctx.fillRect(x, y, w, h);
				}
			}

			// Draw image fill
			if (imageFill) {
				await drawImageFill(ctx, x, y, w, h, imageFill, radius);
			}

			// Draw stroke
			if (strokeWidth > 0 && strokeColor) {
				ctx.strokeStyle = toRGBA(strokeColor);
				if (
					radius &&
					(radius.topLeft > 0 ||
						radius.topRight > 0 ||
						radius.bottomRight > 0 ||
						radius.bottomLeft > 0)
				) {
					drawRoundedRect(ctx, x, y, w, h, radius);
					ctx.stroke();
				} else {
					ctx.strokeRect(x, y, w, h);
				}
			}
		} else if (el.type === "ellipse") {
			const x = el.x - offsetX,
				y = el.y - offsetY,
				w = el.w,
				h = el.h;
			const blur = (el as EllipseElement).blur;

			// Draw shadow first
			if (shadow) {
				ctx.save();
				ctx.shadowColor = shadow.color;
				ctx.shadowBlur = shadow.blur;
				ctx.shadowOffsetX = shadow.x;
				ctx.shadowOffsetY = shadow.y;
				ctx.globalAlpha = shadow.opacity;
				ctx.beginPath();
				ctx.ellipse(
					x + w / 2,
					y + h / 2,
					Math.abs(w / 2),
					Math.abs(h / 2),
					0,
					0,
					Math.PI * 2,
				);
				ctx.fill();
				ctx.restore();
			}

			// Apply blur filter
			applyBlurFilter(ctx, blur);

			ctx.beginPath();
			ctx.ellipse(
				x + w / 2,
				y + h / 2,
				Math.abs(w / 2),
				Math.abs(h / 2),
				0,
				0,
				Math.PI * 2,
			);
			if (fill && fill !== "transparent" && fill !== "none") {
				ctx.fillStyle = toRGBA(fill);
				ctx.fill();
			}

			// Draw image fill
			if (imageFill) {
				await drawImageFill(ctx, x, y, w, h, imageFill);
			}

			if (strokeWidth > 0) {
				ctx.strokeStyle = toRGBA(strokeColor);
				ctx.stroke();
			}
		} else if (el.type === "line") {
			const lineEl = el as Element & { x2: number; y2: number };

			// Draw shadow first
			if (shadow) {
				ctx.save();
				ctx.shadowColor = shadow.color;
				ctx.shadowBlur = shadow.blur;
				ctx.shadowOffsetX = shadow.x;
				ctx.shadowOffsetY = shadow.y;
				ctx.globalAlpha = shadow.opacity;
				ctx.beginPath();
				ctx.moveTo(el.x - offsetX, el.y - offsetY);
				ctx.lineTo(lineEl.x2 - offsetX, lineEl.y2 - offsetY);
				ctx.stroke();
				ctx.restore();
			}

			ctx.beginPath();
			ctx.moveTo(el.x - offsetX, el.y - offsetY);
			ctx.lineTo(lineEl.x2 - offsetX, lineEl.y2 - offsetY);
			if (strokeWidth > 0) {
				ctx.strokeStyle = toRGBA(strokeColor);
				ctx.stroke();
			}
		} else if (el.type === "text") {
			const textEl = el as Element & {
				color: string;
				fontSize: number;
				fontFamily: string;
				text: string;
			};
			const x = el.x - offsetX;
			const y = el.y - offsetY;

			// Draw shadow first
			if (shadow) {
				ctx.save();
				ctx.shadowColor = shadow.color;
				ctx.shadowBlur = shadow.blur;
				ctx.shadowOffsetX = shadow.x;
				ctx.shadowOffsetY = shadow.y;
				ctx.globalAlpha = shadow.opacity;
				ctx.fillStyle = textEl.color || "#000";
				const fontSize = textEl.fontSize || 16;
				ctx.font = `${fontSize}px ${textEl.fontFamily || "Arial"}`;
				const text = textEl.text || "";
				ctx.textBaseline = "top";
				ctx.fillText(text, x, y);
				ctx.restore();
			}

			ctx.fillStyle = textEl.color || "#000";
			const fontSize = textEl.fontSize || 16;
			ctx.font = `${fontSize}px ${textEl.fontFamily || "Arial"}`;
			const text = textEl.text || "";
			ctx.textBaseline = "top";
			ctx.fillText(text, x, y);
		} else if (el.type === "path") {
			const pathEl = el as Element & {
				points: { x: number; y: number; curve?: { cx: number; cy: number } }[];
				closed: boolean;
			};
			const ox = pathEl.x - offsetX;
			const oy = pathEl.y - offsetY;
			const pts = pathEl.points;

			// Draw shadow first
			if (shadow && pts.length > 0) {
				ctx.save();
				ctx.shadowColor = shadow.color;
				ctx.shadowBlur = shadow.blur;
				ctx.shadowOffsetX = shadow.x;
				ctx.shadowOffsetY = shadow.y;
				ctx.globalAlpha = shadow.opacity;
				ctx.beginPath();
				const firstPt = pts[0];
				if (firstPt) {
					ctx.moveTo(ox + firstPt.x, oy + firstPt.y);
				}
				for (let i = 1; i < pts.length; i++) {
					const prev = pts[i - 1];
					const pt = pts[i];
					if (prev && pt && prev.curve)
						ctx.quadraticCurveTo(
							ox + prev.curve.cx,
							oy + prev.curve.cy,
							ox + pt.x,
							oy + pt.y,
						);
					else if (pt) ctx.lineTo(ox + pt.x, oy + pt.y);
				}
				if (pathEl.closed) ctx.closePath();
				ctx.stroke();
				ctx.restore();
			}

			if (pts.length > 0) {
				ctx.beginPath();
				const firstPt = pts[0];
				if (firstPt) {
					ctx.moveTo(ox + firstPt.x, oy + firstPt.y);
				}
				for (let i = 1; i < pts.length; i++) {
					const prev = pts[i - 1];
					const pt = pts[i];
					if (prev && pt && prev.curve)
						ctx.quadraticCurveTo(
							ox + prev.curve.cx,
							oy + prev.curve.cy,
							ox + pt.x,
							oy + pt.y,
						);
					else if (pt) ctx.lineTo(ox + pt.x, oy + pt.y);
				}
				if (pathEl.closed) ctx.closePath();
				if (
					pathEl.closed &&
					fill &&
					fill !== "transparent" &&
					fill !== "none"
				) {
					ctx.fillStyle = toRGBA(fill);
					ctx.fill();
				}
				if (strokeWidth > 0) {
					ctx.strokeStyle = toRGBA(strokeColor);
					ctx.stroke();
				}
			}
		} else if (el.type === "image") {
			const imageEl = el as Element & { src: string };
			const x = el.x - offsetX;
			const y = el.y - offsetY;
			const w = el.w;
			const h = el.h;
			const src = imageEl.src || "";

			// Draw shadow first
			if (shadow) {
				ctx.save();
				ctx.shadowColor = shadow.color;
				ctx.shadowBlur = shadow.blur;
				ctx.shadowOffsetX = shadow.x;
				ctx.shadowOffsetY = shadow.y;
				ctx.globalAlpha = shadow.opacity;
				ctx.fillRect(x, y, w, h);
				ctx.restore();
			}

			if (src) {
				try {
					const img = new Image();
					img.crossOrigin = "anonymous";
					await new Promise<void>((resolve, reject) => {
						img.onload = () => resolve();
						img.onerror = () => reject(new Error("Failed to load image"));
						img.src = src;
					});
					ctx.drawImage(img, x, y, w, h);
				} catch (error) {
					console.warn("Failed to load image for export:", error);
				}
			}
		}
		ctx.restore();
	}
};

export const exportSelectionAsPNG = async (
	els: Element[],
	filename = "export-selection.png",
	scale = 2,
) => {
	const { x, y, w, h } = unionBounds(els);

	if (w <= 0 || h <= 0) {
		throw new Error(`Invalid export bounds: ${w}x${h}`);
	}

	const { canvas, ctx } = ensureCanvas(w, h, scale);

	// Clear canvas with transparent background
	ctx.clearRect(0, 0, w, h);

	await drawElements2D(ctx, els, x, y);
	return new Promise<void>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) return reject(new Error("Failed to create PNG blob"));
			saveAs(blob, filename);
			resolve();
		}, "image/png");
	});
};

export const exportSceneAsPNG = async (
	elements: Element[],
	filename = "scene.png",
	scale = 2,
) => {
	const visible = elements.filter((e) => e.visible !== false);
	return exportSelectionAsPNG(visible, filename, scale);
};

const esc = (s: string) =>
	s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

const toSvgPathD = (
	el: {
		x: number;
		y: number;
		points: {
			x: number;
			y: number;
			curve?: {
				type: "quadratic" | "cubic" | "smooth";
				cx?: number;
				cy?: number;
				inHandle?: { x: number; y: number };
				outHandle?: { x: number; y: number };
			};
		}[];
		closed: boolean;
	},
	offsetX: number,
	offsetY: number,
) => {
	const pts = el.points;
	if (!pts || pts.length === 0) return "";
	const firstPt = pts[0];
	if (!firstPt) return "";
	let d = `M ${el.x - offsetX + firstPt.x} ${el.y - offsetY + firstPt.y}`;
	for (let i = 1; i < pts.length; i++) {
		const prev = pts[i - 1];
		const p = pts[i];
		if (prev && p && prev.curve) {
			if (
				prev.curve.type === "cubic" &&
				prev.curve.outHandle &&
				prev.curve.inHandle
			) {
				// Cubic curve (C command)
				d += ` C ${el.x - offsetX + prev.curve.outHandle.x} ${
					el.y - offsetY + prev.curve.outHandle.y
				} ${el.x - offsetX + prev.curve.inHandle.x} ${
					el.y - offsetY + prev.curve.inHandle.y
				} ${el.x - offsetX + p.x} ${el.y - offsetY + p.y}`;
			} else if (
				prev.curve.type === "quadratic" &&
				prev.curve.cx !== undefined &&
				prev.curve.cy !== undefined
			) {
				// Quadratic curve (Q command)
				d += ` Q ${el.x - offsetX + prev.curve.cx} ${
					el.y - offsetY + prev.curve.cy
				} ${el.x - offsetX + p.x} ${el.y - offsetY + p.y}`;
			} else if (
				prev.curve.type === "smooth" &&
				prev.curve.cx !== undefined &&
				prev.curve.cy !== undefined
			) {
				// Smooth curve (S command)
				d += ` S ${el.x - offsetX + prev.curve.cx} ${
					el.y - offsetY + prev.curve.cy
				} ${el.x - offsetX + p.x} ${el.y - offsetY + p.y}`;
			} else {
				// Fallback to line
				d += ` L ${el.x - offsetX + p.x} ${el.y - offsetY + p.y}`;
			}
		} else if (p) {
			d += ` L ${el.x - offsetX + p.x} ${el.y - offsetY + p.y}`;
		}
	}
	if (el.closed) d += " Z";
	return d;
};

// Helper function to generate SVG rounded rectangle path
const generateSVGRoundedRectPath = (
	x: number,
	y: number,
	width: number,
	height: number,
	radius?: {
		topLeft: number;
		topRight: number;
		bottomRight: number;
		bottomLeft: number;
	},
): string => {
	if (
		!radius ||
		(radius.topLeft === 0 &&
			radius.topRight === 0 &&
			radius.bottomRight === 0 &&
			radius.bottomLeft === 0)
	) {
		return `M ${x} ${y} h ${width} v ${height} h -${width} z`;
	}

	const tl = Math.min(radius.topLeft, width / 2, height / 2);
	const tr = Math.min(radius.topRight, width / 2, height / 2);
	const br = Math.min(radius.bottomRight, width / 2, height / 2);
	const bl = Math.min(radius.bottomLeft, width / 2, height / 2);

	let path = `M ${x + tl} ${y}`;
	path += ` h ${width - tl - tr}`;
	if (tr > 0) path += ` q ${tr} 0 ${tr} ${tr}`;
	path += ` v ${height - tr - br}`;
	if (br > 0) path += ` q 0 ${br} -${br} ${br}`;
	path += ` h -${width - br - bl}`;
	if (bl > 0) path += ` q -${bl} 0 -${bl} -${bl}`;
	path += ` v -${height - bl - tl}`;
	if (tl > 0) path += ` q 0 -${tl} ${tl} -${tl}`;
	path += " z";

	return path;
};

// Helper function to generate SVG shadow filter
const generateSVGShadowFilter = (
	shadow: {
		type?: "drop" | "inner";
		x: number;
		y: number;
		blur: number;
		color: string;
		opacity: number;
		spread?: number;
	},
	filterId: string,
): string => {
	if (!shadow || shadow.opacity === 0) return "";

	const offsetX = shadow.x;
	const offsetY = shadow.y;
	const blurRadius = shadow.blur;

	return `
		<defs>
			<filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
				<feDropShadow 
					dx="${offsetX}" 
					dy="${offsetY}" 
					stdDeviation="${blurRadius}" 
					flood-color="${shadow.color}" 
					flood-opacity="${shadow.opacity}"
				/>
			</filter>
		</defs>`;
};

// Helper function to generate SVG blur filter
const generateSVGBlurFilter = (
	blur: {
		type: "layer" | "background";
		radius: number;
	},
	filterId: string,
): string => {
	if (!blur || blur.radius <= 0) return "";

	return `
		<defs>
			<filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
				<feGaussianBlur stdDeviation="${blur.radius}" />
			</filter>
		</defs>`;
};

export const exportSelectionAsSVG = (
	els: Element[],
	filename = "export-selection.svg",
) => {
	const { x, y, w, h } = unionBounds(els);

	if (w <= 0 || h <= 0) {
		throw new Error(`Invalid SVG export bounds: ${w}x${h}`);
	}

	const pieces: string[] = [];
	const filters: string[] = [];
	let filterCounter = 0;

	pieces.push(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`,
	);

	for (const el of els) {
		if (el.visible === false) continue;

		const stroke = el.stroke;
		const sw = stroke?.width || 0;
		const sc = getColorFallback(stroke?.color) || "none";
		const so = stroke?.opacity ?? 1;
		const fill = getColorFallback(el.fill) ?? "none";
		const op = el.opacity ?? 1;
		const shadow = el.shadow;
		const imageFill = el.imageFill;
		const radius = (el as RectangleElement).radius;
		const blur = (el as RectangleElement).blur;

		// Generate shadow filter if needed
		let filterId = "";
		if (shadow && shadow.opacity > 0) {
			filterId = `shadow-${filterCounter++}`;
			filters.push(generateSVGShadowFilter(shadow, filterId));
		}

		// Generate blur filter if needed
		if (blur && blur.radius > 0) {
			const blurFilterId = `blur-${filterCounter++}`;
			filters.push(generateSVGBlurFilter(blur, blurFilterId));
			filterId = filterId ? `${filterId} ${blurFilterId}` : blurFilterId;
		}

		const common = `${
			sw > 0
				? ` stroke="${esc(sc)}" stroke-width="${sw}" stroke-opacity="${so}"`
				: ""
		}${
			fill && fill !== "transparent"
				? ` fill="${esc(fill)}" fill-opacity="${op}"`
				: ` fill="none"`
		}${filterId ? ` filter="url(#${filterId})"` : ""}`;

		if (el.type === "rect" || el.type === "frame") {
			if (
				radius &&
				(radius.topLeft > 0 ||
					radius.topRight > 0 ||
					radius.bottomRight > 0 ||
					radius.bottomLeft > 0)
			) {
				// Use path for rounded rectangle
				const pathData = generateSVGRoundedRectPath(
					el.x - x,
					el.y - y,
					el.w,
					el.h,
					radius,
				);
				pieces.push(`<path d="${pathData}"${common} />`);
			} else {
				pieces.push(
					`<rect x="${el.x - x}" y="${el.y - y}" width="${el.w}" height="${
						el.h
					}"${common} />`,
				);
			}

			// Add image fill as separate element
			if (imageFill && imageFill.enabled && imageFill.src) {
				const imageId = `image-${filterCounter++}`;
				pieces.push(`
					<defs>
						<clipPath id="${imageId}">
							${
								radius &&
								(
									radius.topLeft > 0 ||
										radius.topRight > 0 ||
										radius.bottomRight > 0 ||
										radius.bottomLeft > 0
								)
									? `<path d="${generateSVGRoundedRectPath(
											el.x - x,
											el.y - y,
											el.w,
											el.h,
											radius,
										)}" />`
									: `<rect x="${el.x - x}" y="${el.y - y}" width="${
											el.w
										}" height="${el.h}" />`
							}
						</clipPath>
					</defs>
					<image 
						href="${esc(imageFill.src)}" 
						x="${el.x - x}" 
						y="${el.y - y}" 
						width="${el.w}" 
						height="${el.h}"
						clip-path="url(#${imageId})"
					/>
				`);
			}
		} else if (el.type === "ellipse") {
			const ellipseBlur = (el as EllipseElement).blur;

			// Generate blur filter for ellipse if needed
			let ellipseFilterId = "";
			if (ellipseBlur && ellipseBlur.radius > 0) {
				ellipseFilterId = `blur-${filterCounter++}`;
				filters.push(generateSVGBlurFilter(ellipseBlur, ellipseFilterId));
			}

			const ellipseCommon = `${common}${
				ellipseFilterId ? ` filter="url(#${ellipseFilterId})"` : ""
			}`;

			pieces.push(
				`<ellipse cx="${el.x - x + el.w / 2}" cy="${
					el.y - y + el.h / 2
				}" rx="${Math.abs(el.w / 2)}" ry="${Math.abs(
					el.h / 2,
				)}"${ellipseCommon} />`,
			);

			// Add image fill as separate element
			if (imageFill && imageFill.enabled && imageFill.src) {
				const imageId = `image-${filterCounter++}`;
				pieces.push(`
					<defs>
						<clipPath id="${imageId}">
							<ellipse cx="${el.x - x + el.w / 2}" cy="${el.y - y + el.h / 2}" rx="${Math.abs(
								el.w / 2,
							)}" ry="${Math.abs(el.h / 2)}" />
						</clipPath>
					</defs>
					<image 
						href="${esc(imageFill.src)}" 
						x="${el.x - x}" 
						y="${el.y - y}" 
						width="${el.w}" 
						height="${el.h}"
						clip-path="url(#${imageId})"
					/>
				`);
			}
		} else if (el.type === "line") {
			const lineEl = el as Element & { x2: number; y2: number };
			pieces.push(
				`<line x1="${el.x - x}" y1="${el.y - y}" x2="${lineEl.x2 - x}" y2="${
					lineEl.y2 - y
				}"${common} />`,
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
				`<text x="${el.x - x}" y="${
					el.y - y + fontSize
				}" fill="${color}" font-size="${fontSize}" font-family="${family}"${
					filterId ? ` filter="url(#${filterId})"` : ""
				}>${text}</text>`,
			);
		} else if (el.type === "path") {
			const pathEl = el as Element & {
				points: {
					x: number;
					y: number;
					curve?: {
						type: "quadratic" | "cubic" | "smooth";
						cx?: number;
						cy?: number;
						inHandle?: { x: number; y: number };
						outHandle?: { x: number; y: number };
					};
				}[];
				closed: boolean;
			};
			const d = toSvgPathD(pathEl, x, y);
			pieces.push(`<path d="${d}"${common} />`);
		} else if (el.type === "image") {
			const imageEl = el as Element & { src: string };
			const src = imageEl.src || "";
			if (src)
				pieces.push(
					`<image href="${esc(src)}" x="${el.x - x}" y="${el.y - y}" width="${
						el.w
					}" height="${el.h}"${
						filterId ? ` filter="url(#${filterId})"` : ""
					} />`,
				);
		}
	}

	// Add all filters at the beginning
	if (filters.length > 0) {
		pieces.splice(1, 0, ...filters);
	}

	pieces.push("</svg>");
	const svgContent = pieces.join("");
	const blob = new Blob([svgContent], { type: "image/svg+xml" });
	saveAs(blob, filename);
};

export const exportSceneAsSVG = (
	elements: Element[],
	filename = "scene.svg",
) => {
	const visible = elements.filter((e) => e.visible !== false);
	exportSelectionAsSVG(visible, filename);
};
