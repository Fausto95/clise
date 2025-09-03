import type { Element, PathElement } from "@store/index";
import type { SelectionBox } from "./types";

// Note: screenToCanvas and canvasToScreen functions have been removed
// in favor of the simplified coordinate system using useCoordinateTransforms hook

/**
 * Check if a line intersects with a rectangle
 */
const lineIntersectsRect = (
	lineStart: { x: number; y: number },
	lineEnd: { x: number; y: number },
	rect: { left: number; right: number; top: number; bottom: number },
): boolean => {
	// Check if either endpoint is inside the rectangle
	if (
		(lineStart.x >= rect.left &&
			lineStart.x <= rect.right &&
			lineStart.y >= rect.top &&
			lineStart.y <= rect.bottom) ||
		(lineEnd.x >= rect.left &&
			lineEnd.x <= rect.right &&
			lineEnd.y >= rect.top &&
			lineEnd.y <= rect.bottom)
	) {
		return true;
	}

	// Check if line intersects any of the four rectangle edges using parametric line intersection
	// Uses the parametric line intersection algorithm to find intersection points
	const intersectsEdge = (
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		x3: number,
		y3: number,
		x4: number,
		y4: number,
	): boolean => {
		// Calculate denominator for parametric intersection formula
		// If denominator is 0, lines are parallel
		const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
		if (Math.abs(denom) < 1e-10) return false; // Lines are parallel

		// Calculate parametric values t and u
		// t represents position along first line (0-1 for segment)
		// u represents position along second line (0-1 for segment)
		const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
		const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

		// Intersection occurs if both parameters are within [0,1] range
		return t >= 0 && t <= 1 && u >= 0 && u <= 1;
	};

	// Check intersection with all four edges of the rectangle
	return (
		intersectsEdge(
			lineStart.x,
			lineStart.y,
			lineEnd.x,
			lineEnd.y,
			rect.left,
			rect.top,
			rect.right,
			rect.top,
		) || // top edge
		intersectsEdge(
			lineStart.x,
			lineStart.y,
			lineEnd.x,
			lineEnd.y,
			rect.right,
			rect.top,
			rect.right,
			rect.bottom,
		) || // right edge
		intersectsEdge(
			lineStart.x,
			lineStart.y,
			lineEnd.x,
			lineEnd.y,
			rect.right,
			rect.bottom,
			rect.left,
			rect.bottom,
		) || // bottom edge
		intersectsEdge(
			lineStart.x,
			lineStart.y,
			lineEnd.x,
			lineEnd.y,
			rect.left,
			rect.bottom,
			rect.left,
			rect.top,
		) // left edge
	);
};

/**
 * Check if an element intersects with a selection box
 */
export const elementIntersectsBox = (
	element: Element,
	selectionBox: SelectionBox,
): boolean => {
	const boxLeft = selectionBox.x;
	const boxRight = selectionBox.x + selectionBox.width;
	const boxTop = selectionBox.y;
	const boxBottom = selectionBox.y + selectionBox.height;

	// Special handling for lines
	if (element.type === "line" && "x2" in element && "y2" in element) {
		const lineStart = { x: element.x, y: element.y };
		const lineEnd = { x: element.x2, y: element.y2 };
		return lineIntersectsRect(lineStart, lineEnd, {
			left: boxLeft,
			right: boxRight,
			top: boxTop,
			bottom: boxBottom,
		});
	}

	// Special handling for paths: treat as line segments for selection box intersection
	if (
		element.type === "path" &&
		Array.isArray((element as PathElement).points)
	) {
		const pathElement = element as PathElement;
		const pts = pathElement.points;
		if (pts.length >= 2) {
			const abs = pts.map((p) => ({ x: element.x + p.x, y: element.y + p.y }));
			for (let j = 1; j < abs.length; j++) {
				if (
					lineIntersectsRect(abs[j - 1]!, abs[j]!, {
						left: boxLeft,
						right: boxRight,
						top: boxTop,
						bottom: boxBottom,
					})
				) {
					return true;
				}
			}
			if (pathElement.closed) {
				if (
					lineIntersectsRect(abs[abs.length - 1]!, abs[0]!, {
						left: boxLeft,
						right: boxRight,
						top: boxTop,
						bottom: boxBottom,
					})
				) {
					return true;
				}
			}
		}
		// fall through to bounding box check below
	}

	// Regular rectangular intersection for other elements
	const elemLeft = element.x;
	const elemRight = element.x + element.w;
	const elemTop = element.y;
	const elemBottom = element.y + element.h;

	// Check if rectangles overlap
	return !(
		elemRight < boxLeft ||
		elemLeft > boxRight ||
		elemBottom < boxTop ||
		elemTop > boxBottom
	);
};

