import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Element } from "@store/index";
import { getIcon } from "./layer-tree-manager";
import {
	LayerVisibilityControls,
	useLayerVisibilityManager,
} from "./layer-visibility-manager";
import { useLayerSelectionManager } from "./layer-selection-manager";

interface LayerItemProps {
	element: Element;
	elements: Element[];
	selection: string[];
	select: (ids: string[]) => void;
	level: number;
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

export const LayerItem: React.FC<LayerItemProps> = ({
	element,
	elements,
	selection,
	select,
	level,
	expandedFrames,
	toggleExpanded,
	childrenMap,
	onContextMenu,
}) => {
	const children = childrenMap.get(element.id) ?? [];
	const hasChildren = children.length > 0;
	const isExpanded = expandedFrames.has(element.id);
	const isSelected = selection.includes(element.id);
	const isVisible = element.visible !== false;

	const { handleVisibilityToggle, handleLockToggle } =
		useLayerVisibilityManager();
	const {
		editingId,
		editingName,
		setEditingName,
		handleClick,
		handleDoubleClick,
		handleSaveName,
		handleKeyDown,
	} = useLayerSelectionManager();

	const isEditing = editingId === element.id;

	return (
		<div key={element.id}>
			<div
				className={`layer-item ${isSelected ? "selected" : ""}`}
				style={{
					paddingLeft: `${level * 20 + 8}px`,
					cursor: "pointer",
					opacity: isVisible ? 1 : 0.5,
				}}
				onClick={handleClick(element, selection, select)}
				onContextMenu={(e) => onContextMenu(e, element.id, selection, select)}
			>
				{hasChildren && (
					<div
						className="layer-expand-toggle"
						onClick={(e) => {
							e.stopPropagation();
							toggleExpanded(element.id);
						}}
						style={{
							display: "inline-flex",
							alignItems: "center",
							marginRight: "4px",
							cursor: "pointer",
						}}
					>
						{isExpanded ? (
							<ChevronDown size={14} />
						) : (
							<ChevronRight size={14} />
						)}
					</div>
				)}

				<div className="layer-icon">{getIcon(element.type, element)}</div>
				<div className="layer-info">
					{isEditing ? (
						<input
							type="text"
							value={editingName}
							onChange={(e) => setEditingName(e.target.value)}
							onKeyDown={handleKeyDown(element)}
							onBlur={handleSaveName(element)}
							className="layer-name-input"
							autoFocus
							onClick={(e) => e.stopPropagation()}
						/>
					) : (
						<span
							className="layer-name"
							onDoubleClick={handleDoubleClick(element)}
						>
							{element.name}
							{element.type === "path" && (element as any).closed && (
								<span className="path-status"> (closed)</span>
							)}
						</span>
					)}
				</div>

				<LayerVisibilityControls
					element={element}
					onVisibilityToggle={handleVisibilityToggle(element)}
					onLockToggle={handleLockToggle(element)}
				/>
			</div>

			{/* Render children if expanded */}
			{hasChildren &&
				isExpanded &&
				children.map((child) => (
					<LayerItem
						key={child.id}
						element={child}
						elements={elements}
						selection={selection}
						select={select}
						level={level + 1}
						expandedFrames={expandedFrames}
						toggleExpanded={toggleExpanded}
						childrenMap={childrenMap}
						onContextMenu={onContextMenu}
					/>
				))}
		</div>
	);
};
