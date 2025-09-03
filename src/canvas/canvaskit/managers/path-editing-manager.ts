import type { PathElement, PathPoint } from "../../../store/element-atoms";

export interface PathHandleHit {
	type: "point" | "curve";
	pointIndex: number;
	handleType?: "in" | "out" | "quadratic";
}

export class PathEditingManager {
	/**
	 * Detect which path handle was clicked
	 */
	static getHandleAtPoint(
		coords: { x: number; y: number },
		element: PathElement,
		zoom: number,
		tolerance: number = 8,
	): PathHandleHit | null {
		const handleRadius = Math.max(tolerance / zoom, 4);
		const curveHandleRadius = Math.max((tolerance / zoom) * 0.75, 3);

		for (let i = 0; i < element.points.length; i++) {
			const point = element.points[i];
			if (!point) continue;

			// Check point handle
			const pointDistance = Math.hypot(
				coords.x - (element.x + point.x),
				coords.y - (element.y + point.y),
			);
			if (pointDistance <= handleRadius) {
				return { type: "point", pointIndex: i };
			}

			// Check curve handles
			if (point.curve) {
				if (
					point.curve.type === "quadratic" &&
					point.curve.cx !== undefined &&
					point.curve.cy !== undefined
				) {
					const curveDistance = Math.hypot(
						coords.x - (element.x + point.curve.cx),
						coords.y - (element.y + point.curve.cy),
					);
					if (curveDistance <= curveHandleRadius) {
						return { type: "curve", pointIndex: i, handleType: "quadratic" };
					}
				} else if (point.curve.type === "cubic") {
					if (point.curve.outHandle) {
						const outDistance = Math.hypot(
							coords.x - (element.x + point.curve.outHandle.x),
							coords.y - (element.y + point.curve.outHandle.y),
						);
						if (outDistance <= curveHandleRadius) {
							return { type: "curve", pointIndex: i, handleType: "out" };
						}
					}

					if (point.curve.inHandle) {
						const inDistance = Math.hypot(
							coords.x - (element.x + point.curve.inHandle.x),
							coords.y - (element.y + point.curve.inHandle.y),
						);
						if (inDistance <= curveHandleRadius) {
							return { type: "curve", pointIndex: i, handleType: "in" };
						}
					}
				}
			}
		}

		return null;
	}

	/**
	 * Move a path point
	 */
	static movePathPoint(
		element: PathElement,
		pointIndex: number,
		newPosition: { x: number; y: number },
	): PathElement {
		const newPoints = [...element.points];
		if (newPoints[pointIndex]) {
			newPoints[pointIndex] = {
				...newPoints[pointIndex],
				x: newPosition.x - element.x,
				y: newPosition.y - element.y,
			};
		}

		// Recalculate bounds
		const { x, y, w, h } = this.calculatePathBounds(
			newPoints,
			element.x,
			element.y,
		);

		return {
			...element,
			x,
			y,
			w,
			h,
			points: newPoints,
		};
	}

	/**
	 * Move multiple selected path points by a delta
	 */
	static moveSelectedPathPoints(
		element: PathElement,
		selectedPointIndices: number[],
		deltaX: number,
		deltaY: number,
	): PathElement {
		const newPoints = [...element.points];

		// Move all selected points by the same delta
		selectedPointIndices.forEach((index) => {
			if (newPoints[index]) {
				newPoints[index] = {
					...newPoints[index],
					x: newPoints[index].x + deltaX,
					y: newPoints[index].y + deltaY,
				};
			}
		});

		// Recalculate bounds
		const { x, y, w, h } = this.calculatePathBounds(
			newPoints,
			element.x,
			element.y,
		);

		return {
			...element,
			x,
			y,
			w,
			h,
			points: newPoints,
		};
	}

