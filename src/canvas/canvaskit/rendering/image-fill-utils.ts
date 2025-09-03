import type {
	CanvasKitCanvas,
	CanvasKitInstance,
	CanvasKitRectObject,
	CanvasKitPath,
} from "../../../types/canvaskit";
import type { ImageFill } from "../../../store/elements/element-types";
import type { ImageCacheManager } from "./image-cache-manager";

/**
 * Helper utilities to render image fills inside shapes using CanvasKit
 */
export class ImageFillUtils {
	private canvasKit: CanvasKitInstance;
	private imageCache: ImageCacheManager;

	constructor(canvasKit: CanvasKitInstance, imageCache: ImageCacheManager) {
		this.canvasKit = canvasKit;
		this.imageCache = imageCache;
	}

	private createColorFilter(
		brightness: number,
		contrast: number,
		saturation: number,
	) {
		const sat = this.saturationMatrix(saturation);
		const con = this.contrastMatrix(contrast);
		const bri = this.brightnessMatrix(brightness);
		const m1 = this.multiplyColorMatrices(con, sat);
		const m = this.multiplyColorMatrices(bri, m1);
		return this.canvasKit.ColorFilter.MakeMatrix(m);
	}

	private saturationMatrix(s: number): number[] {
		const lr = 0.2126,
			lg = 0.7152,
			lb = 0.0722;
		const sr = (1 - s) * lr;
		const sg = (1 - s) * lg;
		const sb = (1 - s) * lb;
		return [
			sr + s,
			sg,
			sb,
			0,
			0,
			sr,
			sg + s,
			sb,
			0,
			0,
			sr,
			sg,
			sb + s,
			0,
			0,
			0,
			0,
			0,
			1,
			0,
		];
	}

	private contrastMatrix(c: number): number[] {
		const t = (1 - c) * 0.5;
		return [c, 0, 0, 0, t, 0, c, 0, 0, t, 0, 0, c, 0, t, 0, 0, 0, 1, 0];
	}

	private brightnessMatrix(b: number): number[] {
		const o = b - 1;
		return [1, 0, 0, 0, o, 0, 1, 0, 0, o, 0, 0, 1, 0, o, 0, 0, 0, 1, 0];
	}

	private multiplyColorMatrices(a: number[], b: number[]): number[] {
		const r = new Array(20).fill(0);
		for (let row = 0; row < 4; row++) {
			for (let col = 0; col < 5; col++) {
				const idx = row * 5 + col;
				r[idx] =
					(a[row * 5 + 0] ?? 0) * (b[0 * 5 + col] ?? 0) +
					(a[row * 5 + 1] ?? 0) * (b[1 * 5 + col] ?? 0) +
					(a[row * 5 + 2] ?? 0) * (b[2 * 5 + col] ?? 0) +
					(a[row * 5 + 3] ?? 0) * (b[3 * 5 + col] ?? 0) +
					(col === 4 ? (a[row * 5 + 4] ?? 0) : 0);
			}
		}
		return r;
	}