/**
 * Check if an element is completely inside a frame
 */
export const isElementInsideFrame = (
	element: Element,
	frame: Element,
): boolean => {
	if (frame.type !== "frame") return false;

	// Element bounds
	const elemLeft = element.x;
	const elemRight = element.x + element.w;
	const elemTop = element.y;
	const elemBottom = element.y + element.h;

	// Frame bounds
	const frameLeft = frame.x;
	const frameRight = frame.x + frame.w;
	const frameTop = frame.y;
	const frameBottom = frame.y + frame.h;

	// Check if element is completely inside frame
	return (
		elemLeft >= frameLeft &&
		elemRight <= frameRight &&
		elemTop >= frameTop &&
		elemBottom <= frameBottom
	);
};

/**
 * Find the topmost frame that contains an element
 */
export const findContainingFrame = (
	element: Element,
	elements: Element[],
): Element | null => {
	// Helper to check if setting parentId would create a circular reference
	const wouldCreateCircularReference = (
		childId: string,
		potentialParentId: string,
	): boolean => {
		let current = elements.find((el) => el.id === potentialParentId);
		const visited = new Set<string>();

		while (current && !visited.has(current.id)) {
			if (current.id === childId) return true;
			visited.add(current.id);
			const parentId = current.parentId;
			current = parentId
				? elements.find((el) => el.id === parentId)
				: undefined;
		}

		return false;
	};

	// Gather frames and compute matching rules
	const frameCandidates = elements.filter(
		(el) => el.type === "frame" && el.id !== element.id,
	);

	const intersects = (frame: Element) => {
		const left = Math.min(frame.x, frame.x + frame.w);
		const top = Math.min(frame.y, frame.y + frame.h);
		const width = Math.abs(frame.w);
		const height = Math.abs(frame.h);
		return elementIntersectsBox(element, { x: left, y: top, width, height });
	};

	const matches = (frame: Element) => {
		if (wouldCreateCircularReference(element.id, frame.id)) return false;
		const allowOverflow = (frame as any).clipContent === false;
		return allowOverflow
			? intersects(frame)
			: isElementInsideFrame(element, frame);
	};

	// Prefer keeping current parent while intersecting to avoid flicker at edges
	const currentParent = element.parentId
		? elements.find((e) => e.id === element.parentId)
		: null;
	if (
		currentParent &&
		currentParent.type === "frame" &&
		!wouldCreateCircularReference(element.id, currentParent.id) &&
		intersects(currentParent)
	) {
		return currentParent;
	}

	// Otherwise select a candidate based on rules
	const containingFrames = frameCandidates.filter(matches);

	if (containingFrames.length === 0) return null;

	// Return the topmost frame (last in array = front in z-order)
	return containingFrames[containingFrames.length - 1] || null;
};

/**
 * Calculate the shortest distance from a point to a line segment
 * Uses vector projection to find the closest point on the segment
 * @param point The point to measure distance from
 * @param start Start point of the line segment
 * @param end End point of the line segment
 * @returns Shortest distance from point to line segment
 */
