import type {
	CanvasKitInstance,
	CanvasKitFont,
	CanvasKitTypeface,
} from "../types/canvaskit";
import { fontCacheManager } from "./font-cache-manager";
import { generateLocalFontConfigs } from "./local-font-config";
import inter300 from "../assets/fonts/inter-1.woff2";
import inter400 from "../assets/fonts/inter-2.woff2";
import inter500 from "../assets/fonts/inter-3.woff2";
import inter600 from "../assets/fonts/inter-4.woff2";
import inter700 from "../assets/fonts/inter-5.woff2";
import inter800 from "../assets/fonts/inter-6.woff2";

// Font variant data interface
export interface FontVariantData {
	weight: number;
	style: "normal" | "italic";
	fileName: string;
	path: string;
}

// Font configuration interface
export interface FontConfig {
	name: string;
	family: string;
	weight?: number;
	style?: "normal" | "italic";
	url?: string;
	localPath?: string;
	isWebFont?: boolean;
	isGoogleFont?: boolean;
	isLocalFont?: boolean;
	source?: "system" | "google" | "custom" | "local";
	variants?: string[];
	variantsData?: Map<string, FontVariantData>;
}

// Font loading state
export type FontLoadingState = "idle" | "loading" | "loaded" | "error";

export interface FontLoadingInfo {
	state: FontLoadingState;
	error?: string;
}

// Default fallback font (Inter as primary, single system fallback)
export const DEFAULT_FONT: FontConfig = {
	name: "Inter",
	family: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
	source: "local",
	isLocalFont: true,
	isWebFont: true,
	variants: ["300", "400", "500", "600", "700", "800"],
	variantsData: new Map([
		[
			"300",
			{
				weight: 300,
				style: "normal",
				fileName: "inter-1.woff2",
				path: inter300,
			},
		],
		[
			"400",
			{
				weight: 400,
				style: "normal",
				fileName: "inter-2.woff2",
				path: inter400,
			},
		],
		[
			"500",
			{
				weight: 500,
				style: "normal",
				fileName: "inter-3.woff2",
				path: inter500,
			},
		],
		[
			"600",
			{
				weight: 600,
				style: "normal",
				fileName: "inter-4.woff2",
				path: inter600,
			},
		],
		[
			"700",
			{
				weight: 700,
				style: "normal",
				fileName: "inter-5.woff2",
				path: inter700,
			},
		],
		[
			"800",
			{
				weight: 800,
				style: "normal",
				fileName: "inter-6.woff2",
				path: inter800,
			},
		],
	]),
	localPath: inter400,
};

// Local fonts available in the application
export const LOCAL_FONTS: FontConfig[] = generateLocalFontConfigs();

// Legacy alias for backward compatibility
export const GOOGLE_FONTS: FontConfig[] = LOCAL_FONTS;

class FontManager {
	private canvasKit: CanvasKitInstance | null = null;
	private typefaceCache = new Map<string, CanvasKitTypeface>();
	private fontLoadingStates = new Map<string, FontLoadingInfo>();
	private loadedWebFonts = new Set<string>();
	private fontLoadPromises = new Map<string, Promise<void>>();
	private onFontLoadedCallbacks = new Set<() => void>();

	// Initialize with CanvasKit instance
	async initialize(canvasKit: CanvasKitInstance) {
		this.canvasKit = canvasKit;

		// Initialize font cache
		try {
			await fontCacheManager.initialize();
			await this.restoreCachedFonts();
		} catch (error) {
			console.warn("Failed to initialize font cache:", error);
		}
	}

	// Register callback for when fonts are loaded
	onFontLoaded(callback: () => void): () => void {
		this.onFontLoadedCallbacks.add(callback);
		// Return unsubscribe function
		return () => {
			this.onFontLoadedCallbacks.delete(callback);
		};
	}

	// Trigger font loaded callbacks
	private triggerFontLoadedCallbacks(): void {
		this.onFontLoadedCallbacks.forEach((callback) => {
			try {
				callback();
			} catch (error) {
				console.error("Error in font loaded callback:", error);
			}
		});
	}

	// Get all available fonts
	getAllFonts(): FontConfig[] {
		return [DEFAULT_FONT, ...LOCAL_FONTS];
	}

