import { v4 as uuidv4 } from "uuid";
import type { Element } from "../../store/element-atoms";

const uid = () => uuidv4();

export interface ElementGeneratorOptions {
	count: number;
	worldWidth: number;
	worldHeight: number;
	elementSizeRange: { min: number; max: number };
	colors?: string[];
}

/**
 * Generate a large number of test elements for performance testing
 */
export function generateTestElements(
	options: ElementGeneratorOptions,
): Element[] {
	const {
		count,
		worldWidth,
		worldHeight,
		elementSizeRange,
		colors = ["#e5e5e5", "#ffd43b", "#51cf66", "#74c0fc", "#ff8cc8", "#ffa8a8"],
	} = options;

	const elements: Element[] = [];
	const elementTypes = ["rect", "ellipse", "frame"] as const;

	// Calculate grid dimensions for flag-like arrangement
	const aspectRatio = 3 / 2; // Flag-like aspect ratio (3:2)
	const cols = Math.ceil(Math.sqrt(count * aspectRatio));
	const rows = Math.ceil(count / cols);

	// Calculate element size to fit in the available space
	const elementWidth = Math.min(
		elementSizeRange.max,
		(worldWidth / cols) * 0.8,
	);
	const elementHeight = Math.min(
		elementSizeRange.max,
		(worldHeight / rows) * 0.8,
	);
	const spacing = Math.min(elementWidth, elementHeight) * 0.1;

	for (let i = 0; i < count; i++) {
		const type = elementTypes[Math.floor(Math.random() * elementTypes.length)];

		// Calculate position in grid
		const col = i % cols;
		const row = Math.floor(i / cols);

		// Position elements side by side in a rectangular formation
		const x = col * (elementWidth + spacing) + spacing;
		const y = row * (elementHeight + spacing) + spacing;

		const w = elementWidth;
		const h = elementHeight;

		const fillColor =
			colors[Math.floor(Math.random() * colors.length)] || "#e5e5e5";
		const strokeColor = "#495057";

		const baseElement = {
			id: uid(),
			parentId: null,
			rotation: 0,
			name: `Generated ${type} ${i}`,
			x,
			y,
			w,
			h,
			fill: fillColor,
			stroke: {
				color: strokeColor,
				width: Math.random() > 0.7 ? 2 : 1,
				opacity: 1,
				style: "solid" as const,
				position: "center" as const,
			},
			opacity: 0.8 + Math.random() * 0.2, // 80-100% opacity
			visible: true,
		};

		if (type === "rect") {
			const hasRoundedCorners = Math.random() > 0.7;
			elements.push({
				...baseElement,
				type: "rect",
				blur:
					Math.random() > 0.9
						? { type: "layer" as const, radius: Math.random() * 5 }
						: undefined,
				...(hasRoundedCorners && {
					radius: {
						topLeft: Math.random() * 20,
						topRight: Math.random() * 20,
						bottomRight: Math.random() * 20,
						bottomLeft: Math.random() * 20,
					},
				}),
			});
		} else if (type === "ellipse") {
			elements.push({
				...baseElement,
				type: "ellipse",
				blur:
					Math.random() > 0.9
						? { type: "layer" as const, radius: Math.random() * 5 }
						: undefined,
			});
		} else {
			elements.push({
				...baseElement,
				type: "frame",
			});
		}
	}

	return elements;
}

/**
 * Generate clustered elements (simulating grouped content)
 */
