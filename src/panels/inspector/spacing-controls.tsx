import React from "react";
import { Move } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Field } from "../../components/inspector";
import type { Element } from "@store/index";

interface SpacingControlsProps {
	element: Element;
	onUpdate: (id: string, patch: Partial<Element>) => void;
}

export const SpacingControls: React.FC<SpacingControlsProps> = ({
	element,
	onUpdate,
}) => {
	const { t } = useTranslation();

	const handlePaddingChange = (
		side: "top" | "right" | "bottom" | "left",
		value: number,
	) => {
		onUpdate(element.id, {
			padding: {
				top: side === "top" ? value : element.padding?.top || 0,
				right: side === "right" ? value : element.padding?.right || 0,
				bottom: side === "bottom" ? value : element.padding?.bottom || 0,
				left: side === "left" ? value : element.padding?.left || 0,
			},
		});
	};

	return (
		<div className="section">
			<div className="section-header">
				<Move size={16} />
				<span>{t("inspector.spacing")}</span>
			</div>
			<div className="input-group">
				<Field label={t("inspector.paddingTop")}>
					<input
						className="input-field"
						type="number"
						min={0}
						value={element.padding?.top || 0}
						onChange={(e) => handlePaddingChange("top", +e.target.value)}
					/>
				</Field>
				<Field label={t("inspector.paddingRight")}>
					<input
						className="input-field"
						type="number"
						min={0}
						value={element.padding?.right || 0}
						onChange={(e) => handlePaddingChange("right", +e.target.value)}
					/>
				</Field>
				<Field label={t("inspector.paddingBottom")}>
					<input
						className="input-field"
						type="number"
						min={0}
						value={element.padding?.bottom || 0}
						onChange={(e) => handlePaddingChange("bottom", +e.target.value)}
					/>
				</Field>
				<Field label={t("inspector.paddingLeft")}>
					<input
						className="input-field"
						type="number"
						min={0}
						value={element.padding?.left || 0}
						onChange={(e) => handlePaddingChange("left", +e.target.value)}
					/>
				</Field>
			</div>
		</div>
	);
};
