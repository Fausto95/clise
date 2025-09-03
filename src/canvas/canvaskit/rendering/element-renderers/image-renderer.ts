import type { Element, ImageElement } from "../../../../store/element-atoms";
import type {
	CanvasKitCanvas,
	CanvasKitInstance,
} from "../../../../types/canvaskit";
import { ImageCacheManager } from "../image-cache-manager";

/**
 * Image element renderer for CanvasKit
 */
export class ImageRenderer {
	private canvasKit: CanvasKitInstance;
	private imageCacheManager: ImageCacheManager;

	constructor(
		canvasKit: CanvasKitInstance,
		imageCacheManager: ImageCacheManager,
	) {
		this.canvasKit = canvasKit;
		this.imageCacheManager = imageCacheManager;
	}

	/**
	 * Draws an image element with opacity support
	 */
	drawImage(
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
	) {
		if (element.type !== "image") return;

		const { x, y, w, h, src, opacity = 1 } = element;
		const effects = (element as ImageElement).imageEffects;

		// Check if image is already cached
		const canvasKitImage = this.imageCacheManager.getCachedImage(src);

		if (!canvasKitImage) {
			// Image is still loading, return early
			return;
		}

		// Create paint for image rendering
		const paint = new this.canvasKit.Paint();
		paint.setAntiAlias(true);

		// Apply opacity if specified
		if (opacity < 1) {
			paint.setAlphaf(Math.max(0, Math.min(1, opacity)));
		}

		// Apply blur if requested
		const blur = effects?.blur ?? 0;
		if (blur > 0) {
			const blurFilter = this.canvasKit.ImageFilter.MakeBlur(
				blur,
				blur,
				this.canvasKit.TileMode.Decal,
				null,
			);
			paint.setImageFilter(blurFilter);
		}

		// Apply blend mode if requested
		const blend = effects?.blendMode || "normal";
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

		// Apply color effects (brightness/contrast/saturation)
		const brightness = effects?.brightness ?? 1;
		const contrast = effects?.contrast ?? 1;
		const saturation = effects?.saturation ?? 1;
		if (brightness !== 1 || contrast !== 1 || saturation !== 1) {
			const cf = this.canvasKit.ColorFilter.MakeMatrix(
				this.composeColorMatrix(brightness, contrast, saturation),
			);
			paint.setColorFilter(cf);
		}

		// Define source rectangle (entire image)
		const srcRect = this.canvasKit.XYWHRect(
			0,
			0,
			canvasKitImage.width(),
			canvasKitImage.height(),
		);

		// Define destination rectangle (element bounds)
		const destRect = this.canvasKit.XYWHRect(x, y, w, h);

		// Draw the image
		canvasContext.drawImageRect(canvasKitImage, srcRect, destRect, paint, true);

		paint.delete();

		// Draw selection outline if selected
		if (isSelected && onDrawSelectionOutline && onDrawResizeHandles) {
			const padding = 8;
			// Handle negative dimensions properly
			const left = Math.min(x, x + w) - padding;
			const top = Math.min(y, y + h) - padding;
			const actualWidth = Math.abs(w) + padding * 2;
			const actualHeight = Math.abs(h) + padding * 2;

			onDrawSelectionOutline(
				canvasContext,
				left,
				top,
				actualWidth,
				actualHeight,
				zoom,
			);
			onDrawResizeHandles(
				canvasContext,
				left,
				top,
				actualWidth,
				actualHeight,
				zoom,
			);
		}
	}

	private composeColorMatrix(b: number, c: number, s: number): number[] {
		const sat = this.saturationMatrix(s);
		const con = this.contrastMatrix(c);
		const bri = this.brightnessMatrix(b);
		const m1 = this.multiplyColorMatrices(con, sat);
		return this.multiplyColorMatrices(bri, m1);
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
}
