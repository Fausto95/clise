import { useState, useEffect } from "react";
import { fontPreloader } from "../utils/font-preloader";

/**
 * Optional component to show font preloading status
 * Can be used for debugging or monitoring font loading progress
 */
export const FontPreloadStatus = () => {
	const [status, setStatus] = useState({
		isPreloading: false,
		queuedFonts: 0,
		preloadingFonts: 0,
	});

	useEffect(() => {
		const updateStatus = () => {
			setStatus(fontPreloader.getPreloadingStatus());
		};

		// Update status every second while preloading
		const interval = setInterval(updateStatus, 1000);

		// Initial status check
		updateStatus();

		return () => clearInterval(interval);
	}, []);

	// Only show if preloading is active
	if (!status.isPreloading && status.preloadingFonts === 0) {
		return null;
	}

	return (
		<div
			style={{
				position: "fixed",
				bottom: "20px",
				right: "20px",
				background: "rgba(0, 0, 0, 0.8)",
				color: "white",
				padding: "8px 12px",
				borderRadius: "6px",
				fontSize: "12px",
				fontFamily: "monospace",
				zIndex: 1000,
				pointerEvents: "none",
			}}
		>
			<div>Fonts: {status.preloadingFonts} loading</div>
			{status.queuedFonts > 0 && <div>Queued: {status.queuedFonts}</div>}
		</div>
	);
};