const distanceToLineSegment = (
	point: { x: number; y: number },
	start: { x: number; y: number },
	end: { x: number; y: number },
): number => {
	// Vector from start to point
	const A = point.x - start.x;
	const B = point.y - start.y;
	// Vector from start to end (line segment direction)
	const C = end.x - start.x;
	const D = end.y - start.y;

	// Project point vector onto line segment vector
	const dot = A * C + B * D; // Dot product
	const lenSq = C * C + D * D; // Squared length of line segment

	if (lenSq === 0) return Math.sqrt(A * A + B * B); // Degenerate case: line has no length

	// Normalized parameter (0-1) representing position along line segment
	const param = dot / lenSq;

	let closestX, closestY;

	// Clamp the projection to the line segment endpoints
	if (param < 0) {
		// Closest point is before the start of the segment
		closestX = start.x;
		closestY = start.y;
	} else if (param > 1) {
		// Closest point is after the end of the segment
		closestX = end.x;
		closestY = end.y;
	} else {
		// Closest point is on the segment itself
		closestX = start.x + param * C;
		closestY = start.y + param * D;
	}

	// Calculate Euclidean distance from point to closest point on segment
	const dx = point.x - closestX;
	const dy = point.y - closestY;
	return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Evaluate a quadratic Bezier curve at parameter t
 * Uses the quadratic Bezier formula: B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
 * @param p0 Start point of the curve
 * @param cp Control point of the curve
 * @param p1 End point of the curve
 * @param t Parameter value (0 to 1, where 0 = start point, 1 = end point)
 * @returns Point on the curve at parameter t
 */
const quadPoint = (
	p0: { x: number; y: number },
	cp: { x: number; y: number },
	p1: { x: number; y: number },
	t: number,
) => {
	const mt = 1 - t; // (1 - t) term used multiple times
	const x = mt * mt * p0.x + 2 * mt * t * cp.x + t * t * p1.x;
	const y = mt * mt * p0.y + 2 * mt * t * cp.y + t * t * p1.y;
	return { x, y };
};

// Flatten a path's points (with optional quadratic curves) into a polyline of absolute points
const flattenPathToPolyline = (
	element: Element & { type: "path" },
	samplesPerCurve: number = 12,
) => {
	const pathElement = element as PathElement;
	const pts = pathElement.points;
	const abs = pts.map((p) => ({
		x: element.x + p.x,
		y: element.y + p.y,
		curve: p.curve,
	}));
	const poly: { x: number; y: number }[] = [];
	if (abs.length === 0)
		return { points: poly, closed: Boolean(pathElement.closed) };
	poly.push({ x: abs[0]!.x, y: abs[0]!.y });
	for (let i = 1; i < abs.length; i++) {
		const prev = abs[i - 1]!;
		const curr = abs[i]!;
		if (prev.curve) {
			for (let s = 1; s <= samplesPerCurve; s++) {
				const t = s / samplesPerCurve;
				poly.push(
					quadPoint(prev, { x: prev.curve.cx!, y: prev.curve.cy! }, curr, t),
				);
			}
		} else {
			poly.push({ x: curr.x, y: curr.y });
		}
	}
	return { points: poly, closed: Boolean(pathElement.closed) };
};

/**
 * Determine if a point is inside a polygon using ray casting algorithm
 * The algorithm casts a horizontal ray from the point to infinity and counts
 * how many polygon edges it crosses. Odd number = inside, even number = outside.
 * @param pt Point to test
 * @param poly Array of polygon vertices (automatically handles closure)
 * @returns True if point is inside polygon, false otherwise
 */
const pointInPolygon = (
	pt: { x: number; y: number },
	poly: { x: number; y: number }[],
) => {
	let inside = false;
	// Iterate through each edge of the polygon (j is previous vertex, i is current vertex)
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const xi = poly[i]!.x,
			yi = poly[i]!.y;
		const xj = poly[j]!.x,
			yj = poly[j]!.y;

		// Check if horizontal ray from point crosses this edge
		// Edge must cross the y-coordinate of the point, and intersection must be to the right
		const intersect =
			yi > pt.y !== yj > pt.y && // Edge crosses horizontal line at pt.y
			pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-12) + xi; // Intersection is to the right of point
		if (intersect) inside = !inside; // Toggle inside/outside state
	}
	return inside;
};

/**
 * Get the element at a specific point, prioritizing non-frame elements
 * @param point - The point to test in canvas coordinates (already transformed by screenToCanvas)
 * @param elements - Array of elements to test against
 * @param zoom - Current zoom level for zoom-aware hit testing (default: 1)
 * @param pan - Current pan offset for pan-aware hit testing (default: {x: 0, y: 0})
 */
