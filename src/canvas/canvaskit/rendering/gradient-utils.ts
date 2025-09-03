import type {
	Gradient,
	LinearGradient,
	RadialGradient,
	MeshGradient,
} from "../../../store/elements/element-types";
import type {
	CanvasKitInstance,
	CanvasKitShader,
} from "../../../types/canvaskit";

export class GradientUtils {
	private canvasKit: CanvasKitInstance;

	constructor(canvasKit: CanvasKitInstance) {
		this.canvasKit = canvasKit;
	}

	/**
	 * Creates a CanvasKit shader from a gradient definition
	 */
	createGradientShader(
		gradient: Gradient,
		elementX: number,
		elementY: number,
		elementWidth: number,
		elementHeight: number,
	): CanvasKitShader | null {
		switch (gradient.type) {
			case "linear":
				return this.createLinearGradientShader(
					gradient,
					elementX,
					elementY,
					elementWidth,
					elementHeight,
				);
			case "radial":
				return this.createRadialGradientShader(
					gradient,
					elementX,
					elementY,
					elementWidth,
					elementHeight,
				);
			case "mesh":
				return this.createMeshGradientShader(
					gradient,
					elementX,
					elementY,
					elementWidth,
					elementHeight,
				);
			default:
				return null;
		}
	}

	private createLinearGradientShader(
		gradient: LinearGradient,
		elementX: number,
		elementY: number,
		elementWidth: number,
		elementHeight: number,
	): CanvasKitShader | null {
		if (!gradient.stops || gradient.stops.length === 0) return null;

		// Convert relative coordinates to absolute
		const startX = elementX + gradient.startX * elementWidth;
		const startY = elementY + gradient.startY * elementHeight;
		const endX = elementX + gradient.endX * elementWidth;
		const endY = elementY + gradient.endY * elementHeight;

		// Extract colors and positions
		const colors = gradient.stops.map((stop) => {
			const rgba = this.parseColor(stop.color);
			const opacity = stop.opacity !== undefined ? stop.opacity : 1;
			return this.canvasKit.Color(rgba[0], rgba[1], rgba[2], rgba[3] * opacity);
		});

		const positions = gradient.stops.map((stop) => stop.position);

		// Create linear gradient shader
		return this.canvasKit.Shader.MakeLinearGradient(
			[startX, startY],
			[endX, endY],
			colors,
			positions,
			this.canvasKit.TileMode.Clamp,
		);
	}

	private createRadialGradientShader(
		gradient: RadialGradient,
		elementX: number,
		elementY: number,
		elementWidth: number,
		elementHeight: number,
	): CanvasKitShader | null {
		if (!gradient.stops || gradient.stops.length === 0) return null;

		// Convert relative coordinates to absolute
		const centerX = elementX + gradient.centerX * elementWidth;
		const centerY = elementY + gradient.centerY * elementHeight;

		// Calculate radius based on element diagonal
		const diagonal = Math.sqrt(
			elementWidth * elementWidth + elementHeight * elementHeight,
		);
		const radius = gradient.radius * diagonal;

		// Extract colors and positions
		const colors = gradient.stops.map((stop) => {
			const rgba = this.parseColor(stop.color);
			const opacity = stop.opacity !== undefined ? stop.opacity : 1;
			return this.canvasKit.Color(rgba[0], rgba[1], rgba[2], rgba[3] * opacity);
		});

		const positions = gradient.stops.map((stop) => stop.position);

		// Create radial gradient shader
		return this.canvasKit.Shader.MakeRadialGradient(
			[centerX, centerY],
			radius,
			colors,
			positions,
			this.canvasKit.TileMode.Clamp,
		);
	}

