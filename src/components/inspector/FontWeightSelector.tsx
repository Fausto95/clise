import React from "react";
import { getAvailableWeights } from "../../utils/local-font-config";

type FontWeight =
	| "100"
	| "200"
	| "300"
	| "400"
	| "500"
	| "600"
	| "700"
	| "800"
	| "900"
	| "normal"
	| "bold";

interface FontWeightSelectorProps {
	value: string;
	onChange: (fontWeight: FontWeight) => void;
	className?: string;
	disabled?: boolean;
	fontFamily?: string; // Add fontFamily prop to get available weights
}

// Weight labels mapping
const WEIGHT_LABELS: Record<string, string> = {
	"100": "Thin (100)",
	"200": "Extra Light (200)",
	"300": "Light (300)",
	"400": "Normal (400)",
	"500": "Medium (500)",
	"600": "Semi Bold (600)",
	"700": "Bold (700)",
	"800": "Extra Bold (800)",
	"900": "Black (900)",
	normal: "Normal",
	bold: "Bold",
};

export function FontWeightSelector({
	value,
	onChange,
	className = "",
	disabled = false,
	fontFamily,
}: FontWeightSelectorProps) {
	// Get available weights for the current font family
	const availableWeights = fontFamily
		? getAvailableWeights(fontFamily)
		: ["400", "700"];

	// Fallback: if no weights found, use default weights
	const finalWeights =
		availableWeights.length > 0 ? availableWeights : ["400", "700"];

	// Create weight options based on available weights
	const weightOptions = finalWeights.map((weight) => ({
		value: weight,
		label: WEIGHT_LABELS[weight] || weight,
	}));

	const handleFontWeightChange = (
		event: React.ChangeEvent<HTMLSelectElement>,
	) => {
		const fontWeight = event.target.value as FontWeight;
		onChange(fontWeight);
	};

	return (
		<select
			value={value || "400"}
			onChange={handleFontWeightChange}
			className={`input-field ${className}`}
			disabled={disabled}
			style={{
				cursor: disabled ? "not-allowed" : "pointer",
				opacity: disabled ? 0.6 : 1,
			}}
		>
			{weightOptions.map((weight) => (
				<option key={weight.value} value={weight.value}>
					{weight.label}
				</option>
			))}
		</select>
	);
}
