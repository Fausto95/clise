export interface SVGPathInfo {
	id: string; // Generated unique ID for the path
	element: string; // The path element tag ('path', 'circle', 'rect', etc.)
	originalFill: string;
	originalStroke: string;
	originalFillOpacity: number;
	originalStrokeOpacity: number;
	currentFill: string;
	currentStroke: string;
	currentFillOpacity: number;
	currentStrokeOpacity: number;
	pathData?: string; // For path elements
	attributes: Record<string, string>; // Other attributes like cx, cy, r, etc.
}

export interface SVGColorInfo {
	isSVG: boolean;
	paths: SVGPathInfo[];
}

/**
 * Extract color information from SVG paths and shapes
 */
export function extractSVGPathColors(src: string): SVGColorInfo {
	if (!src.includes("data:image/svg+xml")) {
		return { isSVG: false, paths: [] };
	}

	try {
		// Decode the SVG data
		const srcParts = src.split(",");
		if (srcParts.length < 2 || !srcParts[1]) {
			return { isSVG: false, paths: [] };
		}

		const svgData = atob(srcParts[1]);

		// Parse the SVG using DOMParser
		const parser = new DOMParser();
		const svgDoc = parser.parseFromString(svgData, "image/svg+xml");

		if (svgDoc.querySelector("parsererror")) {
			console.warn("Failed to parse SVG");
			return { isSVG: false, paths: [] };
		}

		const paths: SVGPathInfo[] = [];

		// Find all drawable elements (path, circle, rect, ellipse, line, polygon, polyline)
		const drawableElements = svgDoc.querySelectorAll(
			"path, circle, rect, ellipse, line, polygon, polyline",
		);

		drawableElements.forEach((element, index) => {
			const tagName = element.tagName.toLowerCase();
			const fill = element.getAttribute("fill") || "currentColor";
			const stroke = element.getAttribute("stroke") || "none";
			const fillOpacity = parseFloat(
				element.getAttribute("fill-opacity") || "1",
			);
			const strokeOpacity = parseFloat(
				element.getAttribute("stroke-opacity") || "1",
			);

			// Collect all attributes
			const attributes: Record<string, string> = {};
			for (let i = 0; i < element.attributes.length; i++) {
				const attr = element.attributes[i];
				if (
					attr &&
					!["fill", "stroke", "fill-opacity", "stroke-opacity"].includes(
						attr.name,
					)
				) {
					attributes[attr.name] = attr.value;
				}
			}

			paths.push({
				id: `${tagName}-${index}`,
				element: tagName,
				originalFill: fill,
				originalStroke: stroke,
				originalFillOpacity: fillOpacity,
				originalStrokeOpacity: strokeOpacity,
				currentFill: fill,
				currentStroke: stroke,
				currentFillOpacity: fillOpacity,
				currentStrokeOpacity: strokeOpacity,
				pathData:
					tagName === "path" ? element.getAttribute("d") || "" : undefined,
				attributes,
			});
		});

		return { isSVG: true, paths };
	} catch (error) {
		console.warn("Error parsing SVG:", error);
		return { isSVG: false, paths: [] };
	}
}

/**
 * Apply color changes to SVG and return new data URL
 */
export function applySVGPathColors(
	originalSrc: string,
	pathColors: SVGPathInfo[],
): string {
	if (!originalSrc.includes("data:image/svg+xml")) {
		return originalSrc;
	}

	try {
		// Decode the original SVG
		const srcParts = originalSrc.split(",");
		if (srcParts.length < 2 || !srcParts[1]) {
			return originalSrc;
		}

		const svgData = atob(srcParts[1]);

		// Parse the SVG
		const parser = new DOMParser();
		const svgDoc = parser.parseFromString(svgData, "image/svg+xml");

		if (svgDoc.querySelector("parsererror")) {
			return originalSrc;
		}

		// Find all drawable elements and update their colors
		const drawableElements = svgDoc.querySelectorAll(
			"path, circle, rect, ellipse, line, polygon, polyline",
		);

		drawableElements.forEach((element, index) => {
			const tagName = element.tagName.toLowerCase();
			const pathInfo = pathColors.find((p) => p.id === `${tagName}-${index}`);

			if (pathInfo) {
				// Update fill and stroke
				if (pathInfo.currentFill !== "none") {
					element.setAttribute("fill", pathInfo.currentFill);
					element.setAttribute(
						"fill-opacity",
						pathInfo.currentFillOpacity.toString(),
					);
				} else {
					element.removeAttribute("fill");
					element.removeAttribute("fill-opacity");
				}

				if (pathInfo.currentStroke !== "none") {
					element.setAttribute("stroke", pathInfo.currentStroke);
					element.setAttribute(
						"stroke-opacity",
						pathInfo.currentStrokeOpacity.toString(),
					);
				} else {
					element.removeAttribute("stroke");
					element.removeAttribute("stroke-opacity");
				}
			}
		});

		// Serialize back to string
		const serializer = new XMLSerializer();
		const rootElement = svgDoc.documentElement;
		if (!rootElement) {
			return originalSrc;
		}
		const modifiedSvgString = serializer.serializeToString(rootElement);

		// Create new data URL
		const encodedSvg = btoa(modifiedSvgString);
		return `data:image/svg+xml;base64,${encodedSvg}`;
	} catch (error) {
		console.warn("Error applying SVG colors:", error);
		return originalSrc;
	}
}

/**
 * Check if a color is a valid CSS color
 */
export function isValidColor(color: string): boolean {
	if (!color) return false;

	// CSS color keywords
	const colorKeywords = [
		"transparent",
		"currentColor",
		"inherit",
		"initial",
		"unset",
		"none",
		"black",
		"white",
		"red",
		"green",
		"blue",
		"yellow",
		"cyan",
		"magenta",
		"gray",
		"grey",
		"orange",
		"pink",
		"purple",
		"brown",
		"navy",
		"teal",
	];

	if (colorKeywords.includes(color.toLowerCase())) return true;

	// Hex colors
	if (/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(color))
		return true;

	// RGB/RGBA
	if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/.test(color))
		return true;

	// HSL/HSLA
	if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+)?\s*\)$/.test(color))
		return true;

	return false;
}

/**
 * Convert various color formats to hex for consistency
 */
export function normalizeColor(color: string): string {
	if (!color || color === "none" || color === "transparent") return color;

	// Already hex
	if (color.startsWith("#")) return color;

	// Use temporary element to get computed color
	const tempElement = document.createElement("div");
	tempElement.style.color = color;
	document.body.appendChild(tempElement);

	const computedColor = window.getComputedStyle(tempElement).color;
	document.body.removeChild(tempElement);

	// Convert rgb to hex
	const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
	if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
		const r = parseInt(rgbMatch[1]).toString(16).padStart(2, "0");
		const g = parseInt(rgbMatch[2]).toString(16).padStart(2, "0");
		const b = parseInt(rgbMatch[3]).toString(16).padStart(2, "0");
		return `#${r}${g}${b}`;
	}

	return color;
}