	private createMeshGradientShader(
		gradient: MeshGradient,
		elementX: number,
		elementY: number,
		elementWidth: number,
		elementHeight: number,
	): CanvasKitShader | null {
		// For now, approximate mesh gradients with a complex radial gradient
		// This is a simplified implementation - true mesh gradients would require
		// more complex shader programming or multiple gradient layers

		if (!gradient.controlPoints || gradient.controlPoints.length === 0)
			return null;

		// Use the first control point as the center
		const firstPoint = gradient.controlPoints[0];
		if (!firstPoint) return null;

		const centerX = elementX + firstPoint.x * elementWidth;
		const centerY = elementY + firstPoint.y * elementHeight;

		// Calculate radius based on element diagonal
		const diagonal = Math.sqrt(
			elementWidth * elementWidth + elementHeight * elementHeight,
		);
		const radius = diagonal * 0.5;

		// Create approximate colors from control points
		const colors = gradient.controlPoints.map((point) => {
			const rgba = this.parseColor(point.color);
			const opacity = point.opacity !== undefined ? point.opacity : 1;
			return this.canvasKit.Color(rgba[0], rgba[1], rgba[2], rgba[3] * opacity);
		});

		// Create evenly distributed positions
		const positions = gradient.controlPoints.map(
			(_, index) => index / (gradient.controlPoints.length - 1),
		);

		// Create radial gradient shader as approximation
		return this.canvasKit.Shader.MakeRadialGradient(
			[centerX, centerY],
			radius,
			colors,
			positions,
			this.canvasKit.TileMode.Clamp,
		);
	}

	/**
	 * Parse color string to RGBA values
	 */
	private parseColor(colorStr: string): [number, number, number, number] {
		// Handle hex colors
		if (colorStr.startsWith("#")) {
			const hex = colorStr.substring(1);
			if (hex.length === 3) {
				// Short hex format (#RGB)
				const r = parseInt((hex[0] || "0") + (hex[0] || "0"), 16);
				const g = parseInt((hex[1] || "0") + (hex[1] || "0"), 16);
				const b = parseInt((hex[2] || "0") + (hex[2] || "0"), 16);
				return [r, g, b, 1];
			} else if (hex.length === 6) {
				// Long hex format (#RRGGBB)
				const r = parseInt(hex.substring(0, 2), 16);
				const g = parseInt(hex.substring(2, 4), 16);
				const b = parseInt(hex.substring(4, 6), 16);
				return [r, g, b, 1];
			} else if (hex.length === 8) {
				// Long hex format with alpha (#RRGGBBAA)
				const r = parseInt(hex.substring(0, 2), 16);
				const g = parseInt(hex.substring(2, 4), 16);
				const b = parseInt(hex.substring(4, 6), 16);
				const a = parseInt(hex.substring(6, 8), 16) / 255;
				return [r, g, b, a];
			}
		}

		// Handle rgb/rgba formats
		const rgbMatch = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
		if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
			return [
				parseInt(rgbMatch[1]),
				parseInt(rgbMatch[2]),
				parseInt(rgbMatch[3]),
				1,
			];
		}

		const rgbaMatch = colorStr.match(
			/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/,
		);
		if (
			rgbaMatch &&
			rgbaMatch[1] &&
			rgbaMatch[2] &&
			rgbaMatch[3] &&
			rgbaMatch[4]
		) {
			return [
				parseInt(rgbaMatch[1]),
				parseInt(rgbaMatch[2]),
				parseInt(rgbaMatch[3]),
				parseFloat(rgbaMatch[4]),
			];
		}

		// Fallback to black
		return [0, 0, 0, 1];
	}

	/**
	 * Check if a fill is a gradient
	 */
	static isGradient(fill: string | Gradient): fill is Gradient {
		return typeof fill === "object" && fill !== null && "type" in fill;
	}

	/**
	 * Create default linear gradient
	 */
	static createDefaultLinearGradient(
		startColor: string = "#000000",
		endColor: string = "#ffffff",
	): LinearGradient {
		return {
			type: "linear",
			startX: 0,
			startY: 0,
			endX: 1,
			endY: 1,
			stops: [
				{ color: startColor, position: 0 },
				{ color: endColor, position: 1 },
			],
		};
	}

	/**
	 * Create default radial gradient
	 */
	static createDefaultRadialGradient(
		centerColor: string = "#ffffff",
		edgeColor: string = "#000000",
	): RadialGradient {
		return {
			type: "radial",
			centerX: 0.5,
			centerY: 0.5,
			radius: 0.5,
			stops: [
				{ color: centerColor, position: 0 },
				{ color: edgeColor, position: 1 },
			],
		};
	}

	/**
	 * Create default mesh gradient
	 */
	static createDefaultMeshGradient(): MeshGradient {
		return {
			type: "mesh",
			stops: [],
			controlPoints: [
				{ x: 0, y: 0, color: "#ff0000" },
				{ x: 1, y: 0, color: "#00ff00" },
				{ x: 0, y: 1, color: "#0000ff" },
				{ x: 1, y: 1, color: "#ffff00" },
			],
			resolution: 4,
		};
	}
}
