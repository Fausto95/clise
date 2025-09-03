import type { SVGPathInfo } from "../../utils/svg-utils";

export type ElementType =
	| "rect"
	| "ellipse"
	| "frame"
	| "text"
	| "line"
	| "path"
	| "image";

export interface GradientStop {
	color: string;
	position: number; // 0-1
	opacity?: number;
}

export interface LinearGradient {
	type: "linear";
	stops: GradientStop[];
	startX: number; // 0-1 relative to element bounds
	startY: number; // 0-1 relative to element bounds
	endX: number; // 0-1 relative to element bounds
	endY: number; // 0-1 relative to element bounds
}

export interface RadialGradient {
	type: "radial";
	stops: GradientStop[];
	centerX: number; // 0-1 relative to element bounds
	centerY: number; // 0-1 relative to element bounds
	radius: number; // 0-1 relative to element diagonal
	focalX?: number; // 0-1 relative to element bounds (optional focal point)
	focalY?: number; // 0-1 relative to element bounds (optional focal point)
}

export interface MeshGradient {
	type: "mesh";
	stops: GradientStop[];
	controlPoints: {
		x: number; // 0-1 relative to element bounds
		y: number; // 0-1 relative to element bounds
		color: string;
		opacity?: number;
	}[];
	resolution?: number; // mesh resolution (default 4x4)
}

export type Gradient = LinearGradient | RadialGradient | MeshGradient;

// Image fill support
export type ImageFit = "fill" | "contain" | "cover" | "stretch" | "tile";
export type ImageAlign =
	| "center"
	| "topLeft"
	| "top"
	| "topRight"
	| "left"
	| "right"
	| "bottomLeft"
	| "bottom"
	| "bottomRight";

export interface ImageFill {
	enabled: boolean;
	src: string; // URL or data URL
	fit?: ImageFit; // default: fill
	align?: ImageAlign; // default: center
	rotationDeg?: number; // default: 0
	offsetX?: number; // px in element space
	offsetY?: number; // px in element space
	scaleX?: number; // additional scale multiplier (default 1)
	scaleY?: number; // additional scale multiplier (default 1)
	blur?: number; // optional blur sigma in px
	// Tiling options
	repeatX?: "none" | "repeat" | "mirror"; // default: none
	repeatY?: "none" | "repeat" | "mirror"; // default: none
	// Color effects
	brightness?: number; // 0..2 (1 = normal)
	contrast?: number; // 0..2 (1 = normal)
	saturation?: number; // 0..2 (1 = normal)
	// Blend mode
	blendMode?:
		| "normal"
		| "multiply"
		| "screen"
		| "overlay"
		| "darken"
		| "lighten";
}

export interface BaseElement {
	id: string;
	type: ElementType;
	parentId: string | null;
	rotation: number;
	name: string;
	x: number;
	y: number;
	w: number;
	h: number;
	/** When true, the element cannot be selected, moved, or resized */
	locked?: boolean;
	/** Legacy: when true, both width and height are locked */
	lockedDimensions?: boolean;
	/** When true, width cannot change via resize or inputs */
	lockedWidth?: boolean;
	/** When true, height cannot change via resize or inputs */
	lockedHeight?: boolean;
	fill: string | Gradient;
	/** Optional image fill drawn inside the element shape */
	imageFill?: ImageFill;
	opacity: number;
	visible: boolean;
	isDragging?: boolean;
	stroke?: {
		color: string | Gradient;
		width: number;
		opacity: number;
		style: "solid" | "dashed";
		position: "center" | "inside" | "outside";
	};
	layoutConstraints?: {
		horizontalAlign: "left" | "center" | "right" | "none";
		verticalAlign: "top" | "center" | "bottom" | "none";
	};
	padding?: {
		top: number;
		right: number;
		bottom: number;
		left: number;
	};
	shadow?: {
		type?: "drop" | "inner";
		x: number; // offset X
		y: number; // offset Y
		blur: number;
		color: string;
		opacity: number;
		spread?: number;
	};
}

