import type { FontConfig } from "./font-manager";

// Import font files as Vite assets - now with multiple weights
import inter300 from "../assets/fonts/inter-1.woff2";
import inter400 from "../assets/fonts/inter-2.woff2";
import inter500 from "../assets/fonts/inter-3.woff2";
import inter600 from "../assets/fonts/inter-4.woff2";
import inter700 from "../assets/fonts/inter-5.woff2";
import inter800 from "../assets/fonts/inter-6.woff2";

import roboto300 from "../assets/fonts/roboto-1.woff2";
import roboto400 from "../assets/fonts/roboto-2.woff2";
import roboto500 from "../assets/fonts/roboto-3.woff2";
import roboto700 from "../assets/fonts/roboto-4.woff2";
import roboto900 from "../assets/fonts/roboto-5.woff2";

import openSans300 from "../assets/fonts/open-sans-1.woff2";
import openSans400 from "../assets/fonts/open-sans-2.woff2";
import openSans600 from "../assets/fonts/open-sans-3.woff2";
import openSans700 from "../assets/fonts/open-sans-4.woff2";
import openSans800 from "../assets/fonts/open-sans-5.woff2";

import montserrat300 from "../assets/fonts/montserrat-1.woff2";
import montserrat400 from "../assets/fonts/montserrat-2.woff2";
import montserrat500 from "../assets/fonts/montserrat-3.woff2";
import montserrat600 from "../assets/fonts/montserrat-4.woff2";
import montserrat700 from "../assets/fonts/montserrat-5.woff2";
import montserrat800 from "../assets/fonts/montserrat-6.woff2";
import montserrat900 from "../assets/fonts/montserrat-7.woff2";

import poppins300 from "../assets/fonts/poppins-1.woff2";
import poppins400 from "../assets/fonts/poppins-2.woff2";
import poppins500 from "../assets/fonts/poppins-3.woff2";
import poppins600 from "../assets/fonts/poppins-4.woff2";
import poppins700 from "../assets/fonts/poppins-5.woff2";
import poppins800 from "../assets/fonts/poppins-6.woff2";
import poppins900 from "../assets/fonts/poppins-7.woff2";

import lato300 from "../assets/fonts/lato-1.woff2";
import lato400 from "../assets/fonts/lato-2.woff2";
import lato700 from "../assets/fonts/lato-3.woff2";
import lato900 from "../assets/fonts/lato-4.woff2";

import sourceCodePro300 from "../assets/fonts/source-code pro-1.woff2";
import sourceCodePro400 from "../assets/fonts/source-code pro-2.woff2";
import sourceCodePro500 from "../assets/fonts/source-code pro-3.woff2";
import sourceCodePro600 from "../assets/fonts/source-code pro-4.woff2";
import sourceCodePro700 from "../assets/fonts/source-code pro-5.woff2";
import sourceCodePro800 from "../assets/fonts/source-code pro-6.woff2";
import sourceCodePro900 from "../assets/fonts/source-code pro-7.woff2";

