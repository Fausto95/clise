import { useTranslation } from "react-i18next";
import { Accordion } from "./Accordion";
import { Field } from "./Field";
import type { InspectorSectionProps } from "./types";
import type { ImageElement } from "../../store/element-atoms";

export function ImageEffectsSection({
	element,
	onUpdate,
}: InspectorSectionProps) {
	const { t } = useTranslation();

	if (element.type !== "image") return null;

	const img = element as ImageElement;
	const current = img.imageEffects;
	const isSet =
		!!current &&
		((current.blur ?? 0) !== 0 ||
			(current.brightness ?? 1) !== 1 ||
			(current.contrast ?? 1) !== 1 ||
			(current.saturation ?? 1) !== 1 ||
			(current.blendMode && current.blendMode !== "normal"));

	const setDefault = () => {
		onUpdate(element.id, {
			imageEffects: {
				blur: 0,
				brightness: 1,
				contrast: 1,
				saturation: 1,
				blendMode: "normal",
			},
		} as any);
	};

	const unset = () => {
		onUpdate(element.id, { imageEffects: undefined } as any);
	};

	const update = (
		patch: Partial<NonNullable<ImageElement["imageEffects"]>>,
	) => {
		const next = { ...(current || {}), ...patch };
		onUpdate(element.id, { imageEffects: next } as any);
	};

	return (
		<Accordion
			title={t("inspector.effects", "Effects")}
			icon={null}
			variant="set"
			isSet={isSet}
			onSet={setDefault}
			onUnset={unset}
			defaultOpen={false}
		>
			<Field label={t("inspector.blur", "Blur")}>
				<input
					className="input-field"
					type="number"
					min={0}
					step={0.5}
					value={current?.blur ?? 0}
					onChange={(e) =>
						update({ blur: Math.max(0, Number(e.target.value) || 0) })
					}
				/>
			</Field>

			<Field label={t("inspector.brightness", "Brightness")}>
				<input
					className="input-field"
					type="number"
					min={0}
					max={2}
					step={0.05}
					value={current?.brightness ?? 1}
					onChange={(e) =>
						update({ brightness: Math.max(0, Number(e.target.value) || 1) })
					}
				/>
			</Field>

			<Field label={t("inspector.contrast", "Contrast")}>
				<input
					className="input-field"
					type="number"
					min={0}
					max={2}
					step={0.05}
					value={current?.contrast ?? 1}
					onChange={(e) =>
						update({ contrast: Math.max(0, Number(e.target.value) || 1) })
					}
				/>
			</Field>

			<Field label={t("inspector.saturation", "Saturation")}>
				<input
					className="input-field"
					type="number"
					min={0}
					max={2}
					step={0.05}
					value={current?.saturation ?? 1}
					onChange={(e) =>
						update({ saturation: Math.max(0, Number(e.target.value) || 1) })
					}
				/>
			</Field>

			<Field label={t("inspector.blendMode", "Blend Mode")}>
				<select
					className="input-field"
					value={current?.blendMode || "normal"}
					onChange={(e) => update({ blendMode: e.target.value as any })}
				>
					<option value="normal">{t("inspector.blendNormal", "Normal")}</option>
					<option value="multiply">
						{t("inspector.blendMultiply", "Multiply")}
					</option>
					<option value="screen">{t("inspector.blendScreen", "Screen")}</option>
					<option value="overlay">
						{t("inspector.blendOverlay", "Overlay")}
					</option>
					<option value="darken">{t("inspector.blendDarken", "Darken")}</option>
					<option value="lighten">
						{t("inspector.blendLighten", "Lighten")}
					</option>
				</select>
			</Field>
		</Accordion>
	);
}
