import { useTranslation } from "react-i18next";
import { Field } from "./Field";
import type { InspectorSectionProps } from "./types";
import type { RectangleElement } from "../../store/element-atoms";

export function CornerRadiusSection({
	element,
	onUpdate,
}: InspectorSectionProps) {
	const { t } = useTranslation();

	// Only show for rectangle elements
	if (element.type !== "rect") {
		return null;
	}

	const rectElement = element as RectangleElement;

	return (
		<div className="section" style={{ marginTop: "12px" }}>
			<div className="section-header">
				<span>{t("inspector.cornerRadius")}</span>
			</div>
			<div className="input-group">
				{(["topLeft", "topRight", "bottomLeft", "bottomRight"] as const).map(
					(corner) => (
						<Field key={corner} label={t(`inspector.${corner}`)}>
							<input
								className="input-field"
								type="number"
								min={0}
								max={Math.min(element.w, element.h) / 2}
								value={rectElement.radius?.[corner] || 0}
								onChange={(e) =>
									onUpdate(element.id, {
										radius: {
											topLeft: 0,
											topRight: 0,
											bottomLeft: 0,
											bottomRight: 0,
											...rectElement.radius,
											[corner]: +e.target.value,
										} as RectangleElement["radius"],
									})
								}
							/>
						</Field>
					),
				)}
			</div>
		</div>
	);
}
