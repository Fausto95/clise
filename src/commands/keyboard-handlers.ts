import { useEffect } from "react";
import { useCommandDispatcher } from "./dispatcher";
import {
	moveSelection,
	selectAll,
	copySelection,
	pasteClipboard,
	duplicateSelection,
	deleteSelection,
	createGroup,
	ungroup,
	reorderElements,
} from "./index";
import {
	useContextMenu,
	useElements,
	useElementsById,
	useSelection,
	useZoomControls,
	useTool,
	useIsDrawing,
	useGroups,
} from "../store";

export const useCommandBasedKeyboardHandlers = () => {
	const [selection] = useSelection();
	const [contextMenu, setContextMenu] = useContextMenu();
	const { zoomIn, zoomOut, setZoom } = useZoomControls();
	const [tool, setTool] = useTool();
	const [isDrawing, setIsDrawing] = useIsDrawing();
	const elements = useElements();
	const elementsById = useElementsById();
	const groups = useGroups();
	const { dispatch } = useCommandDispatcher();

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

			// Handle arrow key movement for selected elements
			if (selection.length > 0) {
				const moveStep = e.shiftKey ? 10 : 1;
				let deltaX = 0;
				let deltaY = 0;

				switch (e.code) {
					case "ArrowLeft":
						e.preventDefault();
						deltaX = -moveStep;
						break;
					case "ArrowRight":
						e.preventDefault();
						deltaX = moveStep;
						break;
					case "ArrowUp":
						e.preventDefault();
						deltaY = -moveStep;
						break;
					case "ArrowDown":
						e.preventDefault();
						deltaY = moveStep;
						break;
				}

				if (deltaX !== 0 || deltaY !== 0) {
					dispatch(moveSelection(deltaX, deltaY));
					return;
				}
			}

			if (e.key === "Delete" || e.key === "Backspace") {
				e.preventDefault();
				if (selection.length > 0) {
					dispatch(deleteSelection());
				}
				return;
			}

			if (e.key === "Escape") {
				if (contextMenu.open) {
					setContextMenu((prev) => ({ ...prev, open: false }));
					return;
				}
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
						dispatch(selectAll());
						break;
					case "c":
					case "C":
						e.preventDefault();
						if (selection.length > 0) {
							dispatch(copySelection());
						}
						break;
					case "v":
					case "V":
						e.preventDefault();
						dispatch(pasteClipboard());
						break;
					case "d":
					case "D":
						e.preventDefault();
						if (selection.length > 0) {
							dispatch(duplicateSelection());
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
										dispatch(ungroup(groupId));
									}
								}
							}
						} else {
							// Group: Cmd/Ctrl + G
							if (selection.length >= 2) {
								const canGroup = selection.every((id) => elementsById.has(id));
								if (canGroup) {
									dispatch(createGroup(selection));
								}
							}
						}
						break;
					case "]":
						e.preventDefault();
						if (selection.length > 0) {
							dispatch(reorderElements(selection, "bring-forward"));
						}
						break;
					case "[":
						e.preventDefault();
						if (selection.length > 0) {
							dispatch(reorderElements(selection, "send-backward"));
						}
						break;
				}
			}

			if (e.key === "d" || e.key === "D") {
				if (!(e.ctrlKey || e.metaKey) && selection.length > 0) {
					e.preventDefault();
					dispatch(duplicateSelection());
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		selection,
		elements,
		elementsById,
		contextMenu.open,
		setContextMenu,
		zoomIn,
		zoomOut,
		setZoom,
		groups,
		isDrawing,
		setIsDrawing,
		setTool,
		tool,
		dispatch,
	]);
};
