import React, { useCallback, useState } from "react";
import { DragDropOverlay } from "../components/drag-drop/drag-drop-overlay";
import { useFileImport } from "./file-import-manager";
import { useImageImport } from "./image-import-manager";
import { useToast } from "../components/ToastProvider";
import { useTranslation } from "react-i18next";
import { captureError } from "../utils/sentry";

export const useDragDrop = () => {
	const [isDragOver, setIsDragOver] = useState(false);
	const { handleFileImport, isCliseFile } = useFileImport();
	const { handleImageImport, isSupportedImageFile } = useImageImport();
	const toast = useToast();
	const { t } = useTranslation();

	const handleDragOver = useCallback((e: React.DragEvent) => {
		// Check if the dragged items include files
		const hasFiles = Array.from(e.dataTransfer.types).includes("Files");
		if (hasFiles) {
			e.preventDefault();
			e.stopPropagation();
			setIsDragOver(true);
		}
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		// Check if the dragged items include files
		const hasFiles = Array.from(e.dataTransfer.types).includes("Files");
		if (hasFiles) {
			e.preventDefault();
			e.stopPropagation();

			// Only hide overlay if leaving the app-root entirely
			if (!e.currentTarget.contains(e.relatedTarget as Node)) {
				setIsDragOver(false);
			}
		}
	}, []);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			const files = Array.from(e.dataTransfer.files);

			// Only handle file drops, not canvas element drops
			if (files.length === 0) {
				return;
			}

			e.preventDefault();
			e.stopPropagation();
			setIsDragOver(false);

			const cliseFiles = files.filter(isCliseFile);
			const imageFiles = files.filter(isSupportedImageFile);

			// Handle .clise files
			if (cliseFiles.length > 0) {
				if (cliseFiles.length > 1) {
					toast(
						t(
							"dragDrop.onlyOneClise",
							"Please drop only one .clise file at a time",
						),
						"warning",
					);
					return;
				}

				if (imageFiles.length > 0) {
					alert(
						"Please drop either .clise files or image files, not both at the same time",
					);
					return;
				}

				const file = cliseFiles[0];
				if (!file) {
					captureError("No file found in cliseFiles array", {
						cliseFilesLength: cliseFiles.length,
					});
					return;
				}

				await handleFileImport(file);
				return;
			}

			// Handle image files
			if (imageFiles.length > 0) {
				await handleImageImport(imageFiles, e);
				return;
			}

			// No valid files found
			if (files.length > 0) {
				toast(
					t(
						"dragDrop.invalidFiles",
						"Please drop valid .clise files or image files (JPG, PNG, SVG)",
					),
					"error",
				);
			}
		},
		[isCliseFile, isSupportedImageFile, handleFileImport, handleImageImport],
	);

	const dragDropProps = {
		onDragOver: handleDragOver,
		onDragLeave: handleDragLeave,
		onDrop: handleDrop,
	};

	return {
		isDragOver,
		dragDropProps,
	};
};

interface DragDropManagerProps {
	isDragOver: boolean;
	children: React.ReactNode;
	dragDropProps: {
		onDragOver: (e: React.DragEvent) => void;
		onDragLeave: (e: React.DragEvent) => void;
		onDrop: (e: React.DragEvent) => void;
	};
}

export const DragDropManager: React.FC<DragDropManagerProps> = ({
	isDragOver,
	children,
	dragDropProps,
}) => {
	return (
		<div className="app-root" {...dragDropProps}>
			<DragDropOverlay isDragOver={isDragOver} />
			{children}
		</div>
	);
};
