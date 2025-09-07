import type { FontConfig } from "./font-manager";

// Static font configurations based on available local fonts
const LOCAL_FONT_CONFIGS: FontConfig[] = [
	{
		name: "Roboto",
		family: "Roboto, -apple-system, BlinkMacSystemFont, sans-serif",
		isWebFont: true,
		isLocalFont: true,
		source: "local",
		variants: ["400"],
		localPath: "/src/assets/fonts/roboto-1.woff2",
	},
	{
		name: "Open Sans",
		family: "Open Sans, -apple-system, BlinkMacSystemFont, sans-serif",
		isWebFont: true,
		isLocalFont: true,
		source: "local",
		variants: ["400"],
		localPath: "/src/assets/fonts/open-sans-1.woff2",
	},
	{
		name: "Montserrat",
		family: "Montserrat, -apple-system, BlinkMacSystemFont, sans-serif",
		isWebFont: true,
		isLocalFont: true,
		source: "local",
		variants: ["400"],
		localPath: "/src/assets/fonts/montserrat-1.woff2",
	},
	{
		name: "Poppins",
		family: "Poppins, -apple-system, BlinkMacSystemFont, sans-serif",
		isWebFont: true,
		isLocalFont: true,
		source: "local",
		variants: ["400"],
		localPath: "/src/assets/fonts/poppins-1.woff2",
	},
	{
		name: "Lato",
		family: "Lato, -apple-system, BlinkMacSystemFont, sans-serif",
		isWebFont: true,
		isLocalFont: true,
		source: "local",
		variants: ["400"],
		localPath: "/src/assets/fonts/lato-1.woff2",
	},
	{
		name: "Source Code Pro",
		family: "Source Code Pro, -apple-system, BlinkMacSystemFont, monospace",
		isWebFont: true,
		isLocalFont: true,
		source: "local",
		variants: ["400"],
		localPath: "/src/assets/fonts/source-code-pro-1.woff2",
	},
];

/**
 * Generate local font configurations
 */
export function generateLocalFontConfigs(): FontConfig[] {
	return LOCAL_FONT_CONFIGS;
}

/**
 * Get the local font file path for a specific font family
 */
export function getLocalFontPath(familyName: string): string | null {
	const fontConfig = LOCAL_FONT_CONFIGS.find(
		(font) => font.name === familyName,
	);
	return fontConfig?.localPath || null;
}

/**
 * Get all available font families from local fonts
 */
export function getLocalFontFamilies(): string[] {
	return LOCAL_FONT_CONFIGS.map((font) => font.name);
}

/**
 * Check if a font family is available locally
 */
export function isLocalFontAvailable(familyName: string): boolean {
	return LOCAL_FONT_CONFIGS.some((font) => font.name === familyName);
}
