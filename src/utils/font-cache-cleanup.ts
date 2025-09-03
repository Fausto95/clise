import { fontCacheManager } from "./font-cache-manager";

/**
 * Font cache cleanup utilities and scheduled tasks
 */
class FontCacheCleanup {
	private cleanupInterval: number | null = null;
	private readonly CLEANUP_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours (more frequent cleanup)
	private readonly IDLE_CLEANUP_DELAY = 2 * 60 * 1000; // 2 minutes after last activity (faster cleanup)

	// Start automatic cleanup
	startAutomaticCleanup(): void {
		if (this.cleanupInterval) {
			return; // Already running
		}

		// Run cleanup every 24 hours
		this.cleanupInterval = setInterval(async () => {
			try {
				await this.performCleanup();
			} catch (error) {
				console.warn("Scheduled font cache cleanup failed:", error);
			}
		}, this.CLEANUP_INTERVAL);

		// Also run cleanup when the page is about to be unloaded
		window.addEventListener("beforeunload", this.handleBeforeUnload.bind(this));

		// Run cleanup when the page becomes hidden (user switches tabs)
		document.addEventListener(
			"visibilitychange",
			this.handleVisibilityChange.bind(this),
		);
	}

	// Stop automatic cleanup
	stopAutomaticCleanup(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}

		window.removeEventListener(
			"beforeunload",
			this.handleBeforeUnload.bind(this),
		);
		document.removeEventListener(
			"visibilitychange",
			this.handleVisibilityChange.bind(this),
		);
	}

	// Perform cleanup with different strategies
	async performCleanup(): Promise<void> {
		try {
			const stats = fontCacheManager.getCacheStats();
			console.log("Font cache cleanup started:", stats);

			// Perform the actual cleanup
			await fontCacheManager.performCleanup();

			const newStats = fontCacheManager.getCacheStats();
			console.log("Font cache cleanup completed:", newStats);
		} catch (error) {
			console.error("Font cache cleanup failed:", error);
		}
	}

	// Handle page unload - perform quick cleanup
	private async handleBeforeUnload(): Promise<void> {
		try {
			// Quick cleanup - only remove expired fonts
			await this.performQuickCleanup();
		} catch (error) {
			console.warn("Quick font cache cleanup failed:", error);
		}
	}

	// Handle visibility change - perform cleanup when page becomes hidden
	private async handleVisibilityChange(): Promise<void> {
		if (document.hidden) {
			// Delay cleanup to avoid interfering with user activity
			setTimeout(async () => {
				if (document.hidden) {
					try {
						await this.performCleanup();
					} catch (error) {
						console.warn("Background font cache cleanup failed:", error);
					}
				}
			}, this.IDLE_CLEANUP_DELAY);
		}
	}

	// Perform quick cleanup (only expired fonts)
	private async performQuickCleanup(): Promise<void> {
		try {
			// This would need to be implemented in fontCacheManager
			// For now, we'll just call the regular cleanup
			await fontCacheManager.performCleanup();
		} catch (error) {
			console.warn("Quick cleanup failed:", error);
		}
	}

	// Manual cleanup with options
	async performManualCleanup(
		options: {
			removeExpired?: boolean;
			removeUnused?: boolean;
			removeLowUsage?: boolean;
			maxAge?: number;
		} = {},
	): Promise<void> {
		const {
			removeExpired: _removeExpired = true,
			removeUnused: _removeUnused = true,
			removeLowUsage: _removeLowUsage = false,
			maxAge = 30 * 24 * 60 * 60 * 1000, // 30 days
		} = options;

		try {
			// Update cache settings temporarily
			await fontCacheManager.updateCacheSettings(undefined, maxAge);

			// Perform cleanup
			await fontCacheManager.performCleanup();

			console.log("Manual font cache cleanup completed with options:", options);
		} catch (error) {
			console.error("Manual font cache cleanup failed:", error);
		}
	}

	// Get cleanup recommendations
	getCleanupRecommendations(): {
		shouldCleanup: boolean;
		reason: string;
		estimatedSavings: number;
	} {
		const stats = fontCacheManager.getCacheStats();

		// Check if cleanup is recommended
		const shouldCleanup = stats.totalSize > 10 * 1024 * 1024; // 10MB
		const reason = shouldCleanup
			? `Cache size is ${Math.round(stats.totalSize / 1024 / 1024)}MB`
			: "Cache size is within acceptable limits";

		// Estimate potential savings (rough calculation)
		const estimatedSavings = Math.round(stats.totalSize * 0.3); // Assume 30% can be cleaned

		return {
			shouldCleanup,
			reason,
			estimatedSavings,
		};
	}

	// Clear all cache (nuclear option)
	async clearAllCache(): Promise<void> {
		try {
			await fontCacheManager.clearCache();
			console.log("All font cache cleared");
		} catch (error) {
			console.error("Failed to clear all font cache:", error);
		}
	}
}

// Export singleton instance
export const fontCacheCleanup = new FontCacheCleanup();
export default fontCacheCleanup;
