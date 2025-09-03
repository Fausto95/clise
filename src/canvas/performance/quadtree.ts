import type { Element } from "../../store/element-atoms";
import type { ViewportBounds } from "./viewport-culler";

export interface QuadtreeNode {
	bounds: ViewportBounds;
	elements: Element[];
	level: number;
	children: QuadtreeNode[] | null;
}

export interface QuadtreeConfig {
	maxElements: number;
	maxLevels: number;
	initialBounds: ViewportBounds;
}

export class Quadtree {
	private root: QuadtreeNode;
	private maxElements: number;
	private maxLevels: number;

	constructor(config: QuadtreeConfig) {
		this.maxElements = config.maxElements;
		this.maxLevels = config.maxLevels;
		this.root = {
			bounds: { ...config.initialBounds },
			elements: [],
			children: null,
			level: 0,
		};
	}

	/**
	 * Clear the quadtree and rebuild with new elements
	 */
	rebuild(elements: Element[], bounds?: ViewportBounds): void {
		if (bounds) {
			this.root.bounds = { ...bounds };
		}

		this.root.elements = [];
		this.root.children = null;
		this.root.level = 0;

		for (const element of elements) {
			this.insert(element);
		}
	}

	/**
	 * Insert an element into the quadtree
	 */
	insert(element: Element): void {
		this.insertIntoNode(this.root, element);
	}

	/**
	 * Remove an element from the quadtree
	 */
	remove(elementId: string): boolean {
		return this.removeFromNode(this.root, elementId);
	}

	/**
	 * Query elements within a viewport bounds
	 */
	query(bounds: ViewportBounds): Element[] {
		const result: Element[] = [];
		this.queryNode(this.root, bounds, result);
		return result;
	}

	/**
	 * Get all elements in the quadtree
	 */
	getAllElements(): Element[] {
		const result: Element[] = [];
		this.collectAllElements(this.root, result);
		return result;
	}

	/**
	 * Get quadtree statistics for debugging
	 */
	getStats(): {
		totalNodes: number;
		leafNodes: number;
		totalElements: number;
		maxDepth: number;
	} {
		let totalNodes = 0;
		let leafNodes = 0;
		let totalElements = 0;
		let maxDepth = 0;

		const traverse = (node: QuadtreeNode) => {
			totalNodes++;
			totalElements += node.elements.length;
			maxDepth = Math.max(maxDepth, node.level);

			if (node.children === null) {
				leafNodes++;
			} else {
				for (const child of node.children) {
					traverse(child);
				}
			}
		};

		traverse(this.root);

		return { totalNodes, leafNodes, totalElements, maxDepth };
	}

	private insertIntoNode(node: QuadtreeNode, element: Element): void {
		// If element doesn't fit in this node, don't insert it
		if (!this.elementIntersectsBounds(element, node.bounds)) {
			return;
		}

		// If we have space and no children, add the element here
		if (node.elements.length < this.maxElements && node.children === null) {
			node.elements.push(element);
			return;
		}

		// Split if we haven't already and we're not at max level
		if (node.children === null && node.level < this.maxLevels) {
			this.splitNode(node);
		}

		// If we have children, try to insert into appropriate child
		if (node.children !== null) {
			for (const child of node.children) {
				this.insertIntoNode(child, element);
			}
		} else {
			// At max level, just add to this node
			node.elements.push(element);
		}
	}

	private removeFromNode(node: QuadtreeNode, elementId: string): boolean {
		// Check if element is in this node
		const elementIndex = node.elements.findIndex((el) => el.id === elementId);
		if (elementIndex !== -1) {
			node.elements.splice(elementIndex, 1);
			return true;
		}

		// Check children if they exist
		if (node.children !== null) {
			for (const child of node.children) {
				if (this.removeFromNode(child, elementId)) {
					return true;
				}
			}
		}

		return false;
	}

	private queryNode(
		node: QuadtreeNode,
		bounds: ViewportBounds,
		result: Element[],
	): void {
		// If this node doesn't intersect with query bounds, skip it
		if (!this.boundsIntersect(node.bounds, bounds)) {
			return;
		}

		// Add elements from this node that intersect with query bounds
		for (const element of node.elements) {
			if (this.elementIntersectsBounds(element, bounds)) {
				result.push(element);
			}
		}

		// Query children if they exist
		if (node.children !== null) {
			for (const child of node.children) {
				this.queryNode(child, bounds, result);
			}
		}
	}

	private collectAllElements(node: QuadtreeNode, result: Element[]): void {
		result.push(...node.elements);

		if (node.children !== null) {
			for (const child of node.children) {
				this.collectAllElements(child, result);
			}
		}
	}

	private splitNode(node: QuadtreeNode): void {
		const bounds = node.bounds;
		const centerX = (bounds.left + bounds.right) / 2;
		const centerY = (bounds.top + bounds.bottom) / 2;
		const level = node.level + 1;

		node.children = [
			// Top-left quadrant
			{
				bounds: {
					left: bounds.left,
					top: bounds.top,
					right: centerX,
					bottom: centerY,
				},
				elements: [],
				children: null,
				level,
			},
			// Top-right quadrant
			{
				bounds: {
					left: centerX,
					top: bounds.top,
					right: bounds.right,
					bottom: centerY,
				},
				elements: [],
				children: null,
				level,
			},
			// Bottom-left quadrant
			{
				bounds: {
					left: bounds.left,
					top: centerY,
					right: centerX,
					bottom: bounds.bottom,
				},
				elements: [],
				children: null,
				level,
			},
			// Bottom-right quadrant
			{
				bounds: {
					left: centerX,
					top: centerY,
					right: bounds.right,
					bottom: bounds.bottom,
				},
				elements: [],
				children: null,
				level,
			},
		];

		// Redistribute elements to children
		const elementsToRedistribute = [...node.elements];
		node.elements = [];

		for (const element of elementsToRedistribute) {
			for (const child of node.children) {
				this.insertIntoNode(child, element);
			}
		}
	}

	private elementIntersectsBounds(
		element: Element,
		bounds: ViewportBounds,
	): boolean {
		const elementLeft = element.x;
		const elementTop = element.y;
		const elementRight = element.x + element.w;
		const elementBottom = element.y + element.h;

		return !(
			elementRight < bounds.left ||
			elementLeft > bounds.right ||
			elementBottom < bounds.top ||
			elementTop > bounds.bottom
		);
	}

	private boundsIntersect(
		bounds1: ViewportBounds,
		bounds2: ViewportBounds,
	): boolean {
		return !(
			bounds1.right < bounds2.left ||
			bounds1.left > bounds2.right ||
			bounds1.bottom < bounds2.top ||
			bounds1.top > bounds2.bottom
		);
	}
}
