import { useCallback, useRef, useState } from "react";
import type { Element } from "../store/element-atoms";
import type { Group } from "../store/group-atoms";
import { captureError } from "../utils/sentry";

export interface ProcessedImageData {
	src: string;
	originalWidth: number;
	originalHeight: number;
	aspectRatio: number;
	displayWidth: number;
	displayHeight: number;
	fileName: string;
}

export interface ProcessedCliseData {
	elements: Element[];
	groups: Group[];
	viewport?: { zoom: number; pan: { x: number; y: number } };
	metadata?: any;
}

export interface FileProcessorProgress {
	progress: number; // 0-100
	message: string;
}

export const useFileProcessor = () => {
	const workerRef = useRef<Worker | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [progress, setProgress] = useState<FileProcessorProgress | null>(null);

	// Initialize worker
	const getWorker = useCallback(() => {
		if (!workerRef.current) {
			workerRef.current = new Worker(
				new URL("../workers/file-processor.worker.ts", import.meta.url),
				{ type: "module" },
			);
		}
		return workerRef.current;
	}, []);

	// Process DZNZ file
	const processCliseFile = useCallback(
		(content: string): Promise<ProcessedCliseData> => {
			return new Promise((resolve, reject) => {
				const worker = getWorker();
				setIsProcessing(true);
				setProgress({ progress: 0, message: "Processing DZNZ file..." });

				const handleMessage = (e: MessageEvent) => {
					const { type, data } = e.data;

					switch (type) {
						case "clise-processed":
							worker.removeEventListener("message", handleMessage);
							setIsProcessing(false);
							setProgress(null);
							resolve(data);
							break;

						case "error":
							worker.removeEventListener("message", handleMessage);
							setIsProcessing(false);
							setProgress(null);
							const error = new Error(data.message);
							captureError(error, { context: "DZNZ file processing" });
							reject(error);
							break;

						case "progress":
							setProgress({ progress: data.progress, message: data.message });
							break;
					}
				};

				worker.addEventListener("message", handleMessage);
				worker.postMessage({ type: "process-clise", content });
			});
		},
		[getWorker],
	);

	// Process single image file
	const processImageFile = useCallback(
		(file: File): Promise<ProcessedImageData> => {
			return new Promise((resolve, reject) => {
				const worker = getWorker();
				setIsProcessing(true);
				setProgress({ progress: 0, message: "Processing image..." });

				// Convert file to base64
				const reader = new FileReader();
				reader.onload = () => {
					const base64 = (reader.result as string).split(",")[1]; // Remove data:image/...;base64, prefix
					if (!base64) {
						const error = new Error("Failed to convert file to base64");
						captureError(error, {
							context: "Image file processing",
							fileName: file.name,
						});
						setIsProcessing(false);
						setProgress(null);
						reject(error);
						return;
					}

					const handleMessage = (e: MessageEvent) => {
						const { type, data } = e.data;

						switch (type) {
							case "image-processed":
								worker.removeEventListener("message", handleMessage);
								setIsProcessing(false);
								setProgress(null);
								resolve(data);
								break;

							case "error":
								worker.removeEventListener("message", handleMessage);
								setIsProcessing(false);
								setProgress(null);
								const error = new Error(data.message);
								captureError(error, {
									context: "Image file processing",
									fileName: file.name,
								});
								reject(error);
								break;

							case "progress":
								setProgress({ progress: data.progress, message: data.message });
								break;
						}
					};

					worker.addEventListener("message", handleMessage);
					worker.postMessage({
						type: "process-image",
						fileData: base64,
						fileName: file.name,
						fileType: file.type,
					});
				};

				reader.onerror = () => {
					const error = new Error("Failed to read file");
					captureError(error, {
						context: "Image file reading",
						fileName: file.name,
					});
					setIsProcessing(false);
					setProgress(null);
					reject(error);
				};

				reader.readAsDataURL(file);
			});
		},
		[getWorker],
	);

	// Process multiple image files
	const processImageFiles = useCallback(
		(files: File[]): Promise<ProcessedImageData[]> => {
			return new Promise((resolve, reject) => {
				const worker = getWorker();
				setIsProcessing(true);
				setProgress({ progress: 0, message: "Processing images..." });

				// Convert all files to base64
				const filePromises = files.map((file) => {
					return new Promise<{ data: string; name: string; type: string }>(
						(resolve, reject) => {
							const reader = new FileReader();
							reader.onload = () => {
								const base64 = (reader.result as string).split(",")[1];
								if (!base64) {
									const error = new Error("Failed to convert file to base64");
									captureError(error, {
										context: "Batch image processing",
										fileName: file.name,
									});
									reject(error);
									return;
								}
								resolve({
									data: base64,
									name: file.name,
									type: file.type,
								});
							};
							reader.onerror = () => {
								const fileError = new Error(
									`Failed to read file: ${file.name}`,
								);
								captureError(fileError, {
									context: "Batch image reading",
									fileName: file.name,
								});
								reject(fileError);
							};
							reader.readAsDataURL(file);
						},
					);
				});

				Promise.all(filePromises)
					.then((fileData) => {
						const handleMessage = (e: MessageEvent) => {
							const { type, data } = e.data;

							switch (type) {
								case "images-processed":
									worker.removeEventListener("message", handleMessage);
									setIsProcessing(false);
									setProgress(null);
									resolve(data);
									break;

								case "error":
									worker.removeEventListener("message", handleMessage);
									setIsProcessing(false);
									setProgress(null);
									const error = new Error(data.message);
									captureError(error, {
										context: "Batch image processing",
										fileCount: files.length,
									});
									reject(error);
									break;

								case "progress":
									setProgress({
										progress: data.progress,
										message: data.message,
									});
									break;
							}
						};

						worker.addEventListener("message", handleMessage);
						worker.postMessage({
							type: "process-images",
							files: fileData,
						});
					})
					.catch((error) => {
						captureError(error as Error, {
							context: "Batch image processing setup",
							fileCount: files.length,
						});
						setIsProcessing(false);
						setProgress(null);
						reject(error);
					});
			});
		},
		[getWorker],
	);

	// Export DZNZ file
	const exportCliseFile = useCallback(
		(
			elements: Element[],
			groups: Group[],
			viewport: { zoom: number; pan: { x: number; y: number } },
			metadata?: any,
		): Promise<string> => {
			return new Promise((resolve, reject) => {
				const worker = getWorker();
				setIsProcessing(true);
				setProgress({ progress: 0, message: "Exporting DZNZ file..." });

				const handleMessage = (e: MessageEvent) => {
					const { type, data } = e.data;

					switch (type) {
						case "clise-exported":
							worker.removeEventListener("message", handleMessage);
							setIsProcessing(false);
							setProgress(null);
							resolve(data);
							break;

						case "error":
							worker.removeEventListener("message", handleMessage);
							setIsProcessing(false);
							setProgress(null);
							const error = new Error(data.message);
							captureError(error, {
								context: "DZNZ file export",
								elementCount: elements.length,
								groupCount: groups.length,
							});
							reject(error);
							break;

						case "progress":
							setProgress({ progress: data.progress, message: data.message });
							break;
					}
				};

				worker.addEventListener("message", handleMessage);
				worker.postMessage({
					type: "export-clise",
					elements,
					groups,
					viewport,
					metadata,
				});
			});
		},
		[getWorker],
	);

	// Cleanup worker
	const cleanup = useCallback(() => {
		if (workerRef.current) {
			workerRef.current.terminate();
			workerRef.current = null;
		}
	}, []);

	return {
		processCliseFile,
		processImageFile,
		processImageFiles,
		exportCliseFile,
		isProcessing,
		progress,
		cleanup,
	};
};
