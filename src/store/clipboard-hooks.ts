import { useAtomValue, useSetAtom } from "jotai";
import {
	clipboardAtom,
	copyElementsAtom,
	pasteElementsAtom,
} from "./clipboard-atoms";
import { duplicateElementsAtom } from "./element-atoms";

export const useCopyElements = () => useSetAtom(copyElementsAtom);
export const usePasteElements = () => useSetAtom(pasteElementsAtom);
export const useDuplicateElements = () => useSetAtom(duplicateElementsAtom);
export const useClipboard = () => useAtomValue(clipboardAtom);
