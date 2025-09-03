import type { Element } from "../../store/element-atoms";
import type { CanvasKitCanvas, CanvasKitInstance } from "../../types/canvaskit";
import { BatchRenderer, type RenderBatch } from "./batch-renderer";
import { Quadtree, type QuadtreeConfig } from "./quadtree";
import { type ViewportBounds, ViewportCuller } from "./viewport-culler";

export interface PerformanceConfig {
	enableViewCulling: boolean;
	enableQuadtree: boolean;
	enableBatching: boolean;
	quadtreeMaxElements: number;
	quadtreeMaxLevels: number;
	cullingBufferPercentage: number;
}

export interface PerformanceMetrics {
	totalElements: number;
	visibleElements: number;
	culledElements: number;
	renderTime: number;
	cullingTime: number;
	batchingTime: number;
	quadtreeStats?: {
		totalNodes: number;
		leafNodes: number;
		maxDepth: number;
	};
	cacheStats?: {
		paintCacheSize: number;
		pathCacheSize: number;
		drawCallCacheSize: number;
	};
}

export class PerformanceManager {
	private viewportCuller: ViewportCuller;
	private quadtree: Quadtree | null = null;
	private batchRenderer: BatchRenderer;
	private config: PerformanceConfig;
	private lastRebuildTime: number = 0;
	private rebuildThreshold: number = 2000; // Rebuild quadtree every 2s max (less frequent)
	private lastElementsHash: string = "";
	private isRebuildScheduled: boolean = false;

	constructor(
		canvasKit: CanvasKitInstance,
		config: Partial<PerformanceConfig> = {},
	) {
		this.config = {
			enableViewCulling: true,
			enableQuadtree: true,
			enableBatching: true,
			quadtreeMaxElements: 10,
			quadtreeMaxLevels: 5,
			cullingBufferPercentage: 0.2,
			...config,
		};

		this.viewportCuller = new ViewportCuller(
			this.config.cullingBufferPercentage,
		);
		this.batchRenderer = new BatchRenderer(canvasKit);
	}

	/**
	 * Initialize or rebuild the quadtree with current elements (debounced to prevent flickering)
	 */
	rebuildQuadtree(elements: Element[], worldBounds?: ViewportBounds): void {
		if (!this.config.enableQuadtree) {
			this.quadtree = null;
			return;
		}

		// Create a hash of element positions to detect actual changes
		const elementsHash = elements
			.map((el) => `${el.id}:${el.x}:${el.y}:${el.w}:${el.h}`)
			.join("|");

		// Skip rebuild if elements haven't changed
		if (elementsHash === this.lastElementsHash) {
			return;
		}

		const now = performance.now();

		// Debounce rebuilds to prevent flickering during pan/zoom
		if (
			this.isRebuildScheduled ||
			now - this.lastRebuildTime < this.rebuildThreshold
		) {
			if (!this.isRebuildScheduled) {
				this.isRebuildScheduled = true;
				setTimeout(() => {
					this.performQuadtreeRebuild(elements, worldBounds);
					this.isRebuildScheduled = false;
				}, 100); // Small delay to batch multiple requests
			}
			return;
		}

		this.performQuadtreeRebuild(elements, worldBounds);
	}

	/**
	 * Actually perform the quadtree rebuild
	 */
	private performQuadtreeRebuild(
		elements: Element[],
		worldBounds?: ViewportBounds,
	): void {
		// Calculate world bounds if not provided
		if (!worldBounds) {
			worldBounds = this.calculateWorldBounds(elements);
		}

		const quadtreeConfig: QuadtreeConfig = {
			maxElements: this.config.quadtreeMaxElements,
			maxLevels: this.config.quadtreeMaxLevels,
			initialBounds: worldBounds,
		};

		if (!this.quadtree) {
			this.quadtree = new Quadtree(quadtreeConfig);
		}

		this.quadtree.rebuild(elements, worldBounds);
		this.lastRebuildTime = performance.now();
		this.lastElementsHash = elements
			.map((el) => `${el.id}:${el.x}:${el.y}:${el.w}:${el.h}`)
			.join("|");
	}

