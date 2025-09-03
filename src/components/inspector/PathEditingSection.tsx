import { useState } from "react";
import {
	PenTool,
	Plus,
	Minus,
	Square,
	Circle,
	Scissors,
	Link,
	Merge,
	SquaresIntersect,
	Minus as MinusIcon,
	X,
} from "lucide-react";
import type { InspectorSectionProps } from "./types";
import { captureError } from "../../utils/sentry";
import type { PathElement, PathPoint } from "@store/element-atoms";
import { useSelectedElements, useElementOperations } from "@store/index";
import { Field } from "./Field";
import { PathEditingManager } from "../../canvas/canvaskit/managers/path-editing-manager";
import { PathBooleanOperations } from "../../canvas/canvaskit/managers/path-boolean-operations";

export function PathEditingSection({
	element,
	onUpdate,
	addElement,
}: InspectorSectionProps) {
	const [expandedPoints, setExpandedPoints] = useState<Set<number>>(new Set());
	const selectedElements = useSelectedElements();
	const { deleteElements } = useElementOperations();

	if (element.type !== "path") return null;

	const pathElement = element as PathElement;

	const togglePointExpanded = (index: number) => {
		const newExpanded = new Set(expandedPoints);
		if (newExpanded.has(index)) {
			newExpanded.delete(index);
		} else {
			newExpanded.add(index);
		}
		setExpandedPoints(newExpanded);
	};

	const updatePoint = (pointIndex: number, updates: Partial<PathPoint>) => {
		const newPoints = [...pathElement.points];
		if (newPoints[pointIndex]) {
			newPoints[pointIndex] = { ...newPoints[pointIndex], ...updates };
			onUpdate(element.id, { points: newPoints });
		}
	};

	const addPoint = () => {
		const newPoints = [...pathElement.points];
		const lastPoint = newPoints[newPoints.length - 1];
		if (lastPoint) {
			newPoints.push({
				x: lastPoint.x + 20,
				y: lastPoint.y + 20,
			});
			onUpdate(element.id, { points: newPoints });
		}
	};

	const removePoint = (pointIndex: number) => {
		if (pathElement.points.length <= 2) return; // Don't remove if only 2 points left

		const newPoints = [...pathElement.points];
		newPoints.splice(pointIndex, 1);
		onUpdate(element.id, { points: newPoints });
	};

	const convertToCurve = (
		pointIndex: number,
		curveType: "quadratic" | "cubic",
	) => {
		const newPoints = [...pathElement.points];
		const point = newPoints[pointIndex];
		if (!point || point.curve) return;

		if (curveType === "quadratic") {
			const nextPoint = newPoints[pointIndex + 1];
			if (nextPoint) {
				// Calculate a better control point that goes outward
				const dx = nextPoint.x - point.x;
				const dy = nextPoint.y - point.y;
				const len = Math.hypot(dx, dy) || 1;
				const offset = Math.min(30, len * 0.25);

				// Perpendicular vector (clockwise rotation for outward curves)
				const perpX = dy / len; // Reversed from -dy
				const perpY = -dx / len; // Reversed from dx

				const midX = (point.x + nextPoint.x) / 2;
				const midY = (point.y + nextPoint.y) / 2;

				newPoints[pointIndex] = {
					...point,
					curve: {
						type: "quadratic",
						cx: midX + perpX * offset,
						cy: midY + perpY * offset,
					},
				};
			}
		} else if (curveType === "cubic") {
			const nextPoint = newPoints[pointIndex + 1];
			if (nextPoint) {
				// Calculate better control points for cubic curves
				const dx = nextPoint.x - point.x;
				const dy = nextPoint.y - point.y;
				const len = Math.hypot(dx, dy) || 1;
				const offset = Math.min(25, len * 0.2);

				// Perpendicular vector (clockwise rotation for outward curves)
				const perpX = dy / len; // Reversed from -dy
				const perpY = -dx / len; // Reversed from dx

				newPoints[pointIndex] = {
					...point,
					curve: {
						type: "cubic",
						outHandle: {
							x: point.x + perpX * offset,
							y: point.y + perpY * offset,
						},
						inHandle: {
							x: nextPoint.x - perpX * offset,
							y: nextPoint.y - perpY * offset,
						},
					},
				};
			}
		}

		onUpdate(element.id, { points: newPoints });
	};

	const convertToLine = (pointIndex: number) => {
		const newPoints = [...pathElement.points];
		const point = newPoints[pointIndex];
		if (!point || !point.curve) return;

		newPoints[pointIndex] = {
			x: point.x,
			y: point.y,
		};

		onUpdate(element.id, { points: newPoints });
	};

	const convertToSmoothCurve = (pointIndex: number) => {
		const updatedPath = PathEditingManager.convertToSmoothCurve(
			pathElement,
			pointIndex,
		);
		onUpdate(element.id, updatedPath);
	};

	const splitPath = (pointIndex: number = 0) => {
		// Ensure we have at least 2 points to split
		if (pathElement.points.length < 2) {
			alert("Cannot split a path with less than 2 points.");
			return;
		}

		try {
			// Use a valid point index (middle of the path if not specified)
			const splitIndex =
				pointIndex >= 0 && pointIndex < pathElement.points.length
					? pointIndex
					: Math.floor(pathElement.points.length / 2);

			const { firstPath, secondPath } = PathEditingManager.splitPath(
				pathElement,
				splitIndex,
			);

			// Ensure both paths have proper properties
			const validFirstPath = {
				...firstPath,
				id: element.id, // Keep original ID for first path
				type: "path" as const,
				name: element.name || "Split Path 1",
				closed: false, // Split paths should be open
			};

			const validSecondPath = {
				...secondPath,
				type: "path" as const,
				name: `${element.name || "Path"} (Split)`,
				closed: false, // Split paths should be open
			};

			// Update the current path to the first part
			onUpdate(element.id, validFirstPath);

			// Add the second path to the canvas
			if (addElement) {
				// Create a new element with the second path
				const newElement = {
					...validSecondPath,
					id: `${element.id}_split_${Date.now()}`, // Ensure unique ID
				};

				// Add the second path to the canvas
				addElement(newElement);
			} else {
				console.warn("Split path: addElement function not available");
			}
		} catch (error) {
			captureError("Error splitting path", { error });
			alert("Failed to split path. Please try again.");
		}
	};

	const joinPaths = () => {
		// Get all selected path elements
		const selectedPaths = selectedElements.filter(
			(el) => el.type === "path",
		) as PathElement[];

		if (selectedPaths.length !== 2) {
			alert(
				"Join Paths: Please select exactly 2 path elements to join them together.",
			);
			return;
		}

		const [path1, path2] = selectedPaths;

		if (!path1 || !path2) {
			alert("Error: Could not find the selected paths.");
			return;
		}

		try {
			// Join the paths using PathEditingManager
			const joinedPath = PathEditingManager.joinPaths(path1, path2, true);

			// Ensure the joined path has proper properties
			const validJoinedPath = {
				...joinedPath,
				id: path1.id, // Keep original ID
				type: "path" as const,
				name: path1.name || "Joined Path",
				closed: false, // Joined paths should be open
			};

			// Update the first path with the joined result
			onUpdate(path1.id, validJoinedPath);

			// Delete the second path
			deleteElements([path2.id]);
		} catch (error) {
			captureError("Error joining paths", { error });
			alert("Failed to join paths. Please try again.");
		}
	};

	const performBooleanOperation = (
		operation: "union" | "intersection" | "difference" | "exclusion",
	) => {
		// Get all selected path elements
		const selectedPaths = selectedElements.filter(
			(el) => el.type === "path",
		) as PathElement[];

		if (selectedPaths.length !== 2) {
			const operationNames = {
				union: "Union (combine)",
				intersection: "Intersection (overlap)",
				difference: "Difference (subtract)",
				exclusion: "Exclusion (XOR)",
			};
			alert(
				`${operationNames[operation]}: Please select exactly 2 path elements to perform this operation.`,
			);
			return;
		}

		const [path1, path2] = selectedPaths;

		if (!path1 || !path2) {
			alert("Error: Could not find the selected paths.");
			return;
		}

		try {
			// Perform the boolean operation
			const result = PathBooleanOperations.performBooleanOperation(
				path1,
				path2,
				operation,
			);

			if (!result) {
				alert(
					`Boolean operation ${operation} failed. The paths may not be compatible for this operation.`,
				);
				return;
			}

			// Ensure the result has proper properties
			const validResult = {
				...result,
				id: path1.id, // Keep original ID
				type: "path" as const,
				name:
					path1.name ||
					`${operation.charAt(0).toUpperCase() + operation.slice(1)} Path`,
				// Keep the closed property from the operation result
			};

			// Update the first path with the result
			onUpdate(path1.id, validResult);

			// Delete the second path
			deleteElements([path2.id]);
		} catch (error) {
			captureError(`Error performing ${operation} operation`, {
				operation,
				error,
			});
			alert(`Failed to perform ${operation} operation. Please try again.`);
		}
	};

	return (
		<div className="section">
			<div className="section-header">
				<PenTool size={16} />
				<span>Path Editing</span>
			</div>

			<div className="input-group">
				<Field label="Points">
					<div className="path-points-list">
						{pathElement.points.map((point, index) => (
							<div key={index} className="path-point-item">
								<div className="path-point-header">
									<button
										type="button"
										className="path-point-toggle"
										onClick={() => togglePointExpanded(index)}
									>
										{expandedPoints.has(index) ? "−" : "+"}
									</button>
									<span className="path-point-label">Point {index + 1}</span>
									<button
										type="button"
										className="path-point-remove"
										onClick={() => removePoint(index)}
										disabled={pathElement.points.length <= 2}
										title="Remove point"
									>
										<Minus size={12} />
									</button>
								</div>

								{expandedPoints.has(index) && (
									<div className="path-point-details">
										<div className="input-row">
											<Field label="X">
												<input
													type="number"
													value={Math.round(point.x)}
													onChange={(e) =>
														updatePoint(index, { x: +e.target.value })
													}
													className="input-field"
												/>
											</Field>
											<Field label="Y">
												<input
													type="number"
													value={Math.round(point.y)}
													onChange={(e) =>
														updatePoint(index, { y: +e.target.value })
													}
													className="input-field"
												/>
											</Field>
										</div>

										{point.curve ? (
											<div className="curve-controls">
												<div className="curve-type">
													<span>Curve: {point.curve.type}</span>
													<button
														type="button"
														onClick={() => convertToLine(index)}
														className="btn-secondary"
													>
														Convert to Line
													</button>
												</div>

												{point.curve.type === "quadratic" &&
													point.curve.cx !== undefined &&
													point.curve.cy !== undefined && (
														<div className="input-row">
															<Field label="Control X">
																<input
																	type="number"
																	value={Math.round(point.curve.cx)}
																	onChange={(e) =>
																		updatePoint(index, {
																			curve: {
																				...point.curve!,
																				cx: +e.target.value,
																			},
																		})
																	}
																	className="input-field"
																/>
															</Field>
															<Field label="Control Y">
																<input
																	type="number"
																	value={Math.round(point.curve.cy)}
																	onChange={(e) =>
																		updatePoint(index, {
																			curve: {
																				...point.curve!,
																				cy: +e.target.value,
																			},
																		})
																	}
																	className="input-field"
																/>
															</Field>
														</div>
													)}

												{point.curve.type === "cubic" && (
													<>
														{point.curve.outHandle && (
															<div className="input-row">
																<Field label="Out X">
																	<input
																		type="number"
																		value={Math.round(point.curve.outHandle.x)}
																		onChange={(e) =>
																			updatePoint(index, {
																				curve: {
																					...point.curve!,
																					outHandle: {
																						...point.curve!.outHandle!,
																						x: +e.target.value,
																					},
																				},
																			})
																		}
																		className="input-field"
																	/>
																</Field>
																<Field label="Out Y">
																	<input
																		type="number"
																		value={Math.round(point.curve.outHandle.y)}
																		onChange={(e) =>
																			updatePoint(index, {
																				curve: {
																					...point.curve!,
																					outHandle: {
																						...point.curve!.outHandle!,
																						y: +e.target.value,
																					},
																				},
																			})
																		}
																		className="input-field"
																	/>
																</Field>
															</div>
														)}
														{point.curve.inHandle && (
															<div className="input-row">
																<Field label="In X">
																	<input
																		type="number"
																		value={Math.round(point.curve.inHandle.x)}
																		onChange={(e) =>
																			updatePoint(index, {
																				curve: {
																					...point.curve!,
																					inHandle: {
																						...point.curve!.inHandle!,
																						x: +e.target.value,
																					},
																				},
																			})
																		}
																		className="input-field"
																	/>
																</Field>
																<Field label="In Y">
																	<input
																		type="number"
																		value={Math.round(point.curve.inHandle.y)}
																		onChange={(e) =>
																			updatePoint(index, {
																				curve: {
																					...point.curve!,
																					inHandle: {
																						...point.curve!.inHandle!,
																						y: +e.target.value,
																					},
																				},
																			})
																		}
																		className="input-field"
																	/>
																</Field>
															</div>
														)}
													</>
												)}
											</div>
										) : (
											<div className="curve-controls">
												<span>Line segment</span>
												<div className="curve-buttons">
													<button
														type="button"
														onClick={() => convertToCurve(index, "quadratic")}
														className="btn-secondary"
														title="Convert to quadratic curve"
													>
														<Square size={12} />
													</button>
													<button
														type="button"
														onClick={() => convertToCurve(index, "cubic")}
														className="btn-secondary"
														title="Convert to cubic curve"
													>
														<Circle size={12} />
													</button>
													<button
														type="button"
														onClick={() => convertToSmoothCurve(index)}
														className="btn-secondary"
														title="Convert to smooth curve"
													>
														<Square size={12} />
													</button>
												</div>
											</div>
										)}
									</div>
								)}
							</div>
						))}
					</div>
				</Field>

				{/* Path Operations */}
				<div className="input-group">
					<Field label="Path Operations">
						<div className="path-operations">
							<div className="operation-buttons">
								<button
									type="button"
									onClick={() => splitPath(0)}
									className="path-operation-btn"
									title="Split path at middle point"
								>
									<Scissors size={16} />
								</button>
								<button
									type="button"
									onClick={joinPaths}
									className="path-operation-btn"
									title="Join with another path"
								>
									<Link size={16} />
								</button>
							</div>
							<div className="boolean-operations">
								<span className="boolean-label">Boolean:</span>
								<button
									type="button"
									onClick={() => performBooleanOperation("union")}
									className="boolean-operation-btn"
									title="Union (combine)"
								>
									<Merge size={16} />
								</button>
								<button
									type="button"
									onClick={() => performBooleanOperation("intersection")}
									className="boolean-operation-btn"
									title="Intersection (overlap)"
								>
									<SquaresIntersect size={16} />
								</button>
								<button
									type="button"
									onClick={() => performBooleanOperation("difference")}
									className="boolean-operation-btn"
									title="Difference (subtract)"
								>
									<MinusIcon size={16} />
								</button>
								<button
									type="button"
									onClick={() => performBooleanOperation("exclusion")}
									className="boolean-operation-btn"
									title="Exclusion (XOR)"
								>
									<X size={16} />
								</button>
							</div>
						</div>
					</Field>
				</div>

				<div className="path-actions">
					<button
						type="button"
						onClick={addPoint}
						className="btn-primary"
						title="Add point"
					>
						<Plus size={14} />
						Add Point
					</button>
				</div>
			</div>
		</div>
	);
}
