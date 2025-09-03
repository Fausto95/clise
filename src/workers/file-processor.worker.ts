// Web Worker for file import/export operations without blocking the UI
import type { Element } from "../store/element-atoms";
import type { Group } from "../store/group-atoms";

// Simple error tracking for worker context
const captureWorkerError = (error: Error, context: string) => {
	// Send error info back to main thread for proper error tracking
	self.postMessage({
		type: "error",
		payload: { error: error.message, context, stack: error.stack },
	});
};

// Types for worker messages (used in message handler)

// Response types
type ProcessCliseResponse = {
	type: "clise-processed";
	data: {
		elements: Element[];
		groups: Group[];
		viewport?: { zoom: number; pan: { x: number; y: number } };
		metadata?: any;
	};
};

type ProcessImageResponse = {
	type: "image-processed";
	data: {
		src: string;
		originalWidth: number;
		originalHeight: number;
		aspectRatio: number;
		displayWidth: number;
		displayHeight: number;
		fileName: string;
	};
};

type ProcessImagesResponse = {
	type: "images-processed";
	data: Array<{
		src: string;
		originalWidth: number;
		originalHeight: number;
		aspectRatio: number;
		displayWidth: number;
		displayHeight: number;
		fileName: string;
	}>;
};

type ExportCliseResponse = {
	type: "clise-exported";
	data: string; // JSON string
};

type ErrorResponse = {
	type: "error";
	message: string;
};

type ProgressResponse = {
	type: "progress";
	progress: number; // 0-100
	message: string;
};

// Utility functions for image processing

function loadImage(
	src: string,
): Promise<{ width: number; height: number; aspectRatio: number }> {
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
			resolve({ width, height, aspectRatio });
		};
		img.onerror = reject;
		img.src = src;
	});
}

function calculateDisplayDimensions(
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

// DZNZ file processing
async function processCliseFile(
	content: string,
): Promise<ProcessCliseResponse["data"]> {
	try {
		const data = JSON.parse(content);

		// Validate the format
		if (!data.version || !data.elements || !Array.isArray(data.elements)) {
			throw new Error("Invalid Clise file format");
		}

		// Ensure backward compatibility - normalize groups to array
		if (!data.groups) {
			data.groups = [];
		} else if (!Array.isArray(data.groups)) {
			data.groups = Object.values(data.groups);
		}

		// Ensure backward compatibility - add default viewport if missing
		if (!data.viewport) {
			data.viewport = { zoom: 1, pan: { x: 0, y: 0 } };
		}

		// Validate elements (basic validation)
		const validatedElements = data.elements.map((element: Element) => {
			// Basic validation - ensure required fields exist
			if (!element.id || !element.type) {
				throw new Error(`Invalid element: missing id or type`);
			}
			return element;
		});

		return {
			elements: validatedElements,
			groups: data.groups || [],
			viewport: data.viewport,
			metadata: data.metadata,
		};
	} catch (error) {
		const errorObj = error instanceof Error ? error : new Error(String(error));
		captureWorkerError(errorObj, "DZNZ file processing");
		throw errorObj;
	}
}

// Image processing
async function processImageFile(
	fileData: string,
	fileName: string,
	fileType: string,
): Promise<ProcessImageResponse["data"]> {
	try {
		// Convert to data URL
		const src = `data:${fileType};base64,${fileData}`;

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
			fileName,
		};
	} catch (error) {
		const errorObj = error instanceof Error ? error : new Error(String(error));
		captureWorkerError(errorObj, `Image processing: ${fileName}`);
		throw errorObj;
	}
}

// Multiple images processing
async function processImages(
	files: Array<{ data: string; name: string; type: string }>,
): Promise<ProcessImagesResponse["data"]> {
	const results = [];
	const total = files.length;

	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		if (!file) continue;

		// Send progress update
		(self as any).postMessage({
			type: "progress",
			progress: Math.round((i / total) * 100),
			message: `Processing ${file.name}...`,
		} as ProgressResponse);

		try {
			const result = await processImageFile(file.data, file.name, file.type);
			results.push(result);
		} catch (error) {
			const errorObj =
				error instanceof Error ? error : new Error(String(error));
			captureWorkerError(errorObj, `Batch image processing: ${file.name}`);
			// Continue with other files even if one fails
		}
	}

	return results;
}

// DZNZ export
function exportCliseFile(
	elements: Element[],
	groups: Group[],
	viewport: { zoom: number; pan: { x: number; y: number } },
	metadata?: any,
): string {
	const exportData = {
		version: "1.0",
		elements,
		groups,
		viewport,
		metadata: metadata || {
			exportedAt: new Date().toISOString(),
			elementCount: elements.length,
			groupCount: groups.length,
		},
	};

	return JSON.stringify(exportData, null, 2);
}

// Main message handler
self.onmessage = async (e: MessageEvent) => {
	const data = e.data;
	if (!data) return;

	try {
		switch (data.type) {
			case "process-clise": {
				const result = await processCliseFile(data.content);
				(self as any).postMessage({
					type: "clise-processed",
					data: result,
				} as ProcessCliseResponse);
				break;
			}

			case "process-image": {
				const result = await processImageFile(
					data.fileData,
					data.fileName,
					data.fileType,
				);
				(self as any).postMessage({
					type: "image-processed",
					data: result,
				} as ProcessImageResponse);
				break;
			}

			case "process-images": {
				const result = await processImages(data.files);
				(self as any).postMessage({
					type: "images-processed",
					data: result,
				} as ProcessImagesResponse);
				break;
			}

			case "export-clise": {
				const result = exportCliseFile(
					data.elements,
					data.groups,
					data.viewport,
					data.metadata,
				);
				(self as any).postMessage({
					type: "clise-exported",
					data: result,
				} as ExportCliseResponse);
				break;
			}

			default:
				throw new Error(`Unknown message type: ${data.type}`);
		}
	} catch (error) {
		const errorObj = error instanceof Error ? error : new Error(String(error));
		captureWorkerError(errorObj, `Worker message handler: ${data.type}`);

		(self as any).postMessage({
			type: "error",
			message: errorObj.message,
		} as ErrorResponse);
	}
};
