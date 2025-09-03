let suppressUntil = 0;
let installed = false;

export function noteMenuClosed(durationMs: number = 600) {
	suppressUntil = Date.now() + Math.max(0, durationMs);
}

export function shouldSuppressOpen() {
	return Date.now() < suppressUntil;
}

export function installContextMenuGuard() {
	if (installed) return;
	installed = true;
	window.addEventListener(
		"contextmenu",
		(e) => {
			if (shouldSuppressOpen()) {
				e.preventDefault();
				e.stopPropagation();
			}
		},
		true,
	);
}