	/**
	 * Get visible elements using the most appropriate method
	 */
	getVisibleElements(
		elements: Element[],
		pan: { x: number; y: number },
		zoom: number,
		dimensions: { width: number; height: number },
	): { visibleElements: Element[]; metrics: Partial<PerformanceMetrics> } {
		let visibleElements: Element[] = [];
		let cullingTime = 0;
		let culledElements = 0;

		// Temporarily disable aggressive culling to fix interactivity issues
		// Only cull when there are a large number of elements to avoid breaking interaction
		const shouldCull = elements.length > 1000;

		if (shouldCull && this.config.enableQuadtree && this.quadtree) {
			// Use quadtree for spatial querying
			const cullingStart = performance.now();
			const viewportBounds = this.viewportCuller.calculateViewportBounds(
				pan,
				zoom,
				dimensions,
			);
			visibleElements = this.quadtree.query(viewportBounds);
			cullingTime = performance.now() - cullingStart;
			culledElements = elements.length - visibleElements.length;
		} else if (shouldCull && this.config.enableViewCulling) {
			// Use basic viewport culling
			const cullingStart = performance.now();
			const cullingResult = this.viewportCuller.cullElements(
				elements,
				pan,
				zoom,
				dimensions,
				true,
			);
			visibleElements = cullingResult.visibleElements;
			culledElements = cullingResult.culledCount;
			cullingTime = performance.now() - cullingStart;
		} else {
			// No culling - render all elements (for better interactivity)
			visibleElements = elements;
			culledElements = 0;
		}

		return {
			visibleElements,
			metrics: {
				totalElements: elements.length,
				visibleElements: visibleElements.length,
				culledElements,
				cullingTime,
				quadtreeStats: this.quadtree?.getStats(),
				cacheStats: this.batchRenderer.getCacheStats(),
			},
		};
	}

	/**
	 * Create render batches for visible elements
	 */
	createRenderBatches(visibleElements: Element[]): RenderBatch[] {
		if (!this.config.enableBatching) {
			// Return individual batches for each element
			return visibleElements.map((element) => ({
				elements: [element],
				type: element.type,
			}));
		}

		return this.batchRenderer.groupElementsForBatching(visibleElements);
	}

	/**
	 * Render batches using the batch renderer
	 */
	renderBatches(canvas: CanvasKitCanvas, batches: RenderBatch[]): number {
		const startTime = performance.now();
		for (const batch of batches) {
			this.batchRenderer.renderBatch(canvas, batch);
		}

		return performance.now() - startTime;
	}

	/**
	 * Update performance configuration
	 */
	updateConfig(newConfig: Partial<PerformanceConfig>): void {
		this.config = { ...this.config, ...newConfig };

		// Update viewport culler buffer
		if (newConfig.cullingBufferPercentage !== undefined) {
			this.viewportCuller.setBufferPercentage(
				newConfig.cullingBufferPercentage,
			);
		}

		// Force quadtree rebuild if quadtree settings changed
		if (
			newConfig.quadtreeMaxElements !== undefined ||
			newConfig.quadtreeMaxLevels !== undefined ||
			newConfig.enableQuadtree !== undefined
		) {
			this.lastRebuildTime = 0; // Force rebuild on next call
		}
	}

	/**
	 * Add element to quadtree (for incremental updates)
	 */
	addElement(element: Element): void {
		if (this.quadtree && this.config.enableQuadtree) {
			this.quadtree.insert(element);
		}
	}

	/**
	 * Remove element from quadtree
	 */
	removeElement(elementId: string): void {
		if (this.quadtree && this.config.enableQuadtree) {
			this.quadtree.remove(elementId);
		}
	}

	/**
	 * Check if quadtree is initialized
	 */
	hasQuadtree(): boolean {
		return this.quadtree !== null;
	}

	/**
	 * Get current configuration
	 */
	getConfig(): PerformanceConfig {
		return { ...this.config };
	}

	/**
	 * Clean up resources
	 */
	cleanup(): void {
		this.batchRenderer.clearCaches();
		this.quadtree = null;
	}

	/**
	 * Calculate world bounds that encompass all elements for infinite canvas
	 */
	private calculateWorldBounds(elements: Element[]): ViewportBounds {
		if (elements.length === 0) {
			// For infinite canvas, provide a large default bounds
			return { left: -50000, top: -50000, right: 50000, bottom: 50000 };
		}

		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		for (const element of elements) {
			minX = Math.min(minX, element.x);
			minY = Math.min(minY, element.y);
			maxX = Math.max(maxX, element.x + element.w);
			maxY = Math.max(maxY, element.y + element.h);
		}

		// For infinite canvas, expand bounds significantly beyond content
		const expansionFactor = 0.5; // 50% expansion on each side
		const contentWidth = maxX - minX;
		const contentHeight = maxY - minY;
		const expandX = Math.max(5000, contentWidth * expansionFactor); // Minimum 5k expansion
		const expandY = Math.max(5000, contentHeight * expansionFactor);

		return {
			left: minX - expandX,
			top: minY - expandY,
			right: maxX + expandX,
			bottom: maxY + expandY,
		};
	}

	/**
	 * Get performance statistics
	 */
	getPerformanceStats(): {
		config: PerformanceConfig;
		quadtreeStats: Record<string, unknown> | null;
		cacheStats: Record<string, unknown>;
	} {
		return {
			config: this.config,
			quadtreeStats: this.quadtree?.getStats() || null,
			cacheStats: this.batchRenderer.getCacheStats(),
		};
	}
}