	// Get font loading state
	getFontLoadingState(fontFamily: string): FontLoadingState {
		const info = this.fontLoadingStates.get(fontFamily);
		return info?.state || "idle";
	}

	// Set font loading state
	setFontLoadingState(
		fontFamily: string,
		state: FontLoadingState,
		error?: string,
	): void {
		this.fontLoadingStates.set(fontFamily, {
			state,
			error: state === "error" ? error : undefined,
		});
	}

	// Get detailed font loading info
	getFontLoadingInfo(fontFamily: string): FontLoadingInfo {
		return (
			this.fontLoadingStates.get(fontFamily) || {
				state: "idle",
				error: undefined,
			}
		);
	}

	// Load a web font (local, Google Font, or custom)
	async loadWebFont(fontConfig: FontConfig, elementId?: string): Promise<void> {
		if (this.loadedWebFonts.has(fontConfig.family)) {
			return;
		}

		// Check if already loading
		const existingPromise = this.fontLoadPromises.get(fontConfig.family);
		if (existingPromise) {
			return existingPromise;
		}

		// Check cache first
		const cachedFontData = await fontCacheManager.getCachedFont(
			fontConfig.family,
		);
		if (cachedFontData) {
			try {
				await this.loadFontFromBuffer(
					fontConfig.family,
					cachedFontData,
					elementId,
				);
				this.loadedWebFonts.add(fontConfig.family);
				this.fontLoadingStates.set(fontConfig.family, {
					state: "loaded",
				});
				this.triggerFontLoadedCallbacks();
				return;
			} catch (error) {
				console.warn(
					"Failed to load cached font, falling back to source:",
					error,
				);
			}
		}

		// Set loading state
		this.fontLoadingStates.set(fontConfig.family, {
			state: "loading",
		});

		const loadPromise = this.loadFontFromSource(fontConfig, elementId);
		this.fontLoadPromises.set(fontConfig.family, loadPromise);

		try {
			await loadPromise;
			this.loadedWebFonts.add(fontConfig.family);
			this.fontLoadingStates.set(fontConfig.family, {
				state: "loaded",
			});
			// Trigger callbacks to re-render canvas
			this.triggerFontLoadedCallbacks();
		} catch (error) {
			this.fontLoadingStates.set(fontConfig.family, {
				state: "error",
				error: error instanceof Error ? error.message : "Failed to load font",
			});
			throw error;
		} finally {
			this.fontLoadPromises.delete(fontConfig.family);
		}
	}

	// Load font from source (local, Google Font, or custom)
	private async loadFontFromSource(
		fontConfig: FontConfig,
		elementId?: string,
	): Promise<void> {
		if (fontConfig.isLocalFont && fontConfig.localPath) {
			// Load local font file
			await this.loadLocalFontFile(fontConfig, elementId);
		} else if (fontConfig.isGoogleFont && fontConfig.url) {
			// Load Google Font file directly
			await this.loadGoogleFontFile(fontConfig, elementId);
		} else if (fontConfig.url) {
			// Load custom font file
			await this.loadCustomFont(fontConfig, elementId);
		}
	}

	// Load local font file and create CanvasKit typeface
	private async loadLocalFontFile(
		fontConfig: FontConfig,
		elementId?: string,
	): Promise<void> {
		if (!fontConfig.localPath) {
			throw new Error("Local font path is required");
		}

		try {
			// localPath is now a URL string from Vite asset imports
			console.log(
				`Loading local font: ${fontConfig.family} from ${fontConfig.localPath}`,
			);
			const response = await fetch(fontConfig.localPath);
			if (!response.ok) {
				throw new Error(`Failed to fetch local font: ${response.statusText}`);
			}

			const fontData = await response.arrayBuffer();
			await this.loadFontFromBuffer(fontConfig.family, fontData, elementId);
		} catch (error) {
			console.error(`Failed to load local font ${fontConfig.family}:`, error);
			throw new Error(`Failed to load local font: ${error}`);
		}
	}

