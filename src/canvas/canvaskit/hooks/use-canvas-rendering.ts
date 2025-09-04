import { useEffect, useState } from "react";
import {
	useBoxSelectEnd,
	useBoxSelectStart,
	useCanvasKitInstance,
	useElements,
	useGroups,
	useIsBoxSelecting,
	useRendererRef,
	useSelection,
	selectionRecalcVersionAtom,
} from "../../../store";
import { useActiveGuides } from "../../../store/smart-guides-hooks";
import { useAtomValue } from "jotai";
import { captureError } from "../../../utils/sentry";
import { fontManager } from "../../../utils/font-manager";

export const useCanvasRendering = ({
	canvasRef,
	dimensions,
	pan,
	zoom,
}: {
	canvasRef: React.RefObject<HTMLCanvasElement>;
	dimensions: { width: number; height: number };
	pan: { x: number; y: number };
	zoom: number;
}) => {
	const [canvasKit] = useCanvasKitInstance();
	const [rendererRef] = useRendererRef();
	const elements = useElements();
	const [selection] = useSelection();
	const [isBoxSelecting] = useIsBoxSelecting();
	const [boxSelectStart] = useBoxSelectStart();
	const [boxSelectEnd] = useBoxSelectEnd();
	const groups = useGroups();
	const selectionRecalcVersion = useAtomValue(selectionRecalcVersionAtom);
	const [activeGuides] = useActiveGuides();
	const [themeVersion, setThemeVersion] = useState(0);
	const [fontVersion, setFontVersion] = useState(0);

	useEffect(() => {
		if (
			!canvasKit ||
			!canvasRef.current ||
			!rendererRef ||
			dimensions.width === 0 ||
			dimensions.height === 0
		)
			return;

		const canvas = canvasRef.current;
		const dpr = window.devicePixelRatio || 1;

		canvas.width = dimensions.width * dpr;
		canvas.height = dimensions.height * dpr;

		canvas.style.width = `${dimensions.width}px`;
		canvas.style.height = `${dimensions.height}px`;

		const surface = canvasKit.MakeCanvasSurface(canvas);
		if (!surface) {
			captureError("Failed to create CanvasKit surface");
			return;
		}

		const drawFrame = () => {
			const boxSelection =
				isBoxSelecting && boxSelectStart && boxSelectEnd
					? { start: boxSelectStart, end: boxSelectEnd }
					: undefined;

			const smartGuides =
				activeGuides.length > 0 ? { guides: activeGuides } : undefined;

			rendererRef!.render(
				surface,
				pan,
				zoom,
				{ width: dimensions.width * dpr, height: dimensions.height * dpr },
				elements,
				selection,
				dpr,
				boxSelection,
				groups,
				smartGuides,
			);
		};

		// Set up the re-render callback for the renderer (for when images load)
		if (rendererRef) {
			rendererRef.setOnImageLoaded(drawFrame);
		}

		drawFrame();

		return () => {
			surface.delete();
		};
	}, [
		canvasKit,
		rendererRef,
		dimensions,
		pan,
		zoom,
		elements,
		selection,
		isBoxSelecting,
		boxSelectStart,
		boxSelectEnd,
		groups,
		activeGuides,
		selectionRecalcVersion,
		themeVersion,
		fontVersion,
	]);

	// Listen for theme changes to trigger re-render
	useEffect(() => {
		const handleThemeChange = () => {
			setThemeVersion((prev) => prev + 1);
		};

		window.addEventListener("themeChanged", handleThemeChange);
		return () => window.removeEventListener("themeChanged", handleThemeChange);
	}, []);

	// Listen for font loading to trigger re-render
	useEffect(() => {
		const unsubscribe = fontManager.onFontLoaded(() => {
			setFontVersion((prev) => prev + 1);
		});

		return unsubscribe;
	}, []);
};
