import {
	useClipboard,
	useElementOperations,
	useElements,
	useElementsById,
	useGroupOperations,
	useGroups,
	useHistoryOperations,
	useSelection,
	usePan,
	useZoom,
	useViewport,
} from "@store/index";
import React from "react";
import { ContextMenu as SmartContextMenu } from "../components/context-menu/context-menu";
import { useTranslation } from "react-i18next";
import {
	exportSelectionAsPNG,
	exportSelectionAsSVG,
} from "../export/export-utils";
import { getElementsToExport } from "../store/file-operations";
import { useElementVisibility } from "@store/hooks";

export const ContextMenu: React.FC<{
	x: number;
	y: number;
	elementId: string | null;
	open: boolean;
	onClose: () => void;
	getCurrentCursorPosition: () => { canvasX: number; canvasY: number } | null;
}> = ({ x, y, elementId, open, onClose, getCurrentCursorPosition }) => {
	const { t } = useTranslation();
	const elements = useElements();
	const elementsById = useElementsById();
	const [selection] = useSelection();
	const clipboard = useClipboard();
	const {
		reorderElements,
		copyElements,
		pasteElements,
		duplicateElements,
		deleteElements,
	} = useElementOperations();
	const { push, undo, redo } = useHistoryOperations();
	const { createGroup, ungroup } = useGroupOperations();
	const groups = useGroups();
	const { toggleVisibility } = useElementVisibility();

	// Viewport state for pan/zoom operations
	const { pan, setPan } = usePan();
	const [zoom] = useZoom();
	const { viewportWidth, viewportHeight } = useViewport();

	// Close behavior is handled inside the SmartContextMenu component which has the ref

	// Build index map for O(1) id -> z-index (must be before conditional returns to keep hooks order stable)
	const indexMap = React.useMemo(() => {
		const m = new Map<string, number>();
		for (let i = 0; i < elements.length; i++) m.set(elements[i]!.id, i);
		return m;
	}, [elements]);

	if (!open) return null;

	const selectedIndices = selection
		.map((id) => indexMap.get(id) ?? -1)
		.filter((i) => i !== -1)
		.sort((a, b) => a - b);

	const isAtBack = selectedIndices[0] === 0;
	const isAtFront =
		selectedIndices[selectedIndices.length - 1] === elements.length - 1;
	const isReorderableSelection =
		selection.length > 0 && selection.every((id) => indexMap.has(id));

	const doAction = (action: "front" | "back" | "forward" | "backward") => {
		push();
		const operationMap = {
			front: "bring-to-front" as const,
			back: "send-to-back" as const,
			forward: "bring-forward" as const,
			backward: "send-backward" as const,
		};
		reorderElements({ elementIds: selection, operation: operationMap[action] });
		onClose();
	};

	const doCopy = () => {
		copyElements(selection);
		onClose();
	};

	const doPaste = () => {
		push();
		const cursorPos = getCurrentCursorPosition();
		if (cursorPos) {
			pasteElements({ x: cursorPos.canvasX, y: cursorPos.canvasY });
		} else {
			pasteElements();
		}
		onClose();
	};

	const doDuplicate = () => {
		push();
		duplicateElements(selection);
		onClose();
	};

	const doGroup = () => {
		if (selection.length < 2) return;
		push();
		createGroup({ elementIds: selection });
		onClose();
	};

	const doUngroup = () => {
		if (selection.length !== 1) return;
		const groupId = selection[0];
		if (!groupId) return;
		// Check if it's a group by id membership
		const groupIds = new Set(groups.map((g) => g.id));
		if (groupIds.has(groupId)) {
			push();
			ungroup(groupId);
			onClose();
		}
	};

	// Check if selection can be grouped (2+ elements, none are groups)
	const canGroup =
		selection.length >= 2 && selection.every((id) => indexMap.has(id));

	// Check if selection can be ungrouped (single group selected)
	const canUngroup =
		selection.length === 1 &&
		new Set(groups.map((g) => g.id)).has(selection[0]!);

	// Removed - replaced with PNG/SVG exports

	const doToggleVisibility = () => {
		push();
		selection.forEach((id) => toggleVisibility(id));
		onClose();
	};

	const doDelete = () => {
		if (selection.length === 0) return;
		push();
		deleteElements(selection);
		onClose();
	};

	const doUndo = () => {
		undo();
		onClose();
	};

	const doRedo = () => {
		redo();
		onClose();
	};

	// Smoothly pan the viewport to center on the given element
	const doGoToElement = () => {
		// Determine target element: prefer context elementId, fallback to first selected
		const targetId = elementId ?? selection[0];
		if (!targetId) return;
		const el = elementsById.get(targetId);
		if (!el) return;

		// Determine the visible canvas area to center within
		const container = document.querySelector(
			".canvaskit-container",
		) as HTMLElement | null;
		const centerW =
			container?.clientWidth ?? viewportWidth ?? window.innerWidth;
		const centerH =
			container?.clientHeight ?? viewportHeight ?? window.innerHeight;

		// Center the element on screen
		const worldCx = el.x + el.w / 2;
		const worldCy = el.y + el.h / 2;
		const targetPanX = centerW / 2 - worldCx * zoom;
		const targetPanY = centerH / 2 - worldCy * zoom;

		// Animate pan for a better experience
		const startX = pan.x;
		const startY = pan.y;
		const dx = targetPanX - startX;
		const dy = targetPanY - startY;
		const duration = 300; // ms
		const start = performance.now();

		const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

		const step = (now: number) => {
			const elapsed = now - start;
			const tNorm = Math.min(1, elapsed / duration);
			const e = easeOutCubic(tNorm);
			setPan(startX + dx * e, startY + dy * e);
			if (tNorm < 1) requestAnimationFrame(step);
		};

		requestAnimationFrame(step);
		onClose();
	};

	// Check if all selected elements are visible
	const allVisible = selection.every(
		(id) => elementsById.get(id)?.visible !== false,
	);

	// Legacy ContextButton removed; SmartContextMenu renders items

	const items = [
		...(selection.length > 0 || elementId
			? [
					{
						id: "goToElement",
						label: t("contextMenu.goToElement", "Go to element"),
						onClick: doGoToElement,
					},
					{ id: "sepGoto", type: "separator" as const },
				]
			: []),
		...(selection.length > 0
			? [
					{
						id: "copy",
						label: `${t("contextMenu.copy")} ${t("shortcuts.copy")}`,
						onClick: doCopy,
					},
					{
						id: "dup",
						label: `${t("contextMenu.duplicate")} ${t("shortcuts.duplicate")}`,
						onClick: doDuplicate,
					},
					{
						id: "expPng",
						label: t(
							"contextMenu.exportSelectionToPng",
							"Export selection to PNG",
						),
						onClick: () => {
							const { elements: selectedElements } = getElementsToExport(
								selection,
								elements,
								groups,
							);
							exportSelectionAsPNG(selectedElements);
						},
					},
					{
						id: "expSvg",
						label: t(
							"contextMenu.exportSelectionToSvg",
							"Export selection to SVG",
						),
						onClick: () => {
							const { elements: selectedElements } = getElementsToExport(
								selection,
								elements,
								groups,
							);
							exportSelectionAsSVG(selectedElements);
						},
					},
					{
						id: "toggle",
						label: `${
							allVisible ? t("contextMenu.hide") : t("contextMenu.show")
						} ${
							selection.length > 1
								? t("contextMenu.elements")
								: t("contextMenu.element")
						}`,
						onClick: doToggleVisibility,
					},
					{
						id: "del",
						label: `${t("contextMenu.delete")} ${t("shortcuts.delete")}`,
						onClick: doDelete,
					},
					{ id: "sep1", type: "separator" as const },
					{
						id: "group",
						label: `${t("contextMenu.group")} ${t("shortcuts.group")}`,
						onClick: doGroup,
						disabled: !canGroup,
					},
					{
						id: "ungroup",
						label: `${t("contextMenu.ungroup")} ${t("shortcuts.ungroup")}`,
						onClick: doUngroup,
						disabled: !canUngroup,
					},
				]
			: []),
		{
			id: "paste",
			label: `${t("contextMenu.paste")} ${t("shortcuts.paste")}`,
			onClick: doPaste,
			disabled: clipboard.length === 0,
		},
		...(isReorderableSelection
			? [
					{ id: "sep2", type: "separator" as const },
					{
						id: "front",
						label: `${t("contextMenu.bringToFront")} ${t("shortcuts.bringToFront")}`,
						onClick: () => doAction("front"),
						disabled: isAtFront,
					},
					{
						id: "forward",
						label: `${t("contextMenu.bringForward")} ${t("shortcuts.bringForward")}`,
						onClick: () => doAction("forward"),
						disabled: isAtFront,
					},
					{
						id: "backward",
						label: `${t("contextMenu.sendBackward")} ${t("shortcuts.sendBackward")}`,
						onClick: () => doAction("backward"),
						disabled: isAtBack,
					},
					{
						id: "back",
						label: `${t("contextMenu.sendToBack")} ${t("shortcuts.sendToBack")}`,
						onClick: () => doAction("back"),
						disabled: isAtBack,
					},
				]
			: []),
		{ id: "sep3", type: "separator" as const },
		{
			id: "undo",
			label: `${t("contextMenu.undo")} ${t("shortcuts.undo")}`,
			onClick: doUndo,
		},
		{
			id: "redo",
			label: `${t("contextMenu.redo")} ${t("shortcuts.redo")}`,
			onClick: doRedo,
		},
		...(selection.length === 0
			? [
					{
						id: "hint",
						label: t("contextMenu.selectAll"),
						onClick: () => {},
						disabled: true,
					},
				]
			: []),
	];

	return (
		<SmartContextMenu
			open={open}
			anchorPoint={{ x, y }}
			items={items as any}
			onClose={onClose}
			preferredPlacement="bottom-left"
		/>
	);
};
