import { useElements, useSelection } from "@store/index";
import { Layers } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useLayerTreeManager } from "./layers/layer-tree-manager";
import {
	useLayerContextMenu,
	LayerContextMenuPortal,
} from "./layers/layer-context-menu";
import { LayerVirtualization } from "./layers/layer-virtualization";

export function LayersPanel({ className }: { className?: string }) {
	const { t } = useTranslation();
	const elements = useElements();
	const [selection, setSelection] = useSelection();
	const select = setSelection;

	const { expandedFrames, toggleExpanded, rootElements, childrenMap } =
		useLayerTreeManager(elements);
	const {
		contextMenu,
		handleContextMenu,
		closeContextMenu,
		getCurrentCursorPosition,
	} = useLayerContextMenu();

	const handleContextMenuWrapper = (e: React.MouseEvent, elementId: string) => {
		handleContextMenu(e, elementId, selection, select);
	};

	return (
		<>
			<div className={`panel ${className || ""}`} style={{ width: 280 }}>
				<div className="panel-header">
					<Layers size={20} />
					<strong>{t("panels.layers.title")}</strong>
					<span className="layer-count">{elements.length}</span>
				</div>
				<div className="panel-content">
					{elements.length === 0 ? (
						<div className="empty-state">
							<div className="empty-icon">✨</div>
							<p>{t("panels.layers.empty.title")}</p>
							<small>{t("panels.layers.empty.subtitle")}</small>
						</div>
					) : (
						<LayerVirtualization
							rootElements={rootElements}
							elements={elements}
							selection={selection}
							select={select}
							expandedFrames={expandedFrames}
							toggleExpanded={toggleExpanded}
							childrenMap={childrenMap}
							onContextMenu={handleContextMenuWrapper}
						/>
					)}
				</div>
			</div>

			<LayerContextMenuPortal
				contextMenu={contextMenu}
				onClose={closeContextMenu}
				getCurrentCursorPosition={getCurrentCursorPosition}
			/>
		</>
	);
}
