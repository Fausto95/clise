import { ChevronDown, ChevronRight, Image } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { StringColorInput } from "../string-color-input";
import { Field } from "./Field";
import type { ImageElement } from "../../store/element-atoms";
import type { SVGPathInfo } from "../../utils/svg-utils";

export function SVGColorSection({
	element,
	updateSVGPaths,
}: {
	element: ImageElement;
	updateSVGPaths: (params: { id: string; svgPaths: SVGPathInfo[] }) => void;
}) {
	const { t } = useTranslation();
	const [paths, setPaths] = useState<SVGPathInfo[]>(
		element.svgPaths ? [...element.svgPaths] : [],
	);

	// Debounce the update to prevent flickering
	const [updateTimeout, setUpdateTimeout] = useState<ReturnType<
		typeof setTimeout
	> | null>(null);

	// Accordion state for individual paths
	const [isIndividualPathsOpen, setIsIndividualPathsOpen] = useState(false);

	const updatePathColor = (
		pathId: string,
		colorType: "fill" | "stroke",
		color: string,
	) => {
		const updatedPaths = paths.map((path) => {
			if (path.id === pathId) {
				return {
					...path,
					[colorType === "fill" ? "currentFill" : "currentStroke"]: color,
				};
			}
			return path;
		});

		setPaths(updatedPaths);

		// Debounce the actual SVG update to prevent flickering
		if (updateTimeout) {
			clearTimeout(updateTimeout);
		}

		const newTimeout = setTimeout(() => {
			updateSVGPaths({ id: element.id, svgPaths: updatedPaths });
		}, 150); // 150ms debounce

		setUpdateTimeout(newTimeout);
	};

	const updatePathOpacity = (
		pathId: string,
		opacityType: "fillOpacity" | "strokeOpacity",
		opacity: number,
	) => {
		const updatedPaths = paths.map((path) => {
			if (path.id === pathId) {
				return {
					...path,
					[opacityType === "fillOpacity"
						? "currentFillOpacity"
						: "currentStrokeOpacity"]: opacity,
				};
			}
			return path;
		});

		setPaths(updatedPaths);

		// Debounce the actual SVG update to prevent flickering
		if (updateTimeout) {
			clearTimeout(updateTimeout);
		}

		const newTimeout = setTimeout(() => {
			updateSVGPaths({ id: element.id, svgPaths: updatedPaths });
		}, 150); // 150ms debounce

		setUpdateTimeout(newTimeout);
	};

	const updateAllPathsColor = (colorType: "fill" | "stroke", color: string) => {
		const updatedPaths = paths.map((path) => {
			// Only update paths that have this color type (not "none")
			if (colorType === "fill" && path.currentFill !== "none") {
				return { ...path, currentFill: color };
			} else if (colorType === "stroke" && path.currentStroke !== "none") {
				return { ...path, currentStroke: color };
			}
			return path;
		});

		setPaths(updatedPaths);

		// Debounce the actual SVG update to prevent flickering
		if (updateTimeout) {
			clearTimeout(updateTimeout);
		}

		const newTimeout = setTimeout(() => {
			updateSVGPaths({ id: element.id, svgPaths: updatedPaths });
		}, 150); // 150ms debounce

		setUpdateTimeout(newTimeout);
	};

	const updateAllPathsOpacity = (
		opacityType: "fillOpacity" | "strokeOpacity",
		opacity: number,
	) => {
		const updatedPaths = paths.map((path) => {
			// Only update paths that have the corresponding color (not "none")
			if (opacityType === "fillOpacity" && path.currentFill !== "none") {
				return { ...path, currentFillOpacity: opacity };
			} else if (
				opacityType === "strokeOpacity" &&
				path.currentStroke !== "none"
			) {
				return { ...path, currentStrokeOpacity: opacity };
			}
			return path;
		});

		setPaths(updatedPaths);

		// Debounce the actual SVG update to prevent flickering
		if (updateTimeout) {
			clearTimeout(updateTimeout);
		}

		const newTimeout = setTimeout(() => {
			updateSVGPaths({ id: element.id, svgPaths: updatedPaths });
		}, 150); // 150ms debounce

		setUpdateTimeout(newTimeout);
	};

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (updateTimeout) {
				clearTimeout(updateTimeout);
			}
		};
	}, [updateTimeout]);

	if (!paths.length) {
		return null;
	}

	// Helper to check if any paths have fills or strokes
	const hasFills = paths.some((path) => path.currentFill !== "none");
	const hasStrokes = paths.some((path) => path.currentStroke !== "none");

	return (
		<div className="section">
			<div className="section-header">
				<Image size={16} />
				<span>{t("inspector.svgColors", "SVG Colors")}</span>
			</div>

			{/* Change All Controls */}
			{(hasFills || hasStrokes) && (
				<div className="svg-change-all">
					<div className="section-subheader">
						{t("inspector.changeAll", "Change All")}
					</div>
					<div className="change-all-colors">
						{hasFills && (
							<Field label="All Fills">
								<StringColorInput
									value={
										paths.find((p) => p.currentFill !== "none")?.currentFill ||
										"#000000"
									}
									opacity={
										paths.find((p) => p.currentFill !== "none")
											?.currentFillOpacity || 1
									}
									onChange={(color) => updateAllPathsColor("fill", color)}
									onOpacityChange={(opacity) =>
										updateAllPathsOpacity("fillOpacity", opacity)
									}
									showOpacity={true}
								/>
							</Field>
						)}
						{hasStrokes && (
							<Field label="All Strokes">
								<StringColorInput
									value={
										paths.find((p) => p.currentStroke !== "none")
											?.currentStroke || "#000000"
									}
									opacity={
										paths.find((p) => p.currentStroke !== "none")
											?.currentStrokeOpacity || 1
									}
									onChange={(color) => updateAllPathsColor("stroke", color)}
									onOpacityChange={(opacity) =>
										updateAllPathsOpacity("strokeOpacity", opacity)
									}
									showOpacity={true}
								/>
							</Field>
						)}
					</div>
				</div>
			)}

			{/* Individual Path Controls - Accordion */}
			<div className="svg-accordion">
				<button
					type="button"
					className="accordion-header"
					onClick={() => setIsIndividualPathsOpen(!isIndividualPathsOpen)}
				>
					{isIndividualPathsOpen ? (
						<ChevronDown size={14} />
					) : (
						<ChevronRight size={14} />
					)}
					<span>
						{t("inspector.individualPaths", "Individual Paths")} ({paths.length}
						)
					</span>
				</button>

				{isIndividualPathsOpen && (
					<div className="svg-paths-grid">
						{paths.map((path) => (
							<div key={path.id} className="svg-path-item">
								<div className="path-label">
									{path.element.charAt(0).toUpperCase() + path.element.slice(1)}{" "}
									{path.id.split("-")[1]}
								</div>
								<div className="path-colors">
									{path.currentFill !== "none" && (
										<Field label="Fill">
											<StringColorInput
												value={path.currentFill}
												opacity={path.currentFillOpacity}
												onChange={(color) =>
													updatePathColor(path.id, "fill", color)
												}
												onOpacityChange={(opacity) =>
													updatePathOpacity(path.id, "fillOpacity", opacity)
												}
												showOpacity={true}
											/>
										</Field>
									)}
									{path.currentStroke !== "none" && (
										<Field label="Stroke">
											<StringColorInput
												value={path.currentStroke}
												opacity={path.currentStrokeOpacity}
												onChange={(color) =>
													updatePathColor(path.id, "stroke", color)
												}
												onOpacityChange={(opacity) =>
													updatePathOpacity(path.id, "strokeOpacity", opacity)
												}
												showOpacity={true}
											/>
										</Field>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
