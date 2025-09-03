import React from "react";
import { useRendererRef } from "../../../store";
import { useCanvasKitInitialization } from "../hooks";
import { CanvasKitRenderer } from "../drawing/canvas-kit-renderer";

export const useCanvasInitialization = () => {
	const [rendererRef, setRendererRef] = useRendererRef();
	const canvasKit = useCanvasKitInitialization();

	React.useEffect(() => {
		if (canvasKit && !rendererRef) {
			(setRendererRef as (renderer: CanvasKitRenderer) => void)(
				new CanvasKitRenderer(canvasKit),
			);
		}
	}, [canvasKit, rendererRef, setRendererRef]);

	return {
		canvasKit,
		rendererRef,
	};
};
