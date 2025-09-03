import { useAtom } from "jotai";
import { documentNameAtom, toolAtom } from "./document-atoms";

// Document hooks
export const useDocumentName = () => useAtom(documentNameAtom);
export const useTool = () => useAtom(toolAtom);
