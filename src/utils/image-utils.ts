import type { ImageElement } from "../store/element-atoms";
import { extractSVGPathColors } from "./svg-utils";

export interface ImageDimensions {
	width: number;
	height: number;
	aspectRatio: number;
}

export interface ProcessedImageData {
	src: string;
	originalWidth: number;
	originalHeight: number;
	aspectRatio: number;
	displayWidth: number;
	displayHeight: number;
}

/**
 * Convert a File to base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

/**
 * Load an image and get its natural dimensions
 */
export function loadImage(src: string): Promise<ImageDimensions> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			let width = img.naturalWidth;
			let height = img.naturalHeight;

			// Handle SVG files that might not have natural dimensions
			if ((width === 0 || height === 0) && src.includes("data:image/svg+xml")) {
				// For SVG files without explicit dimensions, use default size
				width = width || 300;
				height = height || 300;

				// Try to parse SVG viewBox or width/height attributes
				try {
					const srcParts = src.split(",");
					if (srcParts.length < 2 || !srcParts[1]) {
						throw new Error("Invalid base64 data");
					}
					const svgData = atob(srcParts[1]);
					const viewBoxMatch = svgData.match(/viewBox=["']([^"']+)["']/);
					const widthMatch = svgData.match(/width=["']([^"']+)["']/);
					const heightMatch = svgData.match(/height=["']([^"']+)["']/);

					if (viewBoxMatch && viewBoxMatch[1]) {
						const viewBox = viewBoxMatch[1].split(/\s+/);
						if (viewBox.length >= 4 && viewBox[2] && viewBox[3]) {
							width = parseFloat(viewBox[2]) || width;
							height = parseFloat(viewBox[3]) || height;
						}
					} else if (
						widthMatch &&
						heightMatch &&
						widthMatch[1] &&
						heightMatch[1]
					) {
						const parsedWidth = parseFloat(widthMatch[1]);
						const parsedHeight = parseFloat(heightMatch[1]);
						if (!isNaN(parsedWidth) && !isNaN(parsedHeight)) {
							width = parsedWidth;
							height = parsedHeight;
						}
					}
				} catch (e) {
					// If parsing fails, use default dimensions
					console.warn("Failed to parse SVG dimensions, using defaults:", e);
				}
			}

			// Ensure we have valid dimensions
			if (width <= 0 || height <= 0) {
				width = 300;
				height = 300;
			}

			const aspectRatio = width / height;
			resolve({
				width,
				height,
				aspectRatio,
			});
		};
		img.onerror = reject;
		img.src = src;
	});
}

/**
 * Calculate display dimensions while preserving aspect ratio
 * @param originalWidth Original image width
 * @param originalHeight Original image height
 * @param maxWidth Maximum display width (default: 400)
 * @param maxHeight Maximum display height (default: 400)
 */
export function calculateDisplayDimensions(
	originalWidth: number,
	originalHeight: number,
	maxWidth: number = 400,
	maxHeight: number = 400,
): { width: number; height: number } {
	const aspectRatio = originalWidth / originalHeight;

	let width = originalWidth;
	let height = originalHeight;

	// Scale down if too large
	if (width > maxWidth) {
		width = maxWidth;
		height = width / aspectRatio;
	}

	if (height > maxHeight) {
		height = maxHeight;
		width = height * aspectRatio;
	}

	// Ensure minimum size
	const minSize = 20;
	if (width < minSize) {
		width = minSize;
		height = width / aspectRatio;
	}
	if (height < minSize) {
		height = minSize;
		width = height * aspectRatio;
	}

	return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Process an image file for use in the canvas
 */
export async function processImageFile(
	file: File,
): Promise<ProcessedImageData> {
	// Convert to base64
	const src = await fileToBase64(file);

	// Load and get dimensions
	const dimensions = await loadImage(src);

	// Calculate display size
	const displaySize = calculateDisplayDimensions(
		dimensions.width,
		dimensions.height,
	);

	return {
		src,
		originalWidth: dimensions.width,
		originalHeight: dimensions.height,
		aspectRatio: dimensions.aspectRatio,
		displayWidth: displaySize.width,
		displayHeight: displaySize.height,
	};
}

/**
 * Create an ImageElement from processed image data
 */
export function createImageElement(
	imageData: ProcessedImageData,
	x: number,
	y: number,
	fileName?: string,
): Omit<ImageElement, "id"> {
	// Extract SVG path information if it's an SVG
	const svgColorInfo = extractSVGPathColors(imageData.src);

	return {
		type: "image",
		x,
		y,
		w: imageData.displayWidth,
		h: imageData.displayHeight,
		src: imageData.src,
		originalWidth: imageData.originalWidth,
		originalHeight: imageData.originalHeight,
		aspectRatio: imageData.aspectRatio,
		alt: fileName || "Imported image",
		fill: "transparent",
		opacity: 1,
		visible: true,
		parentId: null,
		rotation: 0,
		name: fileName ? `image-${fileName}` : `image-${Date.now()}`,
		svgPaths: svgColorInfo.isSVG ? svgColorInfo.paths : undefined,
		imageEffects: {
			blur: 0,
			brightness: 1,
			contrast: 1,
			saturation: 1,
			blendMode: "normal",
		},
	};
}

/**
 * Calculate constrained dimensions for resize while maintaining aspect ratio
 */
export function calculateConstrainedResize(
	originalWidth: number,
	originalHeight: number,
	newWidth: number,
	newHeight: number,
	aspectRatio: number,
	maintainAspectRatio: boolean = true,
): { width: number; height: number } {
	if (!maintainAspectRatio) {
		return { width: newWidth, height: newHeight };
	}

	// Determine which dimension changed more and constrain the other
	const widthRatio = newWidth / originalWidth;
	const heightRatio = newHeight / originalHeight;

	if (Math.abs(widthRatio - 1) > Math.abs(heightRatio - 1)) {
		// Width changed more, constrain height
		return {
			width: newWidth,
			height: newWidth / aspectRatio,
		};
	} else {
		// Height changed more, constrain width
		return {
			width: newHeight * aspectRatio,
			height: newHeight,
		};
	}
}

/**
 * Check if a file is a supported image type
 */
export function isSupportedImageFile(file: File): boolean {
	const supportedTypes = ["image/jpeg", "image/png", "image/svg+xml"];
	return supportedTypes.includes(file.type);
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
	return filename.split(".").pop()?.toLowerCase() || "";
}

/**
 * Validate image file by extension and MIME type
 */
export function validateImageFile(file: File): {
	valid: boolean;
	error?: string;
} {
	const supportedExtensions = ["jpg", "jpeg", "png", "svg"];
	const extension = getFileExtension(file.name);

	if (!supportedExtensions.includes(extension)) {
		return {
			valid: false,
			error: `Unsupported file extension: .${extension}. Supported formats: JPG, PNG, SVG`,
		};
	}

	if (!isSupportedImageFile(file)) {
		return {
			valid: false,
			error: `Unsupported MIME type: ${file.type}. Supported formats: JPG, PNG, SVG`,
		};
	}

	// Check file size (limit to 10MB)
	const maxSize = 10 * 1024 * 1024; // 10MB
	if (file.size > maxSize) {
		return {
			valid: false,
			error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size: 10MB`,
		};
	}

	return { valid: true };
}
