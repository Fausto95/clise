// CanvasKit TypeScript definitions
export type CanvasKitColor = (
	r: number,
	g: number,
	b: number,
	a?: number,
) => number;

export interface CanvasKitImageFilter {
	delete(): void;
}

export interface CanvasKitShader {
	delete(): void;
}

export interface CanvasKitPaint {
	setColor(color: number): void;
	setStyle(style: PaintStyle): void;
	setStrokeWidth(width: number): void;
	setAntiAlias(antialias: boolean): void;
	setAlphaf(alpha: number): void;
	setImageFilter(filter: CanvasKitImageFilter | null): void;
	setShader(shader: CanvasKitShader | null): void;
	setBlendMode(mode: CanvasKitBlendMode): void;
	setColorFilter(filter: CanvasKitColorFilter | null): void;
	// Optional in our usage: allow path effects for dashed strokes
	setPathEffect?(effect: CanvasKitPathEffect | null): void;
	delete(): void;
}

export interface CanvasKitPaintConstructor {
	new (): CanvasKitPaint;
}

export enum PaintStyle {
	Fill = 0,
	Stroke = 1,
}

export interface CanvasKitPaintStyleStatic {
	Fill: PaintStyle.Fill;
	Stroke: PaintStyle.Stroke;
}

export type CanvasKitRect = (
	x: number,
	y: number,
	width: number,
	height: number,
) => CanvasKitRectObject;

export interface CanvasKitRectObject {
	fLeft: number;
	fTop: number;
	fRight: number;
	fBottom: number;
}

export interface CanvasKitImage {
	width(): number;
	height(): number;
	delete(): void;
}

export interface CanvasKitCanvas {
	clear(color: number): void;
	drawRect(rect: CanvasKitRectObject, paint: CanvasKitPaint): void;
	drawOval(rect: CanvasKitRectObject, paint: CanvasKitPaint): void;
	drawPath(path: CanvasKitPath, paint: CanvasKitPaint): void;
	drawText(
		text: string,
		x: number,
		y: number,
		paint: CanvasKitPaint,
		font: CanvasKitFont,
	): void;
	drawImageRect(
		image: CanvasKitImage,
		src: CanvasKitRectObject,
		dest: CanvasKitRectObject,
		paint: CanvasKitPaint,
		fastSample?: boolean,
	): void;
	save(): void;
	restore(): void;
	translate(dx: number, dy: number): void;
	scale(sx: number, sy: number): void;
	rotate(radians: number, px: number, py: number): void; // rotation around a pivot
	// Additional operations (some are approximations for type support)
	saveLayer(paint?: CanvasKitPaint): void;
	clipRect(
		rect: CanvasKitRectObject,
		op: CanvasKitClipOp,
		antiAlias?: boolean,
	): void;
	clipPath(path: CanvasKitPath, op: CanvasKitClipOp, antiAlias?: boolean): void;
}

export enum CanvasKitClipOp {
	Difference = 0,
	Intersect = 1,
}

export interface CanvasKitSurface {
	getCanvas(): CanvasKitCanvas;
	flush(): void;
	delete(): void;
}

export enum CanvasKitTileMode {
	Clamp = 0,
	Repeat = 1,
	Mirror = 2,
	Decal = 3,
}

export interface CanvasKitTileModeStatic {
	Clamp: CanvasKitTileMode.Clamp;
	Repeat: CanvasKitTileMode.Repeat;
	Mirror: CanvasKitTileMode.Mirror;
	Decal: CanvasKitTileMode.Decal;
}

export interface CanvasKitImageFilterStatic {
	MakeBlur(
		sigmaX: number,
		sigmaY: number,
		tileMode: CanvasKitTileMode,
		input: CanvasKitImageFilter | null,
	): CanvasKitImageFilter;
}

export interface CanvasKitFont {
	delete(): void;
}

export interface CanvasKitFontConstructor {
	new (typeface: CanvasKitTypeface | null, size: number): CanvasKitFont;
}

export interface CanvasKitPath {
	moveTo(x: number, y: number): void;
	lineTo(x: number, y: number): void;
	quadTo(cx: number, cy: number, x: number, y: number): void; // quadratic curve
	arcToTangent(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		radius: number,
	): void;
	addOval(rect: CanvasKitRectObject): void;
	close(): void;
	delete(): void;
}

export interface CanvasKitPathConstructor {
	new (): CanvasKitPath;
}

export interface CanvasKitTypeface {
	delete(): void;
}

export interface CanvasKitTypefaceStatic {
	MakeFreeTypeFaceFromData(data: ArrayBuffer): CanvasKitTypeface | null;
}

export interface CanvasKitInstance {
	MakeCanvasSurface(canvas: HTMLCanvasElement): CanvasKitSurface | null;
	MakeImageFromEncoded(data: ArrayBuffer): CanvasKitImage | null;
	Paint: CanvasKitPaintConstructor;
	Font: CanvasKitFontConstructor;
	Path: CanvasKitPathConstructor;
	PaintStyle: CanvasKitPaintStyleStatic;
	Color: CanvasKitColor;
	XYWHRect: CanvasKitRect;
	ImageFilter: CanvasKitImageFilterStatic;
	ColorFilter: CanvasKitColorFilterStatic;
	TileMode: CanvasKitTileModeStatic;
	ClipOp: typeof CanvasKitClipOp;
	BlendMode: CanvasKitBlendModeStatic;
	Typeface: CanvasKitTypefaceStatic;
	// PathEffect for dashed strokes (not fully typed, just what's needed)
	PathEffect?: {
		MakeDash(intervals: number[], phase: number): CanvasKitPathEffect;
	};
	// Shader for gradients
	Shader: {
		MakeLinearGradient(
			start: [number, number],
			end: [number, number],
			colors: number[],
			pos: number[] | null,
			mode: number,
		): CanvasKitShader;
		MakeRadialGradient(
			center: [number, number],
			radius: number,
			colors: number[],
			pos: number[] | null,
			mode: number,
		): CanvasKitShader;
	};
}

// Color filter types
export interface CanvasKitColorFilter {}
export interface CanvasKitColorFilterStatic {
	MakeMatrix(matrix: number[]): CanvasKitColorFilter;
}

// Blend mode types (subset used)
export enum CanvasKitBlendMode {
	SrcOver = 0,
	Multiply = 1,
	Screen = 2,
	Overlay = 3,
	Darken = 4,
	Lighten = 5,
}
export interface CanvasKitBlendModeStatic {
	SrcOver: CanvasKitBlendMode.SrcOver;
	Multiply: CanvasKitBlendMode.Multiply;
	Screen: CanvasKitBlendMode.Screen;
	Overlay: CanvasKitBlendMode.Overlay;
	Darken: CanvasKitBlendMode.Darken;
	Lighten: CanvasKitBlendMode.Lighten;
}

export interface CanvasKitPathEffect {
	delete(): void;
}

export interface CanvasKitInitOptions {
	locateFile?: (file: string) => string;
}

export type CanvasKitInit = (
	options?: CanvasKitInitOptions,
) => Promise<CanvasKitInstance>;

declare global {
	interface Window {
		CanvasKitInit: CanvasKitInit;
	}
}