export const getElementAtPoint = (
	point: { x: number; y: number },
	elements: Element[],
	zoom: number = 1,
): Element | null => {
	// Filter out invisible elements
	const visibleElements = elements.filter(
		(el) => el.visible !== false && el.locked !== true,
	);

	// First check non-frame elements in reverse order (front to back)
	for (let i = visibleElements.length - 1; i >= 0; i--) {
		const element = visibleElements[i];
		if (!element || element.type === "frame") continue;

		// Special handling for lines
		if (element.type === "line" && "x2" in element && "y2" in element) {
			const lineStart = { x: element.x, y: element.y };
			const lineEnd = { x: element.x2, y: element.y2 };
			const distance = distanceToLineSegment(point, lineStart, lineEnd);
			// Zoom-aware hit threshold: minimum visual size of 8px at current zoom level
			const minHitAreaInCanvasSpace = 8 / zoom; // 8px minimum in screen space, converted to canvas space
			const strokeWidthInCanvasSpace = element.stroke?.width || 2;
			const hitThreshold = Math.max(
				minHitAreaInCanvasSpace,
				strokeWidthInCanvasSpace,
			);
			if (distance <= hitThreshold) {
				return element;
			}
		}
		// Special handling for paths (stroke proximity along polyline segments)
		else if (
			element.type === "path" &&
			Array.isArray((element as PathElement).points)
		) {
			const { points: poly, closed } = flattenPathToPolyline(element);
			if (poly.length >= 2) {
				const minHitAreaInCanvasSpace = 8 / zoom;
				const strokeWidthInCanvasSpace = element.stroke?.width || 2;
				const hitThreshold = Math.max(
					minHitAreaInCanvasSpace,
					strokeWidthInCanvasSpace,
				);
				for (let j = 1; j < poly.length; j++) {
					const d = distanceToLineSegment(point, poly[j - 1]!, poly[j]!);
					if (d <= hitThreshold) return element;
				}
				if (closed) {
					const d = distanceToLineSegment(
						point,
						poly[poly.length - 1]!,
						poly[0]!,
					);
					if (d <= hitThreshold) return element;
				}
				// If closed and visually filled, allow inside hit
				const pathElement = element as PathElement;
				const hasFill =
					pathElement.fill &&
					pathElement.fill !== "transparent" &&
					pathElement.fill !== "none" &&
					pathElement.opacity > 0;
				if (closed && hasFill && pointInPolygon(point, poly)) return element;
			}
		}
		// Regular rectangular hit testing for other elements
		else {
			// Use calculated bounds for text elements
			const bounds =
				element.type === "text"
					? getTextBounds(element, zoom)
					: { w: element.w, h: element.h };

			// Normalize bounds to handle negative dimensions
			const left = Math.min(element.x, element.x + bounds.w);
			const right = Math.max(element.x, element.x + bounds.w);
			const top = Math.min(element.y, element.y + bounds.h);
			const bottom = Math.max(element.y, element.y + bounds.h);

			if (
				point.x >= left &&
				point.x <= right &&
				point.y >= top &&
				point.y <= bottom
			) {
				return element;
			}
		}
	}

	// Then check frames if no other element was found
	for (let i = visibleElements.length - 1; i >= 0; i--) {
		const element = visibleElements[i];
		if (element && element.type === "frame") {
			// Normalize bounds to handle negative dimensions
			const left = Math.min(element.x, element.x + element.w);
			const right = Math.max(element.x, element.x + element.w);
			const top = Math.min(element.y, element.y + element.h);
			const bottom = Math.max(element.y, element.y + element.h);

			if (
				point.x >= left &&
				point.x <= right &&
				point.y >= top &&
				point.y <= bottom
			) {
				return element;
			}
		}
	}

	return null;
};

/**
 * Calculate text bounds for text elements with zoom-aware sizing
 * @param element - The text element
 * @param zoom - Current zoom level (default: 1)
 */
