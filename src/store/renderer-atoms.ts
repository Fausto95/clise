import { atom } from "jotai";
import type { CanvasKitInstance } from "../types/canvaskit";
import type { CanvasKitRenderer } from "../canvas/canvaskit/drawing/canvas-kit-renderer";

// Feature flags for renderer selection
export const useCanvasKitAtom = atom<boolean>(false);
export const rendererModeAtom = atom<"canvas2d" | "canvaskit">("canvas2d");

// CanvasKit state atoms
export const canvasKitInstanceAtom = atom<CanvasKitInstance | null>(null);
export const canvasKitRendererAtom = atom<CanvasKitRenderer | null>(null);