	/**
	 * Move a curve control handle
	 */
	static moveCurveHandle(
		element: PathElement,
		pointIndex: number,
		handleType: "in" | "out" | "quadratic",
		newPosition: { x: number; y: number },
	): PathElement {
		const newPoints = [...element.points];
		const point = newPoints[pointIndex];
		if (!point) return element;

		const localX = newPosition.x - element.x;
		const localY = newPosition.y - element.y;

		if (handleType === "quadratic" && point.curve?.type === "quadratic") {
			newPoints[pointIndex] = {
				...point,
				curve: {
					...point.curve,
					cx: localX,
					cy: localY,
				},
			};
		} else if (handleType === "out" && point.curve?.type === "cubic") {
			newPoints[pointIndex] = {
				...point,
				curve: {
					...point.curve,
					outHandle: { x: localX, y: localY },
				},
			};
		} else if (handleType === "in" && point.curve?.type === "cubic") {
			newPoints[pointIndex] = {
				...point,
				curve: {
					...point.curve,
					inHandle: { x: localX, y: localY },
				},
			};
		}

		return {
			...element,
			points: newPoints,
		};
	}

	/**
	 * Add a new point to the path
	 */
	static addPathPoint(
		element: PathElement,
		segmentIndex: number,
		position: { x: number; y: number },
	): PathElement {
		const newPoints = [...element.points];
		const localX = position.x - element.x;
		const localY = position.y - element.y;

		// Insert new point after the specified segment
		const newPoint: PathPoint = {
			x: localX,
			y: localY,
		};

		newPoints.splice(segmentIndex + 1, 0, newPoint);

		// Recalculate bounds
		const { x, y, w, h } = this.calculatePathBounds(
			newPoints,
			element.x,
			element.y,
		);

		return {
			...element,
			x,
			y,
			w,
			h,
			points: newPoints,
		};
	}

	/**
	 * Remove a point from the path
	 */
	static removePathPoint(
		element: PathElement,
		pointIndex: number,
	): PathElement {
		if (element.points.length <= 2) return element; // Don't remove if only 2 points left

		const newPoints = [...element.points];
		newPoints.splice(pointIndex, 1);

		// Recalculate bounds
		const { x, y, w, h } = this.calculatePathBounds(
			newPoints,
			element.x,
			element.y,
		);

		return {
			...element,
			x,
			y,
			w,
			h,
			points: newPoints,
		};
	}

	/**
	 * Convert a point to a curve
	 */
	static convertToCurve(
		element: PathElement,
		pointIndex: number,
		curveType: "quadratic" | "cubic" = "quadratic",
	): PathElement {
		const newPoints = [...element.points];
		const point = newPoints[pointIndex];
		if (!point || point.curve) return element;

		if (curveType === "quadratic") {
			// Create a simple quadratic curve
			const nextPoint = newPoints[pointIndex + 1];
			if (nextPoint) {
				const midX = (point.x + nextPoint.x) / 2;
				const midY = (point.y + nextPoint.y) / 2;

				// Calculate perpendicular offset for outward curve
				const dx = nextPoint.x - point.x;
				const dy = nextPoint.y - point.y;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance > 0) {
					// Create perpendicular vector (rotate 90 degrees)
					const perpX = -dy / distance;
					const perpY = dx / distance;

					// Offset the control point outward by 1/4 of the segment length
					const offsetDistance = distance * 0.25;
					const controlX = midX + perpX * offsetDistance;
					const controlY = midY + perpY * offsetDistance;

					newPoints[pointIndex] = {
						...point,
						curve: {
							type: "quadratic",
							cx: controlX,
							cy: controlY,
						},
					};
				} else {
					// Fallback for zero-distance points
					newPoints[pointIndex] = {
						...point,
						curve: {
							type: "quadratic",
							cx: midX,
							cy: midY,
						},
					};
				}
			}
		} else if (curveType === "cubic") {
			// Create a simple cubic curve
			const nextPoint = newPoints[pointIndex + 1];
			if (nextPoint) {
				const thirdX = (nextPoint.x - point.x) / 3;
				const thirdY = (nextPoint.y - point.y) / 3;
				newPoints[pointIndex] = {
					...point,
					curve: {
						type: "cubic",
						outHandle: { x: point.x + thirdX, y: point.y + thirdY },
						inHandle: { x: point.x + 2 * thirdX, y: point.y + 2 * thirdY },
					},
				};
			}
		}

