import {
	AlignHorizontalJustifyStart,
	AlignHorizontalJustifyEnd,
	AlignHorizontalJustifyCenter,
	AlignVerticalJustifyStart,
	AlignVerticalJustifyEnd,
	AlignVerticalJustifyCenter,
	Rows,
	Columns,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Field } from "./Field";
import type { InspectorSectionProps } from "./types";
import type { FrameElement } from "../../store/element-atoms";

export function LayoutSection({ element, onUpdate }: InspectorSectionProps) {
	const { t } = useTranslation();
	const frameElement = element as FrameElement;

	if (element.type !== "frame") {
		return null;
	}

	return (
		<div className="section">
			<div className="section-header">
				<AlignHorizontalJustifyCenter size={16} />
				<span>{t("inspector.layout")}</span>
			</div>
			<div className="input-group">
				<Field label={t("inspector.horizontalAlign")}>
					<div className="align-buttons">
						<button
							type="button"
							className={`align-button ${
								frameElement.layoutConstraints?.horizontalAlign === "left"
									? "active"
									: ""
							}`}
							onClick={() => {
								const currentAlign =
									frameElement.layoutConstraints?.horizontalAlign;
								const newAlign = currentAlign === "left" ? "none" : "left";
								onUpdate(element.id, {
									layoutConstraints: {
										horizontalAlign: newAlign,
										verticalAlign:
											frameElement.layoutConstraints?.verticalAlign || "top",
									},
								});
							}}
						>
							<AlignHorizontalJustifyStart size={14} />
						</button>
						<button
							type="button"
							className={`align-button ${
								frameElement.layoutConstraints?.horizontalAlign === "center"
									? "active"
									: ""
							}`}
							onClick={() => {
								const currentAlign =
									frameElement.layoutConstraints?.horizontalAlign;
								const newAlign = currentAlign === "center" ? "none" : "center";
								onUpdate(element.id, {
									layoutConstraints: {
										horizontalAlign: newAlign,
										verticalAlign:
											frameElement.layoutConstraints?.verticalAlign || "top",
									},
								});
							}}
						>
							<AlignHorizontalJustifyCenter size={14} />
						</button>
						<button
							type="button"
							className={`align-button ${
								frameElement.layoutConstraints?.horizontalAlign === "right"
									? "active"
									: ""
							}`}
							onClick={() => {
								const currentAlign =
									frameElement.layoutConstraints?.horizontalAlign;
								const newAlign = currentAlign === "right" ? "none" : "right";
								onUpdate(element.id, {
									layoutConstraints: {
										horizontalAlign: newAlign,
										verticalAlign:
											frameElement.layoutConstraints?.verticalAlign || "top",
									},
								});
							}}
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
								frameElement.layoutConstraints?.verticalAlign === "top"
									? "active"
									: ""
							}`}
							onClick={() => {
								const currentAlign =
									frameElement.layoutConstraints?.verticalAlign;
								const newAlign = currentAlign === "top" ? "none" : "top";
								onUpdate(element.id, {
									layoutConstraints: {
										horizontalAlign:
											frameElement.layoutConstraints?.horizontalAlign || "left",
										verticalAlign: newAlign,
									},
								});
							}}
						>
							<AlignVerticalJustifyStart size={14} />
						</button>
						<button
							type="button"
							className={`align-button ${
								frameElement.layoutConstraints?.verticalAlign === "center"
									? "active"
									: ""
							}`}
							onClick={() => {
								const currentAlign =
									frameElement.layoutConstraints?.verticalAlign;
								const newAlign = currentAlign === "center" ? "none" : "center";
								onUpdate(element.id, {
									layoutConstraints: {
										horizontalAlign:
											frameElement.layoutConstraints?.horizontalAlign || "left",
										verticalAlign: newAlign,
									},
								});
							}}
						>
							<AlignVerticalJustifyCenter size={14} />
						</button>
						<button
							type="button"
							className={`align-button ${
								frameElement.layoutConstraints?.verticalAlign === "bottom"
									? "active"
									: ""
							}`}
							onClick={() => {
								const currentAlign =
									frameElement.layoutConstraints?.verticalAlign;
								const newAlign = currentAlign === "bottom" ? "none" : "bottom";
								onUpdate(element.id, {
									layoutConstraints: {
										horizontalAlign:
											frameElement.layoutConstraints?.horizontalAlign || "left",
										verticalAlign: newAlign,
									},
								});
							}}
						>
							<AlignVerticalJustifyEnd size={14} />
						</button>
					</div>
				</Field>
				{/* Gap controls (frame-specific) */}
				<Field label={t("inspector.gap")}>
					<input
						className="input-field"
						type="number"
						min={0}
						value={frameElement.layoutConstraints?.gap ?? 0}
						onChange={(e) => {
							const value = Math.max(0, Number(e.target.value));
							onUpdate(element.id, {
								layoutConstraints: {
									horizontalAlign:
										frameElement.layoutConstraints?.horizontalAlign ?? "none",
									verticalAlign:
										frameElement.layoutConstraints?.verticalAlign ?? "none",
									direction: frameElement.layoutConstraints?.direction ?? "row",
									gap: value,
								},
							});
						}}
					/>
				</Field>
				<Field label={t("inspector.direction")}>
					<div className="align-buttons">
						<button
							type="button"
							className={`align-button ${
								(frameElement.layoutConstraints?.direction ?? "row") === "row"
									? "active"
									: ""
							}`}
							onClick={() => {
								onUpdate(element.id, {
									layoutConstraints: {
										horizontalAlign:
											frameElement.layoutConstraints?.horizontalAlign ?? "none",
										verticalAlign:
											frameElement.layoutConstraints?.verticalAlign ?? "none",
										direction: "row",
										gap: frameElement.layoutConstraints?.gap ?? 0,
									},
								});
							}}
							aria-label={t("inspector.row")}
						>
							<Rows size={14} />
						</button>
						<button
							type="button"
							className={`align-button ${
								frameElement.layoutConstraints?.direction === "column"
									? "active"
									: ""
							}`}
							onClick={() => {
								onUpdate(element.id, {
									layoutConstraints: {
										horizontalAlign:
											frameElement.layoutConstraints?.horizontalAlign ?? "none",
										verticalAlign:
											frameElement.layoutConstraints?.verticalAlign ?? "none",
										direction: "column",
										gap: frameElement.layoutConstraints?.gap ?? 0,
									},
								});
							}}
							aria-label={t("inspector.column")}
						>
							<Columns size={14} />
						</button>
					</div>
				</Field>
			</div>
		</div>
	);
}
