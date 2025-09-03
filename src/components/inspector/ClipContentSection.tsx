import { Crop } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Field } from "./Field";
import type { InspectorSectionProps } from "./types";

export function ClipContentSection({
	element,
	onUpdate,
}: InspectorSectionProps) {
	const { t } = useTranslation();

	if (element.type !== "frame") {
		return null;
	}

	const checked = (element as any).clipContent !== false; // default true

	return (
		<div className="section">
			<div className="section-header">
				<Crop size={16} />
				<span>{t("inspector.frameOptions") || "Frame Options"}</span>
			</div>
			<div className="input-group" style={{ gridTemplateColumns: "1fr" }}>
				<Field label={t("inspector.clipContent") || "Clip content"}>
					<label
						className="toggle-switch"
						aria-label={t("inspector.clipContent") || "Clip content"}
					>
						<input
							type="checkbox"
							checked={checked}
							onChange={(e) =>
								onUpdate(element.id, { clipContent: e.target.checked })
							}
						/>
						<span className="slider" />
					</label>
				</Field>
			</div>
		</div>
	);
}
