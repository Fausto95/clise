import { Lock, Maximize2, Unlock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Field } from "./Field";
import type { InspectorSectionProps } from "./types";

export function SizeSection({ element, onUpdate }: InspectorSectionProps) {
	const { t } = useTranslation();

	// Don't show size controls for text elements
	if (element.type === "text") {
		return null;
	}

	const legacyLocked = element.lockedDimensions === true;
	const isPath = element.type === "path";
	// For paths, width/height are read-only/locked in inspector
	const widthLocked = isPath || element.lockedWidth === true || legacyLocked;
	const heightLocked = isPath || element.lockedHeight === true || legacyLocked;

	return (
		<div className="section">
			<div className="section-header">
				<Maximize2 size={16} />
				<span>{t("inspector.size")}</span>
			</div>
			<div className="input-group size-inputs">
				<Field label="W">
					<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
						<input
							className="input-field"
							type="number"
							value={Math.round(element.w)}
							disabled={widthLocked}
							onChange={(e) => onUpdate(element.id, { w: +e.target.value })}
						/>
						<button
							type="button"
							onClick={() => {
								if (isPath) return; // keep locked for paths
								if (legacyLocked) {
									// Convert legacy both-locked to per-axis, keep other axis locked
									onUpdate(element.id, {
										lockedDimensions: false,
										lockedHeight: true,
										lockedWidth: false,
									});
								} else {
									onUpdate(element.id, {
										lockedWidth: !widthLocked,
									});
								}
							}}
							title={
								widthLocked
									? t("inspector.unlockDimensions") || "Unlock dimensions"
									: t("inspector.lockDimensions") || "Lock dimensions"
							}
							style={{
								display: "inline-flex",
								alignItems: "center",
								background: "transparent",
								border: "1px solid var(--border-light)",
								borderRadius: 6,
								cursor: isPath ? "not-allowed" : "pointer",
								color: "inherit",
								padding: "6px",
								height: 32,
								width: 32,
								justifyContent: "center",
							}}
							disabled={isPath}
						>
							{widthLocked ? <Lock size={16} /> : <Unlock size={16} />}
						</button>
					</div>
				</Field>
				<Field label="H">
					<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
						<input
							className="input-field"
							type="number"
							value={Math.round(element.h)}
							disabled={heightLocked}
							onChange={(e) => onUpdate(element.id, { h: +e.target.value })}
						/>
						<button
							type="button"
							onClick={() => {
								if (isPath) return; // keep locked for paths
								if (legacyLocked) {
									// Convert legacy both-locked to per-axis, keep other axis locked
									onUpdate(element.id, {
										lockedDimensions: false,
										lockedWidth: true,
										lockedHeight: false,
									});
								} else {
									onUpdate(element.id, {
										lockedHeight: !heightLocked,
									});
								}
							}}
							title={
								heightLocked
									? t("inspector.unlockDimensions") || "Unlock dimensions"
									: t("inspector.lockDimensions") || "Lock dimensions"
							}
							style={{
								display: "inline-flex",
								alignItems: "center",
								background: "transparent",
								border: "1px solid var(--border-light)",
								borderRadius: 6,
								cursor: isPath ? "not-allowed" : "pointer",
								color: "inherit",
								padding: "6px",
								height: 32,
								width: 32,
								justifyContent: "center",
							}}
							disabled={isPath}
						>
							{heightLocked ? <Lock size={16} /> : <Unlock size={16} />}
						</button>
					</div>
				</Field>
			</div>
		</div>
	);
}
