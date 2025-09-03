import React, { useState } from "react";
import { shouldSuppressOpen } from "../../context-menu/suppressor";
import { createPortal } from "react-dom";
import { ContextMenu } from "../../context-menu";

interface ContextMenuState {
	x: number;
	y: number;
	elementId: string | null;
	open: boolean;
}

export const useLayerContextMenu = () => {
	const [contextMenu, setContextMenu] = useState<ContextMenuState>({
		x: 0,
		y: 0,
		elementId: null,
		open: false,
	});

	const lastCloseRef = React.useRef(0);

	const handleContextMenu = (
		e: React.MouseEvent,
		elementId: string,
		selection: string[],
		select: (ids: string[]) => void,
	) => {
		if (shouldSuppressOpen()) return;
		e.preventDefault();
		e.stopPropagation();

		// Handle selection logic for right-click
		const isAlreadySelected = new Set(selection).has(elementId);

		if (e.metaKey || e.ctrlKey) {
			// Toggle selection with cmd+click
			const set = new Set(selection);
			if (set.has(elementId)) set.delete(elementId);
			else set.add(elementId);
			select(Array.from(set));
		} else if (isAlreadySelected && selection.length > 1) {
			// Preserve multi-selection if element is already selected
		} else {
			// Regular selection - select only this element
			select([elementId]);
		}

		// Use viewport (client) coordinates as anchor; smart positioning will handle bounds
		setContextMenu({
			x: e.clientX,
			y: e.clientY,
			elementId,
			open: true,
		});
	};

	const closeContextMenu = () => {
		lastCloseRef.current = Date.now();
		setContextMenu((prev) => ({ ...prev, open: false }));
	};

	// Mock function for getCurrentCursorPosition - layers don't need cursor position
	const getCurrentCursorPosition = () => null;

	return {
		contextMenu,
		handleContextMenu,
		closeContextMenu,
		getCurrentCursorPosition,
	};
};

interface LayerContextMenuPortalProps {
	contextMenu: ContextMenuState;
	onClose: () => void;
	getCurrentCursorPosition: () => null;
}

export const LayerContextMenuPortal: React.FC<LayerContextMenuPortalProps> = ({
	contextMenu,
	onClose,
	getCurrentCursorPosition,
}) => {
	if (!contextMenu.open) return null;

	return createPortal(
		<ContextMenu
			x={contextMenu.x}
			y={contextMenu.y}
			elementId={contextMenu.elementId}
			open={contextMenu.open}
			onClose={onClose}
			getCurrentCursorPosition={getCurrentCursorPosition}
		/>,
		document.body,
	);
};
