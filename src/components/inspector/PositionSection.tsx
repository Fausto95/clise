import { Move } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Field } from "./Field";
import type { InspectorSectionProps } from "./types";

export function PositionSection({ element, onUpdate }: InspectorSectionProps) {
	const { t } = useTranslation();

	return (
		<div className="section">
			<div className="section-header">
				<Move size={16} />
				<span>{t("inspector.position")}</span>
			</div>
			<div className="input-group">
				<Field label="X">
					<input
						className="input-field"
						type="number"
						value={Math.round(element.x)}
						onChange={(e) => onUpdate(element.id, { x: +e.target.value })}
					/>
				</Field>
				<Field label="Y">
					<input
						className="input-field"
						type="number"
						value={Math.round(element.y)}
						onChange={(e) => onUpdate(element.id, { y: +e.target.value })}
					/>
				</Field>
			</div>
		</div>
	);
}
