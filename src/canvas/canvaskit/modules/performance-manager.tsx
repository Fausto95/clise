import React, { useCallback, useState } from "react";
import { PerformanceTestControls } from "../../../components/performance-test-controls";
import { useRendererRef } from "../../../store";

export const usePerformanceManager = () => {
	const [rendererRef] = useRendererRef();
	const [enableCulling, setEnableCulling] = useState(true);
	const [enableBatching, setEnableBatching] = useState(true);
	const [enableQuadtree, setEnableQuadtree] = useState(true);

	const handleToggleOptimization = useCallback(
		(type: "culling" | "batching" | "quadtree") => {
			if (!rendererRef) return;

			switch (type) {
				case "culling":
					setEnableCulling((prev) => {
						const newValue = !prev;
						rendererRef.updatePerformanceConfig({
							enableViewCulling: newValue,
						});
						return newValue;
					});
					break;
				case "batching":
					setEnableBatching((prev) => {
						const newValue = !prev;
						rendererRef.updatePerformanceConfig({ enableBatching: newValue });
						return newValue;
					});
					break;
				case "quadtree":
					setEnableQuadtree((prev) => {
						const newValue = !prev;
						rendererRef.updatePerformanceConfig({ enableQuadtree: newValue });
						return newValue;
					});
					break;
			}
		},
		[rendererRef],
	);

	return {
		enableCulling,
		enableBatching,
		enableQuadtree,
		handleToggleOptimization,
	};
};

interface PerformanceControlsProps {
	enableCulling: boolean;
	enableBatching: boolean;
	enableQuadtree: boolean;
	onToggleOptimization: (type: "culling" | "batching" | "quadtree") => void;
}

export const PerformanceControls: React.FC<PerformanceControlsProps> = ({
	enableCulling,
	enableBatching,
	enableQuadtree,
	onToggleOptimization,
}) => {
	if (!import.meta.env.DEV) return null;

	return (
		<PerformanceTestControls
			enableCulling={enableCulling}
			enableBatching={enableBatching}
			enableQuadtree={enableQuadtree}
			onToggleOptimization={onToggleOptimization}
		/>
	);
};
