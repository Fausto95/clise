import React, { useMemo } from "react";
import { useFontManager } from "../../store/font-hooks";
import type { FontConfig } from "../../utils/font-manager";

interface FontSelectorProps {
	value: string;
	onChange: (fontFamily: string) => void;
	className?: string;
	disabled?: boolean;
}

export function FontSelector({
	value,
	onChange,
	className = "",
	disabled = false,
}: FontSelectorProps) {
	const { allFonts } = useFontManager();

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

	const handleFontChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		const fontFamily = event.target.value;
		onChange(fontFamily);
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
			{allFonts.map((font) => (
				<option
					key={font.family}
					value={font.family}
					style={{ fontFamily: font.family }}
				>
					{font.name}
				</option>
			))}
		</select>
	);
}
