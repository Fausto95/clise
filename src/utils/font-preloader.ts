import { fontManager } from "./font-manager";
import { GOOGLE_FONTS } from "./font-manager";

/**
 * Font preloader utility for delayed font loading after app launch
 */
class FontPreloader {
	private isPreloading = false;
	private preloadQueue: string[] = [];
	private preloadPromises: Map<string, Promise<void>> = new Map();

	// Start preloading popular fonts after app launch
	async startDelayedPreloading(): Promise<void> {
		if (this.isPreloading) {
			return;
		}

		this.isPreloading = true;

		// Wait for app to be fully loaded
		await this.waitForAppReady();

		// Start preloading popular fonts
		await this.preloadPopularFonts();

		// Continue with other fonts in background
		this.preloadRemainingFonts();
	}

	// Wait for app to be ready (DOM loaded, initial render complete)
	private async waitForAppReady(): Promise<void> {
		return new Promise((resolve) => {
			if (document.readyState === "complete") {
				// Add a small delay to ensure React has finished initial render
				setTimeout(resolve, 1000);
			} else {
				window.addEventListener("load", () => {
					setTimeout(resolve, 1000);
				});
			}
		});
	}

	// Preload the most popular fonts first
	private async preloadPopularFonts(): Promise<void> {
		const popularFonts = GOOGLE_FONTS.slice(0, 5); // Top 5 most popular

		console.log("Starting font preloading for popular fonts...");

		const preloadPromises = popularFonts.map(async (font) => {
			try {
				await this.preloadFont(font.family);
				console.log(`Preloaded font: ${font.name}`);
			} catch (error) {
				console.warn(`Failed to preload font ${font.name}:`, error);
			}
		});

		await Promise.allSettled(preloadPromises);
		console.log("Popular fonts preloading completed");
	}

	// Preload remaining fonts in background
	private async preloadRemainingFonts(): Promise<void> {
		const remainingFonts = GOOGLE_FONTS.slice(5); // Rest of the fonts

		// Process fonts in batches to avoid overwhelming the browser
		const batchSize = 2; // Reduced batch size for better performance
		for (let i = 0; i < remainingFonts.length; i += batchSize) {
			const batch = remainingFonts.slice(i, i + batchSize);

			const batchPromises = batch.map(async (font) => {
				try {
					await this.preloadFont(font.family);
					console.log(`Background preloaded font: ${font.name}`);
				} catch (error) {
					console.warn(
						`Failed to background preload font ${font.name}:`,
						error,
					);
				}
			});

			await Promise.allSettled(batchPromises);

			// Add delay between batches to avoid blocking the main thread
			await new Promise((resolve) => setTimeout(resolve, 750)); // Increased delay for better performance
		}

		console.log("All fonts preloading completed");
	}

	// Preload a specific font
	private async preloadFont(fontFamily: string): Promise<void> {
		// Check if already preloading or loaded
		if (this.preloadPromises.has(fontFamily)) {
			return this.preloadPromises.get(fontFamily);
		}

		const fontConfig = GOOGLE_FONTS.find((font) => font.family === fontFamily);
		if (!fontConfig) {
			return;
		}

		const preloadPromise = fontManager.loadWebFont(fontConfig);
		this.preloadPromises.set(fontFamily, preloadPromise);

		try {
			await preloadPromise;
		} catch (error) {
			this.preloadPromises.delete(fontFamily);
			throw error;
		}
	}

	// Check if a font is being preloaded
	isFontPreloading(fontFamily: string): boolean {
		return this.preloadPromises.has(fontFamily);
	}

	// Get preloading status
	getPreloadingStatus(): {
		isPreloading: boolean;
		queuedFonts: number;
		preloadingFonts: number;
	} {
		return {
			isPreloading: this.isPreloading,
			queuedFonts: this.preloadQueue.length,
			preloadingFonts: this.preloadPromises.size,
		};
	}

	// Stop preloading
	stopPreloading(): void {
		this.isPreloading = false;
		this.preloadQueue = [];
		this.preloadPromises.clear();
	}
}

// Export singleton instance
export const fontPreloader = new FontPreloader();
export default fontPreloader;
