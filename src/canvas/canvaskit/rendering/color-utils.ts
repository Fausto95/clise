/**
 * Color utility functions for CanvasKit rendering
 */

/**
 * Converts hex color string to RGBA values for CanvasKit
 * @param hex - Hex color string (with or without #)
 * @param opacity - Opacity value between 0 and 1
 * @returns RGBA values as tuple [r, g, b, a]
 */
export function hexToRgba(
	hex: string,
	opacity: number = 1,
): [number, number, number, number] {
	// Handle null/undefined hex values
	if (!hex) {
		return [0, 0, 0, 0]; // Transparent
	}

	// Named transparent support
	if (hex === "transparent" || hex === "none") {
		return [0, 0, 0, 0];
	}

	// Remove # if present
	hex = hex.replace("#", "");

	// Handle 3-digit hex
	if (hex.length === 3) {
		hex = hex
			.split("")
			.map((char) => char + char)
			.join("");
	}

	const r = parseInt(hex.substr(0, 2), 16);
	const g = parseInt(hex.substr(2, 2), 16);
	const b = parseInt(hex.substr(4, 2), 16);

	return [r, g, b, opacity];
}
