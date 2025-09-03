import { Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Field } from "./Field";
import { Accordion } from "./Accordion";
import type { InspectorSectionProps } from "./types";

export function BlurSection({ element, onUpdate }: InspectorSectionProps) {
	const { t } = useTranslation();

	// Only for elements that support blur (rect, ellipse)
	if (!(element.type === "rect" || element.type === "ellipse")) {
		return null;
	}

	const hasBlurValue =
		(element.type === "rect" || element.type === "ellipse") &&
		element.blur &&
		element.blur.radius > 0;

	const handleSet = () => {
		onUpdate(element.id, { blur: { type: "layer", radius: 4 } });
	};

	const handleUnset = () => {
		// Explicitly unset the property by setting to undefined
		onUpdate(element.id, { blur: undefined });
	};

	const handleBlurTypeChange = (type: "layer" | "background") => {
		const currentRadius = element.blur?.radius || 4;
		onUpdate(element.id, { blur: { type, radius: currentRadius } });
	};

	const handleRadiusChange = (radius: number) => {
		const currentType = element.blur?.type || "layer";
		onUpdate(element.id, { blur: { type: currentType, radius } });
	};

	return (
		<Accordion
			title={t("inspector.blur")}
			icon={<Eye size={16} />}
			variant="set"
			isSet={hasBlurValue}
			onSet={handleSet}
			onUnset={handleUnset}
		>
			<Field label={t("inspector.blurType")}>
				<select
					className="input-field"
					value={element.blur?.type || "layer"}
					onChange={(e) =>
						handleBlurTypeChange(e.target.value as "layer" | "background")
					}
				>
					<option value="layer">{t("inspector.layerBlur")}</option>
					<option value="background">{t("inspector.backgroundBlur")}</option>
				</select>
			</Field>
			<Field label={t("inspector.blurRadius")}>
				<input
					className="input-field"
					type="number"
					min={0}
					max={20}
					step={0.5}
					value={element.blur?.radius || 0}
					onChange={(e) => handleRadiusChange(Number(e.target.value))}
				/>
			</Field>
		</Accordion>
	);
}
