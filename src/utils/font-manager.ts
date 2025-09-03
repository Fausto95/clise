import type {
	CanvasKitInstance,
	CanvasKitFont,
	CanvasKitTypeface,
} from "../types/canvaskit";
import { fontCacheManager } from "./font-cache-manager";

// Font configuration interface
export interface FontConfig {
	name: string;
	family: string;
	weight?: number;
	style?: "normal" | "italic";
	url?: string;
	isWebFont?: boolean;
	isGoogleFont?: boolean;
	source?: "system" | "google" | "custom";
	variants?: string[];
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
	source: "google",
	isGoogleFont: true,
	variants: ["400"],
	url: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2",
};

// Most popular Google Fonts used in design tools (Figma, Canva, Adobe, etc.)
export const GOOGLE_FONTS: FontConfig[] = [
	// Sans-serif fonts (most popular in design tools)
	{
		name: "Inter",
		family: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
		isGoogleFont: true,
		source: "google",
		variants: ["400"],
		url: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2",
	},
	{
		name: "Roboto",
		family: "Roboto, -apple-system, BlinkMacSystemFont, sans-serif",
		isGoogleFont: true,
		source: "google",
		variants: ["400"],
		url: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2",
	},
	{
		name: "Open Sans",
		family: "Open Sans, -apple-system, BlinkMacSystemFont, sans-serif",
		isGoogleFont: true,
		source: "google",
		variants: ["400"],
		url: "https://fonts.gstatic.com/s/opensans/v34/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVc.woff2",
	},
	{
		name: "Montserrat",
		family: "Montserrat, -apple-system, BlinkMacSystemFont, sans-serif",
		isGoogleFont: true,
		source: "google",
		variants: ["400"],
		url: "https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2",
	},
	{
		name: "Poppins",
		family: "Poppins, -apple-system, BlinkMacSystemFont, sans-serif",
		isGoogleFont: true,
		source: "google",
		variants: ["400"],
		url: "https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecg.woff2",
	},
	{
		name: "Lato",
		family: "Lato, -apple-system, BlinkMacSystemFont, sans-serif",
		isGoogleFont: true,
		source: "google",
		variants: ["400"],
		url: "https://fonts.gstatic.com/s/lato/v23/S6uyw4BMUTPHjx4wXiWtFCc.woff2",
	},
	{
		name: "Nunito",
		family: "Nunito, -apple-system, BlinkMacSystemFont, sans-serif",
		isGoogleFont: true,
		source: "google",
		variants: ["400"],
		url: "https://fonts.gstatic.com/s/nunito/v25/XRXV3I6Li01BKofINeaE.woff2",
	},
	{
		name: "Source Sans Pro",
		family: "Source Sans Pro, -apple-system, BlinkMacSystemFont, sans-serif",
		isGoogleFont: true,
		source: "google",
		variants: ["400"],
		url: "https://fonts.gstatic.com/s/sourcesanspro/v21/6xK3dSBYKcSV-LCoeQqfX1RYOo3qOK7lujVj9w.woff2",
	},
	{
		name: "Work Sans",
		family: "Work Sans, -apple-system, BlinkMacSystemFont, sans-serif",
		isGoogleFont: true,
		source: "google",
		variants: ["400"],
		url: "https://fonts.gstatic.com/s/worksans/v19/QGY_z_wNahGAdqQ43RhVcIgYT2Xz5u32K0vWBi8Jow.woff2",
	},
	{
		name: "DM Sans",
		family: "DM Sans, -apple-system, BlinkMacSystemFont, sans-serif",
		isGoogleFont: true,
		source: "google",
		variants: ["400"],
		url: "https://fonts.gstatic.com/s/dmsans/v14/rP2Hp2ywxg089UriCZOIHQ.woff2",
	},
	// Serif fonts (popular for headings and display text)
	{
		name: "Playfair Display",
		family: "Playfair Display, -apple-system, BlinkMacSystemFont, serif",
		isGoogleFont: true,
		source: "google",
		variants: ["400"],
		url: "https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtXK-F2qO0isEw.woff2",
	},
	{
		name: "Merriweather",
		family: "Merriweather, -apple-system, BlinkMacSystemFont, serif",
		isGoogleFont: true,
		source: "google",
		variants: ["400"],
		url: "https://fonts.gstatic.com/s/merriweather/v30/u-440qyriQwlOrhSvowK_l5-fCZMdeX3rsHo.woff2",
	},
	{
		name: "Lora",
		family: "Lora, -apple-system, BlinkMacSystemFont, serif",
		isGoogleFont: true,
		source: "google",
		variants: ["400"],
		url: "https://fonts.gstatic.com/s/lora/v32/0QI6MX1D_JOuGQbT0gvTJPa787weuxJBkqg.woff2",
	},
	// Monospace fonts (for code and technical content)
	{
		name: "Source Code Pro",
		family: "Source Code Pro, -apple-system, BlinkMacSystemFont, monospace",
		isGoogleFont: true,
		source: "google",
		variants: ["400"],
		url: "https://fonts.gstatic.com/s/sourcecodepro/v23/HI_SiYsKILxRpg3hIP6sJ7fM7PqlPevWnsUnxg.woff2",
	},
	{
		name: "Fira Code",
		family: "Fira Code, -apple-system, BlinkMacSystemFont, monospace",
		isGoogleFont: true,
		source: "google",
		variants: ["400"],
		url: "https://fonts.gstatic.com/s/firacode/v22/uU9eCBsR6Z2vfE9aq3bL0fxyUs4tcw4W_D1sJV37MOzlojw8Q.woff2",
	},
];

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
		return [DEFAULT_FONT, ...GOOGLE_FONTS];
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

	// Load a web font (Google Font or custom)
	async loadWebFont(fontConfig: FontConfig, elementId?: string): Promise<void> {
		if (!fontConfig.url || this.loadedWebFonts.has(fontConfig.family)) {
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
					"Failed to load cached font, falling back to network:",
					error,
				);
			}
		}

		// Set loading state
		this.fontLoadingStates.set(fontConfig.family, {
			state: "loading",
		});

		const loadPromise = this.loadFontFromUrl(fontConfig, elementId);
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

	// Load font from URL
	private async loadFontFromUrl(
		fontConfig: FontConfig,
		elementId?: string,
	): Promise<void> {
		if (fontConfig.isGoogleFont && fontConfig.url) {
			// Load Google Font file directly
			await this.loadGoogleFontFile(fontConfig, elementId);
		} else if (fontConfig.url) {
			// Load custom font file
			await this.loadCustomFont(fontConfig, elementId);
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
	createFont(fontFamily: string, fontSize: number): CanvasKitFont {
		if (!this.canvasKit) {
			throw new Error("CanvasKit not initialized");
		}

		if (!fontFamily) {
			throw new Error("Font family is required");
		}

		const canvasKit = this.canvasKit;

		// Extract the primary font name from font family string (e.g., "Inter" from "Inter, sans-serif")
		const fontParts = fontFamily.split(",");
		const primaryFontName = (fontParts[0] || fontFamily)
			.trim()
			.replace(/["']/g, "");

		// Try to get typeface using the primary font name
		let typeface = this.getTypeface(primaryFontName);

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

			// For Google fonts that haven't loaded yet, trigger loading and use fallback
			const googleFont = GOOGLE_FONTS.find(
				(font) =>
					font.family === primaryFontName || font.name === primaryFontName,
			);

			if (googleFont) {
				// Trigger async loading (don't wait)
				this.loadWebFont(googleFont).catch(console.error);
				// Use fallback font for now
				return new canvasKit.Font(null, fontSize);
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