export const getTextBounds = (element: Element, zoom: number = 1) => {
	if (element.type !== "text") return { w: element.w, h: element.h };

	// Calculate text dimensions based on font size and content
	const fontSize = element.fontSize || 16;
	const text = element.text || "";
	const lineHeight = element.lineHeight || 1.2;
	const letterSpacing = element.letterSpacing || 0;
	const textTransform = element.textTransform;

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

	// Calculate bounds considering multiline text and letter spacing
	const lines = displayText.split("\n");
	const actualLineHeight = lineHeight * fontSize;

	// Calculate maximum line width
	let maxLineWidth = 20; // Minimum width for empty text
	for (const line of lines) {
		let lineWidth;
		if (letterSpacing && letterSpacing !== 0) {
			const charWidth = fontSize * 0.6;
			lineWidth = line.length * charWidth + (line.length - 1) * letterSpacing;
		} else {
			lineWidth = line.length * (fontSize * 0.6);
		}
		maxLineWidth = Math.max(maxLineWidth, lineWidth);
	}

	// Base dimensions in canvas space
	const baseWidth = maxLineWidth;
	// Do not apply lineHeight when there's only a single line
	const baseHeight =
		(lines.length <= 1 ? fontSize : lines.length * actualLineHeight) +
		fontSize * 0.2;

	// For very high zoom levels (zoomed in), ensure minimum clickable area
	if (zoom > 2) {
		const minHitSize = 8 / zoom; // 8px minimum in screen space
		const actualWidth = Math.max(baseWidth, minHitSize);
		const actualHeight = Math.max(baseHeight, minHitSize);
		return { w: actualWidth, h: actualHeight };
	}

	return { w: baseWidth, h: baseHeight };
};

/**
 * Get the resize handle at a specific point for an element
 */
export const getResizeHandle = (
	point: { x: number; y: number },
	element: Element,
	zoom: number,
): string | null => {
	// If the element is locked or both dimensions are locked, no resize handles
	const lockedDims =
		element.lockedDimensions === true ||
		(element.lockedWidth === true && element.lockedHeight === true);
	if (element.locked === true || lockedDims) {
		return null;
	}
	// Improved zoom-aware handle sizing
	const baseHandleSize = 12; // Base size in screen pixels
	const basePadding = 8; // Base padding in screen pixels
	const handleSize = Math.max(baseHandleSize / zoom, 4 / zoom); // Minimum 4px in canvas space
	const hitPadding = Math.max(basePadding / zoom, 3 / zoom); // Minimum 3px padding in canvas space
	const { x, y } = element;

	// Special handling for lines - only endpoints can be resized
	if (element.type === "line" && "x2" in element && "y2" in element) {
		const startHandle = { x: x - handleSize / 2, y: y - handleSize / 2 };
		const endHandle = {
			x: element.x2 - handleSize / 2,
			y: element.y2 - handleSize / 2,
		};

		// Check start point handle
		if (
			point.x >= startHandle.x - hitPadding &&
			point.x <= startHandle.x + handleSize + hitPadding &&
			point.y >= startHandle.y - hitPadding &&
			point.y <= startHandle.y + handleSize + hitPadding
		) {
			return "start";
		}

		// Check end point handle
		if (
			point.x >= endHandle.x - hitPadding &&
			point.x <= endHandle.x + handleSize + hitPadding &&
			point.y >= endHandle.y - hitPadding &&
			point.y <= endHandle.y + handleSize + hitPadding
		) {
			return "end";
		}

		return null; // No handle hit for lines
	}

	// Regular handling for other elements
	// Use calculated text bounds for text elements and normalize for negative sizes (flips)
	const bounds =
		element.type === "text"
			? getTextBounds(element, zoom)
			: { w: element.w, h: element.h };
	const left = Math.min(x, x + bounds.w);
	const top = Math.min(y, y + bounds.h);
	const widthAbs = Math.abs(bounds.w);
	const heightAbs = Math.abs(bounds.h);

	const handles = {
		nw: { x: left - handleSize / 2, y: top - handleSize / 2 },
		n: { x: left + widthAbs / 2 - handleSize / 2, y: top - handleSize / 2 },
		ne: { x: left + widthAbs - handleSize / 2, y: top - handleSize / 2 },
		e: {
			x: left + widthAbs - handleSize / 2,
			y: top + heightAbs / 2 - handleSize / 2,
		},
		se: {
			x: left + widthAbs - handleSize / 2,
			y: top + heightAbs - handleSize / 2,
		},
		s: {
			x: left + widthAbs / 2 - handleSize / 2,
			y: top + heightAbs - handleSize / 2,
		},
		sw: { x: left - handleSize / 2, y: top + heightAbs - handleSize / 2 },
		w: { x: left - handleSize / 2, y: top + heightAbs / 2 - handleSize / 2 },
	};

	for (const [handle, pos] of Object.entries(handles)) {
		if (
			point.x >= pos.x - hitPadding &&
			point.x <= pos.x + handleSize + hitPadding &&
			point.y >= pos.y - hitPadding &&
			point.y <= pos.y + handleSize + hitPadding
		) {
			return handle;
		}
	}
	return null;
};

