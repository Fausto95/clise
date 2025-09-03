import type {
	Element,
	TextElement,
	PathElement,
} from "../../../store/element-atoms";

export interface ResizeOperation {
	element: Element;
	handle: string;
	deltaX: number;
	deltaY: number;
}

export interface ResizeResult {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface TextResizeResult {
	x: number;
	y: number;
	w: number;
	h: number;
	fontSize: number;
}

export interface LineResizeResult {
	x: number;
	y: number;
	x2: number;
	y2: number;
}

export interface PathResizeResult {
	x: number;
	y: number;
	w: number;
	h: number;
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
}

export class ResizeManager {
	static calculateTextResize(operation: ResizeOperation): TextResizeResult {
		const { element, handle, deltaX, deltaY } = operation;

		if (element.type !== "text") {
			throw new Error("calculateTextResize called with non-text element");
		}

		const textElement = element as TextElement;
		const { x, y, w, h, fontSize } = textElement;

		// For text, we'll primarily resize by changing font size
		// Use the diagonal handles for proportional resize, or horizontal handles for width-based resize
		let fontSizeMultiplier = 1;
		let newX = x;
		let newY = y;

		if (handle.includes("e") || handle.includes("w")) {
			// Horizontal resize - adjust font size based on width change
			const widthChange = handle.includes("e") ? deltaX : -deltaX;
			const widthRatio = (w + widthChange) / w;
			fontSizeMultiplier = Math.max(0.1, widthRatio); // Minimum font size ratio
		} else if (handle.includes("n") || handle.includes("s")) {
			// Vertical resize - adjust font size based on height change
			const heightChange = handle.includes("s") ? deltaY : -deltaY;
			const heightRatio = (h + heightChange) / h;
			fontSizeMultiplier = Math.max(0.1, heightRatio); // Minimum font size ratio
		} else {
			// Diagonal resize - use the average of both dimensions
			const widthChange = handle.includes("e")
				? deltaX
				: handle.includes("w")
					? -deltaX
					: 0;
			const heightChange = handle.includes("s")
				? deltaY
				: handle.includes("n")
					? -deltaY
					: 0;
			const widthRatio = (w + widthChange) / w;
			const heightRatio = (h + heightChange) / h;
			fontSizeMultiplier = Math.max(0.1, (widthRatio + heightRatio) / 2);
		}

		const newFontSize = Math.max(8, Math.round(fontSize * fontSizeMultiplier)); // Minimum 8px

		// Calculate new text bounds based on new font size
		const approximateCharWidth = newFontSize * 0.6;
		const newW = textElement.text.length * approximateCharWidth;
		const newH = newFontSize * 1.2;

		// Adjust position if needed (for handles that move the origin)
		if (handle.includes("w")) {
			newX = x + w - newW;
		}
		if (handle.includes("n")) {
			newY = y + h - newH;
		}

		return {
			x: newX,
			y: newY,
			w: newW,
			h: newH,
			fontSize: newFontSize,
		};
	}

	static calculateLineResize(operation: ResizeOperation): LineResizeResult {
		const { element, handle, deltaX, deltaY } = operation;

		if (element.type !== "line" || !("x2" in element) || !("y2" in element)) {
			throw new Error("calculateLineResize called with non-line element");
		}

		let newX = element.x;
		let newY = element.y;
		let newX2 = element.x2;
		let newY2 = element.y2;

		switch (handle) {
			case "start":
				// Move the start point
				newX += deltaX;
				newY += deltaY;
				break;
			case "end":
				// Move the end point
				newX2 += deltaX;
				newY2 += deltaY;
				break;
		}

		return {
			x: newX,
			y: newY,
			x2: newX2,
			y2: newY2,
		};
	}

