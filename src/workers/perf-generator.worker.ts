// Web Worker for generating performance test elements without blocking the UI
import {
	generateTestElementsChunk,
	generateClusteredElementsChunk,
	generateGridElementsChunk,
	generateInfiniteCanvasLayoutChunk,
	PERFORMANCE_TEST_CONFIGS,
} from "../canvas/utils/performance-test";

type GenerateMessage = {
	type: "generate";
	testType: keyof typeof PERFORMANCE_TEST_CONFIGS | "infinite";
};

type CancelMessage = { type: "cancel" };

let canceled = false;

self.onmessage = (e: MessageEvent<GenerateMessage | CancelMessage>) => {
	const data = e.data;
	if (!data) return;

	if (data.type === "cancel") {
		canceled = true;
		return;
	}

	if (data.type === "generate") {
		canceled = false;
		const { testType } = data;
		try {
			// Generate elements incrementally in chunks to avoid blocking
			const chunkSize = 1000;
			let totalElements = 0;
			let processedElements = 0;

			// Calculate total elements first
			if (testType === "clustered") {
				const config = PERFORMANCE_TEST_CONFIGS.clustered as any;
				totalElements = config.clusters * config.elementsPerCluster;
			} else if (testType === "grid") {
				const config = PERFORMANCE_TEST_CONFIGS.grid as any;
				totalElements = config.gridSize * config.gridSize;
			} else if (testType === "infinite") {
				// Estimate for infinite layout (9 regions * ~450 elements each)
				totalElements = 9 * 450;
			} else {
				const config = PERFORMANCE_TEST_CONFIGS[testType] as any;
				totalElements = config.count;
			}

			// Generate and send elements in chunks
			const generateChunk = async (startIndex: number) => {
				if (canceled) return;

				let chunk: any[] = [];

				if (testType === "clustered") {
					chunk = generateClusteredElementsChunk(
						PERFORMANCE_TEST_CONFIGS.clustered as any,
						startIndex,
						chunkSize,
					);
				} else if (testType === "grid") {
					chunk = generateGridElementsChunk(
						PERFORMANCE_TEST_CONFIGS.grid as any,
						startIndex,
						chunkSize,
					);
				} else if (testType === "infinite") {
					chunk = generateInfiniteCanvasLayoutChunk(startIndex, chunkSize);
				} else {
					chunk = generateTestElementsChunk(
						PERFORMANCE_TEST_CONFIGS[testType] as any,
						startIndex,
						chunkSize,
					);
				}

				if (chunk.length > 0) {
					processedElements += chunk.length;
					(self as any).postMessage({
						type: "chunk",
						items: chunk,
						done: processedElements,
						total: totalElements,
					});
				}

				// Continue with next chunk if not done and not canceled
				if (processedElements < totalElements && !canceled) {
					// Use setTimeout to yield control and prevent blocking
					setTimeout(() => generateChunk(processedElements), 0);
				} else {
					(self as any).postMessage({ type: "done", total: processedElements });
				}
			};

			// Start generating chunks
			generateChunk(0);
		} catch (err) {
			(self as any).postMessage({
				type: "error",
				message: (err as Error)?.message || String(err),
			});
		}
	}
};
