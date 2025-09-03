import React from "react";
import { Virtuoso } from "react-virtuoso";
import type { Element } from "@store/index";
import { LayerItem } from "./layer-item";

interface LayerVirtualizationProps {
	rootElements: Element[];
	elements: Element[];
	selection: string[];
	select: (ids: string[]) => void;
	expandedFrames: Set<string>;
	toggleExpanded: (frameId: string) => void;
	childrenMap: Map<string | null, Element[]>;
	onContextMenu: (
		e: React.MouseEvent,
		elementId: string,
		selection: string[],
		select: (ids: string[]) => void,
	) => void;
}

export const LayerVirtualization: React.FC<LayerVirtualizationProps> = ({
	rootElements,
	elements,
	selection,
	select,
	expandedFrames,
	toggleExpanded,
	childrenMap,
	onContextMenu,
}) => {
	return (
		<Virtuoso
			data={rootElements}
			totalCount={rootElements.length}
			className="layer-list"
			itemContent={(_, element) => (
				<LayerItem
					key={element.id}
					element={element}
					elements={elements}
					selection={selection}
					select={select}
					level={0}
					expandedFrames={expandedFrames}
					toggleExpanded={toggleExpanded}
					childrenMap={childrenMap}
					onContextMenu={onContextMenu}
				/>
			)}
		/>
	);
};
