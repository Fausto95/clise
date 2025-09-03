import { useRef } from "react";
import { Image as ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { InspectorSectionProps } from "./types";
import type { ImageFill } from "../../store/elements/element-types";
import { Accordion } from "./Accordion";
import { validateImageFile, fileToBase64 } from "../../utils/image-utils";
import { Field } from "./Field";

export function ImageFillSection({ element, onUpdate }: InspectorSectionProps) {
	const { t } = useTranslation();

	// Only show for drawable shapes (exclude pure image elements)
	if (element.type === "image") return null;

	const current: ImageFill | undefined = (element as any).imageFill;
	const isSet = !!current?.enabled;

	const setDefault = () => {
		const def: ImageFill = {
			enabled: true,
			src: "",
			fit: "fill",
			align: "center",
			repeatX: "none",
			repeatY: "none",
			brightness: 1,
			contrast: 1,
			saturation: 1,
			rotationDeg: 0,
			offsetX: 0,
			offsetY: 0,
			scaleX: 1,
			scaleY: 1,
			blur: 0,
		};
		onUpdate(element.id, { imageFill: def } as any);
	};

	const resetAll = () => {
		const def: ImageFill = {
			enabled: true,
			src: "",
			fit: "fill",
			align: "center",
			repeatX: "none",
			repeatY: "none",
			brightness: 1,
			contrast: 1,
			saturation: 1,
			rotationDeg: 0,
			offsetX: 0,
			offsetY: 0,
			scaleX: 1,
			scaleY: 1,
			blur: 0,
		};
		onUpdate(element.id, { imageFill: def } as any);
	};

	const unset = () => {
		onUpdate(element.id, {
			imageFill: { ...(current || {}), enabled: false },
		} as any);
	};

	const update = (patch: Partial<ImageFill>) => {
		const next = { ...(current || {}), enabled: true, ...patch } as ImageFill;
		onUpdate(element.id, { imageFill: next } as any);
	};

	const fileInputRef = useRef<HTMLInputElement | null>(null);

	return (
		<Accordion
			title={t("inspector.imageFill", "Image Fill")}
			icon={<ImageIcon size={16} />}
			variant="set"
			isSet={isSet}
			onSet={setDefault}
			onUnset={unset}
			defaultOpen={false}
		>
			<Field label={t("inspector.source", "Source")}>
				<div
					style={{ display: "grid", gridTemplateColumns: "auto auto", gap: 8 }}
				>
					<input
						type="file"
						accept="image/png,image/jpeg,image/svg+xml"
						ref={fileInputRef}
						style={{ display: "none" }}
						onChange={async (e) => {
							const file = e.target.files?.[0];
							if (!file) return;
							const val = validateImageFile(file);
							if (!val.valid) {
								console.warn(val.error);
								return;
							}
							const dataUrl = await fileToBase64(file);
							update({ src: dataUrl });
							e.currentTarget.value = "";
						}}
					/>
					<button
						type="button"
						className="align-button"
						onClick={() => fileInputRef.current?.click()}
					>
						{t("inspector.upload", "Upload")}
					</button>
					<button type="button" className="align-button" onClick={resetAll}>
						{t("inspector.clear", "Clear")}
					</button>
				</div>
				<div
					style={{
						fontSize: 11,
						color: "var(--muted-foreground)",
						marginTop: 6,
					}}
				>
					{current?.src
						? t("inspector.localImageSelected", "Local image selected")
						: t("inspector.noImage", "No image")}
					{" • "}
					{t("inspector.localOnly", "Local files only")}
				</div>
			</Field>

			<Field label={t("inspector.fit", "Fit")}>
				<select
					className="input-field"
					value={current?.fit || "fill"}
					onChange={(e) => update({ fit: e.target.value as ImageFill["fit"] })}
				>
					<option value="fill">{t("inspector.fitFill", "Fill")}</option>
					<option value="contain">
						{t("inspector.fitContain", "Contain")}
					</option>
					<option value="cover">{t("inspector.fitCover", "Cover")}</option>
					<option value="stretch">
						{t("inspector.fitStretch", "Stretch")}
					</option>
					<option value="tile">{t("inspector.fitTile", "Tile")}</option>
				</select>
			</Field>

			<Field label={t("inspector.rotation", "Rotation")}>
				<input
					className="input-field"
					type="number"
					step={1}
					value={current?.rotationDeg ?? 0}
					onChange={(e) => update({ rotationDeg: Number(e.target.value) || 0 })}
				/>
			</Field>

			<Field label={t("inspector.repeatX", "Repeat X")}>
				<select
					className="input-field"
					value={current?.repeatX || "none"}
					onChange={(e) => update({ repeatX: e.target.value as any })}
				>
					<option value="none">{t("inspector.none", "None")}</option>
					<option value="repeat">{t("inspector.repeat", "Repeat")}</option>
					<option value="mirror">{t("inspector.mirror", "Mirror")}</option>
				</select>
			</Field>
			<Field label={t("inspector.repeatY", "Repeat Y")}>
				<select
					className="input-field"
					value={current?.repeatY || "none"}
					onChange={(e) => update({ repeatY: e.target.value as any })}
				>
					<option value="none">{t("inspector.none", "None")}</option>
					<option value="repeat">{t("inspector.repeat", "Repeat")}</option>
					<option value="mirror">{t("inspector.mirror", "Mirror")}</option>
				</select>
			</Field>

			<Field label={t("inspector.offsetX", "Offset X")}>
				<input
					className="input-field"
					type="number"
					step={1}
					value={current?.offsetX ?? 0}
					onChange={(e) => update({ offsetX: Number(e.target.value) || 0 })}
				/>
			</Field>
			<Field label={t("inspector.offsetY", "Offset Y")}>
				<input
					className="input-field"
					type="number"
					step={1}
					value={current?.offsetY ?? 0}
					onChange={(e) => update({ offsetY: Number(e.target.value) || 0 })}
				/>
			</Field>

			<Field label={t("inspector.scaleX", "Scale X")}>
				<input
					className="input-field"
					type="number"
					step={0.1}
					value={current?.scaleX ?? 1}
					onChange={(e) => update({ scaleX: Number(e.target.value) || 1 })}
				/>
			</Field>
			<Field label={t("inspector.scaleY", "Scale Y")}>
				<input
					className="input-field"
					type="number"
					step={0.1}
					value={current?.scaleY ?? 1}
					onChange={(e) => update({ scaleY: Number(e.target.value) || 1 })}
				/>
			</Field>

			<Field label={t("inspector.blur", "Blur")}>
				<input
					className="input-field"
					type="number"
					min={0}
					step={0.5}
					value={current?.blur ?? 0}
					onChange={(e) =>
						update({ blur: Math.max(0, Number(e.target.value) || 0) })
					}
				/>
			</Field>

			<Field label={t("inspector.brightness", "Brightness")}>
				<input
					className="input-field"
					type="number"
					min={0}
					max={2}
					step={0.05}
					value={current?.brightness ?? 1}
					onChange={(e) =>
						update({ brightness: Math.max(0, Number(e.target.value) || 1) })
					}
				/>
			</Field>
			<Field label={t("inspector.contrast", "Contrast")}>
				<input
					className="input-field"
					type="number"
					min={0}
					max={2}
					step={0.05}
					value={current?.contrast ?? 1}
					onChange={(e) =>
						update({ contrast: Math.max(0, Number(e.target.value) || 1) })
					}
				/>
			</Field>
			<Field label={t("inspector.saturation", "Saturation")}>
				<input
					className="input-field"
					type="number"
					min={0}
					max={2}
					step={0.05}
					value={current?.saturation ?? 1}
					onChange={(e) =>
						update({ saturation: Math.max(0, Number(e.target.value) || 1) })
					}
				/>
			</Field>

			<Field label={t("inspector.blendMode", "Blend Mode")}>
				<select
					className="input-field"
					value={current?.blendMode || "normal"}
					onChange={(e) => update({ blendMode: e.target.value as any })}
				>
					<option value="normal">{t("inspector.blendNormal", "Normal")}</option>
					<option value="multiply">
						{t("inspector.blendMultiply", "Multiply")}
					</option>
					<option value="screen">{t("inspector.blendScreen", "Screen")}</option>
					<option value="overlay">
						{t("inspector.blendOverlay", "Overlay")}
					</option>
					<option value="darken">{t("inspector.blendDarken", "Darken")}</option>
					<option value="lighten">
						{t("inspector.blendLighten", "Lighten")}
					</option>
				</select>
			</Field>
		</Accordion>
	);
}
