import { atom } from "jotai";
import type { SVGPathInfo } from "../../utils/svg-utils";
import { applySVGPathColors } from "../../utils/svg-utils";
import { isTransactionAtom, pushHistoryAtom } from "../history-atoms";
import { elementAtomFamily } from "./element-state";

// SVG path color update atom
export const updateImageSVGPathsAtom = atom(
	null,
	(get, set, { id, svgPaths }: { id: string; svgPaths: SVGPathInfo[] }) => {
		const element = get(elementAtomFamily(id));
		if (!element || element.type !== "image" || !element.svgPaths) return;

		// Only push to history if not in a transaction
		const inTransaction = get(isTransactionAtom);
		if (!inTransaction) {
			set(pushHistoryAtom);
		}

		// Generate new SVG with updated colors - this will create a new data URL
		// The canvas renderer will automatically cache the new image with the new src key
		const newSrc = applySVGPathColors(element.src, svgPaths);

		set(elementAtomFamily(id), {
			...element,
			src: newSrc,
			svgPaths,
		});
	},
);
