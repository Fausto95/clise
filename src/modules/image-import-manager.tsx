import { useCallback } from "react";
import { useElementOperations, useSelection } from "@store/index";
import { usePan, useZoom } from "@store/viewport-hooks";
import {
	createImageElement,
	isSupportedImageFile,
	validateImageFile,
} from "../utils/image-utils";
import { captureError } from "../utils/sentry";
import { useToast } from "../components/ToastProvider";
import { useTranslation } from "react-i18next";
import { useFileProcessor } from "../hooks/use-file-processor";

export const useImageImport = () => {
	const { addElement } = useElementOperations();
	const [, setSelection] = useSelection();
	const [zoom] = useZoom();
	const { pan } = usePan();
	const toast = useToast();
	const { t } = useTranslation();
	const { processImageFiles, isProcessing, progress } = useFileProcessor();

	const handleImageImport = useCallback(
		async (files: File[], dropEvent: React.DragEvent) => {
			try {
				// Validate all image files first
				const invalidFiles = [];
				for (const file of files) {
					const validation = validateImageFile(file);
					if (!validation.valid) {
						invalidFiles.push(`${file.name}: ${validation.error}`);
					}
				}

				if (invalidFiles.length > 0) {
					toast(
						t("imageImport.invalidFiles", "Invalid image files:\n{{list}}", {
							list: invalidFiles.join("\n"),
						}),
						"error",
						5000,
					);
					return false;
				}

				// Calculate center position of current viewport
				const rect = dropEvent.currentTarget.getBoundingClientRect();
				const viewportCenterX = rect.width / 2;
				const viewportCenterY = rect.height / 2;

				// Convert viewport center to canvas coordinates
				const canvasX = (viewportCenterX - pan.x) / zoom;
				const canvasY = (viewportCenterY - pan.y) / zoom;

				// Process all images using worker
				const processedImages = await processImageFiles(files);

				// Add each processed image to the canvas
				const newImageElements = [];
				let currentX = canvasX;
				const currentY = canvasY;
				const spacing = 20; // Space between multiple images

				for (const imageData of processedImages) {
					const imageElement = createImageElement(
						imageData,
						currentX,
						currentY,
						imageData.fileName,
					);

					const elementId = addElement(imageElement);
					newImageElements.push(elementId);

					// Position next image to the right with some spacing
					currentX += imageData.displayWidth + spacing;
				}

				// Select the newly added images
				setSelection(newImageElements);
				return true;
			} catch (error) {
				captureError(error as Error, {
					context: "Failed to import image files",
				});
				toast(
					t(
						"imageImport.failed",
						"Failed to import one or more image files. Please try again.",
					),
					"error",
				);
				return false;
			}
		},
		[addElement, setSelection, pan, zoom, processImageFiles],
	);

	return {
		handleImageImport,
		isSupportedImageFile,
		isProcessing,
		progress,
	};
};
