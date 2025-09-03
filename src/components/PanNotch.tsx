import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, ArrowUpDown } from "lucide-react";
import { useIsPanning } from "@store/index";

export interface PanNotchProps {
	zoom: number;
	pan: { x: number; y: number };
	dimensions: { width: number; height: number };
	durationMs?: number; // visibility duration after pan stops
}

export const PanNotch: React.FC<PanNotchProps> = ({
	zoom,
	pan,
	dimensions,
	durationMs = 800,
}) => {
	const [isPanning] = useIsPanning();
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		if (isPanning) {
			setVisible(true);
		} else {
			const id = setTimeout(() => setVisible(false), durationMs);
			return () => clearTimeout(id);
		}
	}, [isPanning, durationMs]);

	const centerWorld = useMemo(() => {
		const w = Math.max(1, dimensions.width || window.innerWidth);
		const h = Math.max(1, dimensions.height || window.innerHeight);
		const safeZoom = Math.max(zoom, 0.0001);
		const cx = (w / 2 - pan.x) / safeZoom;
		const cy = (h / 2 - pan.y) / safeZoom;
		return { x: cx, y: cy };
	}, [dimensions.width, dimensions.height, pan.x, pan.y, zoom]);

	return (
		<div className={`pan-notch ${visible ? "visible" : ""}`}>
			<div className="pan-notch-content">
				<span className="pan-notch-xy">
					<ArrowLeftRight size={12} /> {Math.round(centerWorld.x)}
				</span>
				<span className="pan-notch-xy">
					<ArrowUpDown size={12} /> {Math.round(centerWorld.y)}
				</span>
			</div>
		</div>
	);
};
