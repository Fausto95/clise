import { useAtom } from "jotai";
import {
	canvasKitInstanceAtom,
	canvasKitRendererAtom,
	rendererModeAtom,
	useCanvasKitAtom,
} from "./renderer-atoms";

// Renderer control hooks
export const useCanvasKit = () => useAtom(useCanvasKitAtom);
export const useRendererMode = () => useAtom(rendererModeAtom);

// Canvas rendering state hooks
export const useCanvasKitInstance = () => useAtom(canvasKitInstanceAtom);
export const useRendererRef = () => useAtom(canvasKitRendererAtom);