export function generateClusteredElements(options: {
	clusters: number;
	elementsPerCluster: number;
	clusterRadius: number;
	worldWidth: number;
	worldHeight: number;
	elementSizeRange: { min: number; max: number };
}): Element[] {
	const elements: Element[] = [];
	const colors = [
		"#e5e5e5",
		"#ffd43b",
		"#51cf66",
		"#74c0fc",
		"#ff8cc8",
		"#ffa8a8",
	];

	for (let cluster = 0; cluster < options.clusters; cluster++) {
		// Random cluster center
		const centerX = Math.random() * options.worldWidth;
		const centerY = Math.random() * options.worldHeight;

		for (let elem = 0; elem < options.elementsPerCluster; elem++) {
			// Generate element within cluster radius
			const angle = Math.random() * 2 * Math.PI;
			const distance = Math.random() * options.clusterRadius;

			const x = centerX + Math.cos(angle) * distance;
			const y = centerY + Math.sin(angle) * distance;

			const w =
				options.elementSizeRange.min +
				Math.random() *
					(options.elementSizeRange.max - options.elementSizeRange.min);
			const h =
				options.elementSizeRange.min +
				Math.random() *
					(options.elementSizeRange.max - options.elementSizeRange.min);

			elements.push({
				id: uid(),
				type: "rect",
				parentId: null,
				rotation: 0,
				name: `Cluster ${cluster} Element ${elem}`,
				x: Math.max(0, Math.min(x, options.worldWidth - w)),
				y: Math.max(0, Math.min(y, options.worldHeight - h)),
				w,
				h,
				fill: colors[Math.floor(Math.random() * colors.length)] || "#e5e5e5",
				stroke: {
					color: "#495057",
					width: 1,
					opacity: 1,
					style: "solid" as const,
					position: "center" as const,
				},
				opacity: 0.9,
				visible: true,
			});
		}
	}

	return elements;
}

/**
 * Generate elements in a grid pattern (worst case for quadtree)
 */
export function generateGridElements(options: {
	gridSize: number; // e.g., 100x100 grid
	elementSize: number;
	spacing: number;
}): Element[] {
	const elements: Element[] = [];
	const colors = ["#e5e5e5", "#ffd43b", "#51cf66", "#74c0fc"];

	for (let row = 0; row < options.gridSize; row++) {
		for (let col = 0; col < options.gridSize; col++) {
			const x = col * (options.elementSize + options.spacing);
			const y = row * (options.elementSize + options.spacing);

			elements.push({
				id: uid(),
				type: "rect",
				parentId: null,
				rotation: 0,
				name: `Grid ${row},${col}`,
				x,
				y,
				w: options.elementSize,
				h: options.elementSize,
				fill: colors[(row + col) % colors.length] || "#e5e5e5",
				stroke: {
					color: "#495057",
					width: 1,
					opacity: 1,
					style: "solid" as const,
					position: "center" as const,
				},
				opacity: 1,
				visible: true,
			});
		}
	}

	return elements;
}

/**
 * Performance test configurations for infinite canvas
 * Elements are distributed across vast areas to test true infinite canvas behavior
 */
export const PERFORMANCE_TEST_CONFIGS = {
	light: {
		count: 1000,
		worldWidth: 50000, // Much larger for infinite canvas
		worldHeight: 50000,
		elementSizeRange: { min: 30, max: 100 },
	},
	medium: {
		count: 5000,
		worldWidth: 100000, // 100k x 100k world
		worldHeight: 100000,
		elementSizeRange: { min: 20, max: 150 },
	},
	heavy: {
		count: 10000,
		worldWidth: 150000, // 150k x 150k world
		worldHeight: 150000,
		elementSizeRange: { min: 10, max: 200 },
	},
	extreme: {
		count: 25000,
		worldWidth: 200000, // 200k x 200k world for ultimate test
		worldHeight: 200000,
		elementSizeRange: { min: 5, max: 300 },
	},
	clustered: {
		clusters: 50,
		elementsPerCluster: 200,
		clusterRadius: 1000, // Larger clusters for infinite canvas
		worldWidth: 150000,
		worldHeight: 150000,
		elementSizeRange: { min: 20, max: 80 },
	},
	grid: {
		gridSize: 100, // 100x100 = 10,000 elements
		elementSize: 200, // Larger elements for better visibility
		spacing: 50, // More spacing for infinite canvas
	},
};

/**
 * Generate elements around specific coordinates for infinite canvas testing
 */
