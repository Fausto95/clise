import { useEffect } from "react";
import {
	useContextMenu,
	useElementOperations,
	useElements,
	useElementsById,
	useGroupOperations,
	useGroups,
	useSelection,
	useZoomControls,
	useTool,
	useIsDrawing,
} from "../../../store";

export const useCanvasKeyboardHandlers = () => {
	const [selection, setSelection] = useSelection();
	const { deleteElements, copyElements, pasteElements, duplicateElements } =
		useElementOperations();
	const [contextMenu, setContextMenu] = useContextMenu();
	const { zoomIn, zoomOut, setZoom } = useZoomControls();
	const [tool, setTool] = useTool();
	const [isDrawing, setIsDrawing] = useIsDrawing();
	const elements = useElements();
	const elementsById = useElementsById();
	const { createGroup, ungroup } = useGroupOperations();
	const groups = useGroups();

	useEffect(() => {
		const isEditableTarget = (event: KeyboardEvent) => {
			const t = event.target as HTMLElement | null;
			if (!t) return false;
			const tag = t.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")
				return true;
			if (t.isContentEditable) return true;
			return false;
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			// Ignore global shortcuts when typing in any editable field
			if (isEditableTarget(e)) return;
			if (e.key === "Delete" || e.key === "Backspace") {
				e.preventDefault();
				if (selection.length > 0) {
					deleteElements(selection);
				}
				return;
			}

			if (e.key === "Escape") {
				if (contextMenu.open) {
					setContextMenu((prev) => ({ ...prev, open: false }));
					return;
				}
				// Finalize path drawing if active
				if (isDrawing && tool === "path") {
					e.preventDefault();
					setIsDrawing(false);
					setTool("select");
					return;
				}
			}

			if (e.ctrlKey || e.metaKey) {
				switch (e.key) {
					case "a":
					case "A":
						e.preventDefault();
						setSelection(elements.map((el) => el.id));
						break;
					case "c":
					case "C":
						e.preventDefault();
						if (selection.length > 0) {
							copyElements(selection);
						}
						break;
					case "v":
					case "V":
						e.preventDefault();
						pasteElements();
						break;
					case "d":
					case "D":
						e.preventDefault();
						if (selection.length > 0) {
							duplicateElements(selection);
						}
						break;
					case "=":
					case "+":
						e.preventDefault();
						zoomIn();
						break;
					case "-":
						e.preventDefault();
						zoomOut();
						break;
					case "0":
						e.preventDefault();
						setZoom(1);
						break;
					case "g":
					case "G":
						e.preventDefault();
						if (e.shiftKey) {
							// Ungroup: Cmd/Ctrl + Shift + G
							if (selection.length === 1) {
								const groupId = selection[0];
								if (groupId) {
									const groupIds = new Set(groups.map((g) => g.id));
									if (groupIds.has(groupId)) {
										ungroup(groupId);
									}
								}
							}
						} else {
							// Group: Cmd/Ctrl + G
							if (selection.length >= 2) {
								const canGroup = selection.every((id) => elementsById.has(id));
								if (canGroup) {
									createGroup({ elementIds: selection });
								}
							}
						}
						break;
				}
			}

			if (e.key === "d" || e.key === "D") {
				if (!(e.ctrlKey || e.metaKey) && selection.length > 0) {
					e.preventDefault();
					duplicateElements(selection);
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		selection,
		deleteElements,
		elements,
		elementsById,
		setSelection,
		copyElements,
		pasteElements,
		duplicateElements,
		contextMenu.open,
		setContextMenu,
		zoomIn,
		zoomOut,
		setZoom,
		createGroup,
		ungroup,
		groups,
	]);
};