// Static font configurations with multiple weight variants
const LOCAL_FONT_CONFIGS: FontConfig[] = [
	{
		name: "Inter",
		family: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
		isWebFont: true,
		isLocalFont: true,
		source: "local",
		variants: ["300", "400", "500", "600", "700", "800"],
		variantsData: new Map([
			[
				"300",
				{
					weight: 300,
					style: "normal",
					fileName: "inter-1.woff2",
					path: inter300,
				},
			],
			[
				"400",
				{
					weight: 400,
					style: "normal",
					fileName: "inter-2.woff2",
					path: inter400,
				},
			],
			[
				"500",
				{
					weight: 500,
					style: "normal",
					fileName: "inter-3.woff2",
					path: inter500,
				},
			],
			[
				"600",
				{
					weight: 600,
					style: "normal",
					fileName: "inter-4.woff2",
					path: inter600,
				},
			],
			[
				"700",
				{
					weight: 700,
					style: "normal",
					fileName: "inter-5.woff2",
					path: inter700,
				},
			],
			[
				"800",
				{
					weight: 800,
					style: "normal",
					fileName: "inter-6.woff2",
					path: inter800,
				},
			],
		]),
		localPath: inter400, // Default to 400 weight
	},
	{
		name: "Roboto",
		family: "Roboto, -apple-system, BlinkMacSystemFont, sans-serif",
		isWebFont: true,
		isLocalFont: true,
		source: "local",
		variants: ["300", "400", "500", "700", "900"],
		variantsData: new Map([
			[
				"300",
				{
					weight: 300,
					style: "normal",
					fileName: "roboto-1.woff2",
					path: roboto300,
				},
			],
			[
				"400",
				{
					weight: 400,
					style: "normal",
					fileName: "roboto-2.woff2",
					path: roboto400,
				},
			],
			[
				"500",
				{
					weight: 500,
					style: "normal",
					fileName: "roboto-3.woff2",
					path: roboto500,
				},
			],
			[
				"700",
				{
					weight: 700,
					style: "normal",
					fileName: "roboto-4.woff2",
					path: roboto700,
				},
			],
			[
				"900",
				{
					weight: 900,
					style: "normal",
					fileName: "roboto-5.woff2",
					path: roboto900,
				},
			],
		]),
		localPath: roboto400, // Default to 400 weight
	},
	{
		name: "Open Sans",
		family: "Open Sans, -apple-system, BlinkMacSystemFont, sans-serif",
		isWebFont: true,
		isLocalFont: true,
		source: "local",
		variants: ["300", "400", "600", "700", "800"],
		variantsData: new Map([
			[
				"300",
				{
					weight: 300,
					style: "normal",
					fileName: "open-sans-1.woff2",
					path: openSans300,
				},
			],
			[
				"400",
				{
					weight: 400,
					style: "normal",
					fileName: "open-sans-2.woff2",
					path: openSans400,
				},
			],
			[
				"600",
				{
					weight: 600,
					style: "normal",
					fileName: "open-sans-3.woff2",
					path: openSans600,
				},
			],
			[
				"700",
				{
					weight: 700,
					style: "normal",
					fileName: "open-sans-4.woff2",
					path: openSans700,
				},
			],
			[
				"800",
				{
					weight: 800,
					style: "normal",
					fileName: "open-sans-5.woff2",
					path: openSans800,
				},
			],
		]),
		localPath: openSans400, // Default to 400 weight
	},
	{
		name: "Montserrat",
		family: "Montserrat, -apple-system, BlinkMacSystemFont, sans-serif",
		isWebFont: true,
		isLocalFont: true,
		source: "local",
		variants: ["300", "400", "500", "600", "700", "800", "900"],
		variantsData: new Map([
			[
				"300",
				{
					weight: 300,
					style: "normal",
					fileName: "montserrat-1.woff2",
					path: montserrat300,
				},
			],
			[
				"400",
				{
					weight: 400,
					style: "normal",
					fileName: "montserrat-2.woff2",
					path: montserrat400,
				},
			],
			[
				"500",
				{
					weight: 500,
					style: "normal",
					fileName: "montserrat-3.woff2",
					path: montserrat500,
				},
			],
			[
				"600",
				{
					weight: 600,
					style: "normal",
					fileName: "montserrat-4.woff2",
					path: montserrat600,
				},
			],
			[
				"700",
				{
					weight: 700,
					style: "normal",
					fileName: "montserrat-5.woff2",
					path: montserrat700,
				},
			],
			[
				"800",
				{
					weight: 800,
					style: "normal",
					fileName: "montserrat-6.woff2",
					path: montserrat800,
				},
			],
			[
				"900",
				{
					weight: 900,
					style: "normal",
					fileName: "montserrat-7.woff2",
					path: montserrat900,
				},
			],
		]),
		localPath: montserrat400, // Default to 400 weight
	},
	{
		name: "Poppins",
		family: "Poppins, -apple-system, BlinkMacSystemFont, sans-serif",
		isWebFont: true,
		isLocalFont: true,
		source: "local",
		variants: ["300", "400", "500", "600", "700", "800", "900"],
		variantsData: new Map([
			[
				"300",
				{
					weight: 300,
					style: "normal",
					fileName: "poppins-1.woff2",
					path: poppins300,
				},
			],
			[
				"400",
				{
					weight: 400,
					style: "normal",
					fileName: "poppins-2.woff2",
					path: poppins400,
				},
			],
			[
				"500",
				{
					weight: 500,
					style: "normal",
					fileName: "poppins-3.woff2",
					path: poppins500,
				},
			],
			[
				"600",
				{
					weight: 600,
					style: "normal",
					fileName: "poppins-4.woff2",
					path: poppins600,
				},
			],
			[
				"700",
				{
					weight: 700,
					style: "normal",
					fileName: "poppins-5.woff2",
					path: poppins700,
				},
			],
			[
				"800",
				{
					weight: 800,
					style: "normal",
					fileName: "poppins-6.woff2",
					path: poppins800,
				},
			],
			[
				"900",
				{
					weight: 900,
					style: "normal",
					fileName: "poppins-7.woff2",
					path: poppins900,
				},
			],
		]),
		localPath: poppins400, // Default to 400 weight
	},
	{
		name: "Lato",
		family: "Lato, -apple-system, BlinkMacSystemFont, sans-serif",
		isWebFont: true,
		isLocalFont: true,
		source: "local",
		variants: ["300", "400", "700", "900"],
		variantsData: new Map([
			[
				"300",
				{
					weight: 300,
					style: "normal",
					fileName: "lato-1.woff2",
					path: lato300,
				},
			],
			[
				"400",
				{
					weight: 400,
					style: "normal",
					fileName: "lato-2.woff2",
					path: lato400,
				},
			],
			[
				"700",
				{
					weight: 700,
					style: "normal",
					fileName: "lato-3.woff2",
					path: lato700,
				},
			],
			[
				"900",
				{
					weight: 900,
					style: "normal",
					fileName: "lato-4.woff2",
					path: lato900,
				},
			],
		]),
		localPath: lato400, // Default to 400 weight
	},
	{
		name: "Source Code Pro",
		family: "Source Code Pro, 'Courier New', monospace",
		isWebFont: true,
		isLocalFont: true,
		source: "local",
		variants: ["300", "400", "500", "600", "700", "800", "900"],
		variantsData: new Map([
			[
				"300",
				{
					weight: 300,
					style: "normal",
					fileName: "source-code pro-1.woff2",
					path: sourceCodePro300,
				},
			],
			[
				"400",
				{
					weight: 400,
					style: "normal",
					fileName: "source-code pro-2.woff2",
					path: sourceCodePro400,
				},
			],
			[
				"500",
				{
					weight: 500,
					style: "normal",
					fileName: "source-code pro-3.woff2",
					path: sourceCodePro500,
				},
			],
			[
				"600",
				{
					weight: 600,
					style: "normal",
					fileName: "source-code pro-4.woff2",
					path: sourceCodePro600,
				},
			],
			[
				"700",
				{
					weight: 700,
					style: "normal",
					fileName: "source-code pro-5.woff2",
					path: sourceCodePro700,
				},
			],
			[
				"800",
				{
					weight: 800,
					style: "normal",
					fileName: "source-code pro-6.woff2",
					path: sourceCodePro800,
				},
			],
			[
				"900",
				{
					weight: 900,
					style: "normal",
					fileName: "source-code pro-7.woff2",
					path: sourceCodePro900,
				},
			],
		]),
		localPath: sourceCodePro400, // Default to 400 weight
	},
];

/**
 * Generate local font configurations
 */
export function generateLocalFontConfigs(): FontConfig[] {
	return LOCAL_FONT_CONFIGS;
}

/**
 * Get the local font file path for a specific font family and weight
 */
export function getLocalFontPath(
	familyName: string,
	weight?: string,
): string | null {
	const fontConfig = LOCAL_FONT_CONFIGS.find(
		(font) => font.name === familyName,
	);

	if (!fontConfig) return null;

	// If weight is specified, try to find the specific weight variant
	if (weight && fontConfig.variantsData) {
		const variant = fontConfig.variantsData.get(weight);
		return variant?.path || fontConfig.localPath || null;
	}

	return fontConfig.localPath || null;
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

/**
 * Get available weights for a font family
 */
export function getAvailableWeights(familyName: string): string[] {
	// Extract the primary font name from the font family string
	// e.g., "Inter, -apple-system, BlinkMacSystemFont, sans-serif" -> "Inter"
	const primaryFontName =
		familyName.split(",")[0]?.trim().replace(/["']/g, "") || familyName;

	const fontConfig = LOCAL_FONT_CONFIGS.find(
		(font) => font.name === primaryFontName,
	);

	return fontConfig?.variants || [];
}