export function generateElementsAroundPoint(options: {
	centerX: number;
	centerY: number;
	count: number;
	radius: number;
	elementSizeRange: { min: number; max: number };
}): Element[] {
	const { centerX, centerY, count, radius, elementSizeRange } = options;
	const elements: Element[] = [];
	const colors = [
		"#e5e5e5",
		"#ffd43b",
		"#51cf66",
		"#74c0fc",
		"#ff8cc8",
		"#ffa8a8",
	];
	const elementTypes = ["rect", "ellipse", "frame"] as const;

	for (let i = 0; i < count; i++) {
		const angle = Math.random() * 2 * Math.PI;
		const distance = Math.random() * radius;

		const x = centerX + Math.cos(angle) * distance;
		const y = centerY + Math.sin(angle) * distance;

		const type = elementTypes[Math.floor(Math.random() * elementTypes.length)];
		const w =
			elementSizeRange.min +
			Math.random() * (elementSizeRange.max - elementSizeRange.min);
		const h =
			elementSizeRange.min +
			Math.random() * (elementSizeRange.max - elementSizeRange.min);

		const baseElement = {
			id: uid(),
			parentId: null,
			rotation: 0,
			name: `Near ${centerX},${centerY} ${type} ${i}`,
			x,
			y,
			w,
			h,
			fill: colors[Math.floor(Math.random() * colors.length)] || "#e5e5e5",
			stroke: {
				color: "#495057",
				width: 1,
				opacity: 1,
				style: "solid" as const,
				position: "center" as const,
			},
			opacity: 1,
			visible: true,
		};

		if (type === "rect") {
			elements.push({
				...baseElement,
				type: "rect",
			});
		} else if (type === "ellipse") {
			elements.push({
				...baseElement,
				type: "ellipse",
			});
		} else {
			elements.push({
				...baseElement,
				type: "frame",
			});
		}
	}

	return elements;
}

/**
 * Generate a sparse infinite canvas layout with elements in different regions
 */
export function generateInfiniteCanvasLayout(): Element[] {
	const elements: Element[] = [];

	// Create several distinct regions across the infinite canvas
	const regions = [
		{ centerX: 0, centerY: 0, name: "Origin" },
		{ centerX: 25000, centerY: 25000, name: "Northeast Cluster" },
		{ centerX: -25000, centerY: 25000, name: "Northwest Cluster" },
		{ centerX: 25000, centerY: -25000, name: "Southeast Cluster" },
		{ centerX: -25000, centerY: -25000, name: "Southwest Cluster" },
		{ centerX: 75000, centerY: 0, name: "Far East" },
		{ centerX: -75000, centerY: 0, name: "Far West" },
		{ centerX: 0, centerY: 75000, name: "Far North" },
		{ centerX: 0, centerY: -75000, name: "Far South" },
	];

	regions.forEach((region) => {
		const regionElements = generateElementsAroundPoint({
			centerX: region.centerX,
			centerY: region.centerY,
			count: Math.floor(Math.random() * 500) + 200, // 200-700 elements per region
			radius: 5000,
			elementSizeRange: { min: 50, max: 200 },
		});
		elements.push(...regionElements);
	});

	return elements;
}

/**
 * Chunked generation functions for non-blocking worker processing
 */

