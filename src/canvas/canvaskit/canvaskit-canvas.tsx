import React, { type RefObject, useEffect, useRef } from "react";
import { useCanvasDimensions, useCanvasRendering } from "./hooks";
import { useCanvasInitialization } from "./modules/canvas-initialization";
import { useCanvasEvents } from "./modules/canvas-events";
import {
	useContextMenuManager,
	ContextMenuOverlay,
} from "./modules/context-menu-manager";
import { useDevTools } from "./modules/dev-tools";
import {
	usePerformanceManager,
	PerformanceControls,
} from "./modules/performance-manager";
import {
	useTextEditorManager,
	TextEditorOverlay,
} from "./modules/text-editor-manager";
import { PanNotch } from "../../components/PanNotch";
import { useElements } from "@store/index";
import { useViewport as useCKViewport } from "./hooks";
import { useIslandDetection } from "./hooks/use-island-detection";

export const CanvasKitCanvas: React.FC = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	useCanvasInitialization();
	useDevTools();
	useIslandDetection();

	const dimensions = useCanvasDimensions({
		containerRef: containerRef as RefObject<HTMLDivElement>,
	});

	const { zoom, pan, eventHandlers } = useCanvasEvents(canvasRef);

	const {
		contextMenuState,
		handleContextMenu,
		getCurrentCursorPosition,
		setContextMenu,
	} = useContextMenuManager(canvasRef);

	const {
		isEditingText,
		editingElement,
		textCreationPosition,
		handleFinishEditing,
	} = useTextEditorManager();

	const {
		enableCulling,
		enableBatching,
		enableQuadtree,
		handleToggleOptimization,
	} = usePerformanceManager();

	useCanvasRendering({
		canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
		dimensions,
		pan,
		zoom,
	});

	// Always center origin (0,0) when there are no elements
	const elements = useElements();
	const { setPan } = useCKViewport();
	useEffect(() => {
		if (!elements || elements.length > 0) return;
		const w = Math.max(1, dimensions.width || window.innerWidth);
		const h = Math.max(1, dimensions.height || window.innerHeight);
		const targetX = w / 2;
		const targetY = h / 2;
		if (Math.abs(pan.x - targetX) > 0.5 || Math.abs(pan.y - targetY) > 0.5) {
			setPan({ x: targetX, y: targetY });
		}
	}, [
		elements.length,
		dimensions.width,
		dimensions.height,
		pan.x,
		pan.y,
		setPan,
	]);

	return (
		<div
			ref={containerRef}
			className="canvaskit-container"
			style={{
				width: "100vw",
				height: "100vh",
				position: "relative",
				overflow: "hidden",
			}}
		>
			<canvas
				ref={canvasRef}
				{...eventHandlers}
				onContextMenu={handleContextMenu}
				style={{
					display: "block",
					width: "100%",
					height: "100%",
					cursor: "default",
				}}
			/>

			<PanNotch zoom={zoom} pan={pan} dimensions={dimensions} />

			<TextEditorOverlay
				isEditingText={isEditingText}
				editingElement={editingElement}
				textCreationPosition={textCreationPosition}
				zoom={zoom}
				onFinish={handleFinishEditing}
			/>

			<ContextMenuOverlay
				contextMenuState={contextMenuState}
				getCurrentCursorPosition={getCurrentCursorPosition}
				onClose={() => setContextMenu((prev) => ({ ...prev, open: false }))}
			/>

			<PerformanceControls
				enableCulling={enableCulling}
				enableBatching={enableBatching}
				enableQuadtree={enableQuadtree}
				onToggleOptimization={handleToggleOptimization}
			/>
		</div>
	);
};
