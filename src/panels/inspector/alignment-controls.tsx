import React from "react";
import {
	AlignVerticalJustifyStart,
	AlignVerticalJustifyEnd,
	AlignVerticalJustifyCenter,
	AlignHorizontalJustifyStart,
	AlignHorizontalJustifyEnd,
	AlignHorizontalJustifyCenter,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Field } from "../../components/inspector";
import type { Element } from "@store/index";

interface AlignmentControlsProps {
	element: Element;
	onUpdate: (id: string, patch: Partial<Element>) => void;
}

export const AlignmentControls: React.FC<AlignmentControlsProps> = ({
	element,
	onUpdate,
}) => {
	const { t } = useTranslation();

	const handleHorizontalAlign = (align: "left" | "center" | "right") => {
		const currentAlign = element.layoutConstraints?.horizontalAlign;
		const newAlign = currentAlign === align ? "none" : align;

		onUpdate(element.id, {
			layoutConstraints: {
				horizontalAlign: newAlign,
				verticalAlign: element.layoutConstraints?.verticalAlign || "none",
			},
		});
	};

	const handleVerticalAlign = (align: "top" | "center" | "bottom") => {
		const currentAlign = element.layoutConstraints?.verticalAlign;
		const newAlign = currentAlign === align ? "none" : align;

		onUpdate(element.id, {
			layoutConstraints: {
				horizontalAlign: element.layoutConstraints?.horizontalAlign || "none",
				verticalAlign: newAlign,
			},
		});
	};

	return (
		<div className="section">
			<div className="section-header">
				<AlignVerticalJustifyCenter size={16} />
				<span>{t("inspector.childLayout")}</span>
			</div>
			<div className="input-group">
				<Field label={t("inspector.horizontalAlign")}>
					<div className="align-buttons">
						<button
							type="button"
							className={`align-button ${
								element.layoutConstraints?.horizontalAlign === "left"
									? "active"
									: ""
							}`}
							onClick={() => handleHorizontalAlign("left")}
						>
							<AlignHorizontalJustifyStart size={14} />
						</button>
						<button
							type="button"
							className={`align-button ${
								element.layoutConstraints?.horizontalAlign === "center"
									? "active"
									: ""
							}`}
							onClick={() => handleHorizontalAlign("center")}
						>
							<AlignHorizontalJustifyCenter size={14} />
						</button>
						<button
							type="button"
							className={`align-button ${
								element.layoutConstraints?.horizontalAlign === "right"
									? "active"
									: ""
							}`}
							onClick={() => handleHorizontalAlign("right")}
						>
							<AlignHorizontalJustifyEnd size={14} />
						</button>
					</div>
				</Field>
				<Field label={t("inspector.verticalAlign")}>
					<div className="align-buttons">
						<button
							type="button"
							className={`align-button ${
								element.layoutConstraints?.verticalAlign === "top"
									? "active"
									: ""
							}`}
							onClick={() => handleVerticalAlign("top")}
						>
							<AlignVerticalJustifyStart size={14} />
						</button>
						<button
							type="button"
							className={`align-button ${
								element.layoutConstraints?.verticalAlign === "center"
									? "active"
									: ""
							}`}
							onClick={() => handleVerticalAlign("center")}
						>
							<AlignVerticalJustifyCenter size={14} />
						</button>
						<button
							type="button"
							className={`align-button ${
								element.layoutConstraints?.verticalAlign === "bottom"
									? "active"
									: ""
							}`}
							onClick={() => handleVerticalAlign("bottom")}
						>
							<AlignVerticalJustifyEnd size={14} />
						</button>
					</div>
				</Field>
			</div>
		</div>
	);
};
