import type {
	CanvasKitImage,
	CanvasKitInstance,
} from "../../../types/canvaskit";
import { captureError } from "../../../utils/sentry";

/**
 * Manages image loading and caching for CanvasKit rendering
 */
export class ImageCacheManager {
	private canvasKit: CanvasKitInstance;
	private imageCache: Map<string, CanvasKitImage> = new Map();
	private onImageLoaded?: () => void;

	constructor(canvasKit: CanvasKitInstance, onImageLoaded?: () => void) {
		this.canvasKit = canvasKit;
		this.onImageLoaded = onImageLoaded;
	}

	setOnImageLoaded(callback: () => void) {
		this.onImageLoaded = callback;
	}

	/**
	 * Gets cached image or starts loading if not available
	 * @param src - Image source URL or data URL
	 * @returns Cached CanvasKit image or null if still loading
	 */
	getCachedImage(src: string): CanvasKitImage | null {
		const cachedImage = this.imageCache.get(src);
		if (!cachedImage) {
			// Only allow local data URLs
			if (!src.startsWith("data:")) {
				// Disallow remote fetches (security and offline-friendly)
				return null;
			}
			// Start loading the image asynchronously
			this.loadImageAsync(src)
				.then(() => {
					// Trigger a re-render when the image is loaded
					if (this.onImageLoaded) {
						this.onImageLoaded();
					}
				})
				.catch((error) => {
					captureError(error as Error, {
						context: "Failed to load image",
						src,
					});
				});
			return null;
		}
		return cachedImage;
	}

	/**
	 * Asynchronously loads and caches an image
	 * @param src - Image source URL or data URL
	 */
	private async loadImageAsync(src: string): Promise<void> {
		try {
			// Only data URLs are supported (local only)
			if (!src.startsWith("data:")) {
				throw new Error("Remote image sources are disabled");
			}

			// Check if this is an SVG data URL
			const isSvg = src.startsWith("data:image/svg+xml");

			if (isSvg) {
				// For SVG, we need to convert it to a raster image first
				const img = new Image();
				img.crossOrigin = "anonymous";

				await new Promise<void>((resolve, reject) => {
					img.onload = () => resolve();
					img.onerror = () => reject(new Error("Failed to load SVG image"));
					img.src = src;
				});

				// Create a canvas to rasterize the SVG
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d")!;
				canvas.width = img.naturalWidth || img.width;
				canvas.height = img.naturalHeight || img.height;

				// Draw the SVG image to canvas
				ctx.drawImage(img, 0, 0);

				// Convert canvas to blob and then to ArrayBuffer
				const blob = await new Promise<Blob>((resolve) => {
					canvas.toBlob((blob) => resolve(blob!), "image/png");
				});

				const arrayBuffer = await blob.arrayBuffer();

				// Create CanvasKit image from the rasterized PNG data
				const newImage = this.canvasKit.MakeImageFromEncoded(arrayBuffer);

				if (newImage) {
					this.imageCache.set(src, newImage);
				} else {
					const error = new Error(
						"Failed to create CanvasKit image from rasterized SVG",
					);
					captureError(error, {
						context: "Failed to create CanvasKit image from rasterized SVG",
					});
					throw error;
				}
			} else {
				// For non-SVG images
				let arrayBuffer: ArrayBuffer;
				if (src.startsWith("data:")) {
					// Decode data URL without fetch for reliability
					const comma = src.indexOf(",");
					if (comma === -1) throw new Error("Invalid data URL");
					const meta = src.substring(0, comma);
					const base64 = src.substring(comma + 1);
					const isBase64 = /;base64/i.test(meta);
					if (isBase64) {
						const binary = atob(base64);
						const len = binary.length;
						const bytes = new Uint8Array(len);
						for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
						arrayBuffer = bytes.buffer;
					} else {
						// Percent-encoded data
						const decoded = decodeURIComponent(base64);
						const len = decoded.length;
						const bytes = new Uint8Array(len);
						for (let i = 0; i < len; i++) bytes[i] = decoded.charCodeAt(i);
						arrayBuffer = bytes.buffer;
					}
				} else {
					throw new Error("Remote image sources are disabled");
				}

				// Create CanvasKit image from encoded data
				const newImage = this.canvasKit.MakeImageFromEncoded(arrayBuffer);

				if (newImage) {
					this.imageCache.set(src, newImage);
				} else {
					const error = new Error("Failed to create CanvasKit image from data");
					captureError(error, {
						context: "Failed to create CanvasKit image from data",
					});
					throw error;
				}
			}
		} catch (error) {
			captureError(error as Error, {
				context: "Failed to load image async",
				src,
			});
			throw error;
		}
	}

	/**
	 * Clears all cached images
	 */
	cleanup(): void {
		for (const image of this.imageCache.values()) {
			image.delete();
		}
		this.imageCache.clear();
	}
}
