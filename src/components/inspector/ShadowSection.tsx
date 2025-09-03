import { Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StringColorInput } from "../string-color-input";
import { Field } from "./Field";
import { Accordion } from "./Accordion";
import type { InspectorSectionProps } from "./types";

export function ShadowSection({ element, onUpdate }: InspectorSectionProps) {
	const { t } = useTranslation();

	// Only show for basic shapes for now (rect, ellipse)
	if (!(element.type === "rect" || element.type === "ellipse")) {
		return null;
	}

	const isSet = !!element.shadow;

	const handleSet = () => {
		const defaults = {
			type: "drop" as const,
			x: 4,
			y: 4,
			blur: 8,
			color: "#000000",
			opacity: 0.25,
			spread: 0,
		};
		onUpdate(element.id, { shadow: defaults });
	};

	const handleUnset = () => {
		onUpdate(element.id, { shadow: undefined });
	};

	return (
		<Accordion
			title={t("inspector.shadow", "Shadow")}
			icon={<Layers size={16} />}
			variant="set"
			isSet={isSet}
			onSet={handleSet}
			onUnset={handleUnset}
			defaultOpen={false}
		>
			{/* Type */}
			<Field label={t("inspector.type", "Type")}>
				<select
					className="input-field"
					value={element.shadow?.type || "drop"}
					onChange={(e) =>
						onUpdate(element.id, {
							shadow: {
								...(element.shadow || {
									x: 0,
									y: 0,
									blur: 0,
									color: "#000000",
									opacity: 0.25,
									spread: 0,
								}),
								type: e.target.value as "drop" | "inner",
							},
						})
					}
				>
					<option value="drop">Drop</option>
					<option value="inner">Inner</option>
				</select>
			</Field>

			{/* Offsets */}
			<Field label={t("inspector.xOffset", "X Offset")}>
				<input
					className="input-field"
					type="number"
					value={element.shadow?.x ?? 0}
					onChange={(e) =>
						onUpdate(element.id, {
							shadow: {
								...(element.shadow || {
									x: 0,
									y: 0,
									blur: 0,
									color: "#000000",
									opacity: 0.25,
								}),
								x: Number(e.target.value),
							},
						})
					}
				/>
			</Field>
			<Field label={t("inspector.yOffset", "Y Offset")}>
				<input
					className="input-field"
					type="number"
					value={element.shadow?.y ?? 0}
					onChange={(e) =>
						onUpdate(element.id, {
							shadow: {
								...(element.shadow || {
									x: 0,
									y: 0,
									blur: 0,
									color: "#000000",
									opacity: 0.25,
								}),
								y: Number(e.target.value),
							},
						})
					}
				/>
			</Field>

			{/* Blur */}
			<Field label={t("inspector.blur")}>
				<input
					className="input-field"
					type="number"
					min={0}
					step={0.5}
					value={element.shadow?.blur ?? 0}
					onChange={(e) =>
						onUpdate(element.id, {
							shadow: {
								...(element.shadow || {
									x: 0,
									y: 0,
									blur: 0,
									color: "#000000",
									opacity: 0.25,
								}),
								blur: Number(e.target.value),
							},
						})
					}
				/>
			</Field>

			{/* Spread */}
			<Field label={t("inspector.spread", "Spread")}>
				<input
					className="input-field"
					type="number"
					step={0.5}
					value={element.shadow?.spread ?? 0}
					onChange={(e) =>
						onUpdate(element.id, {
							shadow: {
								...(element.shadow || {
									x: 0,
									y: 0,
									blur: 0,
									color: "#000000",
									opacity: 0.25,
								}),
								spread: Number(e.target.value),
							},
						})
					}
				/>
			</Field>

			{/* Color + Opacity */}
			<Field label={t("inspector.color")}>
				<StringColorInput
					value={element.shadow?.color || "#000000"}
					opacity={element.shadow?.opacity ?? 0.25}
					showOpacity={true}
					onChange={(color) =>
						onUpdate(element.id, {
							shadow: {
								...(element.shadow || {
									x: 0,
									y: 0,
									blur: 0,
									color: "#000000",
									opacity: 0.25,
								}),
								color,
							},
						})
					}
					onOpacityChange={(opacity) =>
						onUpdate(element.id, {
							shadow: {
								...(element.shadow || {
									x: 0,
									y: 0,
									blur: 0,
									color: "#000000",
									opacity: 0.25,
								}),
								opacity,
							},
						})
					}
				/>
			</Field>
		</Accordion>
	);
}
