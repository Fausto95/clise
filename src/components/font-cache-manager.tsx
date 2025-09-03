import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, RefreshCw, Info } from "lucide-react";
import { useFontCache } from "../store/font-hooks";
import { fontCacheCleanup } from "../utils/font-cache-cleanup";

/**
 * Component for managing font cache - shows cache stats and provides cleanup options
 */
export const FontCacheManager = () => {
	const { t: _t } = useTranslation();
	const { getCacheStats, clearCache, isInitialized } = useFontCache();
	const [stats, setStats] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [showDetails, setShowDetails] = useState(false);

	// Load cache stats
	const loadStats = () => {
		if (isInitialized) {
			setStats(getCacheStats());
		}
	};

	useEffect(() => {
		loadStats();
	}, [isInitialized]);

	// Format bytes to human readable format
	const formatBytes = (bytes: number): string => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	// Handle manual cleanup
	const handleCleanup = async () => {
		setIsLoading(true);
		try {
			await fontCacheCleanup.performManualCleanup({
				removeExpired: true,
				removeUnused: true,
				removeLowUsage: true,
			});
			loadStats(); // Refresh stats
		} catch (error) {
			console.error("Cleanup failed:", error);
		} finally {
			setIsLoading(false);
		}
	};

	// Handle clear all cache
	const handleClearAll = async () => {
		if (
			!confirm(
				"Are you sure you want to clear all cached fonts? This will require re-downloading fonts.",
			)
		) {
			return;
		}

		setIsLoading(true);
		try {
			await clearCache();
			loadStats(); // Refresh stats
		} catch (error) {
			console.error("Clear cache failed:", error);
		} finally {
			setIsLoading(false);
		}
	};

	// Get cleanup recommendations
	const recommendations = fontCacheCleanup.getCleanupRecommendations();

	if (!isInitialized || !stats) {
		return (
			<div className="font-cache-manager">
				<div className="cache-status">
					<RefreshCw className="loading-icon" />
					<span>Initializing font cache...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="font-cache-manager">
			<div className="cache-header">
				<h3>Font Cache</h3>
				<button
					type="button"
					className="info-button"
					onClick={() => setShowDetails(!showDetails)}
					title="Show/hide details"
				>
					<Info size={16} />
				</button>
			</div>

			<div className="cache-stats">
				<div className="stat-item">
					<span className="stat-label">Cached Fonts:</span>
					<span className="stat-value">{stats.totalFonts}</span>
				</div>
				<div className="stat-item">
					<span className="stat-label">Cache Size:</span>
					<span className="stat-value">{formatBytes(stats.totalSize)}</span>
				</div>
				{stats.oldestFont && (
					<div className="stat-item">
						<span className="stat-label">Oldest Font:</span>
						<span className="stat-value">{stats.oldestFont}</span>
					</div>
				)}
				{stats.mostUsedFont && (
					<div className="stat-item">
						<span className="stat-label">Most Used:</span>
						<span className="stat-value">{stats.mostUsedFont}</span>
					</div>
				)}
			</div>

			{showDetails && (
				<div className="cache-details">
					<div className="recommendations">
						<h4>Cleanup Recommendations</h4>
						<p
							className={`recommendation ${
								recommendations.shouldCleanup ? "warning" : "ok"
							}`}
						>
							{recommendations.reason}
						</p>
						{recommendations.shouldCleanup && (
							<p className="savings">
								Estimated savings:{" "}
								{formatBytes(recommendations.estimatedSavings)}
							</p>
						)}
					</div>
				</div>
			)}

			<div className="cache-actions">
				<button
					type="button"
					className="action-button cleanup-button"
					onClick={handleCleanup}
					disabled={isLoading}
				>
					<RefreshCw className={isLoading ? "loading" : ""} size={16} />
					Cleanup Cache
				</button>
				<button
					type="button"
					className="action-button clear-button"
					onClick={handleClearAll}
					disabled={isLoading}
				>
					<Trash2 size={16} />
					Clear All
				</button>
			</div>
		</div>
	);
};
