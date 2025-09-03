import React from "react";
import type { Element, ImageElement } from "@store/index";
import { useElementOperations } from "@store/index";
import {
	AppearanceSection,
	CornerRadiusSection,
	LayoutSection,
	PathEditingSection,
	PositionSection,
	SizeSection,
	SVGColorSection,
	TypographySection,
	ShadowSection,
	StrokeSection,
	BlurSection,
	ClipContentSection,
	ImageFillSection,
	ImageEffectsSection,
	FramePresetsSection,
} from "../../components/inspector";
import { AlignmentControls } from "./alignment-controls";
import { SpacingControls } from "./spacing-controls";

interface SectionCoordinatorProps {
	element: Element;
	isChildOfFrame: boolean;
	onUpdate: (id: string, patch: Partial<Element>) => void;
	updateImageSVGPaths: any;
}

export const SectionCoordinator: React.FC<SectionCoordinatorProps> = ({
	element,
	isChildOfFrame,
	onUpdate,
	updateImageSVGPaths,
}) => {
	const { addElement } = useElementOperations();

	return (
		<div className="inspector-content">
			<PositionSection element={element} onUpdate={onUpdate} />
			<SizeSection element={element} onUpdate={onUpdate} />
			{/* Frame presets for quick sizing */}
			<FramePresetsSection element={element} onUpdate={onUpdate} />
			{/* Place Clip Content toggle before Appearance */}
			<ClipContentSection element={element} onUpdate={onUpdate} />
			<AppearanceSection element={element} onUpdate={onUpdate} />
			<ImageFillSection element={element} onUpdate={onUpdate} />

			{element.type === "image" && (
				<ImageEffectsSection element={element} onUpdate={onUpdate} />
			)}

			{element.type === "path" && (
				<PathEditingSection
					element={element}
					onUpdate={onUpdate}
					addElement={addElement}
				/>
			)}

			{element.type === "image" && (element as ImageElement).svgPaths && (
				<SVGColorSection
					element={element as ImageElement}
					updateSVGPaths={updateImageSVGPaths}
				/>
			)}

			<TypographySection element={element} onUpdate={onUpdate} />
			<CornerRadiusSection element={element} onUpdate={onUpdate} />
			<LayoutSection element={element} onUpdate={onUpdate} />

			{isChildOfFrame && (
				<AlignmentControls element={element} onUpdate={onUpdate} />
			)}

			<SpacingControls element={element} onUpdate={onUpdate} />

			<StrokeSection element={element} onUpdate={onUpdate} />
			<BlurSection element={element} onUpdate={onUpdate} />
			<ShadowSection element={element} onUpdate={onUpdate} />
		</div>
	);
};
