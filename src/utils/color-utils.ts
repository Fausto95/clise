// Color utility functions for the custom color picker

export interface HSL {
	h: number; // 0-360
	s: number; // 0-100
	l: number; // 0-100
}

export interface HSV {
	h: number; // 0-360
	s: number; // 0-100
	v: number; // 0-100
}

export interface RGB {
	r: number; // 0-255
	g: number; // 0-255
	b: number; // 0-255
}

// Convert hex to RGB
export function hexToRgb(hex: string): RGB {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1] || "0", 16),
				g: parseInt(result[2] || "0", 16),
				b: parseInt(result[3] || "0", 16),
			}
		: { r: 0, g: 0, b: 0 };
}

// Convert RGB to hex
export function rgbToHex(rgb: RGB): string {
	const toHex = (n: number) => {
		const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
		return hex.length === 1 ? "0" + hex : hex;
	};
	return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

// Convert RGB to HSL
export function rgbToHsl(rgb: RGB): HSL {
	const { r, g, b } = rgb;
	const rNorm = r / 255;
	const gNorm = g / 255;
	const bNorm = b / 255;

	const max = Math.max(rNorm, gNorm, bNorm);
	const min = Math.min(rNorm, gNorm, bNorm);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

		switch (max) {
			case rNorm:
				h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
				break;
			case gNorm:
				h = (bNorm - rNorm) / d + 2;
				break;
			case bNorm:
				h = (rNorm - gNorm) / d + 4;
				break;
		}
		h /= 6;
	}

	return {
		h: h * 360,
		s: s * 100,
		l: l * 100,
	};
}

// Convert HSL to RGB
export function hslToRgb(hsl: HSL): RGB {
	const { h, s, l } = hsl;
	const hNorm = h / 360;
	const sNorm = s / 100;
	const lNorm = l / 100;

	const hue2rgb = (p: number, q: number, t: number) => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};

	let r, g, b;

	if (sNorm === 0) {
		r = g = b = lNorm; // achromatic
	} else {
		const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
		const p = 2 * lNorm - q;
		r = hue2rgb(p, q, hNorm + 1 / 3);
		g = hue2rgb(p, q, hNorm);
		b = hue2rgb(p, q, hNorm - 1 / 3);
	}

	return {
		r: Math.round(r * 255),
		g: Math.round(g * 255),
		b: Math.round(b * 255),
	};
}

// Convert RGB to HSV
export function rgbToHsv(rgb: RGB): HSV {
	const { r, g, b } = rgb;
	const rNorm = r / 255;
	const gNorm = g / 255;
	const bNorm = b / 255;

	const max = Math.max(rNorm, gNorm, bNorm);
	const min = Math.min(rNorm, gNorm, bNorm);
	const diff = max - min;

	let h = 0;
	if (diff !== 0) {
		if (max === rNorm) {
			h = ((gNorm - bNorm) / diff) % 6;
		} else if (max === gNorm) {
			h = (bNorm - rNorm) / diff + 2;
		} else {
			h = (rNorm - gNorm) / diff + 4;
		}
	}
	h = Math.round(h * 60);
	if (h < 0) h += 360;

	const s = max === 0 ? 0 : (diff / max) * 100;
	const v = max * 100;

	return { h, s, v };
}

// Convert HSV to RGB
export function hsvToRgb(hsv: HSV): RGB {
	const { h, s, v } = hsv;
	const hNorm = h / 360;
	const sNorm = s / 100;
	const vNorm = v / 100;

	const c = vNorm * sNorm;
	const x = c * (1 - Math.abs(((hNorm * 6) % 2) - 1));
	const m = vNorm - c;

	let r, g, b;

	if (hNorm < 1 / 6) {
		r = c;
		g = x;
		b = 0;
	} else if (hNorm < 2 / 6) {
		r = x;
		g = c;
		b = 0;
	} else if (hNorm < 3 / 6) {
		r = 0;
		g = c;
		b = x;
	} else if (hNorm < 4 / 6) {
		r = 0;
		g = x;
		b = c;
	} else if (hNorm < 5 / 6) {
		r = x;
		g = 0;
		b = c;
	} else {
		r = c;
		g = 0;
		b = x;
	}

	return {
		r: Math.round((r + m) * 255),
		g: Math.round((g + m) * 255),
		b: Math.round((b + m) * 255),
	};
}

// Convert hex to HSL
export function hexToHsl(hex: string): HSL {
	return rgbToHsl(hexToRgb(hex));
}

// Convert HSL to hex
export function hslToHex(hsl: HSL): string {
	return rgbToHex(hslToRgb(hsl));
}

// Convert hex to HSV
export function hexToHsv(hex: string): HSV {
	return rgbToHsv(hexToRgb(hex));
}

// Convert HSV to hex
export function hsvToHex(hsv: HSV): string {
	return rgbToHex(hsvToRgb(hsv));
}

// Normalize hex color (ensure it has # prefix and is uppercase)
export function normalizeHex(hex: string): string {
	let normalized = hex.replace(/^#/, "").toUpperCase();
	if (normalized.length === 3) {
		normalized = normalized
			.split("")
			.map((char) => char + char)
			.join("");
	}
	return `#${normalized}`;
}

// Validate hex color
export function isValidHex(hex: string): boolean {
	return /^#?[0-9A-Fa-f]{6}$/.test(hex) || /^#?[0-9A-Fa-f]{3}$/.test(hex);
}