	// Load Google Font file and create CanvasKit typeface
	private async loadGoogleFontFile(
		fontConfig: FontConfig,
		elementId?: string,
	): Promise<void> {
		if (!fontConfig.url) {
			throw new Error("Google Font URL is required");
		}

		try {
			const response = await fetch(fontConfig.url);
			if (!response.ok) {
				throw new Error(`Failed to fetch Google Font: ${response.statusText}`);
			}

			const fontData = await response.arrayBuffer();
			await this.loadFontFromBuffer(fontConfig.family, fontData, elementId);
		} catch (error) {
			throw new Error(`Failed to load Google Font: ${error}`);
		}
	}

	// Load custom font file
	private async loadCustomFont(
		fontConfig: FontConfig,
		elementId?: string,
	): Promise<void> {
		if (!fontConfig.url) return;

		try {
			const response = await fetch(fontConfig.url);
			if (!response.ok) {
				throw new Error(`Failed to fetch font: ${response.statusText}`);
			}

			const fontData = await response.arrayBuffer();
			await this.loadFontFromBuffer(fontConfig.family, fontData, elementId);
		} catch (error) {
			throw new Error(`Failed to load custom font: ${error}`);
		}
	}

	// Load font from ArrayBuffer and create CanvasKit typeface
	private async loadFontFromBuffer(
		fontFamily: string,
		fontData: ArrayBuffer,
		elementId?: string,
	): Promise<void> {
		if (!this.canvasKit) {
			throw new Error("CanvasKit not initialized");
		}

		try {
			const typeface =
				this.canvasKit.Typeface.MakeFreeTypeFaceFromData(fontData);
			if (typeface) {
				this.typefaceCache.set(fontFamily, typeface);

				// Cache the font data for future use
				const fontConfig = this.getAllFonts().find(
					(font) => font.family === fontFamily,
				);
				if (fontConfig) {
					await fontCacheManager.cacheFont(fontConfig, fontData, elementId);
				}
			} else {
				throw new Error("Failed to create typeface from font data");
			}
		} catch (error) {
			throw new Error(`Failed to create CanvasKit typeface: ${error}`);
		}
	}

	// Get CanvasKit typeface for a font family
	getTypeface(fontFamily: string): CanvasKitTypeface | null {
		return this.typefaceCache.get(fontFamily) || null;
	}

