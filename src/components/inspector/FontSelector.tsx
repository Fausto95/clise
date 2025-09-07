import React, { useMemo } from "react";
import { useFontManager } from "../../store/font-hooks";
import type { FontConfig } from "../../utils/font-manager";

interface FontSelectorProps {
	value: string;
	onChange: (fontFamily: string) => void;
	className?: string;
	disabled?: boolean;
	elementId?: string; // Optional element ID for font loading
}

export function FontSelector({
	value,
	onChange,
	className = "",
	disabled = false,
	elementId,
}: FontSelectorProps) {
	const { allFonts, loadFont } = useFontManager();

	// Get current font config
	const currentFont = useMemo(() => {
		return (
			allFonts.find((font) => font.family === value) ||
			({
				name: value.split(",")[0] || "Inter",
				family: value || "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
				source: "google" as const,
			} as FontConfig)
		);
	}, [allFonts, value]);

	const handleFontChange = async (
		event: React.ChangeEvent<HTMLSelectElement>,
	) => {
		const fontFamily = event.target.value;

		// Call the onChange callback immediately for UI responsiveness
		onChange(fontFamily);

		// Load the font if elementId is provided
		if (elementId) {
			try {
				const fontConfig = allFonts.find((font) => font.family === fontFamily);
				if (fontConfig) {
					await loadFont({ fontConfig, elementId });
				}
			} catch (error) {
				console.warn(`Failed to load font ${fontFamily}:`, error);
				// Don't revert the UI change - let the parent component handle errors
			}
		}
	};

	return (
		<select
			value={value}
			onChange={handleFontChange}
			className={`input-field ${className}`}
			disabled={disabled}
			style={{
				fontFamily: currentFont.family,
				cursor: disabled ? "not-allowed" : "pointer",
				opacity: disabled ? 0.6 : 1,
			}}
		>
			{allFonts.map((font, index) => (
				<option
					key={`${font.name}-${index}`}
					value={font.family}
					style={{ fontFamily: font.family }}
				>
					{font.name}
				</option>
			))}
		</select>
	);
}
