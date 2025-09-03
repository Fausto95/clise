import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
	INFINITE_CANVAS_BOOKMARKS,
	PERFORMANCE_TEST_CONFIGS,
} from "../canvas/utils/performance-test";
import { useElementOperations, useElements } from "../store";
import { usePan } from "../store/viewport-hooks";
import type { Element } from "../store/element-atoms";
import { captureError } from "../utils/sentry";

interface PerformanceMetrics {
	fps: number;
	renderTime: number;
	elementCount: number;
	visibleCount: number;
}

declare global {
	interface Window {
		updatePerformanceMetrics?: (
			newMetrics: Partial<PerformanceMetrics>,
		) => void;
	}
}

interface PerformanceTestControlsProps {
	enableCulling?: boolean;
	enableBatching?: boolean;
	enableQuadtree?: boolean;
	onToggleOptimization?: (type: "culling" | "batching" | "quadtree") => void;
}

export const PerformanceTestControls: React.FC<
	PerformanceTestControlsProps
> = ({
	enableCulling = true,
	enableBatching = true,
	enableQuadtree = true,
	onToggleOptimization,
}) => {
	const [isVisible, setIsVisible] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const { addElementsWithIds, clearElements } = useElementOperations();
	const elements = useElements();
	const { setPan } = usePan();

	// Performance overlay drag state
	const [overlayPosition, setOverlayPosition] = useState({ x: 10, y: 60 });
	const [isDraggingOverlay, setIsDraggingOverlay] = useState(false);
	const overlayDragStart = useRef({ x: 0, y: 0 });

	const [performanceMetrics, setPerformanceMetrics] =
		useState<PerformanceMetrics>({
			fps: 0,
			renderTime: 0,
			elementCount: 0,
			visibleCount: 0,
		});

	// FPS tracking with requestAnimationFrame
	const lastRenderTime = useRef(performance.now());
	const frameCount = useRef(0);
	const rafId = useRef<number | null>(null);
	const lastFpsUpdate = useRef(performance.now());

	const workerRef = useRef<Worker | null>(null);
	// Removed unused genProgress state

	const handleGenerateTest = async (
		testType: keyof typeof PERFORMANCE_TEST_CONFIGS | "infinite",
	) => {
		setIsGenerating(true);

		try {
			// Clear existing elements first
			await new Promise((resolve) => {
				clearElements();
				setTimeout(resolve, 50);
			});

			if (!workerRef.current) {
				workerRef.current = new Worker(
					new URL("../workers/perf-generator.worker.ts", import.meta.url),
					{ type: "module" },
				);
			}
			const w = workerRef.current!;

			await new Promise<void>((resolve, reject) => {
				const onMessage = (e: MessageEvent) => {
					const { type } = e.data || {};
					if (type === "chunk") {
						const { items } = e.data as { items: Element[] };
						// Use addElementsWithIds for better batching performance
						addElementsWithIds(items);
						// Yield control to the main thread to prevent blocking
						setTimeout(() => {}, 0);
					} else if (type === "done") {
						w.removeEventListener("message", onMessage);
						resolve();
					} else if (type === "error") {
						w.removeEventListener("message", onMessage);
						reject(new Error(e.data?.message || "Worker error"));
					}
				};
				w.addEventListener("message", onMessage);
				w.postMessage({ type: "generate", testType });
			});
		} catch (err) {
			captureError("Performance generation failed", { testType, error: err });
		} finally {
			setIsGenerating(false);
		}
	};

	const handleNavigateTo = (x: number, y: number) => {
		setPan(-x, -y);
	};

	// FPS counter using requestAnimationFrame
	useEffect(() => {
		const updateFPS = () => {
			const now = performance.now();
			const elapsed = now - lastRenderTime.current;
			frameCount.current++;

			// Update FPS every 2 seconds to avoid excessive re-renders
			if (elapsed >= 1000 && now - lastFpsUpdate.current >= 2000) {
				const fps = Math.round((frameCount.current * 1000) / elapsed);

				setPerformanceMetrics((prev) => {
					if (Math.abs(prev.fps - fps) > 2) {
						return { ...prev, fps };
					}
					return prev;
				});

				frameCount.current = 0;
				lastRenderTime.current = now;
				lastFpsUpdate.current = now;
			}

			rafId.current = requestAnimationFrame(updateFPS);
		};

		rafId.current = requestAnimationFrame(updateFPS);

		return () => {
			if (rafId.current) {
				cancelAnimationFrame(rafId.current);
			}
		};
	}, []);

	// Performance overlay drag handlers
	const handleOverlayMouseDown = (e: React.MouseEvent) => {
		setIsDraggingOverlay(true);
		overlayDragStart.current = {
			x: e.clientX - overlayPosition.x,
			y: e.clientY - overlayPosition.y,
		};
		e.preventDefault();
	};

	// Global mouse event listeners for overlay dragging
	useEffect(() => {
		if (isDraggingOverlay) {
			const handleGlobalMouseMove = (e: MouseEvent) => {
				setOverlayPosition({
					x: e.clientX - overlayDragStart.current.x,
					y: e.clientY - overlayDragStart.current.y,
				});
			};

			const handleGlobalMouseUp = () => {
				setIsDraggingOverlay(false);
			};

			document.addEventListener("mousemove", handleGlobalMouseMove);
			document.addEventListener("mouseup", handleGlobalMouseUp);

			return () => {
				document.removeEventListener("mousemove", handleGlobalMouseMove);
				document.removeEventListener("mouseup", handleGlobalMouseUp);
			};
		}
	}, [isDraggingOverlay]);

	// Keyboard shortcut to toggle visibility
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "F12") {
				e.preventDefault();
				setIsVisible((prev) => !prev);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	// Method to update metrics from external sources
	const updateMetrics = (newMetrics: Partial<PerformanceMetrics>) => {
		setPerformanceMetrics((prev) => ({ ...prev, ...newMetrics }));
	};

	// Expose updateMetrics method globally for canvas to use
	useEffect(() => {
		window.updatePerformanceMetrics = updateMetrics;
		return () => {
			delete window.updatePerformanceMetrics;
		};
	}, []);

	const testConfigs = [
		{
			key: "light",
			label: "1K Elements (Light)",
			description: "1,000 elements in 50k×50k infinite world",
		},
		{
			key: "medium",
			label: "5K Elements (Medium)",
			description: "5,000 elements in 100k×100k infinite world",
		},
		{
			key: "heavy",
			label: "10K Elements (Heavy)",
			description: "10,000 elements in 150k×150k infinite world",
		},
		{
			key: "extreme",
			label: "25K Elements (Extreme)",
			description: "25,000 elements in 200k×200k infinite world",
		},
		{
			key: "clustered",
			label: "10K Clustered",
			description: "50 clusters with 200 elements each across infinite canvas",
		},
		{
			key: "grid",
			label: "10K Grid",
			description: "100×100 grid with larger spacing for infinite canvas",
		},
		{
			key: "infinite",
			label: "Infinite Layout",
			description:
				"9 regions scattered across infinite canvas (3K-6K elements)",
		},
	] as const;

	if (!isVisible) {
		return (
			<div
				style={{
					position: "fixed",
					left: overlayPosition.x,
					top: overlayPosition.y,
					zIndex: 9999,
					backgroundColor: "rgba(0, 0, 0, 0.7)",
					padding: "6px 12px",
					borderRadius: "6px",
					color: "#fff",
					fontSize: "11px",
					cursor: "pointer",
					border: "1px solid rgba(255, 255, 255, 0.2)",
				}}
				onClick={() => setIsVisible(true)}
				title="Click to show performance test suite (F12)"
			>
				🧪 Performance Test Suite
			</div>
		);
	}

	return (
		<div
			style={{
				position: "fixed",
				left: overlayPosition.x,
				top: overlayPosition.y,
				zIndex: 9999,
				backgroundColor: "rgba(0, 0, 0, 0.9)",
				padding: "16px",
				borderRadius: "8px",
				border: "1px solid rgba(255, 255, 255, 0.2)",
				backdropFilter: "blur(10px)",
				minWidth: "320px",
				maxHeight: "80vh",
				overflowY: "auto",
				cursor: isDraggingOverlay ? "grabbing" : "grab",
			}}
			onMouseDown={handleOverlayMouseDown}
		>
			{/* Header */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "12px",
				}}
			>
				<div
					style={{
						fontSize: "13px",
						color: "#fff",
						fontWeight: "bold",
					}}
				>
					🧪 Performance Test Suite
				</div>
				<button
					onClick={() => setIsVisible(false)}
					style={{
						background: "none",
						border: "none",
						color: "#fff",
						cursor: "pointer",
						padding: "0 4px",
						fontSize: "12px",
						opacity: 0.7,
					}}
				>
					✕
				</button>
			</div>

			{/* Performance Metrics */}
			<div
				style={{
					fontSize: "11px",
					color: "#aaa",
					marginBottom: "12px",
					padding: "8px",
					backgroundColor: "rgba(255, 255, 255, 0.05)",
					borderRadius: "4px",
				}}
			>
				<div
					style={{
						color: "#fff",
						fontSize: "11px",
						lineHeight: "1.4",
						marginBottom: "8px",
					}}
				>
					<div>🎯 FPS: {performanceMetrics.fps}</div>
					<div>
						📦 Elements: {performanceMetrics.elementCount || elements.length}
					</div>
					<div>👁️ Visible: {performanceMetrics.visibleCount}</div>
					<div>⚡ Render: {performanceMetrics.renderTime.toFixed(1)}ms</div>
					<div style={{ marginTop: "6px", fontSize: "10px", opacity: 0.7 }}>
						Active:{" "}
						{[
							enableCulling && "Culling",
							enableBatching && "Batching",
							enableQuadtree && "Quadtree",
						]
							.filter(Boolean)
							.join(", ") || "None"}
					</div>
					<div style={{ fontSize: "9px", opacity: 0.5 }}>
						Culling:{" "}
						{performanceMetrics.elementCount > 0
							? Math.round(
									(1 -
										performanceMetrics.visibleCount /
											performanceMetrics.elementCount) *
										100,
								)
							: 0}
						% reduced
					</div>
				</div>
				{/* Optimization Controls */}
				<div style={{ marginBottom: "8px" }}>
					<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
						<label
							style={{
								display: "flex",
								alignItems: "center",
								gap: "4px",
								fontSize: "10px",
								color: "#fff",
							}}
						>
							<input
								type="checkbox"
								checked={enableCulling}
								onChange={() => onToggleOptimization?.("culling")}
								style={{ margin: 0 }}
							/>
							Culling
						</label>
						<label
							style={{
								display: "flex",
								alignItems: "center",
								gap: "4px",
								fontSize: "10px",
								color: "#fff",
							}}
						>
							<input
								type="checkbox"
								checked={enableBatching}
								onChange={() => onToggleOptimization?.("batching")}
								style={{ margin: 0 }}
							/>
							Batching
						</label>
						<label
							style={{
								display: "flex",
								alignItems: "center",
								gap: "4px",
								fontSize: "10px",
								color: "#fff",
							}}
						>
							<input
								type="checkbox"
								checked={enableQuadtree}
								onChange={() => onToggleOptimization?.("quadtree")}
								style={{ margin: 0 }}
							/>
							Quadtree
						</label>
					</div>
				</div>
				Current elements:{" "}
				<strong style={{ color: "#fff" }}>
					{elements.length.toLocaleString()}
				</strong>
				{isGenerating && (
					<div style={{ color: "#ffd43b", marginTop: "4px" }}>
						⚡ Generating elements...
					</div>
				)}
			</div>

			{/* Test Controls */}
			<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
				{testConfigs.map((config) => (
					<div
						key={config.key}
						style={{
							backgroundColor: "rgba(255, 255, 255, 0.05)",
							padding: "10px",
							borderRadius: "6px",
							border: "1px solid rgba(255, 255, 255, 0.1)",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: "4px",
							}}
						>
							<div
								style={{
									fontSize: "12px",
									color: "#fff",
									fontWeight: "500",
								}}
							>
								{config.label}
							</div>
							<button
								onClick={() => handleGenerateTest(config.key)}
								disabled={isGenerating}
								style={{
									background: isGenerating
										? "rgba(255, 255, 255, 0.1)"
										: "#007acc",
									border: "none",
									color: "#fff",
									padding: "4px 8px",
									fontSize: "10px",
									borderRadius: "4px",
									cursor: isGenerating ? "not-allowed" : "pointer",
									opacity: isGenerating ? 0.5 : 1,
								}}
							>
								Generate
							</button>
						</div>
						<div
							style={{
								fontSize: "10px",
								color: "#999",
								lineHeight: "1.3",
							}}
						>
							{config.description}
						</div>
					</div>
				))}
			</div>

			{/* Clear Button */}
			<div
				style={{
					marginTop: "12px",
					paddingTop: "12px",
					borderTop: "1px solid rgba(255, 255, 255, 0.1)",
				}}
			>
				<button
					onClick={() => clearElements()}
					disabled={isGenerating || elements.length === 0}
					style={{
						background:
							elements.length > 0 && !isGenerating
								? "#dc3545"
								: "rgba(255, 255, 255, 0.1)",
						border: "none",
						color: "#fff",
						padding: "6px 12px",
						fontSize: "11px",
						borderRadius: "4px",
						cursor:
							elements.length > 0 && !isGenerating ? "pointer" : "not-allowed",
						width: "100%",
						opacity: elements.length > 0 && !isGenerating ? 1 : 0.5,
					}}
				>
					🗑️ Clear All Elements ({elements.length.toLocaleString()})
				</button>
			</div>

			{/* Navigation Bookmarks */}
			<div
				style={{
					marginTop: "12px",
					paddingTop: "12px",
					borderTop: "1px solid rgba(255, 255, 255, 0.1)",
				}}
			>
				<div
					style={{
						fontSize: "12px",
						color: "#fff",
						fontWeight: "bold",
						marginBottom: "8px",
					}}
				>
					🧭 Navigate Infinite Canvas
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
					{INFINITE_CANVAS_BOOKMARKS.map((bookmark) => (
						<button
							key={bookmark.name}
							onClick={() => handleNavigateTo(bookmark.x, bookmark.y)}
							style={{
								background: "rgba(255, 255, 255, 0.05)",
								border: "1px solid rgba(255, 255, 255, 0.1)",
								color: "#fff",
								padding: "4px 8px",
								fontSize: "10px",
								borderRadius: "4px",
								cursor: "pointer",
								textAlign: "left",
							}}
							title={`Jump to ${bookmark.x}, ${bookmark.y}`}
						>
							📍 {bookmark.name}
						</button>
					))}
				</div>
			</div>

			{/* Instructions */}
			<div
				style={{
					marginTop: "12px",
					fontSize: "9px",
					color: "#666",
					lineHeight: "1.4",
				}}
			>
				<div>
					<strong>Infinite Canvas Tips:</strong>
				</div>
				<div>• Canvas is now truly infinite in all directions</div>
				<div>• Use navigation bookmarks to jump to different regions</div>
				<div>• Try "Infinite Layout" for distributed elements</div>
				<div>• Pan with mouse wheel, zoom with Ctrl+wheel</div>
				<div>• F12 toggles this suite, F4 generates 10K elements</div>
				<div>• Drag header to move • Performance metrics included</div>
				<div>• Performance optimizations work best when zoomed in</div>
			</div>
		</div>
	);
};
