export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rect = { left: number; top: number; right: number; bottom: number };

export interface PositionOptions {
	offset?: number;
	margin?: number;
	preferred?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
	// Limit how far from the cursor the final menu can move
	maxDisplacement?: number;
}

export const getViewportRect = (): Rect => ({
	left: 0,
	top: 0,
	right: window.innerWidth,
	bottom: window.innerHeight,
});

export function computeMenuPosition(
	anchor: Point,
	menuSize: Size,
	viewport: Rect = getViewportRect(),
	opts: PositionOptions = {},
) {
	const offset = opts.offset ?? 8;
	const margin = opts.margin ?? 8;
	const maxDisp = opts.maxDisplacement ?? 16;
	const pref = opts.preferred ?? "bottom-left";

	let x = anchor.x;
	let y = anchor.y;

	// Primary placement
	const isBottom = pref.startsWith("bottom");
	const isLeft = pref.endsWith("left");
	const primaryY = isBottom
		? anchor.y + offset
		: anchor.y - menuSize.height - offset;
	const primaryX = isLeft
		? anchor.x + offset
		: anchor.x - menuSize.width - offset;
	y = primaryY;
	x = primaryX;

	// Flip horizontally if overflowing right/left
	const overflowRight = x + menuSize.width > viewport.right - margin;
	const overflowLeft = x < viewport.left + margin;
	if (overflowRight && isLeft) {
		x = anchor.x - menuSize.width - offset; // flip to right placement
	} else if (overflowLeft && !isLeft) {
		x = anchor.x + offset; // flip to left placement
	}

	// Flip vertically if overflowing bottom/top
	const overflowBottom = y + menuSize.height > viewport.bottom - margin;
	const overflowTop = y < viewport.top + margin;
	if (overflowBottom && isBottom) {
		y = anchor.y - menuSize.height - offset;
	} else if (overflowTop && !isBottom) {
		y = anchor.y + offset;
	}

	// Shift into viewport with bias to stay near the cursor
	const minX = viewport.left + margin;
	const maxX = viewport.right - margin - menuSize.width;
	const minY = viewport.top + margin;
	const maxY = viewport.bottom - margin - menuSize.height;

	const clampedX = Math.min(Math.max(x, minX), maxX);
	const clampedY = Math.min(Math.max(y, minY), maxY);

	const biasedXRaw =
		Math.abs(clampedX - primaryX) > maxDisp
			? clampedX > primaryX
				? primaryX + maxDisp
				: primaryX - maxDisp
			: clampedX;
	const biasedYRaw =
		Math.abs(clampedY - primaryY) > maxDisp
			? clampedY > primaryY
				? primaryY + maxDisp
				: primaryY - maxDisp
			: clampedY;

	// Final hard clamp to viewport bounds
	const biasedX = Math.min(Math.max(biasedXRaw, minX), maxX);
	const biasedY = Math.min(Math.max(biasedYRaw, minY), maxY);

	x = biasedX;
	y = biasedY;

	return { x: Math.round(x), y: Math.round(y) };
}