export function generateTestElementsChunk(
	options: ElementGeneratorOptions,
	startIndex: number,
	chunkSize: number,
): Element[] {
	const {
		count,
		worldWidth,
		worldHeight,
		elementSizeRange,
		colors = ["#e5e5e5", "#ffd43b", "#51cf66", "#74c0fc", "#ff8cc8", "#ffa8a8"],
	} = options;

	const elements: Element[] = [];
	const elementTypes = ["rect", "ellipse", "frame"] as const;

	// Calculate grid dimensions for flag-like arrangement
	const aspectRatio = 3 / 2; // Flag-like aspect ratio (3:2)
	const cols = Math.ceil(Math.sqrt(count * aspectRatio));
	const rows = Math.ceil(count / cols);

	// Calculate element size to fit in the available space
	const elementWidth = Math.min(
		elementSizeRange.max,
		(worldWidth / cols) * 0.8,
	);
	const elementHeight = Math.min(
		elementSizeRange.max,
		(worldHeight / rows) * 0.8,
	);
	const spacing = Math.min(elementWidth, elementHeight) * 0.1;

	const endIndex = Math.min(startIndex + chunkSize, count);

	for (let i = startIndex; i < endIndex; i++) {
		const type = elementTypes[Math.floor(Math.random() * elementTypes.length)];

		// Calculate position in grid
		const col = i % cols;
		const row = Math.floor(i / cols);

		// Position elements side by side in a rectangular formation
		const x = col * (elementWidth + spacing) + spacing;
		const y = row * (elementHeight + spacing) + spacing;

		const w = elementWidth;
		const h = elementHeight;

		const fillColor =
			colors[Math.floor(Math.random() * colors.length)] || "#e5e5e5";
		const strokeColor = "#495057";

		const baseElement = {
			id: uid(),
			parentId: null,
			rotation: 0,
			name: `Generated ${type} ${i}`,
			x,
			y,
			w,
			h,
			fill: fillColor,
			stroke: {
				color: strokeColor,
				width: Math.random() > 0.7 ? 2 : 1,
				opacity: 1,
				style: "solid" as const,
				position: "center" as const,
			},
			opacity: 0.8 + Math.random() * 0.2, // 80-100% opacity
			visible: true,
		};

		if (type === "rect") {
			const hasRoundedCorners = Math.random() > 0.7;
			elements.push({
				...baseElement,
				type: "rect",
				blur:
					Math.random() > 0.9
						? { type: "layer" as const, radius: Math.random() * 5 }
						: undefined,
				...(hasRoundedCorners && {
					radius: {
						topLeft: Math.random() * 20,
						topRight: Math.random() * 20,
						bottomRight: Math.random() * 20,
						bottomLeft: Math.random() * 20,
					},
				}),
			});
		} else if (type === "ellipse") {
			elements.push({
				...baseElement,
				type: "ellipse",
				blur:
					Math.random() > 0.9
						? { type: "layer" as const, radius: Math.random() * 5 }
						: undefined,
			});
		} else {
			elements.push({
				...baseElement,
				type: "frame",
			});
		}
	}

	return elements;
}

export function generateClusteredElementsChunk(
	options: {
		clusters: number;
		elementsPerCluster: number;
		clusterRadius: number;
		worldWidth: number;
		worldHeight: number;
		elementSizeRange: { min: number; max: number };
	},
	startIndex: number,
	chunkSize: number,
): Element[] {
	const elements: Element[] = [];
	const colors = [
		"#e5e5e5",
		"#ffd43b",
		"#51cf66",
		"#74c0fc",
		"#ff8cc8",
		"#ffa8a8",
	];

	const totalElements = options.clusters * options.elementsPerCluster;
	const endIndex = Math.min(startIndex + chunkSize, totalElements);

	for (let i = startIndex; i < endIndex; i++) {
		const cluster = Math.floor(i / options.elementsPerCluster);
		const elem = i % options.elementsPerCluster;

		// Random cluster center
		const centerX = Math.random() * options.worldWidth;
		const centerY = Math.random() * options.worldHeight;

		// Generate element within cluster radius
		const angle = Math.random() * 2 * Math.PI;
		const distance = Math.random() * options.clusterRadius;

		const x = centerX + Math.cos(angle) * distance;
		const y = centerY + Math.sin(angle) * distance;

		const w =
			options.elementSizeRange.min +
			Math.random() *
				(options.elementSizeRange.max - options.elementSizeRange.min);
		const h =
			options.elementSizeRange.min +
			Math.random() *
				(options.elementSizeRange.max - options.elementSizeRange.min);

		elements.push({
			id: uid(),
			type: "rect",
			parentId: null,
			rotation: 0,
			name: `Cluster ${cluster} Element ${elem}`,
			x: Math.max(0, Math.min(x, options.worldWidth - w)),
			y: Math.max(0, Math.min(y, options.worldHeight - h)),
			w,
			h,
			fill: colors[Math.floor(Math.random() * colors.length)] || "#e5e5e5",
			stroke: {
				color: "#495057",
				width: 1,
				opacity: 1,
				style: "solid" as const,
				position: "center" as const,
			},
			opacity: 0.9,
			visible: true,
		});
	}

	return elements;
}

