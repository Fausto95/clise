import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@store": "/src/store",
			"@components": "/src/components",
			"@canvas": "/src/canvas",
			"@panels": "/src/panels",
			"@context-menu": "/src/context-menu",
		},
	},
	// Configure WASM support for CanvasKit
	assetsInclude: ["**/*.wasm"],
	server: {
		fs: {
			allow: [".."],
		},
		headers: {
			"Cross-Origin-Embedder-Policy": "require-corp",
			"Cross-Origin-Opener-Policy": "same-origin",
		},
	},
	optimizeDeps: {
		exclude: ["canvaskit-wasm"],
	},
});
