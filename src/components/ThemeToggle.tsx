import type React from "react";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "auto";

const getSystemTheme = (): "light" | "dark" => {
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
};

const applyTheme = (theme: Theme) => {
	const actualTheme = theme === "auto" ? getSystemTheme() : theme;
	document.documentElement.setAttribute("data-theme", actualTheme);
};

export const ThemeToggle: React.FC = () => {
	const [theme, setTheme] = useState<Theme>("auto");

	useEffect(() => {
		// Check localStorage for saved theme
		const savedTheme = localStorage.getItem("theme") as Theme;
		if (savedTheme && ["light", "dark", "auto"].includes(savedTheme)) {
			setTheme(savedTheme);
			applyTheme(savedTheme);
		} else {
			// Default to auto
			setTheme("auto");
			applyTheme("auto");
		}
	}, []);

	// Listen for system theme changes when in auto mode
	useEffect(() => {
		if (theme !== "auto") return;

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = () => {
			applyTheme("auto");
			// Dispatch theme change event
			window.dispatchEvent(
				new CustomEvent("themeChanged", {
					detail: { theme: getSystemTheme() },
				}),
			);
		};

		mediaQuery.addListener(handleChange);
		return () => mediaQuery.removeListener(handleChange);
	}, [theme]);

	const toggleTheme = () => {
		const themes: Theme[] = ["auto", "light", "dark"];
		const currentIndex = themes.indexOf(theme);
		const newTheme = themes[(currentIndex + 1) % themes.length] as Theme;

		setTheme(newTheme);
		applyTheme(newTheme);
		localStorage.setItem("theme", newTheme);

		// Dispatch a custom event to trigger canvas re-render
		const actualTheme = newTheme === "auto" ? getSystemTheme() : newTheme;
		window.dispatchEvent(
			new CustomEvent("themeChanged", { detail: { theme: actualTheme } }),
		);
	};

	const getIcon = () => {
		switch (theme) {
			case "light":
				return <Sun size={16} />;
			case "dark":
				return <Moon size={16} />;
			case "auto":
				return <Monitor size={16} />;
		}
	};

	const getLabel = () => {
		switch (theme) {
			case "light":
				return "Light";
			case "dark":
				return "Dark";
			case "auto":
				return "Auto";
		}
	};

	const getNextTheme = () => {
		const themes = ["auto", "light", "dark"];
		const currentIndex = themes.indexOf(theme);
		return themes[(currentIndex + 1) % themes.length];
	};

	return (
		<button
			onClick={toggleTheme}
			className="theme-toggle"
			title={`Switch to ${getNextTheme()} mode`}
			aria-label={`Switch to ${getNextTheme()} mode`}
		>
			{getIcon()}
			<span>{getLabel()}</span>
		</button>
	);
};