export function generateGridElementsChunk(
	options: {
		gridSize: number; // e.g., 100x100 grid
		elementSize: number;
		spacing: number;
	},
	startIndex: number,
	chunkSize: number,
): Element[] {
	const elements: Element[] = [];
	const colors = ["#e5e5e5", "#ffd43b", "#51cf66", "#74c0fc"];

	const totalElements = options.gridSize * options.gridSize;
	const endIndex = Math.min(startIndex + chunkSize, totalElements);

	for (let i = startIndex; i < endIndex; i++) {
		const row = Math.floor(i / options.gridSize);
		const col = i % options.gridSize;

		const x = col * (options.elementSize + options.spacing);
		const y = row * (options.elementSize + options.spacing);

		elements.push({
			id: uid(),
			type: "rect",
			parentId: null,
			rotation: 0,
			name: `Grid ${row},${col}`,
			x,
			y,
			w: options.elementSize,
			h: options.elementSize,
			fill: colors[(row + col) % colors.length] || "#e5e5e5",
			stroke: {
				color: "#495057",
				width: 1,
				opacity: 1,
				style: "solid" as const,
				position: "center" as const,
			},
			opacity: 1,
			visible: true,
		});
	}

	return elements;
}

export function generateInfiniteCanvasLayoutChunk(
	startIndex: number,
	chunkSize: number,
): Element[] {
	const elements: Element[] = [];

	// Create several distinct regions across the infinite canvas
	const regions = [
		{ centerX: 0, centerY: 0, name: "Origin" },
		{ centerX: 25000, centerY: 25000, name: "Northeast Cluster" },
		{ centerX: -25000, centerY: 25000, name: "Northwest Cluster" },
		{ centerX: 25000, centerY: -25000, name: "Southeast Cluster" },
		{ centerX: -25000, centerY: -25000, name: "Southwest Cluster" },
		{ centerX: 75000, centerY: 0, name: "Far East" },
		{ centerX: -75000, centerY: 0, name: "Far West" },
		{ centerX: 0, centerY: 75000, name: "Far North" },
		{ centerX: 0, centerY: -75000, name: "Far South" },
	];

	const elementsPerRegion = 450; // Average elements per region
	const totalElements = regions.length * elementsPerRegion;
	const endIndex = Math.min(startIndex + chunkSize, totalElements);

	for (let i = startIndex; i < endIndex; i++) {
		const regionIndex = Math.floor(i / elementsPerRegion);
		const elementIndex = i % elementsPerRegion;

		if (regionIndex >= regions.length) break;

		const region = regions[regionIndex];
		if (!region) continue;

		const regionElements = generateElementsAroundPoint({
			centerX: region.centerX,
			centerY: region.centerY,
			count: 1,
			radius: 5000,
			elementSizeRange: { min: 50, max: 200 },
		});

		if (regionElements.length > 0) {
			// Update the element name to include region info
			const element = {
				...regionElements[0],
				name: `${region.name} Element ${elementIndex}`,
			} as Element;
			elements.push(element);
		}
	}

	return elements;
}

/**
 * Navigation helpers for infinite canvas
 */
export const INFINITE_CANVAS_BOOKMARKS = [
	{ name: "Origin (0,0)", x: 0, y: 0 },
	{ name: "Northeast Cluster", x: 25000, y: 25000 },
	{ name: "Northwest Cluster", x: -25000, y: 25000 },
	{ name: "Southeast Cluster", x: 25000, y: -25000 },
	{ name: "Southwest Cluster", x: -25000, y: -25000 },
	{ name: "Far East", x: 75000, y: 0 },
	{ name: "Far West", x: -75000, y: 0 },
	{ name: "Far North", x: 0, y: 75000 },
	{ name: "Far South", x: 0, y: -75000 },
] as const;
