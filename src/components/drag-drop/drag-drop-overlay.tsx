import React from "react";
import { FolderOpen } from "lucide-react";

interface DragDropOverlayProps {
	isDragOver: boolean;
}

export const DragDropOverlay: React.FC<DragDropOverlayProps> = ({
	isDragOver,
}) => {
	if (!isDragOver) return null;

	return (
		<div className="drag-drop-overlay">
			<div className="drag-drop-content">
				<div className="drag-drop-icon">
					<FolderOpen size={64} />
				</div>
				<h2>Drop .clise file to import</h2>
				<p>Release to add elements and groups to your design</p>
			</div>
		</div>
	);
};
