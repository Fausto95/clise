import { loadImage } from "../utils/image-utils";
import type { Element } from "./element-atoms";
import type { Group } from "./group-atoms";

export interface CliseFileFormat {
	version: string;
	elements: Element[];
	// Allow either array or object map form
	groups: Group[] | Record<string, Group>;
	viewport: {
		zoom: number;
		pan: { x: number; y: number };
	};
	metadata: {
		createdAt: string;
		modifiedAt: string;
		name: string;
	};
}

/**
 * Optimize image data for export by compressing large images
 */
export async function optimizeImageForExport(
	element: Element,
): Promise<Element> {
	if (element.type !== "image") {
		return element;
	}

	// If image src is already optimized or small, return as-is
	if (element.src.length < 500000) {
		// Less than ~500KB base64
		return element;
	}

	try {
		// For large images, we could implement compression here
		// For now, just return the original element
		return element;
	} catch (error) {
		console.warn("Failed to optimize image for export:", error);
		return element;
	}
}

/**
 * Export elements to Clise format with image optimization
 */
export async function exportToClise(
	elements: Element[],
	groups: Group[],
	viewport: { zoom: number; pan: { x: number; y: number } },
	fileName: string = "Untitled",
	options?: { groupsAsObject?: boolean },
): Promise<string> {
	// Filter visible elements before optimizing
	const visibleElements = elements.filter((el) => el.visible !== false);

	// Optimize images for export
	const optimizedElements = await Promise.all(
		visibleElements.map((element) => optimizeImageForExport(element)),
	);

	const groupsField = options?.groupsAsObject
		? Object.fromEntries(groups.map((g) => [g.id, g] as const))
		: groups;

	const cliseData: CliseFileFormat = {
		version: "1.0.0",
		elements: optimizedElements,
		groups: groupsField as any,
		viewport,
		metadata: {
			createdAt: new Date().toISOString(),
			modifiedAt: new Date().toISOString(),
			name: fileName,
		},
	};

	return JSON.stringify(cliseData, null, 2);
}

/**
 * Validate and process image elements during import
 */
export async function validateImageElement(element: Element): Promise<Element> {
	if (element.type !== "image") {
		return element;
	}

	try {
		// Validate that the image src is a valid base64 data URL
		if (!element.src.startsWith("data:image/")) {
			console.warn("Invalid image src format, skipping image element");
			// Could convert to a placeholder or skip the element
			return element;
		}

		// Validate image dimensions using loadImage
		const dimensions = await loadImage(element.src);

		// Update element with validated dimensions if they don't match
		if (
			element.originalWidth !== dimensions.width ||
			element.originalHeight !== dimensions.height
		) {
			return {
				...element,
				originalWidth: dimensions.width,
				originalHeight: dimensions.height,
				aspectRatio: dimensions.aspectRatio,
			};
		}

		return element;
	} catch (error) {
		console.warn("Failed to validate image element:", error);
		return element;
	}
}

/**
 * Import elements from Clise format with image validation
 */
export async function importFromClise(
	jsonContent: string,
): Promise<CliseFileFormat> {
	try {
		const data = JSON.parse(jsonContent) as CliseFileFormat;

		// Validate the format
		if (!data.version || !data.elements || !Array.isArray(data.elements)) {
			throw new Error("Invalid Clise file format");
		}

		// Ensure backward compatibility - normalize groups to array
		if (!data.groups) {
			data.groups = [];
		} else if (!Array.isArray(data.groups)) {
			data.groups = Object.values(data.groups);
		}

		// Ensure backward compatibility - add default viewport if missing
		if (!data.viewport) {
			data.viewport = { zoom: 1, pan: { x: 0, y: 0 } };
		}

		// Validate and process image elements
		const validatedElements = await Promise.all(
			data.elements.map((element) => validateImageElement(element)),
		);

		return {
			...data,
			elements: validatedElements,
		};
	} catch (error) {
		throw new Error(
			`Failed to parse Clise file: ${
				error instanceof Error ? error.message : "Unknown error"
			}`,
		);
	}
}

/**
 * Download a file with the given content
 */
export function downloadFile(
	content: string,
	fileName: string,
	mimeType: string = "application/json",
) {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);

	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();

	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * Get all children of a frame element recursively
 */
export function getFrameChildren(
	frameId: string,
	allElements: Element[],
): Element[] {
	// Build adjacency map once for O(1) parent -> children lookups
	const childrenByParent = new Map<string, Element[]>();
	for (const el of allElements) {
		if (!el.parentId) continue;
		const arr = childrenByParent.get(el.parentId) ?? [];
		arr.push(el);
		if (!childrenByParent.has(el.parentId))
			childrenByParent.set(el.parentId, arr);
	}

	const result: Element[] = [];
	const stack: string[] = [frameId];
	const seen = new Set<string>();
	while (stack.length) {
		const pid = stack.pop()!;
		const kids = childrenByParent.get(pid) ?? [];
		for (const child of kids) {
			if (seen.has(child.id)) continue;
			seen.add(child.id);
			result.push(child);
			if (child.type === "frame") stack.push(child.id);
		}
	}
	return result;
}

/**
 * Get elements to export based on selection
 * If a frame is selected, includes all its children
 */
export function getElementsToExport(
	selectedIds: string[],
	allElements: Element[],
	allGroups: Group[],
): { elements: Element[]; groups: Group[] } {
	const elementsToExport: Element[] = [];
	const groupsToExport: Group[] = [];
	const processedElementIds = new Set<string>();
	const processedGroupIds = new Set<string>();

	const byId = new Map(allElements.map((e) => [e.id, e] as const));
	const groupById = new Map(allGroups.map((g) => [g.id, g] as const));
	// Reuse optimized frame traversal
	const addFrameDescendants = (frameId: string) => {
		const children = getFrameChildren(frameId, allElements);
		for (const child of children) {
			if (!processedElementIds.has(child.id)) {
				elementsToExport.push(child);
				processedElementIds.add(child.id);
			}
		}
	};

	for (const id of selectedIds) {
		const group = groupById.get(id);
		if (group && !processedGroupIds.has(id)) {
			groupsToExport.push(group);
			processedGroupIds.add(id);
			for (const elementId of group.elementIds) {
				const el = byId.get(elementId);
				if (el && !processedElementIds.has(elementId)) {
					elementsToExport.push(el);
					processedElementIds.add(elementId);
					if (el.type === "frame") addFrameDescendants(el.id);
				}
			}
		} else {
			const el = byId.get(id);
			if (el && !processedElementIds.has(id)) {
				elementsToExport.push(el);
				processedElementIds.add(id);
				if (el.type === "frame") addFrameDescendants(el.id);
			}
		}
	}

	const visibleElements = elementsToExport.filter((el) => el.visible !== false);
	return { elements: visibleElements, groups: groupsToExport };
}

/**
 * Read a file as text
 */
export function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			if (e.target?.result) {
				resolve(e.target.result as string);
			} else {
				reject(new Error("Failed to read file"));
			}
		};
		reader.onerror = () => reject(new Error("File reading error"));
		reader.readAsText(file);
	});
}

/**
 * Create a file input element for importing files
 */
export function createFileInput(
	accept: string = ".clise",
): Promise<File | null> {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = accept;
		input.style.display = "none";

		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0] || null;
			document.body.removeChild(input);
			resolve(file);
		};

		input.oncancel = () => {
			document.body.removeChild(input);
			resolve(null);
		};

		document.body.appendChild(input);
		input.click();
	});
}
