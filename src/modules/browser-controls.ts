import { useEffect } from "react";

export const useBrowserControls = () => {
	// Prevent ALL browser zoom, canvas has its own zoom handling
	useEffect(() => {
		const preventZoom = (e: WheelEvent) => {
			// Prevent all Ctrl/Cmd + scroll browser zoom
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();
			}
		};

		const preventKeyboardZoom = (e: KeyboardEvent) => {
			// Prevent all Ctrl/Cmd + Plus/Minus browser zoom shortcuts
			if (
				(e.ctrlKey || e.metaKey) &&
				(e.key === "+" || e.key === "-" || e.key === "=")
			) {
				e.preventDefault();
			}
		};

		const preventTouchZoom = (e: TouchEvent) => {
			// Prevent all pinch-to-zoom on touch devices
			if (e.touches.length > 1) {
				e.preventDefault();
			}
		};

		// Add event listeners
		document.addEventListener("wheel", preventZoom, { passive: false });
		document.addEventListener("keydown", preventKeyboardZoom);
		document.addEventListener("touchmove", preventTouchZoom, {
			passive: false,
		});

		return () => {
			document.removeEventListener("wheel", preventZoom);
			document.removeEventListener("keydown", preventKeyboardZoom);
			document.removeEventListener("touchmove", preventTouchZoom);
		};
	}, []);
};