export interface RectangleElement extends BaseElement {
	type: "rect";
	blur?: {
		type: "layer" | "background";
		radius: number;
	};
	radius?: {
		topLeft: number;
		topRight: number;
		bottomRight: number;
		bottomLeft: number;
	};
}

export interface EllipseElement extends BaseElement {
	type: "ellipse";
	blur?: {
		type: "layer" | "background";
		radius: number;
	};
}

export interface FrameElement extends BaseElement {
	type: "frame";
	/** When true, children are clipped to the frame's content bounds */
	clipContent?: boolean;
	layoutConstraints?: {
		horizontalAlign: "left" | "center" | "right" | "none";
		verticalAlign: "top" | "center" | "bottom" | "none";
		gap?: number;
		direction?: "row" | "column";
	};
}

export interface TextElement extends BaseElement {
	type: "text";
	text: string;
	color: string;
	fontSize: number;
	fontFamily: string;
	textDecoration?: "none" | "underline" | "line-through";
	fontWeight?: "normal" | "bold";
	textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
	lineHeight?: number;
	letterSpacing?: number;
}

export interface LineElement extends BaseElement {
	type: "line";
	x2: number;
	y2: number;
}

export interface PathPoint {
	x: number; // local to element.x/y
	y: number; // local to element.x/y
	// If present, draws a curve from this point to the next
	curve?: {
		type: "quadratic" | "cubic" | "smooth";
		// For quadratic curves (Q command)
		cx?: number; // control point x (local coordinates)
		cy?: number; // control point y (local coordinates)
		// For cubic curves (C command)
		inHandle?: { x: number; y: number }; // incoming control point
		outHandle?: { x: number; y: number }; // outgoing control point
	};
	selected?: boolean; // for multi-point selection
}

export interface PathElement extends BaseElement {
	type: "path";
	points: PathPoint[]; // at least 2 when finalized
	closed: boolean;
}

export interface ImageElement extends BaseElement {
	type: "image";
	src: string; // Base64 data URL or blob URL
	originalWidth: number;
	originalHeight: number;
	aspectRatio: number; // Calculated from original dimensions
	alt?: string; // Optional alt text
	svgPaths?: SVGPathInfo[]; // For SVG images, stores path color information
	/** Optional visual effects for image elements */
	imageEffects?: {
		blur?: number; // optional blur sigma in px
		brightness?: number; // 0..2 (1 = normal)
		contrast?: number; // 0..2 (1 = normal)
		saturation?: number; // 0..2 (1 = normal)
		blendMode?:
			| "normal"
			| "multiply"
			| "screen"
			| "overlay"
			| "darken"
			| "lighten";
	};
}

export type Element =
	| RectangleElement
	| EllipseElement
	| FrameElement
	| TextElement
	| LineElement
	| PathElement
	| ImageElement;

export type ElementPatch =
	| Partial<RectangleElement>
	| Partial<EllipseElement>
	| Partial<FrameElement>
	| Partial<TextElement>
	| Partial<LineElement>
	| Partial<PathElement>
	| Partial<ImageElement>
	| Partial<BaseElement>;

/**
 * Migrate old blur structure to new blur structure
 * This handles backward compatibility for elements created before the blur type system
 */
export function migrateBlurStructure(element: any): any {
	if (element.type === "rect" || element.type === "ellipse") {
		// Check if element has old blur structure (number)
		if (typeof element.blur === "number" && element.blur > 0) {
			return {
				...element,
				blur: {
					type: "layer" as const,
					radius: element.blur,
				},
			};
		}
		// Check if element has old blur structure (0 or undefined)
		if (typeof element.blur === "number" && element.blur === 0) {
			return {
				...element,
				blur: undefined,
			};
		}
		// If element already has new blur structure, ensure it's valid
		if (element.blur && typeof element.blur === "object") {
			if (!element.blur.type || !element.blur.radius) {
				return {
					...element,
					blur: {
						type: "layer" as const,
						radius: element.blur.radius || 4,
					},
				};
			}
		}
	}
	return element;
}
