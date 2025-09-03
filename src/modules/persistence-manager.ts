import { useAtom } from "jotai";
import { useEffect } from "react";
import { useElements } from "@store/index";
import { useGroups } from "@store/group-hooks";
import { usePan, useZoom } from "@store/viewport-hooks";
import { autoSaveAtom, loadStateAtom } from "@store/persistence-atoms";

export const usePersistence = () => {
	const elements = useElements();
	const groups = useGroups();
	const [zoom] = useZoom();
	const { pan } = usePan();
	const [, loadState] = useAtom(loadStateAtom);
	const [, triggerAutoSave] = useAtom(autoSaveAtom);

	// Load state from localStorage on app initialization
	useEffect(() => {
		loadState();
	}, [loadState]);

	// Auto-save state changes to localStorage
	useEffect(() => {
		triggerAutoSave();
	}, [elements, groups, zoom, pan, triggerAutoSave]);
};
