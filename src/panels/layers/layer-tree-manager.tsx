import { useEffect, useMemo, useState } from "react";
import type { Element } from "@store/index";
import { Circle, Frame, Minus, Square, Type } from "lucide-react";

export const getIcon = (type: string, element?: Element) => {
	switch (type) {
		case "rect":
			return <Square size={16} />;
		case "ellipse":
			return <Circle size={16} />;
		case "text":
			return <Type size={16} />;
		case "path":
			// Show different icon for closed paths
			if (element && element.type === "path" && (element as any).closed) {
				return <Square size={16} />; // Use square for closed paths
			}
			return <Minus size={16} />; // Use line for open paths
		case "frame":
			return <Frame size={16} />;
		default:
			return <Minus size={16} />;
	}
};

// Get children of a specific parent (or root level if parentId is null)
export const getChildren = (
	elements: Element[],
	parentId: string | null,
): Element[] => {
	// Kept for compatibility in isolated uses; prefer childrenMap for efficiency
	return elements.filter((el) => el.parentId === parentId);
};

// Get root level elements (no parent)
export const getRootElements = (elements: Element[]): Element[] => {
	return elements.filter((el) => el.parentId === null);
};

export const useLayerTreeManager = (elements: Element[]) => {
	const [expandedFrames, setExpandedFrames] = useState<Set<string>>(new Set());

	// Build a parent -> children map once per elements change
	const childrenMap = useMemo(() => {
		const map = new Map<string | null, Element[]>();
		for (const el of elements) {
			const key = el.parentId;
			const arr = map.get(key) ?? [];
			arr.push(el);
			if (!map.has(key)) map.set(key, arr);
		}
		return map;
	}, [elements]);

	// Auto-expand frames that have children
	useEffect(() => {
		// Compute parent ids that have at least one child in O(n)
		const parentIdsWithChildren = new Set(
			elements.filter((el) => el.parentId !== null).map((el) => el.parentId!),
		);
		const framesWithChildren = elements
			.filter((el) => el.type === "frame")
			.filter((frame) => parentIdsWithChildren.has(frame.id))
			.map((frame) => frame.id);

		setExpandedFrames((prev) => {
			const newSet = new Set(prev);
			framesWithChildren.forEach((frameId) => newSet.add(frameId));
			return newSet;
		});
	}, [elements]);

	const toggleExpanded = (frameId: string) => {
		setExpandedFrames((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(frameId)) {
				newSet.delete(frameId);
			} else {
				newSet.add(frameId);
			}
			return newSet;
		});
	};

	const rootElements = getRootElements(elements);

	return {
		expandedFrames,
		toggleExpanded,
		rootElements,
		childrenMap,
	};
};
