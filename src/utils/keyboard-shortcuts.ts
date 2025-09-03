import { useEffect } from "react";
import {
	useHistoryOperations,
	useIsEditingText,
	useTool,
	useZoomControls,
} from "../store";

export interface KeyboardShortcutsConfig {
	onDeselect: () => void;
}

export const useKeyboardShortcuts = ({
	onDeselect,
}: KeyboardShortcutsConfig) => {
	const [, setTool] = useTool();
	const { zoomIn, zoomOut } = useZoomControls();
	const { undo, redo } = useHistoryOperations();
	const [isEditingText] = useIsEditingText();

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't handle shortcuts while editing text, except for Escape
			if (isEditingText && e.key !== "Escape") {
				return;
			}

			// Tool shortcuts - only when not editing text
			if (!isEditingText) {
				if (e.key === "v" || e.key === "V") {
					e.preventDefault();
					setTool("select");
				} else if (e.key === "r" || e.key === "R") {
					e.preventDefault();
					setTool("rect");
				} else if (e.key === "e" || e.key === "E") {
					e.preventDefault();
					setTool("ellipse");
				} else if (e.key === "f" || e.key === "F") {
					e.preventDefault();
					setTool("frame");
				} else if (e.key === "p" || e.key === "P") {
					e.preventDefault();
					setTool("path");
				}
			}

			// Zoom shortcuts - only when not editing text
			if (!isEditingText) {
				if (e.key === "+" || e.key === "=") {
					e.preventDefault();
					zoomIn();
				} else if (e.key === "-") {
					e.preventDefault();
					zoomOut();
				}
			}

			// Undo/Redo shortcuts - work even while editing text (common expectation)
			if (e.ctrlKey || e.metaKey) {
				// For AZERTY: Z key has code "KeyW"
				// Shift+Z produces 'Z' (uppercase), normal Z produces 'z' (lowercase)
				if ((e.key === "Z" || e.key === "z") && e.shiftKey) {
					e.preventDefault();
					redo();
				} else if ((e.key === "Z" || e.key === "z") && !e.shiftKey) {
					e.preventDefault();
					undo();
				}
			}

			// Escape to deselect
			if (e.key === "Escape") {
				e.preventDefault();
				onDeselect();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [setTool, zoomIn, zoomOut, onDeselect, undo, redo, isEditingText]);
};
