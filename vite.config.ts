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
	// Configure WASM support for CanvasKit and font assets
	assetsInclude: [
		"**/*.wasm",
		"**/*.woff2",
		"**/*.woff",
		"**/*.ttf",
		"**/*.otf",
	],
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
	build: {
		assetsDir: "assets",
		rollupOptions: {
			output: {
				assetFileNames: (assetInfo) => {
					// Keep font files with their original names for better caching
					if (
						assetInfo.name &&
						/\.(woff2?|ttf|otf|eot)$/.test(assetInfo.name)
					) {
						return `assets/fonts/[name]-[hash][extname]`;
					}
					return `assets/[name]-[hash][extname]`;
				},
			},
		},
	},
});