	/**
	 * Draws an image fill clipped to a rectangular shape (optionally with radius),
	 * supporting fit, alignment, rotation, offset, and optional blur.
	 */
	drawImageFillInRect(
		canvas: CanvasKitCanvas,
		left: number,
		top: number,
		width: number,
		height: number,
		imageFill: ImageFill,
		_radius?: {
			topLeft: number;
			topRight: number;
			bottomRight: number;
			bottomLeft: number;
		},
		opacity: number = 1,
		clipPath?: CanvasKitPath,
	) {
		if (!imageFill?.enabled || !imageFill.src) return;
		const img = this.imageCache.getCachedImage(imageFill.src);
		if (!img) return; // not yet loaded

		const iw = Math.max(1, img.width());
		const ih = Math.max(1, img.height());

		const fit = imageFill.fit || "fill";
		const align = imageFill.align || "center";
		const rotDeg = imageFill.rotationDeg || 0;
		const rotRad = (rotDeg * Math.PI) / 180;
		const offX = imageFill.offsetX || 0;
		const offY = imageFill.offsetY || 0;
		const sMulX = imageFill.scaleX ?? 1;
		const sMulY = imageFill.scaleY ?? 1;

		// Compute destination rect based on fit
		const sx = width / iw;
		const sy = height / ih;
		let scaleX = sx;
		let scaleY = sy;
		if (fit === "contain") {
			const s = Math.min(sx, sy);
			scaleX = s;
			scaleY = s;
		} else if (fit === "cover") {
			const s = Math.max(sx, sy);
			scaleX = s;
			scaleY = s;
		} else if (fit === "stretch" || fit === "fill") {
			// keep sx, sy
		} else if (fit === "tile") {
			// For now, approximate by using current scale multipliers only
			scaleX = sMulX;
			scaleY = sMulY;
		}
		// Apply extra user scale
		scaleX *= sMulX;
		scaleY *= sMulY;

		const destW = Math.max(1, iw * scaleX);
		const destH = Math.max(1, ih * scaleY);

		// Alignment within rect
		const cx = left + width / 2;
		const cy = top + height / 2;
		let dx = left;
		let dy = top;
		const ax = align.includes("left") ? 0 : align.includes("right") ? 1 : 0.5;
		const ay = align.includes("top") ? 0 : align.includes("bottom") ? 1 : 0.5;
		dx = left + (width - destW) * ax;
		dy = top + (height - destH) * ay;

		// Add user offset
		dx += offX;
		dy += offY;

		const srcRect: CanvasKitRectObject = this.canvasKit.XYWHRect(0, 0, iw, ih);
		const destRect: CanvasKitRectObject = this.canvasKit.XYWHRect(
			dx,
			dy,
			destW,
			destH,
		);

		// Build paint
		const paint = new this.canvasKit.Paint();
		paint.setStyle(this.canvasKit.PaintStyle.Fill);
		paint.setAntiAlias(true);
		if (imageFill.blur && imageFill.blur > 0) {
			const blur = this.canvasKit.ImageFilter.MakeBlur(
				imageFill.blur,
				imageFill.blur,
				this.canvasKit.TileMode.Decal,
				null,
			);
			paint.setImageFilter(blur);
		}
		if (opacity < 1) paint.setAlphaf(Math.max(0, Math.min(1, opacity)));

		// Clip to shape before rotating (clip remains untransformed), then rotate image around center
		canvas.save();
		if (clipPath) {
			canvas.clipPath(clipPath, this.canvasKit.ClipOp.Intersect, true);
		} else {
			const r = this.canvasKit.XYWHRect(left, top, width, height);
			canvas.clipRect(r, this.canvasKit.ClipOp.Intersect, true);
		}

		if (rotDeg !== 0) {
			canvas.rotate(rotRad, cx, cy);
		}

		// Blend mode
		const blend = imageFill.blendMode || "normal";
		if (blend !== "normal") {
			const bm =
				blend === "multiply"
					? this.canvasKit.BlendMode.Multiply
					: blend === "screen"
						? this.canvasKit.BlendMode.Screen
						: blend === "overlay"
							? this.canvasKit.BlendMode.Overlay
							: blend === "darken"
								? this.canvasKit.BlendMode.Darken
								: blend === "lighten"
									? this.canvasKit.BlendMode.Lighten
									: this.canvasKit.BlendMode.SrcOver;
			paint.setBlendMode(bm);
		}

		// Color effects
		const b = imageFill.brightness ?? 1;
		const c = imageFill.contrast ?? 1;
		const s = imageFill.saturation ?? 1;
		if (b !== 1 || c !== 1 || s !== 1) {
			const cf = this.createColorFilter(b, c, s);
			if (cf) paint.setColorFilter(cf);
		}

		const repX = imageFill.repeatX || "none";
		const repY = imageFill.repeatY || "none";
		if (repX === "none" && repY === "none") {
			canvas.drawImageRect(img, srcRect, destRect, paint, true);
		} else {
			const tileW = destW;
			const tileH = destH;
			const areaLeft = left;
			const areaTop = top;
			const areaRight = left + width;
			const areaBottom = top + height;
			const startCol =
				repX === "none" ? 0 : Math.floor((areaLeft - dx) / tileW);
			const endCol = repX === "none" ? 1 : Math.ceil((areaRight - dx) / tileW);
			const startRow = repY === "none" ? 0 : Math.floor((areaTop - dy) / tileH);
			const endRow = repY === "none" ? 1 : Math.ceil((areaBottom - dy) / tileH);
			for (let row = startRow; row < endRow; row++) {
				for (let col = startCol; col < endCol; col++) {
					const tx = dx + col * tileW;
					const ty = dy + row * tileH;
					const drect = this.canvasKit.XYWHRect(tx, ty, tileW, tileH);
					const mirrorX = repX === "mirror" && Math.abs(col % 2) === 1;
					const mirrorY = repY === "mirror" && Math.abs(row % 2) === 1;
					if (mirrorX || mirrorY) {
						canvas.save();
						const cx2 = tx + tileW / 2;
						const cy2 = ty + tileH / 2;
						canvas.translate(cx2, cy2);
						canvas.scale(mirrorX ? -1 : 1, mirrorY ? -1 : 1);
						canvas.translate(-cx2, -cy2);
						canvas.drawImageRect(img, srcRect, drect, paint, true);
						canvas.restore();
					} else {
						canvas.drawImageRect(img, srcRect, drect, paint, true);
					}
				}
			}
		}
		canvas.restore();

		paint.delete();
	}
}
