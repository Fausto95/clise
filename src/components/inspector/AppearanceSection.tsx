import { Palette } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ColorInput } from "../color-input";
import { StringColorInput } from "../string-color-input";
import { Field } from "./Field";
import type { InspectorSectionProps } from "./types";
import type { TextElement } from "../../store/element-atoms";

export function AppearanceSection({
	element,
	onUpdate,
}: InspectorSectionProps) {
	const { t } = useTranslation();

	// Don't show appearance section for images (they have their own visual content)
	if (element.type === "image") {
		return null;
	}

	return (
		<div className="section">
			<div className="section-header">
				<Palette size={16} />
				<span>{t("inspector.appearance")}</span>
			</div>
			<div className="input-group">
				{element.type === "text" ? (
					<Field label={t("inspector.color")}>
						<StringColorInput
							value={(element as TextElement).color}
							opacity={element.opacity}
							onChange={(color) => onUpdate(element.id, { color })}
							onOpacityChange={(opacity) => onUpdate(element.id, { opacity })}
						/>
					</Field>
				) : (
					<>
						<Field label={t("inspector.fill")} fullWidth>
							<ColorInput
								value={element.fill}
								opacity={element.opacity}
								onChange={(fill) => onUpdate(element.id, { fill })}
								onOpacityChange={(opacity) => onUpdate(element.id, { opacity })}
							/>
						</Field>
					</>
				)}
			</div>
		</div>
	);
}
