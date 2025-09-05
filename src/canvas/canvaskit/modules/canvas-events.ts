import React, { useCallback, useEffect, useRef } from "react";
import {
	useCanvasMouseHandlers,
	useMouseInteractionHandlers,
	useViewport,
} from "../hooks";
import { useCommandBasedKeyboardHandlers } from "../../../commands";
import { useIsPanning } from "@store/index";

export const useCanvasEvents = (
	canvasRef: React.RefObject<HTMLCanvasElement | null>,
) => {
	const { zoom, pan, handleWheel, setPan } = useViewport();
	const [, setIsPanning] = useIsPanning();

	useCommandBasedKeyboardHandlers();

	const { handleMouseDown, handleMouseMove, handleMouseUp, handleDoubleClick } =
		useCanvasMouseHandlers({
			canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
		});

	const { handleMouseUp: handleInteractionMouseUp } =
		useMouseInteractionHandlers();

	// Spacebar hand-pan support
	const handActive = useRef(false);
	const handDragging = useRef(false);
	const dragStart = useRef<{ x: number; y: number } | null>(null);
	const panStart = useRef<{ x: number; y: number } | null>(null);
	const panActivityTimeout = useRef<number | null>(null);

	const markPanningActivity = useCallback(() => {
		setIsPanning(true);
		if (panActivityTimeout.current !== null) {
			clearTimeout(panActivityTimeout.current);
		}
		panActivityTimeout.current = window.setTimeout(() => {
			setIsPanning(false);
			panActivityTimeout.current = null;
		}, 150);
	}, [setIsPanning]);

	useEffect(() => {
		return () => {
			if (panActivityTimeout.current !== null) {
				clearTimeout(panActivityTimeout.current);
				panActivityTimeout.current = null;
			}
		};
	}, []);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.code === "Space") {
				handActive.current = true;
				if (canvasRef.current) canvasRef.current.style.cursor = "grab";
				e.preventDefault();
			}
		};
		const onKeyUp = (e: KeyboardEvent) => {
			if (e.code === "Space") {
				handActive.current = false;
				if (canvasRef.current) canvasRef.current.style.cursor = "default";
			}
		};
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
		};
	}, [canvasRef]);

	const onWheel = useCallback(
		(e: React.WheelEvent<HTMLCanvasElement>) => {
			if (canvasRef.current) {
				const rect = canvasRef.current.getBoundingClientRect();
				markPanningActivity();
				handleWheel(e.nativeEvent, rect);
			}
		},
		[handleWheel, canvasRef, markPanningActivity],
	);

	const onMouseDown = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			// Middle mouse (button 1) triggers hand-drag regardless of Space
			if (e.button === 1) {
				e.preventDefault();
				handDragging.current = true;
				dragStart.current = { x: e.clientX, y: e.clientY };
				panStart.current = { x: pan.x, y: pan.y };
				if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
				markPanningActivity();
				return;
			}

			if (handActive.current) {
				handDragging.current = true;
				dragStart.current = { x: e.clientX, y: e.clientY };
				panStart.current = { x: pan.x, y: pan.y };
				if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
				// Do not start element interactions
				markPanningActivity();
				return;
			}

			handleMouseDown(e);
		},
		[handleMouseDown, pan.x, pan.y, canvasRef, markPanningActivity],
	);

	const onMouseMove = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (handDragging.current && dragStart.current && panStart.current) {
				const dx = e.clientX - dragStart.current.x;
				const dy = e.clientY - dragStart.current.y;
				setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
				markPanningActivity();
				return;
			}
			handleMouseMove(e);
		},
		[handleMouseMove, setPan, markPanningActivity],
	);

	const combinedMouseUp = useCallback(() => {
		if (handDragging.current) {
			handDragging.current = false;
			dragStart.current = null;
			panStart.current = null;
			if (canvasRef.current)
				canvasRef.current.style.cursor = handActive.current
					? "grab"
					: "default";
			// Allow brief visibility after pan stop
			markPanningActivity();
			return;
		}
		handleMouseUp();
		handleInteractionMouseUp();
	}, [handleMouseUp, handleInteractionMouseUp, canvasRef, markPanningActivity]);

	return {
		zoom,
		pan,
		eventHandlers: {
			onMouseDown: onMouseDown,
			onMouseMove: onMouseMove,
			onMouseUp: combinedMouseUp,
			onMouseLeave: combinedMouseUp,
			onDoubleClick: handleDoubleClick,
			onWheel,
		},
	};
};
