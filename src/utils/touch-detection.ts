/**
 * Utility functions for detecting touch devices
 */

/**
 * Detects if the current device supports touch input
 * @returns true if the device supports touch, false otherwise
 */
export function isTouchDevice(): boolean {
	// Check for touch events support
	if ("ontouchstart" in window) {
		return true;
	}

	// Check for touch points
	if (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) {
		return true;
	}

	// Check for pointer events with touch capability
	if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
		return true;
	}

	// Check for mobile user agents as fallback
	const mobileRegex =
		/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
	if (navigator.userAgent && mobileRegex.test(navigator.userAgent)) {
		return true;
	}

	return false;
}

/**
 * Detects if the device is likely a mobile device based on screen size and touch capability
 * @returns true if the device appears to be mobile, false otherwise
 */
export function isMobileDevice(): boolean {
	return isTouchDevice() && window.innerWidth <= 768;
}
