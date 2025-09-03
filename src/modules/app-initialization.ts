import { useCallback } from "react";
import { useSelection } from "@store/index";
import { useKeyboardShortcuts } from "../utils/keyboard-shortcuts";

export const useAppInitialization = () => {
	const [, setSelection] = useSelection();

	const deselect = useCallback(() => setSelection([]), [setSelection]);

	// Initialize keyboard shortcuts
	useKeyboardShortcuts({ onDeselect: deselect });

	return {
		deselect,
	};
};
