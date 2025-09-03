import { useEffect } from "react";
import { useCanvasKitInstance } from "../../../store";
import { captureError } from "../../../utils/sentry";

export const useCanvasKitInitialization = () => {
	const [canvasKit, setCanvasKit] = useCanvasKitInstance();

	useEffect(() => {
		const initCanvasKit = async () => {
			try {
				if (!window.CanvasKitInit) {
					const script = document.createElement("script");
					script.src =
						"https://unpkg.com/canvaskit-wasm@0.37.0/bin/canvaskit.js";
					script.onload = async () => {
						const ck = await window.CanvasKitInit({
							locateFile: (file: string) => {
								if (file.endsWith(".wasm")) {
									return "https://unpkg.com/canvaskit-wasm@0.37.0/bin/canvaskit.wasm";
								}
								return `https://unpkg.com/canvaskit-wasm@0.37.0/bin/${file}`;
							},
						});
						setCanvasKit(ck);
					};
					script.onerror = () => {
						captureError("Failed to load CanvasKit script");
					};
					document.head.appendChild(script);
				} else {
					const ck = await window.CanvasKitInit({
						locateFile: (file: string) => {
							if (file.endsWith(".wasm")) {
								return "https://unpkg.com/canvaskit-wasm@0.37.0/bin/canvaskit.wasm";
							}
							return `https://unpkg.com/canvaskit-wasm@0.37.0/bin/${file}`;
						},
					});
					setCanvasKit(ck);
				}
			} catch (error) {
				captureError(error as Error, {
					context: "Failed to initialize CanvasKit",
				});
			}
		};

		initCanvasKit();
	}, [setCanvasKit]);

	return canvasKit;
};
