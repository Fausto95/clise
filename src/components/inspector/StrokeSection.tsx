import { PenLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ColorInput } from "../color-input";
import { Field } from "./Field";
import { Accordion } from "./Accordion";
import type { InspectorSectionProps } from "./types";
import { GradientUtils } from "../../canvas/canvaskit/rendering/gradient-utils";

export function StrokeSection({ element, onUpdate }: InspectorSectionProps) {
	const { t } = useTranslation();

	// Show for shapes and lines and frames; not for text and not for image (not rendered)
	if (element.type === "text" || element.type === "image") {
		return null;
	}

	// Helper function to get fallback color from fill (in case it's a gradient)
	const getFallbackFillColor = (): string => {
		if (!element.fill) return "#000000";
		if (typeof element.fill === "string") return element.fill;
		if (GradientUtils.isGradient(element.fill)) {
			// Return the first stop color as fallback
			if (element.fill.stops && element.fill.stops.length > 0) {
				return element.fill.stops[0]?.color || "#000000";
			}
		}
		return "#000000";
	};

	// Helper function to get fallback color from stroke (in case it's a gradient)
	const getFallbackStrokeColor = (): string => {
		if (!element.stroke?.color) return getFallbackFillColor();
		if (typeof element.stroke.color === "string") return element.stroke.color;
		if (GradientUtils.isGradient(element.stroke.color)) {
			// Return the first stop color as fallback
			if (element.stroke.color.stops && element.stroke.color.stops.length > 0) {
				return element.stroke.color.stops[0]?.color || "#000000";
			}
		}
		return getFallbackFillColor();
	};

	const isSet =
		!!element.stroke && element.stroke.width > 0 && element.stroke.opacity > 0;

	const handleSet = () => {
		const stroke = {
			color: element.stroke?.color || getFallbackFillColor(),
			width: Math.max(1, element.stroke?.width || 1),
			opacity: 1,
			style: element.stroke?.style || ("solid" as const),
			position: element.stroke?.position || ("center" as const),
		};
		onUpdate(element.id, { stroke });
	};

	const handleUnset = () => {
		onUpdate(element.id, { stroke: undefined });
	};

	return (
		<Accordion
			title={t("inspector.stroke")}
			icon={<PenLine size={16} />}
			variant="set"
			isSet={isSet}
			onSet={handleSet}
			onUnset={handleUnset}
		>
			<Field label={t("inspector.strokeStyle", "Stroke Style")}>
				<select
					className="input-field"
					value={element.stroke?.style || "solid"}
					onChange={(e) =>
						onUpdate(element.id, {
							stroke: element.stroke
								? {
										...element.stroke,
										style: e.target.value as "solid" | "dashed",
									}
								: {
										color: getFallbackFillColor(),
										width: 1,
										opacity: 1,
										style: e.target.value as "solid" | "dashed",
										position: "center" as const,
									},
						})
					}
				>
					<option value="solid">{t("inspector.solid", "Solid")}</option>
					<option value="dashed">{t("inspector.dashed", "Dashed")}</option>
				</select>
			</Field>

			<Field label={t("inspector.strokePosition", "Stroke Position")}>
				<select
					className="input-field"
					value={element.stroke?.position || "center"}
					onChange={(e) =>
						onUpdate(element.id, {
							stroke: element.stroke
								? {
										...element.stroke,
										position: e.target.value as "center" | "inside" | "outside",
									}
								: {
										color: getFallbackFillColor(),
										width: 1,
										opacity: 1,
										style: "solid" as const,
										position: e.target.value as "center" | "inside" | "outside",
									},
						})
					}
				>
					<option value="center">{t("inspector.center")}</option>
					<option value="inside">{t("inspector.inside", "Inside")}</option>
					<option value="outside">{t("inspector.outside", "Outside")}</option>
				</select>
			</Field>

			<Field label={t("inspector.strokeWidth", "Stroke Width")}>
				<input
					className="input-field"
					type="number"
					min={0}
					step={0.5}
					value={element.stroke?.width || 0}
					onChange={(e) =>
						onUpdate(element.id, {
							stroke: element.stroke
								? { ...element.stroke, width: Number(e.target.value) }
								: {
										color: getFallbackFillColor(),
										width: Number(e.target.value),
										opacity: 1,
										style: "solid" as const,
										position: "center" as const,
									},
						})
					}
				/>
			</Field>
			<Field label={t("inspector.color")}>
				<ColorInput
					value={getFallbackStrokeColor()}
					opacity={element.stroke?.opacity || 1}
					showOpacity={true}
					onChange={(color) =>
						onUpdate(element.id, {
							stroke: element.stroke
								? { ...element.stroke, color }
								: {
										color,
										width: 1,
										opacity: 1,
										style: "solid" as const,
										position: "center" as const,
									},
						})
					}
					onOpacityChange={(opacity) =>
						onUpdate(element.id, {
							stroke: element.stroke
								? { ...element.stroke, opacity }
								: {
										color: getFallbackFillColor(),
										width: 1,
										opacity,
										style: "solid" as const,
										position: "center" as const,
									},
						})
					}
				/>
			</Field>
		</Accordion>
	);
}
