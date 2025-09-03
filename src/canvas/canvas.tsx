import { InspectorPanel } from "@panels/inspector";
import { LayersPanel } from "@panels/layers";
import { BottomToolbar } from "@panels/tools";
import { useElements, useSelection, useIsPanning } from "@store/index";

import { CanvasKitCanvas } from "./canvaskit/canvaskit-canvas";

export function Canvas() {
	const [selection] = useSelection();
	const elements = useElements();
	const [isPanning] = useIsPanning();

	const hasSelectedElements = selection.length > 0;
	const hasElements = elements.length > 0;

	return (
		<div className="canvas-container">
			{/* Canvas */}
			<CanvasKitCanvas />

			<div className="floating-tools">
				{hasElements && !isPanning && <LayersPanel className="layers-panel" />}
				<BottomToolbar className="bottom-toolbar" />
				{hasSelectedElements && !isPanning && (
					<InspectorPanel className="inspector-panel" />
				)}
			</div>
		</div>
	);
}