/**
 * Calculate the aligned position for an element within a frame using the frame's constraints
 */
export const calculateAlignedPosition = (
	element: Element,
	frame: Element & { type: "frame" },
): { x: number; y: number } => {
	if (!frame.layoutConstraints) {
		return { x: element.x, y: element.y };
	}

	const { horizontalAlign, verticalAlign } = frame.layoutConstraints;

	// Frame bounds with padding consideration
	const framePadding = frame.padding || {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
	};
	const frameLeft = frame.x + framePadding.left;
	const frameRight = frame.x + frame.w - framePadding.right;
	const frameTop = frame.y + framePadding.top;
	const frameBottom = frame.y + frame.h - framePadding.bottom;
	const frameCenterX = frameLeft + (frameRight - frameLeft) / 2;
	const frameCenterY = frameTop + (frameBottom - frameTop) / 2;

	// Element dimensions
	const elementWidth = element.w;
	const elementHeight = element.h;

	let newX = element.x;
	let newY = element.y;

	// Horizontal alignment
	switch (horizontalAlign) {
		case "left":
			newX = frameLeft;
			break;
		case "center":
			newX = frameCenterX - elementWidth / 2;
			break;
		case "right":
			newX = frameRight - elementWidth;
			break;
	}

	// Vertical alignment
	switch (verticalAlign) {
		case "top":
			newY = frameTop;
			break;
		case "center":
			newY = frameCenterY - elementHeight / 2;
			break;
		case "bottom":
			newY = frameBottom - elementHeight;
			break;
	}

	return { x: Math.round(newX), y: Math.round(newY) };
};

/**
 * Calculate the aligned position for a single element using its own constraints
 */
export const calculateChildAlignedPosition = (
	element: Element,
	frame: Element & { type: "frame" },
): { x: number; y: number } => {
	if (
		!element.layoutConstraints ||
		!element.parentId ||
		element.parentId !== frame.id
	) {
		return { x: element.x, y: element.y };
	}

	const { horizontalAlign, verticalAlign } = element.layoutConstraints;

	// Frame bounds with padding consideration
	const framePadding = frame.padding || {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
	};
	const frameLeft = frame.x + framePadding.left;
	const frameRight = frame.x + frame.w - framePadding.right;
	const frameTop = frame.y + framePadding.top;
	const frameBottom = frame.y + frame.h - framePadding.bottom;
	const frameCenterX = frameLeft + (frameRight - frameLeft) / 2;
	const frameCenterY = frameTop + (frameBottom - frameTop) / 2;

	// Element dimensions
	const elementWidth = element.w;
	const elementHeight = element.h;

	let newX = element.x;
	let newY = element.y;

	// Horizontal alignment
	switch (horizontalAlign) {
		case "left":
			newX = frameLeft;
			break;
		case "center":
			newX = frameCenterX - elementWidth / 2;
			break;
		case "right":
			newX = frameRight - elementWidth;
			break;
		case "none":
		default:
			// Keep current position
			break;
	}

	// Vertical alignment
	switch (verticalAlign) {
		case "top":
			newY = frameTop;
			break;
		case "center":
			newY = frameCenterY - elementHeight / 2;
			break;
		case "bottom":
			newY = frameBottom - elementHeight;
			break;
		case "none":
		default:
			// Keep current position
			break;
	}

	return { x: Math.round(newX), y: Math.round(newY) };
};

/**
 * Apply layout constraints to all children of a frame
 */