		return {
			...element,
			points: newPoints,
		};
	}

	/**
	 * Convert a curve back to a line
	 */
	static convertToLine(element: PathElement, pointIndex: number): PathElement {
		const newPoints = [...element.points];
		const point = newPoints[pointIndex];
		if (!point || !point.curve) return element;

		newPoints[pointIndex] = {
			x: point.x,
			y: point.y,
		};

		return {
			...element,
			points: newPoints,
		};
	}

	/**
	 * Split a path at a specific point
	 */
	static splitPath(
		element: PathElement,
		pointIndex: number,
	): { firstPath: PathElement; secondPath: PathElement } {
		const newPoints = [...element.points];
		const firstPart = newPoints.slice(0, pointIndex + 1);
		const secondPart = newPoints.slice(pointIndex);

		// Create first path
		const firstBounds = this.calculatePathBounds(
			firstPart,
			element.x,
			element.y,
		);
		const firstPath: PathElement = {
			...element,
			id: element.id, // Keep the original ID for the first path
			x: firstBounds.x,
			y: firstBounds.y,
			w: firstBounds.w,
			h: firstBounds.h,
			points: firstPart.map((p) => ({
				...p,
				x: p.x - (firstBounds.x - element.x),
				y: p.y - (firstBounds.y - element.y),
				curve: p.curve
					? {
							...p.curve,
							cx: p.curve.cx
								? p.curve.cx - (firstBounds.x - element.x)
								: undefined,
							cy: p.curve.cy
								? p.curve.cy - (firstBounds.y - element.y)
								: undefined,
							inHandle: p.curve.inHandle
								? {
										x: p.curve.inHandle.x - (firstBounds.x - element.x),
										y: p.curve.inHandle.y - (firstBounds.y - element.y),
									}
								: undefined,
							outHandle: p.curve.outHandle
								? {
										x: p.curve.outHandle.x - (firstBounds.x - element.x),
										y: p.curve.outHandle.y - (firstBounds.y - element.y),
									}
								: undefined,
						}
					: undefined,
			})),
			closed: false,
		};

		// Create second path
		const secondBounds = this.calculatePathBounds(
			secondPart,
			element.x,
			element.y,
		);
		const secondPath: PathElement = {
			...element,
			id: `${element.id}_split_2`,
			x: secondBounds.x,
			y: secondBounds.y,
			w: secondBounds.w,
			h: secondBounds.h,
			points: secondPart.map((p) => ({
				...p,
				x: p.x - (secondBounds.x - element.x),
				y: p.y - (secondBounds.y - element.y),
				curve: p.curve
					? {
							...p.curve,
							cx: p.curve.cx
								? p.curve.cx - (secondBounds.x - element.x)
								: undefined,
							cy: p.curve.cy
								? p.curve.cy - (secondBounds.y - element.y)
								: undefined,
							inHandle: p.curve.inHandle
								? {
										x: p.curve.inHandle.x - (secondBounds.x - element.x),
										y: p.curve.inHandle.y - (secondBounds.y - element.y),
									}
								: undefined,
							outHandle: p.curve.outHandle
								? {
										x: p.curve.outHandle.x - (secondBounds.x - element.x),
										y: p.curve.outHandle.y - (secondBounds.y - element.y),
									}
								: undefined,
						}
					: undefined,
			})),
			closed: false,
		};

		return { firstPath, secondPath };
	}

	/**
	 * Join two paths at their endpoints
	 */
	static joinPaths(
		path1: PathElement,
		path2: PathElement,
		joinAtEnd: boolean = true,
	): PathElement {
		const points1 = [...path1.points];
		const points2 = [...path2.points];

		let combinedPoints: PathPoint[];
		if (joinAtEnd) {
			// Join path2 to the end of path1
			combinedPoints = [...points1, ...points2];
		} else {
			// Join path2 to the beginning of path1
			combinedPoints = [...points2, ...points1];
		}

		// Calculate new bounds
		const bounds = this.calculatePathBounds(combinedPoints, path1.x, path1.y);

		return {
			...path1,
			x: bounds.x,
			y: bounds.y,
			w: bounds.w,
			h: bounds.h,
			points: combinedPoints.map((p) => ({
				...p,
				x: p.x - (bounds.x - path1.x),
				y: p.y - (bounds.y - path1.y),
				curve: p.curve
					? {
							...p.curve,
							cx: p.curve.cx ? p.curve.cx - (bounds.x - path1.x) : undefined,
							cy: p.curve.cy ? p.curve.cy - (bounds.y - path1.y) : undefined,
							inHandle: p.curve.inHandle
								? {
										x: p.curve.inHandle.x - (bounds.x - path1.x),
										y: p.curve.inHandle.y - (bounds.y - path1.y),
									}
								: undefined,
							outHandle: p.curve.outHandle
								? {
										x: p.curve.outHandle.x - (bounds.x - path1.x),
										y: p.curve.outHandle.y - (bounds.y - path1.y),
									}
								: undefined,
						}
					: undefined,
			})),
		};
	}

	/**
	 * Convert to smooth curve (S command equivalent)
	 */
	static convertToSmoothCurve(
		element: PathElement,
		pointIndex: number,
	): PathElement {
		const newPoints = [...element.points];
		const point = newPoints[pointIndex];
		if (!point) return element;

		// For smooth curves, we need to calculate control points based on previous curve
		const prevPoint = newPoints[pointIndex - 1];
		if (!prevPoint || !prevPoint.curve) {
			// If no previous curve, create a simple quadratic curve
			return this.convertToCurve(element, pointIndex, "quadratic");
		}

		// Calculate smooth control point based on previous curve's direction
		let smoothControlX: number;
		let smoothControlY: number;

		if (
			prevPoint.curve.type === "quadratic" &&
			prevPoint.curve.cx !== undefined &&
			prevPoint.curve.cy !== undefined
		) {
			// Mirror the previous control point
			const prevControlX = prevPoint.curve.cx;
			const prevControlY = prevPoint.curve.cy;
			const prevPointX = prevPoint.x;
			const prevPointY = prevPoint.y;

			// Calculate mirrored control point
			smoothControlX = prevPointX + (prevPointX - prevControlX);
			smoothControlY = prevPointY + (prevPointY - prevControlY);
		} else if (prevPoint.curve.type === "cubic" && prevPoint.curve.outHandle) {
			// Mirror the previous out handle
			const prevOutX = prevPoint.curve.outHandle.x;
			const prevOutY = prevPoint.curve.outHandle.y;
			const prevPointX = prevPoint.x;
			const prevPointY = prevPoint.y;

			smoothControlX = prevPointX + (prevPointX - prevOutX);
			smoothControlY = prevPointY + (prevPointY - prevOutY);
		} else {
			// Fallback to simple quadratic
			return this.convertToCurve(element, pointIndex, "quadratic");
		}

		// Create smooth curve
		newPoints[pointIndex] = {
			...point,
			curve: {
				type: "quadratic",
				cx: smoothControlX,
				cy: smoothControlY,
			},
		};

		return {
			...element,
			points: newPoints,
		};
	}

	/**
	 * Calculate path bounds from points
	 */
	private static calculatePathBounds(
		points: PathPoint[],
		baseX: number,
		baseY: number,
	): { x: number; y: number; w: number; h: number } {
		if (points.length === 0) {
			return { x: baseX, y: baseY, w: 1, h: 1 };
		}

		let minX = baseX + points[0]!.x;
		let minY = baseY + points[0]!.y;
		let maxX = minX;
		let maxY = minY;

		for (const point of points) {
			const absX = baseX + point.x;
			const absY = baseY + point.y;

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
					const curveX = baseX + point.curve.cx;
					const curveY = baseY + point.curve.cy;
					minX = Math.min(minX, curveX);
					minY = Math.min(minY, curveY);
					maxX = Math.max(maxX, curveX);
					maxY = Math.max(maxY, curveY);
				} else if (point.curve.type === "cubic") {
					if (point.curve.outHandle) {
						const outX = baseX + point.curve.outHandle.x;
						const outY = baseY + point.curve.outHandle.y;
						minX = Math.min(minX, outX);
						minY = Math.min(minY, outY);
						maxX = Math.max(maxX, outX);
						maxY = Math.max(maxY, outY);
					}
					if (point.curve.inHandle) {
						const inX = baseX + point.curve.inHandle.x;
						const inY = baseY + point.curve.inHandle.y;
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