	// Create CanvasKit font with proper typeface
	createFont(
		fontFamily: string,
		fontSize: number,
		fontWeight?: string,
	): CanvasKitFont {
		if (!this.canvasKit) {
			throw new Error("CanvasKit not initialized");
		}

		if (!fontFamily) {
			throw new Error("Font family is required");
		}

		const canvasKit = this.canvasKit;

		// Log font weight for debugging
		if (fontWeight && fontWeight !== "400" && fontWeight !== "normal") {
			console.log(
				`Creating font with weight: ${fontWeight} for family: ${fontFamily}`,
			);
		}

		// Extract the primary font name from font family string (e.g., "Inter" from "Inter, sans-serif")
		const fontParts = fontFamily.split(",");
		const primaryFontName = (fontParts[0] || fontFamily)
			.trim()
			.replace(/["']/g, "");

		// Try to get typeface using the primary font name with weight
		let typefaceKey = primaryFontName;
		if (fontWeight && fontWeight !== "400" && fontWeight !== "normal") {
			typefaceKey = `${primaryFontName}-${fontWeight}`;
		}

		let typeface = this.getTypeface(typefaceKey);

		// If not found, try with the primary font name without weight
		if (!typeface) {
			typeface = this.getTypeface(primaryFontName);
		}

		// If not found, try with the full font family string
		if (!typeface) {
			typeface = this.getTypeface(fontFamily);
		}

		// If no typeface found, use default font or fallback
		if (!typeface) {
			// Check if it's the default font or Inter
			const isDefaultFont =
				fontFamily === DEFAULT_FONT.family ||
				fontFamily === "Inter" ||
				fontFamily.includes("Inter") ||
				primaryFontName === "Inter";

			if (isDefaultFont) {
				return new canvasKit.Font(null, fontSize);
			}

			// For local fonts that haven't loaded yet, trigger loading and use fallback
			const localFont = LOCAL_FONTS.find(
				(font) =>
					font.family === fontFamily ||
					font.name === primaryFontName ||
					font.family.includes(primaryFontName),
			);

			if (localFont) {
				// Check if we need to load a specific weight variant
				if (
					fontWeight &&
					fontWeight !== "400" &&
					fontWeight !== "normal" &&
					localFont.variantsData
				) {
					const variant = localFont.variantsData.get(fontWeight);
					if (variant) {
						// Create a temporary font config for this specific weight
						const weightFontConfig: FontConfig = {
							...localFont,
							localPath: variant.path,
							name: `${localFont.name}-${fontWeight}`,
							family: `${localFont.family}-${fontWeight}`,
						};
						// Trigger async loading of the specific weight (don't wait)
						this.loadWebFont(weightFontConfig).catch(console.error);
					}
				} else {
					// Trigger async loading of the default font (don't wait)
					this.loadWebFont(localFont).catch(console.error);
				}

				// Use Inter font as fallback instead of null to prevent text disappearing
				console.log(`Font ${fontFamily} not loaded yet, using Inter fallback`);
				const interTypeface = this.getTypeface("Inter");
				return new canvasKit.Font(interTypeface || null, fontSize);
			}
		}

		return new canvasKit.Font(typeface || null, fontSize);
	}

	// Preload popular fonts
	async preloadPopularFonts(): Promise<void> {
		const popularFonts = GOOGLE_FONTS.slice(0, 5); // Load first 5 popular fonts
		const loadPromises = popularFonts.map((font) =>
			this.loadWebFont(font).catch((error) => {
				console.warn(`Failed to preload font ${font.name}:`, error);
			}),
		);

		await Promise.allSettled(loadPromises);
	}

	// Check if font is available
	isFontAvailable(fontFamily: string): boolean {
		// Check if it's the default font
		if (fontFamily === DEFAULT_FONT.family || fontFamily === "Inter") {
			return true;
		}

		// Check if web font is loaded
		return this.loadedWebFonts.has(fontFamily);
	}

	// Get font fallback chain
	getFontFallback(fontFamily: string): string {
		const fontConfig = this.getAllFonts().find(
			(font) => font.family === fontFamily,
		);
		return fontConfig?.family || "Arial, sans-serif";
	}

	// Clear cache
	clearCache(): void {
		this.typefaceCache.clear();
		this.fontLoadingStates.clear();
		this.loadedWebFonts.clear();
		this.fontLoadPromises.clear();
	}

	// Restore cached fonts on initialization
	private async restoreCachedFonts(): Promise<void> {
		try {
			const cachedFontFamilies = fontCacheManager.getCachedFontFamilies();

			for (const fontFamily of cachedFontFamilies) {
				const cachedFontData = await fontCacheManager.getCachedFont(fontFamily);
				if (cachedFontData) {
					try {
						await this.loadFontFromBuffer(fontFamily, cachedFontData);
						this.loadedWebFonts.add(fontFamily);
						this.fontLoadingStates.set(fontFamily, {
							state: "loaded",
						});
					} catch (error) {
						console.warn(`Failed to restore cached font ${fontFamily}:`, error);
					}
				}
			}
		} catch (error) {
			console.warn("Failed to restore cached fonts:", error);
		}
	}

	// Upload custom font
	async uploadCustomFont(file: File, elementId?: string): Promise<FontConfig> {
		const fontData = await file.arrayBuffer();
		const fontFamily = file.name.replace(/\.[^/.]+$/, ""); // Remove extension

		await this.loadFontFromBuffer(fontFamily, fontData, elementId);

		const customFont: FontConfig = {
			name: fontFamily,
			family: fontFamily,
			isWebFont: true,
		};

		return customFont;
	}

	// Load font for specific element
	async loadFontForElement(
		fontConfig: FontConfig,
		elementId: string,
	): Promise<void> {
		await this.loadWebFont(fontConfig, elementId);

		// Associate element with font
		try {
			await fontCacheManager.associateElementWithFont(
				elementId,
				fontConfig.family,
			);
		} catch (error) {
			console.warn("Failed to associate element with font:", error);
		}
	}

	// Remove element font association
	async removeElementFontAssociation(elementId: string): Promise<void> {
		try {
			await fontCacheManager.removeElementFontAssociation(elementId);
		} catch (error) {
			console.warn("Failed to remove element font association:", error);
		}
	}
}

// Export singleton instance
export const fontManager = new FontManager();
export default fontManager;