export const applyLayoutConstraintsToChildren = (
	frame: Element & { type: "frame" },
	elements: Element[],
): Array<{ id: string; x: number; y: number }> => {
	if (!frame.layoutConstraints) {
		return [];
	}

	const {
		horizontalAlign,
		verticalAlign,
		gap = 0,
		direction,
	} = frame.layoutConstraints;

	const children = elements.filter((el) => el.parentId === frame.id);
	const updates: Array<{ id: string; x: number; y: number }> = [];

	if (children.length === 0) return updates;

	// Frame content bounds (respect padding)
	const framePadding = frame.padding || {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
	};
	const frameLeft = frame.x + framePadding.left;
	const frameRight = frame.x + frame.w - framePadding.right;
	const frameTop = frame.y + framePadding.top;
	const frameBottom = frame.y + frame.h - framePadding.bottom;
	const contentWidth = frameRight - frameLeft;
	const contentHeight = frameBottom - frameTop;

	// Helper align functions (cross-axis)
	const alignX = (childWidth: number): number => {
		switch (horizontalAlign) {
			case "left":
				return frameLeft;
			case "center":
				return frameLeft + (contentWidth - childWidth) / 2;
			case "right":
				return frameRight - childWidth;
			default:
				return undefined as unknown as number; // Indicates keep current
		}
	};

	const alignY = (childHeight: number): number => {
		switch (verticalAlign) {
			case "top":
				return frameTop;
			case "center":
				return frameTop + (contentHeight - childHeight) / 2;
			case "bottom":
				return frameBottom - childHeight;
			default:
				return undefined as unknown as number; // Indicates keep current
		}
	};

	// Decide stacking direction (defaults to row)
	const stackDirection: "row" | "column" = direction ?? "row";

	if (stackDirection === "row" && horizontalAlign !== "none") {
		// Sort children left-to-right based on current x to preserve visual order
		const ordered = [...children].sort((a, b) => a.x - b.x);
		const totalChildrenWidth = ordered.reduce((sum, c) => sum + c.w, 0);
		const totalGaps = Math.max(ordered.length - 1, 0) * gap;
		const totalWidth = totalChildrenWidth + totalGaps;

		// Starting x based on horizontal alignment
		let startX: number;
		switch (horizontalAlign) {
			case "left":
				startX = frameLeft;
				break;
			case "center":
				startX = frameLeft + (contentWidth - totalWidth) / 2;
				break;
			case "right":
				startX = frameRight - totalWidth;
				break;
			default:
				startX = frameLeft; // fallback
		}

		let cursorX = startX;
		ordered.forEach((child) => {
			const targetY = alignY(child.h);
			const newX = Math.round(cursorX);
			const newY =
				targetY !== (undefined as unknown as number)
					? Math.round(targetY)
					: child.y;

			if (newX !== child.x || newY !== child.y) {
				updates.push({ id: child.id, x: newX, y: newY });
			}
			cursorX += child.w + gap;
		});

		return updates;
	}

	if (stackDirection === "column" && verticalAlign !== "none") {
		// Sort children top-to-bottom based on current y to preserve visual order
		const ordered = [...children].sort((a, b) => a.y - b.y);
		const totalChildrenHeight = ordered.reduce((sum, c) => sum + c.h, 0);
		const totalGaps = Math.max(ordered.length - 1, 0) * gap;
		const totalHeight = totalChildrenHeight + totalGaps;

		// Starting y based on vertical alignment
		let startY: number;
		switch (verticalAlign) {
			case "top":
				startY = frameTop;
				break;
			case "center":
				startY = frameTop + (contentHeight - totalHeight) / 2;
				break;
			case "bottom":
				startY = frameBottom - totalHeight;
				break;
			default:
				startY = frameTop; // fallback
		}

		let cursorY = startY;
		ordered.forEach((child) => {
			const targetX = alignX(child.w);
			const newX =
				targetX !== (undefined as unknown as number)
					? Math.round(targetX)
					: child.x;
			const newY = Math.round(cursorY);

			if (newX !== child.x || newY !== child.y) {
				updates.push({ id: child.id, x: newX, y: newY });
			}
			cursorY += child.h + gap;
		});

		return updates;
	}

	// Fallback: no stacking (or alignment set to none on the relevant axis)
	children.forEach((child) => {
		const alignedPosition = calculateAlignedPosition(child, frame);
		if (alignedPosition.x !== child.x || alignedPosition.y !== child.y) {
			updates.push({
				id: child.id,
				x: alignedPosition.x,
				y: alignedPosition.y,
			});
		}
	});

	return updates;
};
