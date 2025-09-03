import { Frame } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Field } from "./Field";
import type { InspectorSectionProps } from "./types";

type Preset = {
	label: string;
	w: number;
	h: number;
	translationKey: string;
};

const PHONE_PRESETS: Preset[] = [
	{
		label: "iPhone 15 Pro (393×852)",
		w: 393,
		h: 852,
		translationKey: "presetLabels.phone.iphone15Pro",
	},
	{
		label: "iPhone 15 Pro Max (430×932)",
		w: 430,
		h: 932,
		translationKey: "presetLabels.phone.iphone15ProMax",
	},
	{
		label: "iPhone 14 (390×844)",
		w: 390,
		h: 844,
		translationKey: "presetLabels.phone.iphone14",
	},
	{
		label: "iPhone SE (375×667)",
		w: 375,
		h: 667,
		translationKey: "presetLabels.phone.iphoneSE",
	},
	{
		label: "Pixel 7 (412×915)",
		w: 412,
		h: 915,
		translationKey: "presetLabels.phone.pixel7",
	},
];

const TABLET_PRESETS: Preset[] = [
	{
		label: 'iPad Pro 11" (834×1194)',
		w: 834,
		h: 1194,
		translationKey: "presetLabels.tablet.ipadPro11",
	},
	{
		label: "iPad Mini (744×1133)",
		w: 744,
		h: 1133,
		translationKey: "presetLabels.tablet.ipadMini",
	},
];

const DESKTOP_PRESETS: Preset[] = [
	{
		label: "Desktop (1440×1024)",
		w: 1440,
		h: 1024,
		translationKey: "presetLabels.desktop.desktop",
	},
	{
		label: 'MacBook Pro 14" (1512×982)',
		w: 1512,
		h: 982,
		translationKey: "presetLabels.desktop.macbookPro14",
	},
	{
		label: 'MacBook Pro 16" (1728×1117)',
		w: 1728,
		h: 1117,
		translationKey: "presetLabels.desktop.macbookPro16",
	},
	{
		label: "Full HD (1920×1080)",
		w: 1920,
		h: 1080,
		translationKey: "presetLabels.desktop.fullHD",
	},
];

export function FramePresetsSection({
	element,
	onUpdate,
}: InspectorSectionProps) {
	const { t } = useTranslation();
	const [selection, setSelection] = useState("");

	if (element.type !== "frame") return null;
	const applyPreset = (preset: Preset) => {
		onUpdate(element.id, {
			w: preset.w,
			h: preset.h,
			name:
				element.name ||
				(preset.translationKey
					? t(`inspector.${preset.translationKey}`, preset.label)
					: preset.label),
		});
		setSelection("");
	};

	return (
		<div className="section">
			<div className="section-header">
				<Frame size={16} />
				<span>{t("inspector.framePresets", "Frame Presets")}</span>
			</div>

			<div className="input-group">
				<Field label={t("inspector.presets", "Presets")} fullWidth>
					<select
						className="input-field"
						value={selection}
						onChange={(e) => {
							const val = e.target.value;
							setSelection(val);
							if (!val) return;
							const [wStr, hStr] = val.split("x");
							const w = Number(wStr);
							const h = Number(hStr);
							// Find the preset for name consistency (optional)
							const preset = [
								...PHONE_PRESETS,
								...TABLET_PRESETS,
								...DESKTOP_PRESETS,
							].find((p) => p.w === w && p.h === h);
							applyPreset(
								preset || { label: `${w}×${h}`, w, h, translationKey: "" },
							);
						}}
					>
						<option value="">
							{t("inspector.selectPreset", "Select a preset…")}
						</option>
						<optgroup label={t("inspector.phone", "Phone")}>
							{PHONE_PRESETS.map((p) => (
								<option key={p.label} value={`${p.w}x${p.h}`}>
									{t(`inspector.${p.translationKey}`, p.label)}
								</option>
							))}
						</optgroup>
						<optgroup label={t("inspector.tablet", "Tablet")}>
							{TABLET_PRESETS.map((p) => (
								<option key={p.label} value={`${p.w}x${p.h}`}>
									{t(`inspector.${p.translationKey}`, p.label)}
								</option>
							))}
						</optgroup>
						<optgroup label={t("inspector.desktop", "Desktop")}>
							{DESKTOP_PRESETS.map((p) => (
								<option key={p.label} value={`${p.w}x${p.h}`}>
									{t(`inspector.${p.translationKey}`, p.label)}
								</option>
							))}
						</optgroup>
					</select>
				</Field>
			</div>
		</div>
	);
}
