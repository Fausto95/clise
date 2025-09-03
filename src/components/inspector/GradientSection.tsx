import { Palette, Plus, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StringColorInput } from "../string-color-input";
import { Field } from "./Field";
import { Accordion } from "./Accordion";
import type { InspectorSectionProps } from "./types";
import type {
	Gradient,
	GradientStop,
} from "../../store/elements/element-types";
import { GradientUtils } from "../../canvas/canvaskit/rendering/gradient-utils";

export function GradientSection({ element, onUpdate }: InspectorSectionProps) {
	const { t } = useTranslation();

	// Only show for elements with gradients
	if (!GradientUtils.isGradient(element.fill)) {
		return null;
	}

	const gradient = element.fill as Gradient;
	const isSet = !!gradient && !!gradient.stops && gradient.stops.length > 0;

	const handleUnset = () => {
		// Convert back to solid color using first stop or black
		const firstColor = gradient.stops?.[0]?.color || "#000000";
		onUpdate(element.id, { fill: firstColor });
	};

	const updateGradientStop = (
		index: number,
		updates: Partial<GradientStop>,
	) => {
		if (!gradient.stops) return;

		const newStops = [...gradient.stops];
		const currentStop = newStops[index];
		if (!currentStop) return;

		newStops[index] = {
			color: currentStop.color,
			position: currentStop.position,
			...updates,
		};

		const updatedGradient = { ...gradient, stops: newStops };
		onUpdate(element.id, { fill: updatedGradient });
	};

	const addGradientStop = () => {
		if (!gradient.stops) return;

		// Find a good position for the new stop
		const newPosition =
			gradient.stops.length > 0
				? Math.min(
						1,
						(gradient.stops[gradient.stops.length - 1]?.position || 0) + 0.2,
					)
				: 0.5;

		const newStop: GradientStop = {
			color: "#ffffff",
			position: newPosition,
			opacity: 1,
		};

		const newStops = [...gradient.stops, newStop].sort(
			(a, b) => a.position - b.position,
		);
		const updatedGradient = { ...gradient, stops: newStops };
		onUpdate(element.id, { fill: updatedGradient });
	};

	const removeGradientStop = (index: number) => {
		if (!gradient.stops || gradient.stops.length <= 2) return; // Keep at least 2 stops

		const newStops = gradient.stops.filter((_, i) => i !== index);
		const updatedGradient = { ...gradient, stops: newStops };
		onUpdate(element.id, { fill: updatedGradient });
	};

	const updateGradientType = (newType: "linear" | "radial" | "mesh") => {
		let newGradient: Gradient;
		const firstColor = gradient.stops?.[0]?.color || "#000000";
		const secondColor = gradient.stops?.[1]?.color || "#ffffff";

		switch (newType) {
			case "linear":
				newGradient = GradientUtils.createDefaultLinearGradient(
					firstColor,
					secondColor,
				);
				break;
			case "radial":
				newGradient = GradientUtils.createDefaultRadialGradient(
					firstColor,
					secondColor,
				);
				break;
			case "mesh":
				newGradient = GradientUtils.createDefaultMeshGradient();
				// Update first control point with current color
				if (newGradient.controlPoints && newGradient.controlPoints.length > 0) {
					const firstPoint = newGradient.controlPoints[0];
					if (firstPoint) {
						newGradient.controlPoints[0] = {
							...firstPoint,
							color: firstColor,
							x: firstPoint.x,
							y: firstPoint.y,
						};
					}
				}
				break;
			default:
				return;
		}

		// Preserve existing stops if possible
		if (gradient.stops && newType !== "mesh") {
			newGradient.stops = gradient.stops;
		}

		onUpdate(element.id, { fill: newGradient });
	};

	const updateLinearGradient = (
		updates: Partial<{
			startX: number;
			startY: number;
			endX: number;
			endY: number;
		}>,
	) => {
		if (gradient.type !== "linear") return;
		const updatedGradient = { ...gradient, ...updates };
		onUpdate(element.id, { fill: updatedGradient });
	};

	const updateRadialGradient = (
		updates: Partial<{ centerX: number; centerY: number; radius: number }>,
	) => {
		if (gradient.type !== "radial") return;
		const updatedGradient = { ...gradient, ...updates };
		onUpdate(element.id, { fill: updatedGradient });
	};

	return (
		<Accordion
			title={t("inspector.gradient", "Gradient")}
			icon={<Palette size={16} />}
			variant="set"
			isSet={isSet}
			onSet={() => {}} // Already a gradient
			onUnset={handleUnset}
			defaultOpen={true}
		>
			{/* Gradient Type */}
			<Field label={t("inspector.type", "Type")}>
				<select
					className="input-field"
					value={gradient.type}
					onChange={(e) =>
						updateGradientType(e.target.value as "linear" | "radial" | "mesh")
					}
				>
					<option value="linear">Linear</option>
					<option value="radial">Radial</option>
					<option value="mesh">Mesh</option>
				</select>
			</Field>

			{/* Linear Gradient Controls */}
			{gradient.type === "linear" && (
				<>
					<Field label={t("inspector.angle", "Angle")}>
						<input
							className="input-field"
							type="range"
							min="0"
							max="360"
							step="1"
							value={
								(Math.atan2(
									gradient.endY - gradient.startY,
									gradient.endX - gradient.startX,
								) *
									180) /
									Math.PI +
								90
							}
							onChange={(e) => {
								const angle = ((Number(e.target.value) - 90) * Math.PI) / 180;
								const length = 0.7;
								updateLinearGradient({
									startX: 0.5 - (Math.cos(angle) * length) / 2,
									startY: 0.5 - (Math.sin(angle) * length) / 2,
									endX: 0.5 + (Math.cos(angle) * length) / 2,
									endY: 0.5 + (Math.sin(angle) * length) / 2,
								});
							}}
						/>
					</Field>
				</>
			)}

			{/* Radial Gradient Controls */}
			{gradient.type === "radial" && (
				<>
					<Field label={t("inspector.centerX", "Center X")}>
						<input
							className="input-field"
							type="range"
							min="0"
							max="1"
							step="0.01"
							value={gradient.centerX}
							onChange={(e) =>
								updateRadialGradient({ centerX: Number(e.target.value) })
							}
						/>
					</Field>
					<Field label={t("inspector.centerY", "Center Y")}>
						<input
							className="input-field"
							type="range"
							min="0"
							max="1"
							step="0.01"
							value={gradient.centerY}
							onChange={(e) =>
								updateRadialGradient({ centerY: Number(e.target.value) })
							}
						/>
					</Field>
					<Field label={t("inspector.radius", "Radius")}>
						<input
							className="input-field"
							type="range"
							min="0"
							max="1"
							step="0.01"
							value={gradient.radius}
							onChange={(e) =>
								updateRadialGradient({ radius: Number(e.target.value) })
							}
						/>
					</Field>
				</>
			)}

			{/* Gradient Stops */}
			{gradient.type !== "mesh" && gradient.stops && (
				<>
					<div className="gradient-stops-header">
						<span>{t("inspector.colorStops", "Color Stops")}</span>
						<button
							type="button"
							className="icon-button"
							onClick={addGradientStop}
							title="Add color stop"
						>
							<Plus size={14} />
						</button>
					</div>

					<div className="gradient-stops-list">
						{gradient.stops.map((stop, index) => (
							<div key={index} className="gradient-stop">
								<div className="gradient-stop-controls">
									<StringColorInput
										value={stop.color}
										opacity={stop.opacity || 1}
										onChange={(color) => updateGradientStop(index, { color })}
										onOpacityChange={(opacity) =>
											updateGradientStop(index, { opacity })
										}
										showOpacity={true}
									/>
									<div className="gradient-stop-position">
										<input
											type="range"
											min="0"
											max="1"
											step="0.01"
											value={stop.position}
											onChange={(e) =>
												updateGradientStop(index, {
													position: Number(e.target.value),
												})
											}
											className="position-slider"
										/>
										<span className="position-value">
											{Math.round(stop.position * 100)}%
										</span>
									</div>
									{gradient.stops && gradient.stops.length > 2 && (
										<button
											type="button"
											className="icon-button icon-button-danger"
											onClick={() => removeGradientStop(index)}
											title="Remove color stop"
										>
											<Minus size={14} />
										</button>
									)}
								</div>
							</div>
						))}
					</div>
				</>
			)}

			{/* Mesh Gradient Info */}
			{gradient.type === "mesh" && (
				<div className="mesh-gradient-info">
					<p className="gradient-info-text">
						Mesh gradients create smooth color transitions between multiple
						control points.
					</p>
					{gradient.controlPoints && (
						<div className="mesh-control-points">
							<span>{gradient.controlPoints.length} control points</span>
						</div>
					)}
				</div>
			)}

			{/* Gradient Preview */}
			<div className="gradient-preview-section">
				<Field label={t("inspector.preview", "Preview")}>
					<div
						className="gradient-preview-bar"
						style={{
							background:
								gradient.type === "linear"
									? `linear-gradient(90deg, ${
											gradient.stops
												?.map((stop) => `${stop.color} ${stop.position * 100}%`)
												.join(", ") || ""
										})`
									: gradient.type === "radial"
										? `radial-gradient(circle, ${
												gradient.stops
													?.map(
														(stop) => `${stop.color} ${stop.position * 100}%`,
													)
													.join(", ") || ""
											})`
										: `conic-gradient(from 0deg, ${gradient.controlPoints?.map((point) => point.color).join(", ") || ""})`,
						}}
					/>
				</Field>
			</div>
		</Accordion>
	);
}
