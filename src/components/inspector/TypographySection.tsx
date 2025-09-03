import {
	Type,
	CaseLower,
	CaseUpper,
	CaseSensitive,
	Strikethrough,
	Underline,
	AlertCircle,
	Loader2,
	RotateCcw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Field } from "./Field";
import { FontSelector } from "./FontSelector";
import { useFontApplication } from "../../hooks/use-font-application";
import { useFontManager } from "../../store/font-hooks";
import type { InspectorSectionProps } from "./types";
import type { TextElement } from "../../store/element-atoms";

export function TypographySection({
	element,
	onUpdate,
}: InspectorSectionProps) {
	const { t } = useTranslation();
	const { applyFontToElement } = useFontApplication();
	const { getFontLoadingState } = useFontManager();
	const [fontLoadingError, setFontLoadingError] = useState<string | null>(null);
	const [retryCount, setRetryCount] = useState(0);

	// Only show for text elements
	if (element.type !== "text") {
		return null;
	}

	const textElement = element as TextElement;
	const currentFontLoadingState = getFontLoadingState(textElement.fontFamily);

	// Handle font family change with caching
	const handleFontFamilyChange = async (fontFamily: string) => {
		try {
			setFontLoadingError(null);
			setRetryCount(0);

			// Update the element immediately for UI responsiveness
			onUpdate(element.id, { fontFamily });

			// Apply font with caching in the background
			await applyFontToElement(element.id, fontFamily, textElement);
		} catch (error) {
			console.error("Failed to apply font:", error);
			setFontLoadingError(
				error instanceof Error ? error.message : "Failed to load font",
			);

			// Revert to previous font family on error
			onUpdate(element.id, { fontFamily: textElement.fontFamily });
		}
	};

	// Retry font loading
	const handleRetryFont = async () => {
		try {
			setFontLoadingError(null);
			setRetryCount((prev) => prev + 1);

			// Apply font with caching in the background
			await applyFontToElement(element.id, textElement.fontFamily, textElement);
		} catch (error) {
			console.error("Failed to retry font loading:", error);
			setFontLoadingError(
				error instanceof Error ? error.message : "Failed to load font",
			);
		}
	};

	return (
		<div className="section">
			<div className="section-header">
				<Type size={16} />
				<span>{t("inspector.typography")}</span>
			</div>

			{/* Font Size and Family */}
			<div className="typography-group">
				<div className="input-group">
					<Field label={t("inspector.fontSize")}>
						<input
							className="input-field"
							type="number"
							min={8}
							max={120}
							value={textElement.fontSize}
							onChange={(e) =>
								onUpdate(element.id, { fontSize: +e.target.value })
							}
						/>
					</Field>
					<Field label={t("inspector.fontFamily")}>
						<div style={{ position: "relative" }}>
							<FontSelector
								value={textElement.fontFamily}
								onChange={handleFontFamilyChange}
								className="input-field"
								disabled={currentFontLoadingState === "loading"}
							/>
							{currentFontLoadingState === "loading" && (
								<div
									style={{
										position: "absolute",
										right: "8px",
										top: "50%",
										transform: "translateY(-50%)",
										display: "flex",
										alignItems: "center",
									}}
								>
									<Loader2 size={16} className="animate-spin" />
								</div>
							)}
							{fontLoadingError && (
								<div
									style={{
										position: "absolute",
										right: "8px",
										top: "50%",
										transform: "translateY(-50%)",
										display: "flex",
										alignItems: "center",
										gap: "4px",
										color: "#ef4444",
									}}
								>
									<AlertCircle size={16} />
									{retryCount < 3 && (
										<button
											onClick={handleRetryFont}
											style={{
												background: "none",
												border: "none",
												cursor: "pointer",
												color: "#ef4444",
												padding: "2px",
												display: "flex",
												alignItems: "center",
											}}
											title="Retry font loading"
										>
											<RotateCcw size={14} />
										</button>
									)}
								</div>
							)}
						</div>
					</Field>
				</div>
			</div>

			{/* Text Decoration and Weight */}
			<div className="typography-group">
				<Field label={t("inspector.textDecoration")}>
					<div className="align-buttons">
						<button
							type="button"
							className={`align-button ${
								textElement.textDecoration === "underline" ? "active" : ""
							}`}
							onClick={() =>
								onUpdate(element.id, {
									textDecoration:
										textElement.textDecoration === "underline"
											? "none"
											: "underline",
								})
							}
						>
							<Underline size={24} />
						</button>
						<button
							type="button"
							className={`align-button ${
								textElement.textDecoration === "line-through" ? "active" : ""
							}`}
							onClick={() =>
								onUpdate(element.id, {
									textDecoration:
										textElement.textDecoration === "line-through"
											? "none"
											: "line-through",
								})
							}
						>
							<Strikethrough size={24} />
						</button>
					</div>
				</Field>

				<div className="typography-button-group">
					<Field label={t("inspector.fontWeight")}>
						<div className="align-buttons">
							<button
								type="button"
								className={`align-button ${
									textElement.fontWeight === "normal" || !textElement.fontWeight
										? "active"
										: ""
								}`}
								onClick={() => onUpdate(element.id, { fontWeight: "normal" })}
							>
								Normal
							</button>
							<button
								type="button"
								className={`align-button ${
									textElement.fontWeight === "bold" ? "active" : ""
								}`}
								onClick={() => onUpdate(element.id, { fontWeight: "bold" })}
							>
								Bold
							</button>
						</div>
					</Field>
				</div>
			</div>

			{/* Text Transform */}
			<div className="typography-group">
				<Field label={t("inspector.textTransform")}>
					<div className="align-buttons">
						<button
							type="button"
							className={`align-button ${
								textElement.textTransform === "uppercase" ? "active" : ""
							}`}
							onClick={() =>
								onUpdate(element.id, {
									textTransform:
										textElement.textTransform === "uppercase"
											? "none"
											: "uppercase",
								})
							}
						>
							<CaseUpper size={24} />
						</button>
						<button
							type="button"
							className={`align-button ${
								textElement.textTransform === "lowercase" ? "active" : ""
							}`}
							onClick={() =>
								onUpdate(element.id, {
									textTransform:
										textElement.textTransform === "lowercase"
											? "none"
											: "lowercase",
								})
							}
						>
							<CaseLower size={24} />
						</button>
						<button
							type="button"
							className={`align-button ${
								textElement.textTransform === "capitalize" ? "active" : ""
							}`}
							onClick={() =>
								onUpdate(element.id, {
									textTransform:
										textElement.textTransform === "capitalize"
											? "none"
											: "capitalize",
								})
							}
						>
							<CaseSensitive size={24} />
						</button>
					</div>
				</Field>
			</div>

			{/* Line Height and Letter Spacing */}
			<div className="typography-group">
				<div className="input-group">
					<Field label={t("inspector.lineHeight")}>
						<input
							className="input-field"
							type="number"
							min={0.5}
							max={5}
							step={0.1}
							value={textElement.lineHeight || 1.2}
							onChange={(e) =>
								onUpdate(element.id, { lineHeight: +e.target.value })
							}
						/>
					</Field>
					<Field label={t("inspector.letterSpacing")}>
						<input
							className="input-field"
							type="number"
							min={-10}
							max={50}
							step={0.5}
							value={textElement.letterSpacing || 0}
							onChange={(e) =>
								onUpdate(element.id, { letterSpacing: +e.target.value })
							}
						/>
					</Field>
				</div>
			</div>
		</div>
	);
}
