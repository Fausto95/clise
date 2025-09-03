import type { PathElement } from "../../../store/element-atoms";

export type BooleanOperation =
	| "union"
	| "intersection"
	| "difference"
	| "exclusion";

export class PathBooleanOperations {
	/**
	 * Perform boolean operations on two paths
	 * Note: This is a simplified implementation. For production use,
	 * consider using a library like paper.js or fabric.js for robust boolean operations
	 */
	static performBooleanOperation(
		path1: PathElement,
		path2: PathElement,
		operation: BooleanOperation,
	): PathElement | null {
		// For now, we'll implement a basic approach
		// In a real implementation, you'd use a proper polygon clipping library

		if (operation === "union") {
			return this.union(path1, path2);
		} else if (operation === "intersection") {
			return this.intersection(path1, path2);
		} else if (operation === "difference") {
			return this.difference(path1, path2);
		} else if (operation === "exclusion") {
			return this.exclusion(path1, path2);
		}

		return null;
	}

	/**
	 * Union: Combine two paths into one
	 */
	private static union(path1: PathElement, path2: PathElement): PathElement {
		// For now, create a combined path that includes both path's points
		// This is a simplified approach - in production, you'd use proper polygon clipping

		// Convert both paths to absolute coordinates
		const absPoints1 = path1.points.map((p) => ({
			x: path1.x + p.x,
			y: path1.y + p.y,
			curve: p.curve,
		}));

		const absPoints2 = path2.points.map((p) => ({
			x: path2.x + p.x,
			y: path2.y + p.y,
			curve: p.curve,
		}));

		// Combine all points
		const allPoints = [...absPoints1, ...absPoints2];

		// Calculate bounds of combined points
		const minX = Math.min(...allPoints.map((p) => p.x));
		const minY = Math.min(...allPoints.map((p) => p.y));
		const maxX = Math.max(...allPoints.map((p) => p.x));
		const maxY = Math.max(...allPoints.map((p) => p.y));

		// Convert back to local coordinates
		const localPoints = allPoints.map((p) => ({
			x: p.x - minX,
			y: p.y - minY,
			curve: p.curve,
		}));

		const unionPath: PathElement = {
			...path1,
			id: path1.id, // Keep the original ID to maintain element references
			x: minX,
			y: minY,
			w: maxX - minX,
			h: maxY - minY,
			points: localPoints,
			closed: true,
		};

		return unionPath;
	}

	/**
	 * Intersection: Find the overlapping area
	 */
	private static intersection(
		path1: PathElement,
		path2: PathElement,
	): PathElement | null {
		const bounds1 = this.getPathBounds(path1);
		const bounds2 = this.getPathBounds(path2);

		// Check if paths overlap
		const overlapX = Math.max(
			0,
			Math.min(bounds1.x + bounds1.w, bounds2.x + bounds2.w) -
				Math.max(bounds1.x, bounds2.x),
		);
		const overlapY = Math.max(
			0,
			Math.min(bounds1.y + bounds1.h, bounds2.y + bounds2.h) -
				Math.max(bounds1.y, bounds2.y),
		);

		if (overlapX === 0 || overlapY === 0) {
			return null; // No intersection
		}

		// Create intersection rectangle
		const intersectionX = Math.max(bounds1.x, bounds2.x);
		const intersectionY = Math.max(bounds1.y, bounds2.y);

		const intersectionPath: PathElement = {
			...path1,
			id: path1.id, // Keep the original ID to maintain element references
			x: intersectionX,
			y: intersectionY,
			w: overlapX,
			h: overlapY,
			points: [
				{ x: 0, y: 0 },
				{ x: overlapX, y: 0 },
				{ x: overlapX, y: overlapY },
				{ x: 0, y: overlapY },
			],
			closed: true,
		};

		return intersectionPath;
	}

	/**
	 * Difference: path1 minus path2
	 */
	private static difference(
		path1: PathElement,
		_path2: PathElement,
	): PathElement {
		// For now, return path1 as-is since proper polygon subtraction is complex
		// In a real implementation, you'd use a polygon clipping library
		return {
			...path1,
			id: path1.id, // Keep the original ID to maintain element references
		};
	}

	/**
	 * Exclusion: XOR operation
	 */
	private static exclusion(
		path1: PathElement,
		path2: PathElement,
	): PathElement {
		// For now, return the union since proper XOR is complex
		// In a real implementation, you'd use a polygon clipping library
		return this.union(path1, path2);
	}

	/**
	 * Get bounds of a path including all curve control points
	 */
	private static getPathBounds(path: PathElement): {
		x: number;
		y: number;
		w: number;
		h: number;
	} {
		if (path.points.length === 0) {
			return { x: path.x, y: path.y, w: path.w, h: path.h };
		}

		let minX = path.x + path.points[0]!.x;
		let minY = path.y + path.points[0]!.y;
		let maxX = minX;
		let maxY = minY;

		for (const point of path.points) {
			const absX = path.x + point.x;
			const absY = path.y + point.y;

			minX = Math.min(minX, absX);
			minY = Math.min(minY, absY);
			maxX = Math.max(maxX, absX);
			maxY = Math.max(maxY, absY);

			// Include curve control points in bounds
			if (point.curve) {
				if (
					point.curve.type === "quadratic" &&
					point.curve.cx !== undefined &&
					point.curve.cy !== undefined
				) {
					const curveX = path.x + point.curve.cx;
					const curveY = path.y + point.curve.cy;
					minX = Math.min(minX, curveX);
					minY = Math.min(minY, curveY);
					maxX = Math.max(maxX, curveX);
					maxY = Math.max(maxY, curveY);
				} else if (point.curve.type === "cubic") {
					if (point.curve.outHandle) {
						const outX = path.x + point.curve.outHandle.x;
						const outY = path.y + point.curve.outHandle.y;
						minX = Math.min(minX, outX);
						minY = Math.min(minY, outY);
						maxX = Math.max(maxX, outX);
						maxY = Math.max(maxY, outY);
					}
					if (point.curve.inHandle) {
						const inX = path.x + point.curve.inHandle.x;
						const inY = path.y + point.curve.inHandle.y;
						minX = Math.min(minX, inX);
						minY = Math.min(minY, inY);
						maxX = Math.max(maxX, inX);
						maxY = Math.max(maxY, inY);
					}
				}
			}
		}

		return {
			x: minX,
			y: minY,
			w: Math.max(1, maxX - minX),
			h: Math.max(1, maxY - minY),
		};
	}
}
