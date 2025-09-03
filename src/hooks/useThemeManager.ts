import { useEffect } from "react";

type Theme = "light" | "dark" | "auto";

const getSystemTheme = (): "light" | "dark" =>
	window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const applyTheme = (theme: Theme) => {
	const actual = theme === "auto" ? getSystemTheme() : theme;
	document.documentElement.setAttribute("data-theme", actual);
	// Notify listeners (e.g., canvas) of theme changes
	window.dispatchEvent(
		new CustomEvent("themeChanged", { detail: { theme: actual } }),
	);
};

export const useThemeManager = () => {
	useEffect(() => {
		// Read saved preference (fallback to auto)
		const saved = (localStorage.getItem("theme") as Theme) || "auto";
		const theme: Theme = ["light", "dark", "auto"].includes(saved)
			? saved
			: "auto";
		applyTheme(theme);

		// If auto, watch system changes
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => theme === "auto" && applyTheme("auto");
		if (mq.addEventListener) mq.addEventListener("change", onChange);
		else mq.addListener(onChange);

		// Respond to changes from other tabs (storage event)
		const onStorage = (e: StorageEvent) => {
			if (e.key === "theme" && e.newValue) {
				const t = e.newValue as Theme;
				if (["light", "dark", "auto"].includes(t)) applyTheme(t);
			}
		};
		window.addEventListener("storage", onStorage);

		return () => {
			if (mq.removeEventListener) mq.removeEventListener("change", onChange);
			else mq.removeListener(onChange);
			window.removeEventListener("storage", onStorage);
		};
	}, []);
};
