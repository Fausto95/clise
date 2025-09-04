import {
	type Tool,
	useElementOperations,
	useSelection,
	useTool,
	useZoom,
	useZoomControls,
	useSmartGuidesEnabled,
} from "@store/index";
import { usePan, useViewport } from "@store/viewport-hooks";
import {
	Circle,
	Frame,
	Image,
	MousePointer,
	PenTool,
	Square,
	Type,
	ZoomIn,
	ZoomOut,
	Ruler,
} from "lucide-react";
import { captureError } from "../utils/sentry";

import { useTranslation } from "react-i18next";
import { createFileInput } from "../store/file-operations";
import {
	createImageElement,
	processImageFile,
	validateImageFile,
} from "../utils/image-utils";

const tools: Tool[] = [
	"select",
	"rect",
	"ellipse",
	"path",
	"text",
	"frame",
	"image",
];

const getToolIcon = (tool: Tool) => {
	switch (tool) {
		case "select":
			return <MousePointer size={18} />;
		case "rect":
			return <Square size={18} />;
		case "ellipse":
			return <Circle size={18} />;
		case "path":
			return <PenTool size={18} />;
		case "text":
			return <Type size={18} />;
		case "frame":
			return <Frame size={18} />;
		case "image":
			return <Image size={18} />;
		default:
			return <MousePointer size={18} />;
	}
};

export function BottomToolbar({ className }: { className?: string }) {
	const { t } = useTranslation();
	const [tool, setTool] = useTool();
	const [zoom] = useZoom();
	const { zoomIn, zoomOut, setZoom } = useZoomControls();
	const { addElement } = useElementOperations();
	const [, setSelection] = useSelection();
	const { pan } = usePan();
	const { viewport } = useViewport();
	const [smartGuidesEnabled, setSmartGuidesEnabled] = useSmartGuidesEnabled();

	const handleToolClick = async (t: Tool) => {
		if (t === "image") {
			try {
				const file = await createFileInput("image/*");
				if (!file) return;

				const validation = validateImageFile(file);
				if (!validation.valid) {
					captureError(validation.error || "Invalid image file", {
						context: "Invalid image file",
					});
					return;
				}

				const imageData = await processImageFile(file);

				// Calculate center position of current viewport
				const viewportCenterX = viewport.width / 2;
				const viewportCenterY = viewport.height / 2;

				// Convert viewport center to canvas coordinates
				const canvasX = (viewportCenterX - pan.x) / zoom;
				const canvasY = (viewportCenterY - pan.y) / zoom;

				const imageElement = createImageElement(
					imageData,
					canvasX,
					canvasY,
					file.name,
				);

				const elementId = addElement(imageElement);
				setSelection([elementId]);
				setTool("select"); // Switch back to select tool after adding image
			} catch (error) {
				captureError(error as Error, { context: "Failed to add image" });
			}
		} else {
			setTool(t);
		}
	};

	return (
		<div className={`bottom ${className || ""}`}>
			<div className="tools-section">
				{tools.map((toolType) => (
					<button
						key={toolType}
						className={`tool-button ${tool === toolType ? "active" : ""}`}
						onClick={() => handleToolClick(toolType)}
						title={t(`tools.${toolType}`)}
					>
						{getToolIcon(toolType)}
					</button>
				))}
			</div>

			<div className="zoom-section">
				<button className="zoom-button" onClick={zoomOut} title={t("zoom.out")}>
					<ZoomOut size={16} />
				</button>
				<span
					className="zoom-display"
					onDoubleClick={() => setZoom(1)}
					style={{
						cursor: "pointer",
						userSelect: "none",
					}}
					title={t("zoom.reset")}
				>
					{Math.round(zoom * 100)}%
				</span>
				<button className="zoom-button" onClick={zoomIn} title={t("zoom.in")}>
					<ZoomIn size={16} />
				</button>
			</div>

			<div className="smart-guides-section">
				<button
					className={`tool-button ${smartGuidesEnabled ? "active" : ""}`}
					onClick={() => setSmartGuidesEnabled(!smartGuidesEnabled)}
					title={
						smartGuidesEnabled ? "Disable Smart Guides" : "Enable Smart Guides"
					}
				>
					<Ruler size={18} />
				</button>
			</div>
		</div>
	);
}
