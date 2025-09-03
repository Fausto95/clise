import { useEffect, useState } from "react";

export interface UseCanvasDimensionsProps {
	containerRef: React.RefObject<HTMLDivElement | null>;
}

export interface CanvasDimensions {
	width: number;
	height: number;
}

export const useCanvasDimensions = ({
	containerRef,
}: UseCanvasDimensionsProps) => {
	const [dimensions, setDimensions] = useState<CanvasDimensions>({
		width: 0,
		height: 0,
	});

	// Handle resize and get container dimensions
	useEffect(() => {
		const updateDimensions = () => {
			if (containerRef.current) {
				const rect = containerRef.current.getBoundingClientRect();
				setDimensions({
					width: rect.width || window.innerWidth,
					height: rect.height || window.innerHeight,
				});
			}
		};

		updateDimensions();
		window.addEventListener("resize", updateDimensions);

		return () => {
			window.removeEventListener("resize", updateDimensions);
		};
	}, [containerRef]);

	return dimensions;
};
