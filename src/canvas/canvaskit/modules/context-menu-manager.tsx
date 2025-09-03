import React from "react";
import { ContextMenu } from "../../../context-menu";
import { useContextMenu } from "../../../store";
import { useContextMenuHandler } from "../hooks";

export const useContextMenuManager = (
	canvasRef: React.RefObject<HTMLCanvasElement | null>,
) => {
	const [, setContextMenu] = useContextMenu();

	const {
		contextMenu: contextMenuState,
		handleContextMenu,
		getCurrentCursorPosition,
	} = useContextMenuHandler({
		canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
	});

	return {
		contextMenuState,
		handleContextMenu,
		getCurrentCursorPosition,
		setContextMenu,
	};
};

interface ContextMenuOverlayProps {
	contextMenuState: {
		x: number;
		y: number;
		elementId: string | null;
		open: boolean;
	};
	getCurrentCursorPosition: () => { canvasX: number; canvasY: number } | null;
	onClose: () => void;
}

export const ContextMenuOverlay: React.FC<ContextMenuOverlayProps> = ({
	contextMenuState,
	getCurrentCursorPosition,
	onClose,
}) => {
	return (
		<ContextMenu
			x={contextMenuState.x}
			y={contextMenuState.y}
			elementId={contextMenuState.elementId}
			open={contextMenuState.open}
			onClose={onClose}
			getCurrentCursorPosition={getCurrentCursorPosition}
		/>
	);
};
