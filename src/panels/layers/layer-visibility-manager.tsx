import React from "react";
import { Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { useElementVisibility, useUpdateElement } from "@store/index";
import type { Element } from "@store/index";

interface LayerVisibilityControlsProps {
	element: Element;
	onVisibilityToggle: (e: React.MouseEvent) => void;
	onLockToggle: (e: React.MouseEvent) => void;
}

export const LayerVisibilityControls: React.FC<
	LayerVisibilityControlsProps
> = ({ element, onVisibilityToggle, onLockToggle }) => {
	const isVisible = element.visible !== false;
	const isLocked = element.locked === true;

	return (
		<>
			<div
				className="layer-visibility"
				onClick={onVisibilityToggle}
				style={{ cursor: "pointer" }}
			>
				{isVisible ? (
					<Eye size={16} />
				) : (
					<EyeOff size={16} style={{ opacity: 0.5 }} />
				)}
			</div>
			<div
				className="layer-lock"
				onClick={onLockToggle}
				style={{ cursor: "pointer", marginLeft: 8 }}
				title={isLocked ? "Unlock" : "Lock"}
			>
				{isLocked ? <Lock size={16} /> : <Unlock size={16} />}
			</div>
		</>
	);
};

export const useLayerVisibilityManager = () => {
	const { toggleVisibility } = useElementVisibility();
	const updateElement = useUpdateElement();

	const handleVisibilityToggle =
		(element: Element) => (e: React.MouseEvent) => {
			e.stopPropagation();
			toggleVisibility(element.id);
		};

	const handleLockToggle = (element: Element) => (e: React.MouseEvent) => {
		e.stopPropagation();
		updateElement({ id: element.id, patch: { locked: !element.locked } });
	};

	return {
		handleVisibilityToggle,
		handleLockToggle,
	};
};
