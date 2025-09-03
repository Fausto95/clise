import {
	useBoxSelectEnd,
	useBoxSelectStart,
	useDragStart,
	useIsBoxSelecting,
	useIsDragging,
	useIsDrawing,
	useIsResizing,
	useResizeHandle,
	useTool,
} from "../../../store";

export const useMouseInteractionHandlers = () => {
	const [, setIsDragging] = useIsDragging();
	const [, setIsResizing] = useIsResizing();
	const [isDrawing, setIsDrawing] = useIsDrawing();
	const [isBoxSelecting, setIsBoxSelecting] = useIsBoxSelecting();
	const [, setDragStart] = useDragStart();
	const [, setResizeHandle] = useResizeHandle();
	const [, setBoxSelectStart] = useBoxSelectStart();
	const [, setBoxSelectEnd] = useBoxSelectEnd();
	const [tool, setTool] = useTool();

	const handleMouseUp = () => {
		if (isDrawing) {
			// Do not auto-finish when using the path tool; user finalizes via close/ESC
			if (tool !== "path") {
				setIsDrawing(false);
				setDragStart(null);
				setTool("select");
			}
		}

		if (isBoxSelecting) {
			setIsBoxSelecting(false);
			setBoxSelectStart(null);
			setBoxSelectEnd(null);
		}

		setIsDragging(false);
		setIsResizing(false);
		setDragStart(null);
		setResizeHandle(null);
	};

	return { handleMouseUp };
};