	static calculateResize(operation: ResizeOperation): ResizeResult {
		const { element, handle, deltaX, deltaY } = operation;

		let newX = element.x;
		let newY = element.y;
		let newW = element.w;
		let newH = element.h;

		// For image elements, preserve aspect ratio
		if (element.type === "image") {
			const aspectRatio = element.aspectRatio || element.w / element.h;

			// Calculate new dimensions based on handle
			switch (handle) {
				case "nw":
				case "ne":
				case "sw":
				case "se": {
					// Corner handles - maintain aspect ratio based on the primary drag direction
					let scaleFactor;

					if (Math.abs(deltaX) > Math.abs(deltaY)) {
						// Horizontal drag is dominant
						scaleFactor = handle.includes("e")
							? (element.w + deltaX) / element.w
							: (element.w - deltaX) / element.w;
					} else {
						// Vertical drag is dominant
						scaleFactor = handle.includes("s")
							? (element.h + deltaY) / element.h
							: (element.h - deltaY) / element.h;
					}

					// Apply scale factor to both dimensions
					newW = element.w * scaleFactor;
					newH = element.h * scaleFactor;

					// Adjust position for handles that move the origin
					if (handle.includes("w")) {
						newX = element.x + element.w - newW;
					}
					if (handle.includes("n")) {
						newY = element.y + element.h - newH;
					}
					break;
				}

				case "n":
				case "s":
					// Vertical handles - adjust height and maintain aspect ratio
					newH = handle === "s" ? element.h + deltaY : element.h - deltaY;
					newW = newH * aspectRatio;

					// Center horizontally
					newX = element.x - (newW - element.w) / 2;

					if (handle === "n") {
						newY = element.y + element.h - newH;
					}
					break;

				case "e":
				case "w":
					// Horizontal handles - adjust width and maintain aspect ratio
					newW = handle === "e" ? element.w + deltaX : element.w - deltaX;
					newH = newW / aspectRatio;

					// Center vertically
					newY = element.y - (newH - element.h) / 2;

					if (handle === "w") {
						newX = element.x + element.w - newW;
					}
					break;
			}
		} else {
			// Non-image elements - use original resize logic
			switch (handle) {
				case "nw":
					newX += deltaX;
					newY += deltaY;
					newW -= deltaX;
					newH -= deltaY;
					break;
				case "n":
					newY += deltaY;
					newH -= deltaY;
					break;
				case "ne":
					newY += deltaY;
					newW += deltaX;
					newH -= deltaY;
					break;
				case "e":
					newW += deltaX;
					break;
				case "se":
					newW += deltaX;
					newH += deltaY;
					break;
				case "s":
					newH += deltaY;
					break;
				case "sw":
					newX += deltaX;
					newW -= deltaX;
					newH += deltaY;
					break;
				case "w":
					newX += deltaX;
					newW -= deltaX;
					break;
			}
		}

		// Allow negative dimensions for flipping - no minimum size constraints
		// Keep negative dimensions as-is to allow flipping without position changes

		return { x: newX, y: newY, w: newW, h: newH };
	}

	static calculatePathResize(operation: ResizeOperation): PathResizeResult {
		const { element } = operation;
		if (element.type !== "path") {
			throw new Error("calculatePathResize called with non-path element");
		}

		// First compute new bbox using the generic logic
		const { x, y, w, h } = ResizeManager.calculateResize(operation);

		const pathElement = element as PathElement;
		const oldW = pathElement.w || 1;
		const oldH = pathElement.h || 1;
		const scaleX = w / oldW;
		const scaleY = h / oldH;

		const newPoints = pathElement.points.map(
			(p: {
				x: number;
				y: number;
				curve?: {
					type: "quadratic" | "cubic" | "smooth";
					cx?: number;
					cy?: number;
					inHandle?: { x: number; y: number };
					outHandle?: { x: number; y: number };
				};
			}) => {
				const np = {
					x: p.x * scaleX,
					y: p.y * scaleY,
					curve: p.curve
						? {
								type: p.curve.type,
								cx: p.curve.cx ? p.curve.cx * scaleX : undefined,
								cy: p.curve.cy ? p.curve.cy * scaleY : undefined,
								inHandle: p.curve.inHandle
									? {
											x: p.curve.inHandle.x * scaleX,
											y: p.curve.inHandle.y * scaleY,
										}
									: undefined,
								outHandle: p.curve.outHandle
									? {
											x: p.curve.outHandle.x * scaleX,
											y: p.curve.outHandle.y * scaleY,
										}
									: undefined,
							}
						: undefined,
				};
				return np;
			},
		);

		return { x, y, w, h, points: newPoints };
	}

	static handleResizeRealtime(
		element: Element,
		handle: string,
		deltaX: number,
		deltaY: number,
		updateElementPosition: (update: {
			id: string;
			position: { x: number; y: number; w?: number; h?: number };
		}) => void,
	): void {
		const resizeResult = ResizeManager.calculateResize({
			element,
			handle,
			deltaX,
			deltaY,
		});

		updateElementPosition({
			id: element.id,
			position: resizeResult,
		});
	}
}
